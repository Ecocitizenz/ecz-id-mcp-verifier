# Examples

This directory contains example invocations of the ECZ-ID MCP
Verifier(TM) CLI and GitHub Action.

> All examples use placeholder targets (such as `ECZ-GB-EXAMPLE` or
> `https://api.example.com/...`) and mock outputs. Nothing in this
> directory implies that any real target is safe, certified, approved,
> insured, or fully compliant. The verifier does not certify safety.
> Re-check before reliance. Local policy decides.

## Files

- [cli-basic.md](cli-basic.md) - common CLI invocations.
- [cli-policy-modes.md](cli-policy-modes.md) - `OPEN` / `PREFER` /
  `REQUIRE` and `--operator self|third_party|unknown`.
- [github-action.yml](github-action.yml) - workflow that invokes the
  GitHub Action wrapper.
- [json-output-missing-proof.json](json-output-missing-proof.json) -
  illustrative JSON output for a target with no public resolver proof.
- [json-output-resolver-verifiable.json](json-output-resolver-verifiable.json)
  - illustrative JSON output for a resolver-verifiable target (mock).
- [action-envelope-output.json](action-envelope-output.json) -
  illustrative Action Envelope (routing metadata only).

## Privacy posture

The CLI and Action:

- never upload source code,
- never upload secrets, API keys, or environment variables,
- never upload prompts, tool payloads, private logs, or customer data,
- never emit telemetry, analytics, Sentry, or PostHog beacons,
- never write truth, never activate proof, never mark anything BOUND,
- never perform checkout,
- never run autonomous LLM/agent behaviour.
