# Action Envelope Stack™ — Example instances

Illustrative, mock-data instances of the route-only envelopes. **Examples only.**
Nothing here is a real customer proof, and nothing here certifies safety or
approval. Resolver-verifiable proof is public proof metadata, not a verdict.

| File | Scenario | Schema |
| --- | --- | --- |
| [`mcp-unresolved.json`](mcp-unresolved.json) | MCP server, no public resolver proof yet | `mcp-action-envelope.schema.json` |
| [`agent-unresolved.json`](agent-unresolved.json) | Agent manifest, no public resolver proof yet | `agent-action-envelope.schema.json` |
| [`reciprocal-mcp-resolved-agent-unresolved.json`](reciprocal-mcp-resolved-agent-unresolved.json) | MCP resolved / agent unresolved | `reciprocal-reliance-envelope.schema.json` |
| [`reciprocal-both-resolved.json`](reciprocal-both-resolved.json) | Both resolver-verifiable | `reciprocal-reliance-envelope.schema.json` |
| [`reciprocal-both-unresolved.json`](reciprocal-both-unresolved.json) | Both unresolved | `reciprocal-reliance-envelope.schema.json` |
| [`resolver-recheck-contract.json`](resolver-recheck-contract.json) | Re-check semantics instance | `resolver-recheck-contract.schema.json` |

## Reciprocal composition

The MCP Verifier emits a single-subject reciprocal envelope per target it
checks. A **both-sides** Reciprocal Reliance Envelope (both `agent_subject` and
`mcp_subject` populated) is composed by running two single-target checks and
merging them. ECZ-ID never decides whether an agent may spend, transact, or call
tools — `external_authorisation` is always `not_determined_by_eczid`.

> Backend writes truth. TrustOps handles setup. Resolver proves. Machines re-check.
