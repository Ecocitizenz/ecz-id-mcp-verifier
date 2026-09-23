# Changelog

All notable changes to the ECZ-ID MCP Verifier™ are documented here.
This project is free-forever under the ECZ-ID Proprietary Limited-Use License
(`LICENSE.md`); it is **not** open source.

## [0.9.1] — Cold-Core Reliability

A verification that could not reach Core reported `unavailable`. That is the
truthful state and it has not changed. What was wrong is that Core was reachable
— it was simply cold — and the lookup gave up before it answered.

### Fixed

- **A cold Core no longer loses a good projection.** Core's public projection was
  measured at **28.7 s cold** and 1.1–3.1 s warm, against a single attempt with a
  **5 s** timeout. The first verification a new developer ever ran — the one most
  likely to find Core cold — reported `unavailable` for a record that was
  perfectly good. Three warm production reads measured 4,984 / 2,879 / 3,126 ms:
  the first came within **16 ms** of the old limit, so the margin was gone in
  ordinary operation, not only on a cold start.

- **The lookup is now retried under three simultaneous bounds**: a **10 s**
  per-attempt timeout (an attempt is clipped to whatever remains of the budget),
  at most **3** attempts, and a **32 s** overall wall-clock budget that is never
  exceeded. The lookup is a pure, side-effect-free GET with no body and no
  credentials, so re-issuing it is not a write and violates no idempotency
  contract.

- **A definite answer is never re-requested.** Only transport failures and the
  transient codes `429`, `502`, `503` and `504` are retried. `2xx`, `404`, `410`
  and a `500` the server chose to return are each reported on the first attempt,
  exactly as before.

- **Proof interpretation is untouched.** Retrying cannot turn a revoked,
  suspended or expired record into proof, and when every attempt fails the state
  is still the truthful `unavailable`, with no proof claimed either way.

- **Callers no longer silently pin the timeout.** `verify.ts` resolved an absent
  `--timeout-ms` to the old 5 s constant and passed it down explicitly, so a new
  transport default would have been overridden by its own caller. `action.yml`
  did the same by another route: a declared Action input default is always
  materialised by the runner, so the adapter always passed `--timeout-ms 5000`
  and **every GitHub Action user kept a 5 s attempt**. Measured against the real
  28.7 s cold start, that pin turned one wasted provider call into three and
  still answered `unavailable`. The input keeps its name and still works when set
  deliberately; it no longer declares a default.

### Changed

- `--timeout-ms` is documented, in the CLI help and the README, as the
  **per-attempt** timeout, alongside the attempt cap and the total budget. The
  previous copy advertised a 5,000 ms network timeout, which told a relying party
  the lookup gives up after 5 s — so an `unavailable` result read as a settled
  answer rather than a budget that can be raised.

### Cost

The fix costs **no extra provider call when Core answers**: a warm read is one
call, exactly as before. The worst case is bounded at **3 calls within 32 s**.

## [0.9.0] — MCP 2026-07-28 Edition

The MCP implementation moves from the monolithic `@modelcontextprotocol/sdk` v1
line to the official SDK v2 packages, and MCP protocol revision `2026-07-28` is
adopted explicitly.

### Protocol

- **MCP `2026-07-28` supported.** Previously a client requesting `2026-07-28` was
  silently downgraded to `2025-11-25` with no error or warning. It is now served
  at `2026-07-28`.
- **Dual-era by design.** A modern opening (per-request `_meta`, no handshake) is
  served statelessly at `2026-07-28`; an `initialize` opening is served at the
  negotiated 2025-era revision exactly as before. All five previously supported
  legacy revisions — `2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05`,
  `2024-10-07` — are retained.
- **`server/discover` implemented**, as the revision requires of servers.
- **Unsupported and malformed protocol revisions are now refused** with
  `-32022 UnsupportedProtocolVersion`, naming the versions the server supports,
  instead of being silently downgraded.
- **`resultType`** on modern results.
- **Cache hints** (`ttlMs` / `cacheScope`) on the two cacheable operations,
  `server/discover` and `tools/list`, and on nothing else. Tool results are not
  cacheable under the revision and carry no cache fields.

### Tools

- **`outputSchema` and `structuredContent`** on all three tools. The serialised
  JSON text block is retained for backwards compatibility; there is one canonical
  internal result object rendered twice, and the release gate asserts the two are
  byte-identical.
- The read-only boundary (`verifier_writes_truth`, `verifier_activates_proof`,
  `verifier_marks_bound`) is now expressed as `const` constraints in the
  **published** output schema, so a client can see it from `tools/list` alone.

### Dependencies

- `@modelcontextprotocol/sdk` `1.29.0` → `@modelcontextprotocol/server` `^2.0.0`.
- `@modelcontextprotocol/client` `^2.0.0` added as a **dev** dependency (used only
  by proof scripts, which are not packaged).
- `zod` `3.25.76` → `^4.2.0`, required by SDK v2. Tool input schemas consequently
  emit JSON Schema 2020-12 rather than draft-07; both are valid under the
  specification.

### Unchanged

