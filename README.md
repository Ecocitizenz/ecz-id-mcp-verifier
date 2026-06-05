# ECZ-ID MCP Verifier(TM)

Local-first, privacy-first verifier package for MCP servers, agents, APIs,
packages, repos, container images, and ECZ-IDs.

This package **only reads, reports, and routes**. It never writes truth,
activates proof, marks anything BOUND, or performs checkout.

## What this package does

- Classifies a target deterministically (no LLM).
- Optionally GETs the public Resolver / machine JSON for that target.
- Reports a canonical `ResultState` and uppercase `ReasonCode`s.
- Emits JSON, an optional human-readable soft report, and an optional
  local Action Envelope describing routing-only metadata.
- Exposes deterministic exit codes for CI integration.
- Ships a GitHub Action wrapper around the same CLI.

## What this package does not do

- It does **not** write truth.
- It does **not** activate proof.
- It does **not** mark anything BOUND.
- It does **not** certify the safety of any server, agent, product, or API.
- It does **not** approve agents.
- It does **not** decide global trust.
- It does **not** upload source code.
- It does **not** upload secrets, API keys, prompts, or tool payloads.
- It does **not** emit telemetry, analytics, Sentry, or PostHog beacons.
- It does **not** call Backend/Core.
- It does **not** write to the Resolver.
- It does **not** call TrustOps as a verifier backend.
- It does **not** perform checkout.
- It does **not** create a client-side trust badge.
- It does **not** issue a reusable trust credential.
- It does **not** infer safety or approval state for any third party.
- It does **not** run autonomous LLM or agent behaviour.

## Role split

| Component         | Owns                                          | This verifier may   |
| ----------------- | --------------------------------------------- | ------------------- |
| Backend / Core    | Writing truth.                                | Never write.        |
| Resolver          | Projecting public proof.                      | Read only (GET).    |
| TrustOps          | Setup, acquisition, lifecycle.                | Route users to.     |
| Developer Gateway | Explaining and routing developers.            | Route users to.     |
| **MCP Verifier**  | Local checks, reporting, routing.             | This.               |

Backend remains final authority. Local policy decides.

## Quick start (npx)

Resolve the server. Resolve the agent. Re-check before reliance. Local policy decides.

```sh
npx @ecocitizenz/ecz-id-mcp-verifier check --target <mcp-url> --policy prefer
```

`check` is an accepted leading subcommand; `--target` still does the work. Add
`--report` for the human-readable soft report, or `--offline` to classify
without any network call.

> Note: this package is **not yet published**. The command above is the intended
> first-use shape once local package proof and trusted publishing are complete.
> See **Proof before LIVE** at the end of this document.

## Install (local)

```sh
git clone https://github.com/Ecocitizenz/ecz-id-mcp-verifier.git
cd ecz-id-mcp-verifier
npm install
npm run build
```

Run via the published bin once built:

```sh
node dist/cli.js --help
```

Or install the local bin into your `node_modules/.bin`:

```sh
npm install ./ecz-id-mcp-verifier
npx ecz-mcp-verify --help
```

## CLI

```
ecz-mcp-verify --target <value> [options]
```

### Options

| Flag                | Default                                | Description                              |
| ------------------- | -------------------------------------- | ---------------------------------------- |
| `--target`          | (required)                             | URL, package, repo, image, or ECZ-ID.    |
| `--target-type`     | `auto`                                 | `mcp_server` \| `agent_manifest` \| `api_url` \| `github_repo` \| `npm_package` \| `pypi_package` \| `container_image` \| `ecz_id` \| `auto` |
| `--policy`          | `OPEN`                                 | `OPEN` \| `PREFER` \| `REQUIRE`          |
| `--json`            | on                                     | Emit JSON output.                        |
| `--report`          | off                                    | Emit human-readable soft report.         |
| `--actions`         | off                                    | Include action envelope in JSON output.  |
| `--resolver-base`   | `https://resolver.ecocitizenz.org`     | Override resolver base.                  |
| `--trustops-url`    | `https://trustops.ecocitizenz.com/start` | Override TrustOps URL.                 |
| `--developer-base`  | `https://developers.ecocitizenz.com`   | Override Developer Gateway.              |
| `--offline`         | off                                    | Offline mode (no network).               |
| `--no-network`      | off                                    | Same as `--offline`.                     |
| `--timeout-ms`      | `5000`                                 | Network timeout (ms).                    |
| `--output <path>`   | stdout                                 | Write output to file.                    |
| `--sarif <path>`    | off                                    | Also write a minimal SARIF 2.1.0 file.   |
| `--version`         |                                        | Print version and exit.                  |
| `--help`            |                                        | Print help and exit.                     |

