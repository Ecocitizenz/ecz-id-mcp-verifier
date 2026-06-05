# Release Checklist (not yet released)

> This checklist is preparation only. Do not execute any "publish" or
> "release" step from this document during Phase 9A.

## Locked guardrails (must remain TRUE through Phase 9A)

- [ ] `package.json` has `"private": true`.
- [ ] `package.json` has a `prepublishOnly` script that exits non-zero.
- [ ] No `npm publish` has been run.
- [ ] No GitHub release has been cut.
- [ ] No git push has occurred for this phase.
- [ ] No marketplace listing has been activated.
- [ ] No telemetry / analytics added.
- [ ] No autonomous LLM/agent behaviour added.
- [ ] No MCP Passport or Reciprocity Passport introduced.
- [ ] No checkout, payment, or proof activation in active `src/`.
- [ ] Backend/Core, Resolver, TrustOps, Developer Gateway, Shopify/WS4
      were NOT modified.

## Pre-publish readiness (Phase 9A scope)

- [x] `package.json` name, version, description, bin, files allow-list,
      keywords, author, license, homepage are populated.
- [x] `action.yml` declares all required inputs and outputs.
- [x] `dist/cli.js` is produced by `npm run build`.
- [x] `README.md` covers: what it does / what it does not do, role
      split, install/use, offline example, policy modes, operator
      modes, JSON output, Action Envelope, GitHub Action, privacy,
      TrustOps routing, Developer Gateway routing, Resolver posture,
      exit codes, no-certification statement, status.
- [x] Examples directory contains CLI, Action, and JSON output
      examples using mock targets only.
- [x] Distribution listing drafts exist and are copy-safe.
- [x] Forbidden overclaim copy is absent from active source and docs.
- [x] `_reference/` is ignored and not imported anywhere.
- [x] `npm run test`, `npm run typecheck`, and `npm run build` pass.
- [x] `scripts/prove_phase_9a_distribution_readiness.ps1` passes.

## Out-of-scope until later phases

- Live npm registry account selection and publishing.
- Live GitHub Marketplace listing.
- Live MCP registry submission (schema alignment).
- Final license selection.
- Real GitHub release tagging and version bumps.

## Never-actions (regardless of phase)

- The verifier never writes truth.
- The verifier never activates proof.
- The verifier never marks anything BOUND.
- The verifier never performs checkout.
- The verifier never uploads source, secrets, prompts, tool payloads,
  private logs, raw telemetry, or customer data.
- The verifier never certifies safety, approval, insurance, or
  compliance.
