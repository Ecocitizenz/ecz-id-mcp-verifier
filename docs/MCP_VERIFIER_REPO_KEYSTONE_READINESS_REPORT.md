# MCP Verifier — Repo-Keystone Readiness Report

**Pass type:** Local repo foundation + local package proof. No publish, no
release, no tag, no marketplace submission, no external write.
**Date:** 2026-06-05.
**Workspace:** `C:\Users\hp\Desktop\ECZID_MCP_VERIFIER`
**Scope touched:** this workspace only. No Backend, TrustOps, Resolver, Shopify,
Developer Gateway, VS Code/browser extension, or GitHub App workspace was
touched.

---

## Result: PASS

Repo-keystone readiness is complete. The missing repo foundation was created
and the package was proven locally (build + 217 tests + pack dry-run). Nothing
was published, listed, released, or tagged.

Two gates remain before any **actual** publish/listing and are recorded below:
the IP/patent counsel disclosure review (binding) and the GitHub repo
creation + authenticated push. The public push was intentionally **not**
performed because pushing source to a public remote is itself disclosure, which
is gated by counsel review.

---

## Repo status

- Before: **not a git repository** (confirmed via `git rev-parse`).
- After: initialized git repository on branch **`main`**.
- Initial commit created; working tree clean.
- Tracked files: **112**.
- Compiled `dist/` is intentionally **tracked** (a JS GitHub Action runs the
  committed `dist/action.js`; the npm `files` allow-list also ships `dist/`).

## Remote status

- Configured: `origin` →
  `https://github.com/Ecocitizenz/ecz-id-mcp-verifier.git`
  (local config only; `git remote add`, no network call).
- The GitHub repository at that URL was **not** created or verified by this
  pass: `gh` CLI is not installed in this environment, so a remote repo could
  not be created programmatically, and no push credentials were verified.
- Nothing was fetched from or pushed to the remote.

## Package metadata changes

Publish guard left intact: `package.json` stays `"private": true` with the
`prepublishOnly` guard (`publishing is disabled for this package`). Canonical
name unchanged: `@ecocitizenz/ecz-id-mcp-verifier`.

| Field | Before | After |
| ----- | ------ | ----- |
| `license` | `SEE LICENSE IN LICENSE_PLACEHOLDER.md` | `SEE LICENSE IN LICENSE.md` |
| `homepage` | `https://developers.ecocitizenz.com/mcp` | `https://developers.ecocitizenz.com` (live-route-proven base; matches the canonical `DEVELOPER_GATEWAY` constant) |
| `repository` | *(absent)* | `{ "type": "git", "url": "git+https://github.com/Ecocitizenz/ecz-id-mcp-verifier.git" }` |
| `bugs` | *(absent)* | `{ "url": "https://github.com/Ecocitizenz/ecz-id-mcp-verifier/issues" }` |
| `files[]` | `LICENSE_PLACEHOLDER.md` | `LICENSE.md` |

The `repository` URL uses the exact casing of the canonical remote provided for
this pass; npm provenance / OIDC trusted publishing rejects any casing mismatch.
The conditional `tests/package-metadata.test.ts` rule (a present `repository`
must be a well-formed `git+https` GitHub URL) now passes with the field present.

README updates (public wording only): clone URL set to the canonical repo;
Status section notes the proprietary license and the publication gate;
"Proof before LIVE" updated to reflect the configured remote, the present
`repository`/`bugs` fields, and the IP/patent counsel publication gate. No
banned/overclaim wording introduced (guardrail tests green). The case-sensitive
README assertion `uses: ecocitizenz/ecz-id-mcp-verifier` was preserved.

## License status

- `LICENSE_PLACEHOLDER.md` **removed**.
- `LICENSE.md` **created**: a proprietary **limited-use** license (chosen by the
  owner; not open source, not MIT, not Apache-2.0).
  - **Allows:** free installation and operation of the official, unmodified
    ECZ-ID MCP Verifier to check public ECZ-ID Resolver posture and read public
    machine-readable Resolver output.
  - **Prohibits:** copying beyond technical installation; modification;
    redistribution; sublicensing/selling; wrapping/white-labelling; building
    competing products; cloning resolver/proof/trust/KYA/MCP assurance
    functionality; removing ECZ-ID branding/routes; and using ECZ-ID
    schemas/outputs/workflows to build a same or similar product.
  - **No patent license** is granted; **all patent rights reserved**.
- `package.json` license expression: `SEE LICENSE IN LICENSE.md`.

## Files committed

Keystone commit includes (high level): `src/**`, compiled `dist/**`,
`action.yml`, `README.md`, `LICENSE.md`, `package.json`, `package-lock.json`,
`tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.npmignore`, `examples/**`,
`tests/**`, `docs/**` (ROLE_SPLIT, PRIVACY, DEEPAGENT_REFERENCE_AUDIT,
PHASE7 notes, the action-package fix report, `docs/specs/**`,
`docs/distribution/**`), and the local proof script under `scripts/`.

