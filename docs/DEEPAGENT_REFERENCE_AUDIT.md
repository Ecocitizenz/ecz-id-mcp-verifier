# DeepAgent MCP Verifier ZIP - Reference Audit

> **Status: Reference only.** This audit reviews historical material that
> lives under `_reference/deepagent_zip_do_not_import/`. Nothing from that
> tree is imported by `src/` or `tests/`. The scaffold under
> `src/` remains the canonical Phase 7 starting point.

---

## 1. ZIP source path

`C:\Users\hp\Desktop\ecz-id-mcp-verifier.zip`

## 2. Extraction path

`C:\Users\hp\Desktop\ECZID_MCP_VERIFIER\_reference\deepagent_zip_do_not_import\extracted\`

A copy of the ZIP is preserved at:
`_reference/deepagent_zip_do_not_import/ecz-id-mcp-verifier.zip`

## 3. Confirmation `_reference/` is ignored

- [.gitignore](.gitignore): contains `_reference/`
- [.npmignore](.npmignore): contains `_reference/`
- [tsconfig.json](tsconfig.json): `exclude` includes `_reference`
- [vitest.config.ts](vitest.config.ts): `exclude` includes `_reference/**`

Verified empirically: `grep_search` without `includeIgnoredFiles=true`
returns zero matches under `_reference/`; full scaffold test suite
(31/31 passing) does not pick up any DeepAgent tests.

## 4. Extracted top-level summary (144 files)

| Top-level entry | Kind | Notes |
| --- | --- | --- |
| `README.md`, `PRIVACY.md`, `SECURITY.md`, `LICENSE`, `LAUNCH_GAPS.md` | docs | Project-level prose. |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, `tsconfig.base.json` | tooling | pnpm + turborepo monorepo. |
| `.env.example` | config | Resolver/TrustOps URLs and output mode only. No secrets. |
| `packages/core/` | source | Deterministic decision engine, types, constants, resolver client, manifest fetcher, policy engine, SSRF guards, TrustOps link builder. Includes `tests/`. |
| `packages/mcp-server/` | source | MCP server exposing 10 `ecz.*` tools, resources, prompts. |
| `packages/cli/` | source | `ecz-verify` CLI built on `commander`. |
| `packages/schemas/` | json | `ecz-decision.schema.json`, `ecz-policy.schema.json`. |
| `actions/ecz-id-verify-action/` | source | GitHub Action wrapper. |
| `docs/` | docs | Developer-gateway, marketplace, launch sub-docs. |
| `examples/` | examples | Claude Desktop MCP config, demo agent, default policy YAML. |
| `registry/mcp-server.json` | metadata | MCP registry listing payload. |
| `scripts/forbidden-copy-scanner.mjs` | tooling | Static text scanner for overclaim phrases. |
| `scripts/package-dry-run.mjs` | tooling | Packaging sanity check. |
| `dist/` and `packages/*/dist/` | build output | Compiled JS + `.d.ts` + sourcemaps. |
| `.abacus.donotdelete` | foreign marker | Workspace artifact from the originating tool. Ignored. |

## 5. Useful assets

| Asset | Path (under `_reference/.../extracted/`) | Why it's useful |
| --- | --- | --- |
| SSRF guard logic | `packages/core/src/security/network-guards.ts` | IPv4/IPv6 private/reserved-range checks, localhost block, DNS lookup, well-structured. |
| Manifest fetcher pattern | `packages/core/src/manifest/fetcher.ts` (+ `error.ts`) | HTTPS-only, byte cap (256 KB), single-hop redirect re-check, structured error type. |
| Resolver client pattern | `packages/core/src/resolver/client.ts` | GET-only, AbortController timeout, zod response validation, normalized state mapping. |
| TrustOps link builder | `packages/core/src/trustops/links.ts` | Whitelists `trustops.ecocitizenz.com`, throws on any other host; pure URL construction (no POST). |
| Decision engine shape | `packages/core/src/decision/engine.ts` | Pure function over (input, resolver, manifest) -> structured decision. |
| Policy engine | `packages/core/src/policy/engine.ts` | Category -> required-passport mapping, high-risk action set. |
| Action envelope shape | `packages/core/src/types.ts` (`VerificationDecision`) | Self-describing JSON: schema_version, checked_at, reason_codes[], evidence{}, ttl. |
| JSON schemas | `packages/schemas/ecz-decision.schema.json`, `ecz-policy.schema.json` | Stable JSON Schema 2020-12. |
| Default policy file | `examples/policy/default-policy.yaml` | YAML format users can copy. |
| CLI structure | `packages/cli/src/index.ts`, `commands/verify.ts` | Subcommands `manifest|agent|policy|request`, `--json`/`--markdown`, exit codes. |
| GitHub Action wrapper | `actions/ecz-id-verify-action/action.yml`, `src/index.ts` | `@actions/core` inputs/outputs, markdown step summary, `fail_on_deny`/`fail_on_review`. |
| Claude Desktop MCP config | `examples/claude-desktop/claude_desktop_config.json` | One-screen install recipe for a desktop MCP host. |
| Demo agent | `examples/demo-agent/src/demo.ts` | Minimal end-to-end usage. |
| Forbidden-copy scanner | `scripts/forbidden-copy-scanner.mjs` | Pre-commit / CI gate against overclaim phrases. |
| Test patterns | `packages/core/tests/decision.test.ts`, `security.test.ts`, `packages/mcp-server/tests/*` | Hash mismatch, copied-manifest, SSRF, host whitelist, fail-closed. |
| Privacy/Security wording | `PRIVACY.md`, `SECURITY.md` | Concise, boundary-respecting. |

## 6. Drift / risk table

| Area | Finding | Risk for Phase 7 |
| --- | --- | --- |
| Decision vocabulary | DeepAgent uses **ALLOW / DENY / REVIEW / REQUEST** as the top-level decision; our canon uses **ResultStates** (`RESOLVER_VERIFIABLE`, `NO_PUBLIC_RESOLVER_PROOF_FOUND`, etc.). | **High.** Do not copy the decision enum. Map DeepAgent reason codes onto our `ReasonCode` set, but emit canonical ResultStates only. |
| Reason codes | DeepAgent's `REASON_CODES` set (20 entries: `RESOLVER_ACTIVE`, `POLICY_ALLOW`, `POLICY_HIGH_RISK_FAIL_CLOSED`, `COPIED_MANIFEST_SUSPECTED`, `POLICY_TAMPERING_SUSPECTED`, etc.) overlaps `MANIFEST_HASH_MISMATCH` only. | **Medium.** Different domain. Phase 7 must keep our 30-entry canonical list; DeepAgent's codes are not canon. |
| Policy semantics | DeepAgent's `PolicyEngine` issues an **enforceable** allow/deny based on "required passports" + "high-risk actions". | **High.** Our verifier reports, it does not enforce. Phase 7 must keep `local_policy_decides=true` and let the caller act on the result. Treat DeepAgent's policy engine as a *reporting* template only. |
| "Passports" concept | DeepAgent references `Agent Credential`, `Financial Authority Passport`, `Supply Chain Passport`, `API Stewardship Passport`, `Change Control Passport`. | **Medium.** These are domain-specific tokens that do not match canon. Do not copy verbatim into our docs/types. |
| Canonical IDs hard-coded | `ECZ-GB-A93K7Q`, `::AGENT-4F9Q2A`, `::API-2Q7X9B` are hard-coded as defaults in `tools.ts` and used as fallbacks. | **Medium.** These may be example IDs only. Phase 7 must not default to a specific ECZ-ID; treat all IDs as caller input. |
| TTL on decisions | `ttl: 300s` baked into every decision. | **Low.** Useful idea but our `recheck_before_reliance=true` invariant should drive any TTL semantics. |
| MCP server feature | Full MCP server (10 tools, prompts, resources) shipped as a package. | **Medium.** Our Phase 7 scope is CLI + GitHub Action. An MCP server is out of scope for this scaffold and would expand the surface area. Reference only. |
| Marketplace listings claim "Launch score: 8.7/10" | `docs/marketplace/*.md`. | **Low.** Unsupported metric; do not reuse as copy. |

## 7. Canon conflicts

Searched (with `includeIgnoredFiles=true`) for every canon-drift token
called out in the prompt. **Zero hits** for:

- `FAILED_VERIFICATION`
- `MCP Passport`
- `Reciprocity Passport`
- `MCP Lite`, `KYA Lite`, `KYA Basic`, `KYA Pro`, `KYA Family`
- `ECZ-BUNDLE-KYA-READY`
- `keyset_hash_public`
- lower-case reason codes (all DeepAgent reason codes are UPPER_SNAKE_CASE)

Conflicts that do exist:

1. **Decision enum diverges from canonical ResultStates** (see Drift table).
2. **Reason-code set diverges** from our 30-entry canon (see Drift table).
3. **MCP server scope** beyond what our scaffold targets.
4. **Hard-coded canonical example IDs** that may need to be parameterised.

No forbidden role-drift tokens were found: no `checkout`, no
`activate_proof`, no `mark_bound`/`markBound`, no `create_proof`,
no `truth_write`. The only `checkout` hit is the GitHub Action
`actions/checkout@v4` usage example in `actions/.../README.md`,
which is unrelated.

## 8. Privacy / security risks

| Item | Finding |
| --- | --- |
| Telemetry / analytics SDK | **None.** Only string occurrences of `telemetry` are in *boundary* statements ("No telemetry", `telemetry: "disabled"` in compiled CLI). No PostHog/Sentry/analytics packages in any `package.json`. |
| Source upload | **None.** No file walking, no upload code, no archive creation. |
| Secret / env upload | **None.** `.env.example` is config (URLs + output mode), no secrets. CLI/Action only read `ECZ_RESOLVER_BASE_URL` / `ECZ_TRUSTOPS_BASE_URL`. |
| Prompt / log upload | **None.** |
| Background network calls | **None unsolicited.** Network I/O only on explicit `resolver.resolveBy*` calls and user-provided manifest URLs. |
| Mutation methods | **None.** No `POST`/`PUT`/`PATCH`/`DELETE` to Resolver, TrustOps, or Backend. Resolver client is GET-only; TrustOps "client" is a pure URL builder. |
| SSRF | **Defended.** `assertPublicHostname` blocks localhost, RFC1918, link-local, loopback, multicast, ULA. Manifest fetcher requires HTTPS. |
| Host pinning | TrustOps link builder **throws** on any host other than `trustops.ecocitizenz.com`. |
| API keys / tokens / private keys / webhook secrets | **Not present** in source or examples. |

Net: DeepAgent's privacy/security posture is consistent with our
invariants. The risk is *role drift* (enforcing instead of reporting),
not privacy.

## 9. Overclaim copy risks

`grep` for overclaim phrases (`safe`, `certified`, `approved`,
`guaranteed`, `fully compliant`, `insured`, `unsafe server`,
`untrusted agent`, `must buy`, `demand proof`) returned **zero**
positive-claim hits in user-facing docs.

All matches occur inside the `BLOCKED` list of
`scripts/forbidden-copy-scanner.mjs`, which is *defensive* (a
pre-commit guard against those phrases). That scanner script is
itself a reusable idea.

## 10. Dependency risks

Production dependencies across all packages:

| Package | Deps |
| --- | --- |
| `@ecocitizenz/ecz-id-core` | `zod ^3.24.1` |
| `@ecocitizenz/ecz-id-mcp-server` | `zod`, `@modelcontextprotocol/sdk ^1.12.0`, workspace cores |
| `@ecocitizenz/ecz-id-cli` | `commander ^13.1.0`, workspace core |
| `ecz-id-verify-action` | `@actions/core ^1.11.1`, `js-yaml ^4.1.0`, workspace core |
| `examples/demo-agent` | workspace core |

No OpenAI, Anthropic, LangChain, AutoGen, CrewAI, LlamaIndex,
Sentry, PostHog, or analytics packages. No native modules.
Toolchain (`turbo`, `pnpm`, `vitest`, `typescript`) is dev-only.

Risks: minimal. `zod` is well-maintained. `@modelcontextprotocol/sdk`
is only needed if Phase 7 chooses to ship an MCP server (currently
out of scope for the scaffold).

## 11. Reusable test ideas

| Pattern | Source | Reuse note |
| --- | --- | --- |
| Hash mismatch -> non-positive result | `decision.test.ts` "denies hash mismatch" | Map to our `MANIFEST_HASH_MISMATCH` ReasonCode + `MISMATCH` ResultState. |
| Copied-manifest detection by ECZ-ID mismatch | `decision.test.ts` "denies copied manifest by ECZ mismatch" | Reusable as a ReasonCode test once we add a copied-manifest code. |
| Credential reuse across agent/api | `decision.test.ts` "denies reused credentials" | Maps to `AGENT_CREDENTIAL_REUSED`. |
| Revoked / suspended terminal states | `decision.test.ts` | Maps to `REVOKED` / `SUSPENDED` ResultStates. |
| SSRF: localhost, private IPv4, non-https | `security.test.ts` | Direct reuse pattern when Phase 7 adds the manifest fetcher. |
| TrustOps host whitelist enforcement | `security.test.ts` "rejects trustops links to wrong hosts" | Direct reuse. |
| Blocked-manifest -> non-positive result | `security.test.ts` "denies when fetched manifest flagged as blocked" | Direct reuse. |
| MCP tool schema validation (zod) | `mcp-server/tests/tools.test.ts` | Useful only if Phase 7 adds an MCP server. |

## 12. Reusable docs ideas

- `PRIVACY.md` brevity and structure (4 bullets + scope list).
- `SECURITY.md` "Scope" sentence: "verification and routing only; does
  not issue IDs and does not write resolver truth." Aligns with our
  ROLE_SPLIT.
- `LAUNCH_GAPS.md` pattern: an explicit "deferred to next phase" list.
- `examples/claude-desktop/claude_desktop_config.json` format for any
  future MCP host integration snippet.

## 13. Reusable GitHub Action ideas

- `runs.using: "node20"` + `main: "dist/index.js"` shape. (We already
  use this.)
- Inputs `fail_on_deny` / `fail_on_review` -> map to our policy modes
  (`REQUIRE` -> fail on non-`RESOLVER_VERIFIABLE`, etc.).
- `markdown_summary` output -> publish to `$GITHUB_STEP_SUMMARY` for
  readable workflow summaries.
- Loading a YAML policy file via `js-yaml` for `policy_file` input.
- Setting outputs with `@actions/core.setOutput` plus the markdown
  summary block.

## 14. Reusable package / CLI ideas

- `commander` subcommand layout: `manifest | agent | policy | request`
  (we would re-shape to our canonical target classes).
- Common `--json` / `--markdown` output toggles.
- Exit-code discipline: distinct codes for ALLOW / DENY / REVIEW /
  REQUEST. Phase 7 should pick a small, documented set mapped to
  ResultState families.
- Workspace layout (`packages/core`, `packages/cli`, `actions/*`).
  *Optional* for Phase 7; current scaffold is intentionally a single
  package.
- `scripts/forbidden-copy-scanner.mjs` style of static prose linter,
  re-pointed at our overclaim list.
- `scripts/package-dry-run.mjs` style pre-publish check.

## 15. Scoring

| Area | Score | Verdict |
| --- | --- | --- |
| CLI architecture | 80 | Useful with edits (rewrite commands around our target classes). |
| Target classifier | 40 | Reject. DeepAgent has no classifier; tools imply category. |
| Resolver client | 85 | Useful with edits (drop `zod` schema for DeepAgent payload; keep GET-only + timeout + abort). |
| Action envelope | 55 | Reference only. Shape ideas are good; field names diverge from our canon. |
| JSON output schema | 60 | Reference only. Replace `decision` enum with `result_state`. |
| Human report | 70 | Useful with edits. Markdown summary pattern is reusable. |
| Policy modes | 35 | Reject as-is. DeepAgent enforces; we report. Keep only the *idea* of a YAML policy file. |
| GitHub Action | 80 | Useful with edits. Reuse `js-yaml` + `core.setOutput` + step summary; remap to our inputs/outputs. |
| Tests | 80 | Useful with edits. SSRF/host-whitelist tests transplant directly; decision-engine tests need ReasonCode remap. |
| README / docs | 65 | Reference only. Tone is right; specifics (passport names, score claims) are not canon. |
| Dependency hygiene | 95 | Strong reuse candidate. Lean dep tree, no LLM/telemetry SDKs. |
| Privacy / no-upload posture | 90 | Strong reuse candidate. Already aligns with our invariants. |
| Canon alignment | 30 | Reject. Decision vocabulary and policy semantics differ. |
| Publish readiness | 55 | Reference only. Has `package:dry-run`, MCP registry listing draft, npm listing draft. Useful structure, not the words. |

## 16. Final recommendation

| Disposition | Items |
| --- | --- |
| **Reuse directly (with light rename)** | SSRF guard logic; TrustOps host whitelist; resolver GET-only client skeleton; manifest fetcher size/redirect caps; `forbidden-copy-scanner.mjs`; SSRF + host-whitelist tests. |
| **Reuse after rewrite** | CLI commander layout; GitHub Action wrapper; markdown step-summary pattern; YAML policy file loader; demo agent example; Claude-Desktop config example. |
| **Reference only** | Decision engine structure; JSON output shape; README/PRIVACY/SECURITY tone; LAUNCH_GAPS pattern; marketplace listing drafts. |
| **Reject** | DeepAgent's `ALLOW/DENY/REVIEW/REQUEST` enum; DeepAgent's `REASON_CODES` constants; DeepAgent's "passport" taxonomy and `Financial Authority Passport`-style strings; enforcing policy engine; hard-coded `ECZ-GB-A93K7Q` defaults; "Launch score: 8.7/10" copy; compiled `dist/` content. |

## 17. Instruction for the Phase 7 implementation prompt

When the Phase 7 implementation prompt runs, it MUST observe:

1. The clean scaffold under `src/`, `tests/`, `action.yml`, `package.json`,
   `tsconfig.json`, `vitest.config.ts`, and `docs/` is canon. Phase 7
   builds **on top of** that scaffold.
2. DeepAgent material at `_reference/deepagent_zip_do_not_import/` is
   **reference only**. It is excluded from git, npm, tsc, and vitest.
3. **No file under `_reference/` may be imported, re-exported, or copied
   verbatim** into `src/`, `tests/`, `docs/`, `action.yml`, or
   `package.json`.
4. Any DeepAgent idea that is reused must be **rewritten** into the
   active package under current canon:
   - emit canonical `ResultState` values (the 18 in
     [src/result-states.ts](src/result-states.ts)),
   - emit canonical `ReasonCode` values (the 30 in
     [src/reason-codes.ts](src/reason-codes.ts)),
   - honour `OPEN | PREFER | REQUIRE` policy modes (the verifier
     reports; it does not enforce),
   - preserve every privacy invariant in [src/privacy.ts](src/privacy.ts),
   - keep all network I/O read-only (GET only) and HTTPS-only,
   - never introduce MCP Passport, Reciprocity Passport, KYA tiers,
     `FAILED_VERIFICATION`, or `keyset_hash_public`,
   - never call Backend/Core, never write truth, never activate proof,
     never mark BOUND, never invoke checkout, never add telemetry.
5. Reuse candidates with the highest priority for Phase 7 lift-over
   (after rewrite): SSRF guards, TrustOps host-whitelist pattern,
   resolver GET client skeleton, manifest fetcher caps, markdown
   step-summary in the GitHub Action, and the forbidden-copy scanner
   re-pointed at our overclaim list.
