# Changelog

All notable changes to the ECZ-ID MCP Verifier™ are documented here.
This project is free-forever under the ECZ-ID Proprietary Limited-Use License
(`LICENSE.md`); it is **not** open source.

## [0.7.0] — Release candidate (unreleased)

Release-candidate closure of the deterministic CLI and the bundled GitHub Action.
Not yet published to npm or the GitHub Action Marketplace.

### Changed
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
