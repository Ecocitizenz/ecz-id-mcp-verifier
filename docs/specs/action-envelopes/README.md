# ECZ-ID Action Envelope Stack™ — Shared Schema Contract

Local, reusable schema contract for the ECZ-ID result-actions. These specs are the
single source of truth (SSOT) for the **route-only, read-only** guidance objects
emitted by owned surfaces (MCP Verifier, GitHub Action, and — by reference —
Developer Gateway docs, Resolver action metadata, future VS Code / Shopify
readiness app).

**These schemas describe metadata only. Nothing here writes truth, activates
proof, sets BOUND, processes purchase, or implies certification.**

> Backend writes truth. TrustOps handles setup. Resolver proves. Machines re-check.

## Doctrine

- Resolve the server. Resolve the agent. Resolve the counterparty.
- Re-check before reliance. Local policy decides.
- Marketplace-native entitlement truth is forbidden.
- Payment is not proof. Backend binding/provisioning is required before Resolver
  status changes.

## Role boundaries (authority_boundary)

| Component | Owns | Envelopes may |
| --- | --- | --- |
| Backend / Core | Writing canonical truth | Never write. |
| TrustOps | Acquisition, setup, lifecycle, support, repair | Route users to. |
| Resolver | Public read-only proof + machine JSON/action metadata | Read only. |
| Developer Gateway | Docs, schemas, examples, routing | Route users to. |
| MCP Verifier / extensions / actions | Discover, check, educate, emit local result states, route | This. |

## The stack

1. **Resolver Action Envelope™** — universal public proof/action metadata.
   → [`resolver-action-envelope.schema.json`](resolver-action-envelope.schema.json)
2. **MCP Action Envelope™** — MCP/tool/server posture improvement path.
   → [`mcp-action-envelope.schema.json`](mcp-action-envelope.schema.json)
3. **Agent Action Envelope™** — agent/KYA/operator/principal posture path.
   → [`agent-action-envelope.schema.json`](agent-action-envelope.schema.json)
4. **Reciprocal Reliance Envelope™** — both-sides agent ↔ MCP/tool context.
   → [`reciprocal-reliance-envelope.schema.json`](reciprocal-reliance-envelope.schema.json)

Plus:

- **Request-to-Resolve™ local guidance packet**
  → [`request-to-resolve.schema.json`](request-to-resolve.schema.json)
- **Resolver Re-check Contract**
  → [`resolver-recheck-contract.schema.json`](resolver-recheck-contract.schema.json)

> Product, pricing and acquisition manifests are TrustOps-owned and are **not**
> published in this public spec set. Owned surfaces route to TrustOps via an
> opaque setup handoff; they never embed product catalogues, pricing or
> recommendation logic.

## Common fields (every envelope)

`type`, `version`, `subject`, `posture`/`result`, `missing_evidence`,
`recommended_path`, `actions`, `authority_boundary`, and the read-only boundary
flags: `local_policy_decides: true`, `recheck_before_reliance: true`,
`no_safety_or_approval_inference: true`, and (where applicable)
`verifier_writes_truth: false`, `verifier_activates_proof: false`,
`verifier_marks_bound: false`.

## Examples

See [`examples/`](examples/): unresolved MCP, unresolved agent, resolved MCP /
unresolved agent, both resolver-verifiable, both unresolved.

## Notes on local packets

Request-to-Resolve packets generated locally must set `signed_request: false`
and `server_side_status: "not_created_by_cli"` until a real backend signing
endpoint exists and is tested. Do not claim local packets are signed or
rate-limited.

## Validation

Schemas are JSON Schema 2020-12. The MCP Verifier ships structural tests
(`tests/result-actions.test.ts`); full JSON-Schema validation (e.g. via `ajv`) is
intentionally not wired here to avoid adding dependencies. Reference only.
