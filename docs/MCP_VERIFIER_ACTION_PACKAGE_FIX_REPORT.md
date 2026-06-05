# MCP Verifier — Action / Package Fix Report

**Pass type:** Surgical local implementation + proof. No publish. No deploy. No
marketplace submission. No GitHub release. No external system mutation.
**Date:** 2026-06-04.
**Scope:** Fix the two battlecard blockers (GitHub Action runtime inputs; npm
provenance/repository metadata), harden copy guardrails, add tests, run local
proof.

---

## Result

**PASS** — both blockers were addressed locally and all local proof commands
passed. Blocker 2's *publish* step remains intentionally blocked because no
canonical Git remote exists in this workspace (no URL was invented).

---

## Blocker 1 — GitHub Action input adapter

**Status: FIXED (and proven end-to-end locally).**

- Root cause confirmed: `action.yml` ran `dist/cli.js` directly. The CLI parses
  `argv` only, but a `node20` action delivers `with:` inputs as `INPUT_*`
  environment variables — so the action would have failed with
  `Error: --target is required` (exit 4).
- Added `src/action.ts` → compiled to `dist/action.js`. It:
  - reads inputs via `readActionInput()` from `INPUT_TARGET`, `INPUT_POLICY`,
    `INPUT_JSON`, `INPUT_OFFLINE` / `INPUT_NO-NETWORK`, `INPUT_TARGET-TYPE`,
    `INPUT_OPERATOR`, `INPUT_RESOLVER-BASE` / `INPUT_RESOLVER_URL`,
    `INPUT_TIMEOUT-MS` (hyphen and underscore variants both accepted);
  - maps them onto the existing CLI argument shape and **reuses `cli.main()`** —
    no core logic duplicated;
  - **preserves the existing `$GITHUB_OUTPUT` behaviour** (the CLI already
    appended outputs; the adapter routes through the same path);
  - reads **only** `INPUT_`-prefixed env keys — never secrets or arbitrary env.
- `action.yml` updated: `runs.main: dist/action.js`; added `json` and `offline`
  inputs; added Marketplace `branding` (`icon: shield`, `color: green`).
- Doctrine preserved: does not request secrets, upload source, write truth,
  activate proof, mark BOUND, or mutate Resolver/Backend/TrustOps.

**End-to-end proof (run locally as GitHub would invoke it):**
```
INPUT_TARGET=ECZ-CC-ABC123 INPUT_POLICY=prefer INPUT_OFFLINE=true \
GITHUB_OUTPUT=<file> node dist/action.js
-> exit 0
-> target=ECZ-CC-ABC123, policy_mode=PREFER
-> $GITHUB_OUTPUT received: result-state, reason-codes, action-envelope-json,
   acquisition-flow-json, primary-action, trustops-action-url,
   developer-guidance-url
```

---

## Blocker 2 — package.json repository metadata

**Status: PUBLISH-BLOCKED due to missing Git remote (no URL invented).**

- `git rev-parse` / `git remote -v` confirmed this workspace is **not a git
  repository** and has **no remote**.
- Per instruction, **no `repository` URL was invented or added** to
  `package.json`. The field is intentionally absent.
- `package.json` was **not modified**. The publish guard is intact: `"private":
  true` and the `prepublishOnly` guard (`publishing is disabled for this
  package`) both remain. Publishing is not possible without explicit future
  action.
- TODO (recorded, not actioned): once the canonical GitHub remote exists, add
  ```json
  "repository": { "type": "git", "url": "git+https://github.com/<owner>/<repo>.git" },
  "bugs": { "url": "https://github.com/<owner>/<repo>/issues" }
  ```
  with **exact casing** matching the GitHub URL (npm trusted publishing /
  provenance fails with HTTP 422 on any mismatch). Until then, npm publish proof
  stays blocked. A conditional test (`tests/package-metadata.test.ts`) enforces:
  *if* a `repository` field is present it must be a well-formed `git+https`
  GitHub URL; otherwise the package must remain `private`.

---

## Copy guardrails

- Unresolved output now emits the exact approved wording (single source of truth
  in `src/copy.ts`, rendered by `src/human-report.ts` for
  `NO_PUBLIC_RESOLVER_PROOF_FOUND`):
  > No public resolver proof was found for this MCP target yet. This does not
  > mean the target is unsafe. It means ECZ-ID could not locate machine-readable
  > public proof for the accountable operator. Your local policy decides the
  > action.
- Operator route emitted verbatim:
  > Operate this server? Improve its resolver posture:
  > https://trustops.ecocitizenz.com/start
- Forbidden wording (safe/unsafe-as-claim, certified, approved, guaranteed,
  fully compliant, npm verified, PyPI endorsed, GitHub approved, etc.) is
  asserted **absent** from the unresolved copy and the README. Two README
  disclaimer sentences were reworded to noun forms (e.g. "certify the safety of",
  "makes no safety, certification, approval, or compliance claim") so the
  README carries no positive-claim n-grams while keeping the doctrine intact.