The three tool names, 18 ResultStates, 31 ReasonCodes, `OPEN`/`PREFER`/`REQUIRE`
policy modes, Resolver GET-only access, `offline` zero-egress, stderr-only
diagnostics, and the absence of resources, prompts, sampling, roots, logging and
elicitation. A golden semantic suite covering every lifecycle state is
byte-identical before and after the migration.

### Release gates added

- `proof:wire-matrix` — dual-era wire conformance against the built server.
- `proof:golden` — golden semantic regression.
- Bounded retry on the live official-schema fetch in `validate:server-json`.

## [0.8.2] — Official Registry Edition

Canonical GitHub namespace alignment for Official MCP Registry discovery, with
unified latest-first onboarding. Verifier behaviour, MCP contracts, privacy
boundaries and local-policy control remain consistent.

### Changed
- **MCP Registry identity** now uses the canonical GitHub login casing:
  `package.json.mcpName` and `server.json.name` are
  `io.github.Ecocitizenz/ecz-id-mcp-verifier`, matching the GitHub namespace for
  Official MCP Registry publishing. The runtime MCP server name
  (`ecz-id-mcp-verifier`) and the npm package name
  (`@ecocitizenz/ecz-id-mcp-verifier`) are unchanged.
- Version synchronised to `0.8.2` across package metadata, the runtime constant,
  `--version`, the MCP initialize version, capabilities, tests and examples.
- Public documentation ships the latest-first onboarding (plain `npm install` /
  `npx` primary; exact `@0.8.2` pin is secondary reproducibility guidance).

### Unchanged
- Classifier, target-shape rules, Resolver requests, result states, reason codes,
  policy modes, exit codes, the three read-only MCP tools and their schemas, and
  the GitHub Action behaviour are byte-for-byte preserved. No telemetry; no
  source/secret/prompt/tool-payload upload.

## [0.8.1] — Launch Edition

Adoption and onboarding release. The deterministic Resolver-posture model,
result states, reason codes, policy modes, privacy boundaries and local-policy
behaviour are unchanged and fully preserved.

### Added
- **Clear release-channel guidance** across the README and examples: install with
  the package name for the current release, or pin an exact `@<version>` for
  reproducibility.
- **`--doctor`** — a local self-test (no network, no secret) that confirms a
  healthy install: version, CLI aliases, MCP server, offline verify and privacy
  posture.
- **`--capabilities`** — a machine-readable capability profile
  (`ecz-resolver-posture-v1`) describing supported target types, result states,
  outputs, exit codes, MCP tools, privacy posture and explicit scope flags.
- **`--print-mcp-config`** — prints a ready-to-paste MCP host configuration.
- **Canonical machine-discovery pointer** in the public routes
  (`https://machine.ecocitizenz.org/.well-known/ecz-machine.json`) — read-only
  discovery, never proof.
- **Release-state copy gate** (`check:release-state-copy`, part of
  `release:full`) that keeps public release-channel wording timeless.
- Common-workflows guide and expanded onboarding for CLI, CI, MCP hosts and the
  Node library.

### Unchanged
- Verifier engine, classification, Resolver route/semantics, result states,
  reason codes, policy modes, exit codes, MCP tool contracts and package/server
  identity are byte-for-byte preserved. No telemetry; no source/secret/prompt/
  tool-payload upload.

## [0.8.0] — MCP stdio server

Added a read-only MCP stdio server exposing exactly three tools
(`ecz_check_target`, `ecz_recheck_resolver`, `ecz_explain_result`), each
delegating to the same canonical verifier core. Pinned MCP SDK + Zod, added
`server.json` Registry metadata, a hardened OIDC trusted-publishing workflow with
published provenance and a CycloneDX SBOM, and a cross-platform installed-package
proof matrix (Windows/Linux/macOS on Node 22.14 and 24). Published to npm with
published provenance.

## [0.7.1] — GitHub Marketplace metadata-compliance patch

Metadata-only patch so the bundled GitHub Action passes GitHub Marketplace
validation. The immutable `v0.7.0` release, its npm package and its published
bytes are unchanged.

### Changed
- **Action description shortened** to 114 characters (was 204) to satisfy the
  Marketplace ≤125-character limit. New `action.yml` description:
  "Local-first, privacy-first ECZ-ID verifier for MCP, agents and APIs. No source
  upload, telemetry or truth-writing."
- **Author capitalisation** corrected to `EcoCitizenz`.
- **Version** bumped to `0.7.1` (package metadata, CLI `--version` output, README
  examples, Action usage reference `Ecocitizenz/ecz-id-mcp-verifier@v0.7.1`).

### Not changed
- No functional, identifier (33-code public registry), Resolver route/semantics,
  policy (OPEN/PREFER/REQUIRE), privacy, output, or setup-handoff changes.
- `v0.7.0` tag/release/npm bytes are immutable and untouched.

## [0.7.0] — Deterministic CLI and GitHub Action baseline

Established the deterministic CLI and the bundled GitHub Action as the stable
baseline for the ECZ-ID Resolver-posture verifier.

