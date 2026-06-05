# Package Readiness Report (Phase 9A)

## Status

Distribution-readiness local package. **Not published. Not deployed.**

- `package.json` -> `"private": true` retained.
- `prepublishOnly` guard retained (exits non-zero on any publish).
- No `npm publish` run.
- No GitHub release cut.
- No git push performed for this phase.
- No telemetry, analytics, Sentry, or PostHog beacons introduced.
- No checkout, payment, or proof activation introduced.
- No MCP Passport or Reciprocity Passport introduced.
- No autonomous LLM/agent behaviour introduced.

## Package metadata (`package.json`)

- `name` = `@ecocitizenz/ecz-id-mcp-verifier`
- `version` = `0.7.0`
- `private` = `true`
- `description` populated.
- `bin` entries: `ecz-id-mcp-verifier`, `ecz-mcp-verify` -> `dist/cli.js`.
- `files` allow-list: `dist`, `action.yml`, `README.md`,
  `LICENSE_PLACEHOLDER.md`, `docs/ROLE_SPLIT.md`, `docs/PRIVACY.md`,
  `examples`.
- `keywords` populated.
- `author` = `EcoCitizenZ`.
- `license` = `SEE LICENSE IN LICENSE_PLACEHOLDER.md`.
- `homepage` = `https://developers.ecocitizenz.com/mcp`.
- `repository` / `bugs` intentionally omitted (no fake URL).
- `prepublishOnly` guard retained.

## GitHub Action (`action.yml`)

- Runs on `node20`, main `dist/cli.js`.
- Inputs: `target`, `target-type`, `policy`, `operator`,
  `resolver-base`, `no-network`, `timeout-ms`.
- Outputs: `result-state`, `reason-codes`, `action-envelope-json`,
  `acquisition-flow-json`, `primary-action`, `trustops-action-url`,
  `developer-guidance-url`.

## Examples added

- `examples/README.md` (rewritten)
- `examples/cli-basic.md`
- `examples/cli-policy-modes.md`
- `examples/github-action.yml`
- `examples/json-output-missing-proof.json`
- `examples/json-output-resolver-verifiable.json`
- `examples/action-envelope-output.json`

## Listing drafts added

- `docs/distribution/npm-listing-draft.md`
- `docs/distribution/github-action-listing-draft.md`
- `docs/distribution/mcp-registry-listing-draft.md`
- `docs/distribution/release-checklist.md`
- `docs/distribution/copy-safety-checklist.md`
- `docs/distribution/package-readiness-report.md` (this file)

## Role-split compliance (locked)

- Backend / Core - not modified, not called.
- Resolver - not modified, read-only GET surface only.
- TrustOps - not modified, route-only target.
- Developer Gateway - not modified, route-only target.
- Shopify / WS4 - not modified.
- MCP Verifier scope - unchanged: local check, report, Action
  Envelope, guidance, routing only.

## Remaining gaps for Phase 9B

- Real npm registry account and publishing decision.
- Real GitHub Marketplace listing decision.
- Real MCP registry schema alignment and submission.
- Final license selection (replace `LICENSE_PLACEHOLDER.md`).
- Decide whether to populate `repository` and `bugs` once a public
  repo URL is fixed.
- Tagging / release / publish workflow gating.

Phase 9A does not perform any of the above.
