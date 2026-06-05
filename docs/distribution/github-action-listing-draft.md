# GitHub Action Listing Draft (not yet listed)

> Draft only. No release has been cut. No marketplace listing has been
> activated.

## Name

ECZ-ID MCP Verifier

## Tagline

Local-first verifier for MCP servers, agents, APIs, packages, repos,
container images, and ECZ-IDs. Reports only.

## Description

This Action wraps the ECZ-ID MCP Verifier(TM) CLI inside a node20
GitHub Action.

It is privacy-first by construction:

- never uploads source,
- never uploads secrets,
- never writes truth, activates proof, or marks anything BOUND,
- never performs checkout,
- network is opt-out via `no-network`.

It reports a canonical `result-state` and uppercase `reason-codes`,
plus a routing-only Action Envelope and Acquisition Flow JSON.

## Inputs

- `target` (required) - URL, package, repo, image, or ECZ-ID.
- `target-type` - optional type hint.
- `policy` - local policy mode: `OPEN`, `PREFER`, or `REQUIRE`.
- `operator` - operator role: `self`, `third_party`, or `unknown`.
  Not auto-inferred.
- `resolver-base` - override for the public resolver base URL.
- `no-network` - if `true`, run fully offline.
- `timeout-ms` - timeout for resolver lookups in milliseconds.

## Outputs

- `result-state` - canonical ResultState.
- `reason-codes` - comma-separated canonical ReasonCodes.
- `action-envelope-json` - local Action Envelope JSON (routing only).
- `acquisition-flow-json` - Deterministic Mandated Acquisition Flow JSON.
- `primary-action` - single deterministic next action verb.
- `trustops-action-url` - deterministic TrustOps action URL.
- `developer-guidance-url` - deterministic Developer Gateway guidance URL.

## Usage

See [`examples/github-action.yml`](../../examples/github-action.yml).

## What this Action does NOT do

- It does not certify the target is safe, approved, insured, or
  fully compliant.
- It does not act as a global trust gate.
- It does not perform checkout.
- It does not upload source or secrets.
- It does not emit telemetry.

## Status

Not yet listed on the GitHub Marketplace. Phase 9A readiness only.
