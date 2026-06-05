# MCP-style Registry Listing Draft (not yet registered)

> Generic metadata draft only. This draft is NOT bound to any specific
> external registry schema. The real schema alignment is TODO for
> Phase 9B (live registry / account alignment).

## Identifier

`io.ecocitizenz.ecz-id-mcp-verifier`

## Display name

ECZ-ID MCP Verifier

## Type

Local CLI / Library / GitHub Action.

This package is a **verifier**. It is not itself an MCP server. It
checks MCP servers (and other targets) and reports.

## Summary

Local-first, privacy-first verifier for MCP servers, agents, APIs,
packages, repos, container images, and ECZ-IDs. Reports only. Reads
the public ECZ-ID Resolver. Does not write truth, activate proof, or
mark BOUND.

## Capabilities

- Deterministic target classification (no LLM).
- Read-only resolver posture check (GET-only, HTTPS).
- Machine-readable JSON output.
- Optional human-readable soft report.
- Optional local Action Envelope (routing metadata only).
- Local policy modes: `OPEN`, `PREFER`, `REQUIRE`.
- Deterministic CI exit codes.
- Offline mode (`--offline` / `--no-network`).

## Non-capabilities

- Does not certify safety, approval, insurance, or compliance.
- Does not write to the Resolver.
- Does not call Backend/Core.
- Does not perform checkout.
- Does not run autonomous LLM/agent behaviour.
- Does not emit telemetry.
- Does not upload source, secrets, prompts, tool payloads, private
  logs, or customer data.

## Trust posture

- Backend remains final authority.
- Resolver is the only public proof surface.
- Local policy decides.
- Re-check before reliance.
- The verifier is a reader and reporter, not an authority.

## Routing

- Operators (`--operator self`) are routed to TrustOps:
  `https://trustops.ecocitizenz.com/start`.
- Third-party readers (`--operator third_party`) are routed to
  Developer Gateway: `https://developers.ecocitizenz.com`.

## Homepage

`https://developers.ecocitizenz.com/mcp`

## License

See `LICENSE_PLACEHOLDER.md`. Final license TBD.

## Status

Not yet registered. Schema alignment TODO in Phase 9B.