- The single permitted negation ("does not mean the target is unsafe") is the
  only place "unsafe" appears, by design.

---

## README / docs updates

- Added **Quick start (npx)** with the first-use command
  `npx @ecocitizenz/ecz-id-mcp-verifier check --target <mcp-url> --policy prefer`
  (`check` is an accepted leading subcommand).
- GitHub Action `with: target / policy` usage example retained.
- Added **Proof before LIVE** note verbatim:
  > This package is not live/published until local package proof, external action
  > proof, trusted publishing configuration, and no-overclaim review are complete.
- Recorded the missing-remote / publish-blocked state in the README.

---

## Tests run

Command: `npm test` (vitest run). Also `npm run build` and `npm pack --dry-run`.

New / hardened coverage:
- `tests/action-adapter.test.ts` (new): INPUT_TARGET→target; INPUT_POLICY→policy
  mode; JSON output; missing target → exit 4; unresolved under REQUIRE → non-zero
  (1); unresolved under OPEN/PREFER → exit 0; resolver-base/resolver-url mapping;
  no-telemetry/no-upload invariants in output; `$GITHUB_OUTPUT` preserved via
  `cli.main()`; adapter reads only `INPUT_`-prefixed env; `action.yml` points to
  the new adapter.
- `tests/copy-guardrails.test.ts` (new): exact unresolved copy; forbidden tokens
  absent from copy and README; operate route; README contains the npx command,
  action example, exact copy, and proof-before-LIVE note.
- `tests/package-metadata.test.ts` (new): private + prepublishOnly guard intact;
  canonical name; conditional repository-field rule.
- `tests/cli.test.ts` (updated): report assertions switched to the exact copy;
  added `check` subcommand test.
- `tests/github-action.test.ts` (updated): entrypoint asserted as
  `dist/action.js`, and explicitly **not** `dist/cli.js`.

## Test results

```
Test Files  12 passed (12)
     Tests  187 passed (187)
```
Build: `tsc` clean (no errors). No tests skipped, none failing.

## npm pack --dry-run result

- `npm pack --dry-run` succeeded (no publish; `prepublishOnly` not triggered by
  pack). Tarball: `ecocitizenz-ecz-id-mcp-verifier-0.7.0.tgz`, 47 files, package
  size ~25.8 kB, unpacked ~98.5 kB.
- Confirmed included: `dist/action.js`, `dist/copy.js`, `README.md`,
  `action.yml`, `LICENSE_PLACEHOLDER.md`, `docs/`, `examples/`.
- Confirmed **excluded**: `src/`, `tests/`, `node_modules/`, `_reference/`, and
  any `.env`/`.npmrc` — no source, secrets, or quarantined reference leaked.

---

## Current proof classification

- **Local package proof: PASS** (build + 187 tests + pack content review).
- **External action proof: PASS (local)** — compiled `dist/action.js` runs as
  GitHub would and emits all outputs; full CI marketplace run is the remaining
  external step.
- **Trusted publishing configuration: BLOCKED** — requires a Git remote +
  `repository` field; not configurable in this workspace.
- **No-overclaim review: PASS** — guardrail tests green; README clean.

Overall: **distribution-readiness improved; still PRE-PUBLISH / NOT LIVE.**

## Was anything published / submitted / deployed?

**No.** No npm publish, no PyPI publish, no Marketplace submission, no GitHub
release, no `npm version`, no `git tag`, no deploy, no external write API. No
Backend / TrustOps / Resolver / Shopify / Developer Gateway workspace was
touched. `package.json` stays `private` with the publish guard intact.

---

## Remaining gaps

1. **No Git remote → repository metadata + trusted publishing cannot be
   completed.** Publish proof is blocked until a canonical GitHub remote exists.
2. **Package-name decision needed.** The task referenced
   `@ecocitizenz/mcp-verifier`; the existing canonical package is
   `@ecocitizenz/ecz-id-mcp-verifier` (asserted by scaffold tests and used across
   bins/docs/battlecards). The README/command preserve the canonical name to
   stay correct. Final published name is a naming decision to confirm before
   first publish — it was **not** changed unilaterally.
3. **Committed `dist/` for the Action.** JS actions run the committed `main`;
   `dist/action.js` is built locally but must be committed once a repo exists.
4. **License placeholder** (`LICENSE_PLACEHOLDER.md`) should be finalized before
   any public listing.
5. Marketplace listing, OIDC trusted publisher, and the first authenticated npm
   publish remain future steps (all out of scope here).

---

## One next action

Initialize the Git repository and set the canonical GitHub remote, then add the
exact-casing `repository` (and `bugs`) field to `package.json` and re-run local
package proof — this is the single move that unblocks npm provenance/trusted
publishing and lets the committed `dist/action.js` ship as the Marketplace
action. (Do not publish, flip `private`, or remove the publish guard until that
proof passes.)