### Changed
- **Exact ECZ-ID format validation.** A single deterministic parser
  (`src/ecz-id.ts`) is the source of truth for identifier format across target
  classification, Resolver eligibility, URL construction, CLI input and the
  Action. Parent IDs are exactly `ECZ-CC-XXXXXX` (two uppercase letters + six
  uppercase Base36); child passport instances are
  `ECZ-CC-XXXXXX::PASSPORT_CODE-YYYYYY` with an exactly six-character instance
  suffix split off the final hyphen (hyphenated passport codes parse correctly).
  `PASSPORT_CODE` is validated against the **complete locked 33-code public
  passport-number registry** (the Final Canonical Registry; e.g. `AGENT`, `SSCM`,
  `D1-DRONE`, …, `CRITICAL-INFRA`, `LIC-INFRA`). Backend semantic registry keys
  (e.g. `AGENT_CREDENTIAL`, `IROBOT`, `D1`) and obsolete earlier-taxonomy codes
  (e.g. `DATA-EXCHANGE`) are **not** accepted as public child codes; a separate
  internal public→backend mapping is provided that never affects public validity.
  Malformed IDs (e.g. `ECZ-GB-EXAMPLE`) are rejected and never trigger a fetch.
- **Decomposed child Resolver routes.** A parent resolves to `…/p/{parent}`; a
  child resolves to the decomposed external form
  `…/p/{parent}/{passport_code}/{instance_suffix}` (never a percent-encoded
  internal child ID). No child machine-JSON endpoint is documented/proven, so a
  child reports `machine_json_url: null`; the parent machine JSON is retained.
- **Resolver lifecycle parsing.** The machine projection body is now parsed with
  strict, bounded rules. HTTP 200 alone is never proof; revoked / suspended /
  expired / stale / degraded / abuse / subject-mismatch / malformed /
  unknown-schema responses each map deterministically to the safest applicable
  ResultState + ReasonCode and are never treated as positive proof or cached as
  success. Only an explicit active projection for the requested subject yields
  `RESOLVER_VERIFIABLE`.
- **Public terminology.** Internal-named modules were renamed to purpose-first,
  public-safe names across source, compiled output, exports, tests, examples and
  Action outputs. The result-routing module is now `result-actions`; the TrustOps
  routing module is now `setup-handoff`; the JSON field is `setup_handoff`; the
  Action output is `setup-handoff-json`.
- **Resolver route contract.** The client resolves only valid ECZ-IDs to the
  canonical human proof URL `/p/{ecz_id}` and machine JSON
  `https://api.ecocitizenz.com/api/p/{ecz_id}.json`. It never fabricates a
  Resolver path from an arbitrary URL, repository, package or free-text target,
  and never reports missing proof without a real canonical lookup.
- **Licence / publication posture.** Adopted a free-forever Proprietary
  Limited-Use posture (superseding the earlier pre-publication hold). The package
  is intentionally publishable: `private` removed, `publishConfig` (public +
  provenance) added, and the deliberate publish-blocker replaced with a real
  `release:check` gate.

### Removed
- Removed the TrustOps product/pricing manifest and its schema from public
  source. Pricing and product catalogues are TrustOps-owned and never ship in
  public packages or source; they were relocated to private internal records.

### Added
- `RESOLVER_RESPONSE_UNVERIFIABLE` reason code for a 2xx Resolver body that
  cannot be safely interpreted as valid proof (malformed, unknown schema,
  subject mismatch, or unknown lifecycle state). The 18-state ResultState model
  is unchanged.
- `scan:public` disclosure scanner and a `public-disclosure` test guard
  (no internal-strategy terminology, no pricing, no private commercial logic in
  public surfaces).
- Local GitHub Action harness (`harness:action`) — no network, no repo mutation.
- CI workflow (read-only) and a prepared-but-disabled npm Trusted-Publishing
  (OIDC) workflow.
- GitHub Action step summary; documented minimum permissions (`contents: read`).

### Security / privacy
- 0 production runtime dependencies; no install/prepare lifecycle hooks.
- No source maps, secrets, absolute paths, or internal material in the npm
  tarball. No telemetry. No source/secret/prompt/tool-payload upload.

[0.9.1]: https://github.com/Ecocitizenz/ecz-id-mcp-verifier/releases/tag/v0.9.1
[0.9.0]: https://github.com/Ecocitizenz/ecz-id-mcp-verifier/releases/tag/v0.9.0
[0.8.2]: https://github.com/Ecocitizenz/ecz-id-mcp-verifier/releases/tag/v0.8.2
[0.8.1]: https://github.com/Ecocitizenz/ecz-id-mcp-verifier/releases/tag/v0.8.1
[0.8.0]: https://github.com/Ecocitizenz/ecz-id-mcp-verifier/releases/tag/v0.8.0
[0.7.1]: https://github.com/Ecocitizenz/ecz-id-mcp-verifier/releases/tag/v0.7.1
[0.7.0]: https://github.com/Ecocitizenz/ecz-id-mcp-verifier/releases/tag/v0.7.0
