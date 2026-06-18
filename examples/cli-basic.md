# CLI — basic examples

> Example invocations only. Outputs are illustrative. The verifier does
> not certify safety or approval. Re-check before reliance. Local policy
> decides.

All examples use placeholder targets such as `ECZ-GB-A93K7Q` or
`https://api.example.com/...`. No real customer proof is implied.

## Help and version

```sh
ecz-mcp-verify --help
ecz-mcp-verify --version
```

## Offline classification

Runs deterministic classification only. No network is touched.

```sh
ecz-mcp-verify --target "ECZ-GB-A93K7Q" --offline
```

## ECZ-ID target, default OPEN policy

```sh
ecz-mcp-verify --target "ECZ-GB-A93K7Q"
```

## MCP server well-known URL

```sh
ecz-mcp-verify --target "https://api.example.com/.well-known/ecz-mcp.json"
```

## GitHub repo target with human-readable soft report

```sh
ecz-mcp-verify --target "https://github.com/example-org/example-repo" --report
```

## npm package target with JSON + action envelope

```sh
ecz-mcp-verify --target "pkg:npm/example-package@1.0.0" --actions
```

## Write JSON + SARIF for CI

```sh
ecz-mcp-verify --target "ECZ-GB-A93K7Q" \
  --output result.json \
  --sarif result.sarif
```

## What the verifier never does

- Never writes truth.
- Never activates proof.
- Never marks anything BOUND.
- Never uploads source, secrets, prompts, tool payloads, private logs,
  or customer data.
- Never emits telemetry, analytics, Sentry, or PostHog beacons.
