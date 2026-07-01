# Changelog

All notable changes to the ECZ-ID MCP Verifier™ are documented here.
This project is free-forever under the ECZ-ID Proprietary Limited-Use License
(`LICENSE.md`); it is **not** open source.

## [0.8.1] — Launch Edition

Adoption and onboarding release. The deterministic Resolver-posture model,
result states, reason codes, policy modes, privacy boundaries and local-policy
behaviour are unchanged and fully preserved.

### Added
- **Timeless release-channel guidance** across the README and examples: use the
  package name without a tag for the stable release, `@next` for the current
  candidate, or `@<version>` for exact reproducibility — accurate in every
  registry state.
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
proof matrix (Windows/Linux/macOS on Node 22.14 and 24). Published to npm on the
`next` channel with provenance; `latest` stays on the current stable release.

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

[0.8.1]: https://github.com/Ecocitizenz/ecz-id-mcp-verifier/releases/tag/v0.8.1
[0.8.0]: https://github.com/Ecocitizenz/ecz-id-mcp-verifier/releases/tag/v0.8.0
[0.7.1]: https://github.com/Ecocitizenz/ecz-id-mcp-verifier/releases/tag/v0.7.1
[0.7.0]: https://github.com/Ecocitizenz/ecz-id-mcp-verifier/releases/tag/v0.7.0
