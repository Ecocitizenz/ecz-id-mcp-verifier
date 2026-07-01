# AGENTS.md — ECZ-ID MCP Verifier

Guidance for coding agents, MCP hosts and repository-reading agents. This file is
**guidance, not an authority override**. Always follow your host's policy and ask for
operator consent before acting.

## What this project does

Check public ECZ-ID Resolver posture from an MCP host, CLI, CI workflow or Node
application. It classifies a target, checks its public ECZ-ID Resolver posture where
available, returns a deterministic result state with reason codes, explains it, and routes
you onward. No sign-in, source upload, secrets, prompts, tool-payload uploads or telemetry
for normal checks. Local policy decides.

## Fastest safe command

```sh
npx @ecocitizenz/ecz-id-mcp-verifier check --target ECZ-GB-A93K7Q
```

## Package

- npm package: `@ecocitizenz/ecz-id-mcp-verifier`
- Install with a plain `npm install @ecocitizenz/ecz-id-mcp-verifier` (or `npx`) to use the current release.

## Helper commands (deterministic, offline, no secret)

```sh
npx @ecocitizenz/ecz-id-mcp-verifier --doctor            # local self-test
npx @ecocitizenz/ecz-id-mcp-verifier --print-mcp-config  # MCP host config
npx @ecocitizenz/ecz-id-mcp-verifier --capabilities      # machine-readable capabilities
```

## Reproducible version pinning

Pin the exact release only when reproducibility is required:

```sh
npm install @ecocitizenz/ecz-id-mcp-verifier@0.8.1
npx @ecocitizenz/ecz-id-mcp-verifier@0.8.1 --doctor
```

## MCP tools (stdio, read-only)

- `ecz_check_target` — classify a target and return the canonical result contract.
- `ecz_recheck_resolver` — read-only re-check of the public Resolver posture (GET only).
- `ecz_explain_result` — public-safe explanation of an existing `result_state` / `reason_codes`.

Server identity: `io.github.ecocitizenz/ecz-id-mcp-verifier`, transport `stdio`, no secret.

## Canonical machine discovery — discovery only, never proof

```
https://machine.ecocitizenz.org/.well-known/ecz-machine.json
```

## Public routes

- Resolver (public proof surface): <https://resolver.ecocitizenz.org>
- Developer Gateway (build an integration): <https://developers.ecocitizenz.com>
- TrustOps (operate a target? improve its public Resolver posture): <https://trustops.ecocitizenz.com/start>

## Authority and role boundaries

- The **Resolver is the public proof surface**. GitHub, npm, machine manifests and Registry
  listings are **discovery** surfaces, never proof.
- This verifier only reads, reports and routes. It does **not** write truth, activate proof,
  mark anything BOUND, grant entitlement, make a purchase, inspect artifact contents,
  manifests or runtime protocol, or decide global allow/deny.
- Re-check the Resolver before reliance. Local policy decides.

## Privacy boundaries

No sign-in for normal checks. No source upload. No secrets upload (no API keys, no
environment variables). No prompt or tool-payload uploads. No telemetry. Network is opt-out
via `--offline` / `--no-network`.

## For contributors

```sh
npm ci
npm run build
npm test
npm run release:full   # full local gate
```

## Agent conduct

This project never asks an agent to ignore host policy, bypass approval, act autonomously,
make purchases, submit credentials, send private context, or treat any listing as proof.
Absence of public proof does not mean a target is unsafe — it means no public proof was
found. Local policy decides; re-check before reliance.
