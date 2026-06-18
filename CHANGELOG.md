# Changelog

All notable changes to the ECZ-ID MCP Verifier™ are documented here.
This project is free-forever under the ECZ-ID Proprietary Limited-Use License
(`LICENSE.md`); it is **not** open source.

## [0.7.0] — Release candidate (unreleased)

Release-candidate closure of the deterministic CLI and the bundled GitHub Action.
Not yet published to npm or the GitHub Action Marketplace.

### Changed
- **Exact ECZ-ID format validation.** A single deterministic parser
  (`src/ecz-id.ts`) is the source of truth for identifier format across target
  classification, Resolver eligibility, URL construction, CLI input and the
  Action. Parent IDs are exactly `ECZ-CC-XXXXXX` (two uppercase letters + six
  uppercase Base36); child passport instances are
  `ECZ-CC-XXXXXX::PASSPORT_CODE-YYYYYY` with an exactly six-character instance
  suffix split off the final hyphen (hyphenated passport codes parse correctly).
  `PASSPORT_CODE` is validated against the locked **public passport-number code**
  registry (e.g. `AGENT`, `SSCM`, `D1-DRONE`) from the Passport Number's SSOT;
  backend semantic registry keys (e.g. `AGENT_CREDENTIAL`) are **not** accepted
  as public child codes (a separate internal public→backend mapping is provided).
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

[0.7.0]: https://github.com/Ecocitizenz/ecz-id-mcp-verifier/releases/tag/v0.7.0