### CLI examples

```sh
# Offline classification + JSON output
ecz-mcp-verify --target "ECZ-GB-EXAMPLE" --offline

# REQUIRE policy with action envelope
ecz-mcp-verify --target "https://api.example.com/.well-known/ecz-mcp.json" \
  --policy REQUIRE --actions

# Human-readable soft report
ecz-mcp-verify --target "https://github.com/org/repo" --report

# Write JSON + SARIF files for CI
ecz-mcp-verify --target "ECZ-GB-EXAMPLE" --output result.json --sarif result.sarif
```

### Operator modes

`--operator` is never auto-inferred. The caller declares whether they
operate the target or are a third party reader. The verifier uses this
only to route guidance (TrustOps for operators, Developer Gateway for
third-party readers).

```sh
# You operate the target -> routes to TrustOps setup.
ecz-mcp-verify --target "https://api.example.com/.well-known/ecz-mcp.json" \
  --operator self --actions

# You are a third party reader -> routes to Developer Gateway guidance.
ecz-mcp-verify --target "https://api.example.com/.well-known/ecz-mcp.json" \
  --operator third_party --actions

# Operator role unknown (default).
ecz-mcp-verify --target "https://api.example.com/.well-known/ecz-mcp.json" \
  --operator unknown --actions
```

## JSON output schema

```json
{
  "schema_version": 1,
  "verifier": "ECZ-ID MCP Verifier",
  "verifier_version": "0.7.0",
  "target": "...",
  "target_type": "mcp_server",
  "policy_mode": "OPEN",
  "result_state": "NO_PUBLIC_RESOLVER_PROOF_FOUND",
  "reason_codes": ["NO_PUBLIC_RESOLVER_PROOF_FOUND", "RESOLVER_READ_ONLY", "LOCAL_POLICY_DECIDES"],
  "resolver_url": "https://resolver.ecocitizenz.org/eczid/...",
  "machine_json_url": null,
  "trustops_action_url": "https://trustops.ecocitizenz.com/start",
  "developer_guidance_url": "https://developers.ecocitizenz.com",
  "local_policy_decides": true,
  "recheck_before_reliance": true,
  "no_safety_or_approval_inference": true,
  "no_source_uploaded": true,
  "no_secrets_uploaded": true,
  "no_telemetry": true,
  "timestamp": "2026-05-18T00:00:00.000Z",
  "exit_code": 0,
  "action_envelope": null
}
```

## Human report

The human report uses only approved soft copy. When no public resolver proof is
found, the verifier emits this exact wording:

> No public resolver proof was found for this MCP target yet. This does not mean the target is unsafe. It means ECZ-ID could not locate machine-readable public proof for the accountable operator. Your local policy decides the action.

Followed by the operator route:

> Operate this server? Improve its resolver posture: https://trustops.ecocitizenz.com/start

And the closing reminders: "Re-check before reliance." and "Local policy decides."
If you do not operate the target, share resolver guidance with the operator.

## Action Envelope

When `--actions` is set, the JSON output includes an `action_envelope`:

```json
{
  "schema_version": 1,
  "envelope_type": "MCP",
  "target_type": "mcp_server",
  "target_value": "...",
  "result_state": "...",
  "reason_codes": ["..."],
  "resolver_url": "...",
  "machine_json_url": "...",
  "recommended_next_steps": ["..."],
  "trustops_action_url": "https://trustops.ecocitizenz.com/start",
  "developer_guidance_url": "https://developers.ecocitizenz.com",
  "policy_mode": "OPEN",
  "local_policy_decides": true,
  "recheck_before_reliance": true,
  "no_safety_or_approval_inference": true
}
```

The envelope is guidance/action metadata only. It is **not** a proof authority.

## Policy modes

| Mode      | Missing public proof                                    | Mismatch / Revoked / Suspended / Expired |
| --------- | ------------------------------------------------------- | ---------------------------------------- |
| `OPEN`    | informational, exit 0                                   | deterministic non-zero                   |
| `PREFER`  | warning on stderr, exit 0                               | deterministic non-zero                   |
| `REQUIRE` | fail-closed (exit 1, or exit 5 on network failure)      | deterministic non-zero                   |

Local policy decides. The verifier does not enforce a global gate.

## Exit codes

