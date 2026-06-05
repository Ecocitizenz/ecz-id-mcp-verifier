# npm Listing Draft (not yet published)

> Draft only. The package is currently `"private": true` and a
> `prepublishOnly` guard blocks `npm publish`. This draft prepares
> listing copy for a later, separate publishing decision.

## Package

`@ecocitizenz/ecz-id-mcp-verifier`

## One-line description

Local-first, privacy-first verifier for MCP servers, agents, APIs,
packages, repos, container images, and ECZ-IDs. Reports only.

## Long description

ECZ-ID MCP Verifier(TM) is a free local CLI and library that:

- classifies a target deterministically (no LLM),
- optionally performs a read-only GET against the public ECZ-ID
  Resolver,
- emits machine-readable JSON, optional human-readable soft report,
  and an optional local Action Envelope describing routing metadata,
- exposes deterministic exit codes for CI integration,
- ships a GitHub Action wrapper around the same CLI.

The verifier is local-first and privacy-first by construction:

- no source upload,
- no secrets upload,
- no telemetry, analytics, Sentry, or PostHog beacons,
- network is opt-out via `--offline` / `--no-network`,
- local policy decides (`OPEN` / `PREFER` / `REQUIRE`),
- re-check before reliance,
- Backend remains final authority.

## What it does NOT do

- It does not write truth.
- It does not activate proof.
- It does not mark anything BOUND.
- It does not certify that any target is safe, approved, insured,
  or fully compliant.
- It does not perform checkout.
- It does not require an ECZ-ID token for public checks.

## Role split

- **Backend / Core** writes truth.
- **Resolver** projects public proof (read-only).
- **TrustOps** owns setup, acquisition, lifecycle. The verifier routes
  operators here.
- **Developer Gateway** owns docs and education. The verifier routes
  third-party readers here.
- **MCP Verifier** owns local checks, reporting, and routing only.

## Keywords

`ecz-id`, `mcp`, `verifier`, `resolver`, `agent-trust`,
`machine-readable`, `trustops`, `action-envelope`, `local-first`,
`privacy-first`

## Homepage

`https://developers.ecocitizenz.com/mcp`

## License

See `LICENSE_PLACEHOLDER.md` in the package. Final license selection
will be made before any publish.

## Status

Not yet published. Phase 9A distribution-readiness only.