**Deliberately excluded from the public repo** (via `.gitignore`):
`node_modules/`, `_reference/` (incl. the 402 KB quarantined `deepagent` zip),
`docs/flywheel/` (internal cross-workspace patch plans + extension blueprints),
`ECZID_MCP_IMMEDIATE_MARKETPLACE_BATTLECARDS.md` (internal go-to-market),
`coverage/`, `.env*`, `*.log`. No secrets, logs, zips, or private
reference materials are tracked (verified with `git ls-files`).

## Commit hash

- Keystone commit: **`95a5f1fe9aa7aeab3dde903e8f633b62314e8f21`**
  (`chore: initialize public repo foundation for ECZ-ID MCP Verifier`).
- This report is added in a follow-up commit (`docs: add repo-keystone
  readiness report`) on the same `main` branch.

## Push result / blocker

**Not pushed — BLOCKED (by design).**
1. **Disclosure gate (binding):** public distribution is blocked pending
   EcoCitizenZ IP/patent counsel review. Pushing source/schemas to the public
   remote is itself public disclosure, so the push was withheld until counsel
   confirms what may be safely disclosed.
2. **Auth/remote:** `gh` CLI unavailable; the GitHub repository was not created
   or verified; no push credentials were confirmed.

## Build result

`npm run build` (`tsc -p tsconfig.json`) — **PASS**, exit 0, no errors.
`dist/` recompiled from current `src/` before commit.

## Test result

`npm test` (`vitest run`) — **PASS**. **14 test files, 217 tests passed, 0
failed, 0 skipped.** Includes scaffold/privacy-safety invariants (no telemetry,
no source/secret upload, no Backend/Core or checkout/payment call sites, no
MCP/Reciprocity Passport, no autonomous LLM runtime), copy guardrails
(no-overclaim), action adapter, and the conditional package-metadata rule.

## npm pack dry-run result

`npm pack --dry-run` — **PASS**, exit 0 (publish guard not triggered by pack).
Tarball `ecocitizenz-ecz-id-mcp-verifier-0.7.0.tgz`: **49 files**, package
~30.6 kB, unpacked ~116.8 kB.
- **Included (required):** `dist/action.js`, `dist/cli.js`, all `dist/*.js` +
  `*.d.ts`, `action.yml`, `README.md`, `LICENSE.md`, `docs/ROLE_SPLIT.md`,
  `docs/PRIVACY.md`, `examples/**`, `package.json`.
- **Excluded (correct):** `src/`, `tests/`, `node_modules/`, `_reference/`,
  `LICENSE_PLACEHOLDER.md`, `docs/flywheel/`, the battlecards, `.env*`,
  `.npmrc`. No source, secrets, or quarantined reference leaked.

## GitHub Action readiness result

**READY at the package level (commit-side complete); Marketplace listing
blocked by the gates above.**
- `action.yml`: `runs.using: node20`, `runs.main: dist/action.js` (adapter, not
  the argv-only CLI); all required inputs and outputs declared; no-truth-write
  boundary in the description; Marketplace `branding` present.
- `dist/action.js` is **committed** (JS actions execute the committed `dist`).
- Adapter reads only `INPUT_*` env, maps to `cli.main()`, preserves
  `$GITHUB_OUTPUT`; proven by `tests/action-adapter.test.ts` +
  `tests/github-action.test.ts` (green).
- Remaining external step: a real CI Marketplace run and listing — not done
  (and gated by counsel review).

## npm readiness result

**READY at the package level; publication BLOCKED.**
- Metadata complete for provenance: canonical name, `repository`/`bugs` with
  exact-casing `git+https` URL, `homepage`, `engines`, `bin`, `files`,
  `LICENSE.md`.
- Local proof (build + tests + pack content) is green.
- Publication is intentionally **not** possible from this pass: `private: true`
  + `prepublishOnly` guard remain, and publication is gated by counsel review
  and by trusted-publisher (OIDC) configuration against the live GitHub repo.

## Remaining blockers before actual publish/listing

1. **IP/patent counsel disclosure review (binding gate).** Public distribution
   to npm and the GitHub Action Marketplace — and the public push — are blocked
   until EcoCitizenZ IP/patent counsel confirms in writing what may be safely
   disclosed.
2. **GitHub repository creation + authenticated push.** The repo at the
   configured remote must be created on GitHub and `main` pushed (requires
   `gh`/credentials), so the committed `dist/action.js` can ship as the action.
3. **npm trusted publisher (OIDC)** configured against the live GitHub repo;
   first authenticated publish performed by a human after the guard is lifted.
4. **Publish guard flip** (`private: true` + `prepublishOnly`) — to be removed by
   a human only after gates 1–3 clear. Not done here.

## One next action

Obtain EcoCitizenZ IP/patent counsel written sign-off on the safe-disclosure
scope for the source, schemas, and outputs; only after that clearance, create
the public GitHub repository at the configured remote and push `main`. (Do not
push, flip `private`, remove the publish guard, tag, or publish before that
sign-off.)