| Code | Meaning                                                          |
| ---- | ---------------------------------------------------------------- |
| 0    | OK / informational / resolver-verifiable / OPEN missing proof    |
| 1    | Policy-required proof missing or unresolved under REQUIRE        |
| 2    | Deterministic mismatch                                           |
| 3    | Revoked / suspended / expired                                    |
| 4    | Unsupported target or invalid input                              |
| 5    | Network / timeout error where policy requires fail-closed        |
| 6    | Internal verifier error                                          |

## Privacy / no-upload posture

The verifier:

- no source upload,
- no secrets upload (no API keys, no environment variables),
- never uploads prompts or tool payloads,
- never uploads private logs or raw telemetry,
- never uploads customer data,
- never sends a body to the Resolver (GET-only),
- never sends private headers,
- never emits analytics, Sentry, or PostHog beacons,
- never phones home,
- never auto-updates.

Network is opt-out via `--offline` / `--no-network`.

## GitHub Action

The repository ships a node20 action that wraps the same CLI.

Example:

```yaml
name: ECZ-ID MCP Verifier
on: [push]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: ecocitizenz/ecz-id-mcp-verifier@v0
        with:
          target: "ECZ-CC-ABC123"
          target-type: "ecz_id"
          policy: "PREFER"
          resolver-base: "https://resolver.ecocitizenz.org"
          no-network: "false"
          timeout-ms: "5000"
```

Outputs: `result-state`, `reason-codes`, `action-envelope-json`.

The action does **not** upload source. It does **not** upload secrets.
It does **not** write truth. It does **not** call TrustOps checkout.
It does **not** require an ECZ-ID token for public checks.

## TrustOps routing

When setup is required, the verifier routes the operator to:

`https://trustops.ecocitizenz.com/start`

The verifier never performs setup itself.

## Developer Gateway routing

When documentation or guidance is required, the verifier routes to:

`https://developers.ecocitizenz.com`

## Resolver read-only proof posture

The verifier:

- only GETs from `https://resolver.ecocitizenz.org` (or the override),
- requires HTTPS,
- treats any non-2xx as missing proof rather than inventing proof,
- never POSTs, PUTs, PATCHes, or DELETEs.

## No certification / safety / approval / compliance / insurance claims

The verifier does **not** assert that any target is trustworthy, low-risk,
sanctioned, insured, or endorsed by any registry, platform, or regulator. It
makes no safety, certification, approval, or compliance claim about any target.
Every report says: re-check before reliance, local policy decides, backend
remains final authority.

## DeepAgent reference

A DeepAgent draft of an MCP verifier was quarantined under
`_reference/deepagent_zip_do_not_import/` and audited in
[`docs/DEEPAGENT_REFERENCE_AUDIT.md`](docs/DEEPAGENT_REFERENCE_AUDIT.md).
No file under `_reference/` is imported, re-exported, or copied verbatim.
Any reusable idea has been rewritten under current ECZ-ID canon.

## Status

Distribution-readiness local package. **Not yet published.**

- `package.json` is marked `"private": true`.
- A `prepublishOnly` guard blocks accidental `npm publish`.
- No GitHub release has been cut.
- No registry account or marketplace listing has been activated.
- License is proprietary limited-use (`LICENSE.md`); this is not open source.
- Public distribution is blocked pending IP/patent counsel review.

Phase 9A prepares npm, GitHub Action, GitHub repo, and MCP-style
registry/listing metadata only. Phase 9B will align with the real
registry account and live listing surfaces.

## Proof before LIVE

This package is not live/published until local package proof, external action
proof, trusted publishing configuration, no-overclaim review, and IP/patent
counsel review are complete.

- **Local package proof:** `npm run build`, `npm test` (including privacy
  invariants), and `npm pack --dry-run` content review must pass.
- **External action proof:** the GitHub Action adapter (`dist/action.js`) must
  run green on a sample workflow with real `with:` inputs.
- **Trusted publishing:** the canonical Git remote
  (`https://github.com/Ecocitizenz/ecz-id-mcp-verifier.git`) is configured, and
  `package.json` carries `repository` and `bugs` fields whose URLs match it
  exactly (npm provenance/OIDC rejects any casing mismatch). Connecting the npm
  trusted publisher (OIDC) is the remaining publish-side step.
- **No-overclaim review:** forbidden wording absent from listing copy and report.
- **IP / patent review (publication gate):** public distribution to npm and the
  GitHub Action Marketplace is **blocked** pending EcoCitizenZ intellectual-
  property and patent counsel review confirming what may be safely disclosed.
  Source is not pushed to the public remote until that review clears.

Backend writes truth. TrustOps handles setup. Resolver proves. Machines re-check.

