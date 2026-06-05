# Phase 7 Implementation Notes

This scaffold deliberately stops short of a working verifier. The
Phase 7 implementation prompt will fill in:

- Real target classification in `src/classify-target.ts`.
- Read-only resolver lookups in `src/resolver-client.ts` (with
  `no-network` and `timeout-ms` honoured).
- A real `verify()` function exported from `src/index.ts` that returns
  an `ActionEnvelope` populated with a canonical `ResultState` and zero
  or more canonical `ReasonCode` values.
- A real CLI in `src/cli.ts` that parses arguments matching the
  GitHub Action inputs in `action.yml`.
- Human and JSON output renderers in `src/output.ts`.
- Routing logic that emits `RESOLVER`, `TRUSTOPS`, or
  `DEVELOPER_GATEWAY` URLs from the canonical constants only.

Boundaries that Phase 7 MUST preserve:

- No writes to Backend/Core.
- No writes to Resolver (read-only).
- No calls into TrustOps beyond routing the user there.
- No Developer Gateway side effects beyond routing.
- No Shopify / WS4 changes.
- No checkout, no payment.
- No `activate_proof`, no `markBound`.
- No MCP Passport, no Reciprocity Passport.
- No autonomous LLM/agent behaviour.
- No telemetry, no source upload, no secrets upload.
