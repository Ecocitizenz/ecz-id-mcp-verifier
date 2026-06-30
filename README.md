# ECZ-ID MCP Verifier(TM)

**Check public ECZ-ID Resolver posture from the CLI, CI or an MCP host. No sign-in, source upload or telemetry. Local policy decides.**

A local-first, privacy-first tool that **classifies** a target, **checks** its public ECZ-ID Resolver posture where applicable, **reports** a deterministic result, **explains** it, and **routes** you onward. It **only reads, reports, and routes** — it never writes truth, activates proof, marks anything BOUND, performs checkout, or inspects artifact contents.

## Quick start

```sh
npx @ecocitizenz/ecz-id-mcp-verifier check --target ECZ-GB-A93K7Q --offline
```

`check` is an accepted leading subcommand; `--target` does the work. Add `--report` for the human-readable soft report, `--policy REQUIRE` to fail closed when proof is missing, or drop `--offline` to perform the read-only Resolver lookup.

> Publication note: `@ecocitizenz/ecz-id-mcp-verifier@0.7.0` is the version currently on npm, so a plain `npx …` resolves to it today. `0.8.0` (this branch — adds the MCP stdio server) is the prepared candidate; **after `0.8.0` is published**, the same command resolves to it. See **Publication status** below.

### Representative result

Real output from the `0.8.0` packed candidate for `--target ECZ-GB-A93K7Q --policy OPEN --offline` (representative excerpt; the full JSON also includes `setup_handoff`, `request_to_resolve` and additional boundary flags):

```json
{
  "schema_version": 1,
  "verifier": "ECZ-ID MCP Verifier",
  "verifier_version": "0.8.0",
  "target": "ECZ-GB-A93K7Q",
  "target_type": "ecz_id",
  "policy_mode": "OPEN",
  "result_state": "NO_PUBLIC_RESOLVER_PROOF_FOUND",
  "reason_codes": ["NO_PUBLIC_RESOLVER_PROOF_FOUND", "RESOLVER_READ_ONLY", "LOCAL_POLICY_DECIDES"],
  "resolver_url": "https://resolver.ecocitizenz.org/p/ECZ-GB-A93K7Q",
  "machine_json_url": null,
  "local_policy_decides": true,
  "recheck_before_reliance": true,
  "no_safety_or_approval_inference": true,
  "no_source_uploaded": true,
  "no_secrets_uploaded": true,
  "no_telemetry": true,
  "exit_code": 0
}
```

`NO_PUBLIC_RESOLVER_PROOF_FOUND` here means no public proof was located (offline run); it does **not** mean the target is unsafe. Local policy decides.

## Use it from

| Surface | How |
| --- | --- |
| **CLI** | `npx @ecocitizenz/ecz-id-mcp-verifier check --target <value>` |
| **CI / GitHub Action** | `uses: Ecocitizenz/ecz-id-mcp-verifier@v0.7.1` |
| **MCP host** | run the `ecz-id-mcp-server` stdio binary (three read-only tools) |
| **Node library** | `import { verify } from "@ecocitizenz/ecz-id-mcp-verifier"` |

Next actions: check a target · add to CI · add to an MCP host · inspect public Resolver proof · improve the posture of a target you operate · build an integration.

## Supported target shapes

The classifier is deterministic (regex only — no LLM, no network). A public **Resolver lookup is performed only for a valid ECZ-ID**; every other shape is classified and routed but **not** resolved, and **no shape has its artifact contents, manifest, or runtime protocol inspected**.

| Target shape | Example | Classified | Resolver lookup | Artifact / manifest / runtime inspected |
| --- | --- | --- | --- | --- |
| ECZ-ID (parent) | `ECZ-GB-A93K7Q` | yes | **yes** (GET `…/api/p/{parent}.json`, online) | no / no / no |
| ECZ-ID (child) | `ECZ-GB-A93K7Q::AGENT-4F9Q2A` | yes | no (human URL only; no child machine endpoint) | no / no / no |
| MCP server URL | `https://api.example.com/.well-known/ecz-mcp.json` | yes | no (not directly resolvable) | no / no / no |
| Agent manifest URL | `…/.well-known/ecz-agent.json` | yes | no | no / no / no |
| API URL | `https://api.example.com/...` | yes | no | no / no / no |
| GitHub repo | `https://github.com/org/repo` | yes | no | no / no / no |
| npm package | `left-pad` or `npm:left-pad` | yes | no | no / no / no |
| PyPI package | `pypi:requests` | yes | no | no / no / no |
| Container image | `ghcr.io/org/img@sha256:…` | yes | no | no / no / no |
| Anything else | free text, whitespace, malformed ECZ-ID | classified `unsupported_target` | no | no / no / no |

For a non-ECZ-ID shape the verifier returns `NO_PUBLIC_RESOLVER_PROOF_FOUND` with `resolver_url: null` (it never fabricates a Resolver path). Classification is **not** security inspection.

## What this package does

- Classifies a target deterministically (no LLM).
- For a valid ECZ-ID, GETs the public Resolver machine projection (read-only) and reports its **posture**.
- Reports a canonical `ResultState` and uppercase `ReasonCode`s.
- Emits JSON, an optional human-readable soft report, an optional local Action Envelope (routing-only metadata), and an optional SARIF 2.1.0 file.
- Exposes deterministic exit codes for CI integration.
- Ships a GitHub Action wrapper and a read-only MCP stdio server.

## What this package does not do

- It does **not** write truth.
- It does **not** activate proof.
- It does **not** mark anything BOUND.
- It does **not** inspect artifact contents, manifests, or runtime protocol of any target.
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
- It does **not** treat npm or Official MCP Registry presence as ECZ-ID proof.
- It does **not** infer safety or approval state for any third party.
- It does **not** run autonomous LLM or agent behaviour.

## Privacy

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

Network is opt-out via `--offline` / `--no-network`. No sign-in is required for normal checks. The public **Resolver** remains the proof surface; package and Registry metadata are discovery only, never proof.

## Install

From the public registry (CLI on demand, no install):

```sh
npx @ecocitizenz/ecz-id-mcp-verifier check --target ECZ-GB-A93K7Q
```

Or add it to a project / install globally:

```sh
npm install @ecocitizenz/ecz-id-mcp-verifier
# or: npm install -g @ecocitizenz/ecz-id-mcp-verifier
```

From source (contributors):

```sh
git clone https://github.com/Ecocitizenz/ecz-id-mcp-verifier.git
cd ecz-id-mcp-verifier
npm install
npm run build
node dist/bin/cli.js --help
```

## CLI

```
ecz-mcp-verify --target <value> [options]
```

Two equivalent command names are installed: `ecz-id-mcp-verifier` and `ecz-mcp-verify` (both run the same CLI). A third binary, `ecz-id-mcp-server`, starts the MCP stdio server.

### Options

| Flag                | Default                                | Description                              |
| ------------------- | -------------------------------------- | ---------------------------------------- |
| `--target`          | (required)                             | URL, package, repo, image, or ECZ-ID.    |
| `--target-type`     | `auto`                                 | `mcp_server` \| `agent_manifest` \| `api_url` \| `github_repo` \| `npm_package` \| `pypi_package` \| `container_image` \| `ecz_id` \| `auto` |
| `--policy`          | `OPEN`                                 | `OPEN` \| `PREFER` \| `REQUIRE`          |
| `--operator`        | `unknown`                              | `self` \| `third_party` \| `unknown` (never auto-inferred). |
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
ecz-mcp-verify --target "ECZ-GB-A93K7Q" --offline

# REQUIRE policy with action envelope
ecz-mcp-verify --target "https://api.example.com/.well-known/ecz-mcp.json" \
  --policy REQUIRE --actions

# Human-readable soft report
ecz-mcp-verify --target "https://github.com/org/repo" --report

# Write JSON + SARIF files for CI
ecz-mcp-verify --target "ECZ-GB-A93K7Q" --output result.json --sarif result.sarif
```

### Operator modes

`--operator` is never auto-inferred. The caller declares whether they operate the target or are a third-party reader. The verifier uses this only to route guidance (TrustOps for operators, Developer Gateway for third-party readers).

```sh
# You operate the target -> routes to TrustOps setup.
ecz-mcp-verify --target "https://api.example.com/.well-known/ecz-mcp.json" \
  --operator self --actions

# You are a third party reader -> routes to Developer Gateway guidance.
ecz-mcp-verify --target "https://api.example.com/.well-known/ecz-mcp.json" \
  --operator third_party --actions
```

## Policy modes

| Mode      | Missing public proof                                    | Mismatch / Revoked / Suspended / Expired |
| --------- | ------------------------------------------------------- | ---------------------------------------- |
| `OPEN`    | informational, exit 0                                   | deterministic non-zero                   |
| `PREFER`  | warning on stderr, exit 0                               | deterministic non-zero                   |
| `REQUIRE` | fail-closed (exit 1, or exit 5 on network failure)      | deterministic non-zero                   |

Local policy decides. The verifier does not enforce a global gate.

## Result states and reason codes

There are 18 canonical `result_state` values, including `RESOLVER_VERIFIABLE`, `NO_PUBLIC_RESOLVER_PROOF_FOUND`, `DEGRADED`, `MISMATCH`, `EXPIRED`, `SUSPENDED`, `REVOKED`, `NOT_APPLICABLE` and `UNSUPPORTED_TARGET`. An HTTP 200 alone is **never** proof: only an explicit active/current Resolver projection yields `RESOLVER_VERIFIABLE`; malformed, unknown-schema, subject-mismatched, revoked, suspended, expired, stale or abuse-flagged bodies map deterministically to non-positive states and are never cached as proof.

Reason codes are uppercase snake-case (e.g. `NO_PUBLIC_RESOLVER_PROOF_FOUND`, `RESOLVER_READ_ONLY`, `RESOLVER_RESPONSE_UNVERIFIABLE`, `PULSEGUARD_STALE`, `LOCAL_POLICY_DECIDES`). Use `ecz_explain_result` (MCP) or read the canonical lists exported from the library.

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

## Machine-readable output

Default output is JSON (see the representative result above). Key fields: `schema_version`, `verifier`, `verifier_version`, `target`, `target_type`, `policy_mode`, `result_state`, `reason_codes`, `resolver_url`, `machine_json_url`, `trustops_action_url`, `developer_guidance_url`, the boundary flags (`local_policy_decides`, `recheck_before_reliance`, `no_safety_or_approval_inference`, `no_source_uploaded`, `no_secrets_uploaded`, `no_telemetry`), `timestamp` and `exit_code`.

- `--sarif <path>` also writes a minimal SARIF 2.1.0 file for code-scanning surfaces.
- `--actions` adds an `action_envelope` (routing/guidance metadata only — **not** a proof authority).

## Node library

```js
import { verify, RESULT_STATES, REASON_CODES } from "@ecocitizenz/ecz-id-mcp-verifier";

const result = await verify({ target: "ECZ-GB-A93K7Q", policy: "OPEN", noNetwork: true });
console.log(result.result_state, result.reason_codes);
```

Importing the package has **no side effects** — it never runs the CLI and never makes a network request on import. The canonical `RESULT_STATES`, `REASON_CODES`, exit-code constants and result types are exported for integrators.

## MCP stdio server

`0.8.0` ships a read-only MCP server over stdio with **exactly three tools**, all delegating to the same canonical verifier core. No secret or environment variable is required to start it; it writes no truth and exposes no remote transport.

| Tool | Purpose |
| --- | --- |
| `ecz_check_target` | Classify a target and return the canonical result contract. |
| `ecz_recheck_resolver` | Read-only re-check of the public Resolver posture (GET only). |
| `ecz_explain_result` | Public-safe explanation of existing `result_state` / `reason_codes`. |

### MCP host configuration

Add to your MCP host (e.g. an `mcpServers` block). Using the installed/global binary:

```json
{
  "mcpServers": {
    "ecz-id": {
      "command": "ecz-id-mcp-server",
      "args": []
    }
  }
}
```

Or via `npx` without a global install:

```json
{
  "mcpServers": {
    "ecz-id": {
      "command": "npx",
      "args": ["-y", "-p", "@ecocitizenz/ecz-id-mcp-verifier", "ecz-id-mcp-server"]
    }
  }
}
```

This is **local stdio** use. Future discovery via the Official MCP Registry (a separate lane) is not yet published, and Registry discovery is **not** ECZ-ID proof — proof comes only from the public Resolver.

## GitHub Action

The repository ships a node20 action that wraps the same CLI.

```yaml
name: ECZ-ID MCP Verifier
on: [push]

# Minimum recommended permissions. The Action only reads and reports — it never
# writes to the repository, opens PRs/issues, or needs any write scope.
permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: Ecocitizenz/ecz-id-mcp-verifier@v0.7.1
        with:
          target: "ECZ-CC-ABC123"
          target-type: "ecz_id"
          policy: "PREFER"
          resolver-base: "https://resolver.ecocitizenz.org"
          no-network: "false"
          timeout-ms: "5000"
```

Outputs: `result-state`, `reason-codes`, `action-envelope-json`, `setup-handoff-json`, `mcp-action-envelope-json`, `request-to-resolve-json`, `primary-action`, `trustops-action-url`, `developer-guidance-url`. The Action also writes a concise GitHub **step summary**.

**Minimum permissions:** `contents: read`. The action does **not** upload source. It does **not** upload secrets. It does **not** write truth. It does **not** mutate the repository, open PRs, or open issues. It does **not** call TrustOps checkout. It does **not** require an ECZ-ID token for public checks.

## Offline mode

`--offline` (alias `--no-network`) performs deterministic classification and routing with **no** network call. The Resolver lookup is skipped and any ECZ-ID is reported as `NO_PUBLIC_RESOLVER_PROOF_FOUND` (the verifier never invents proof). Use offline mode in air-gapped CI or when you only need classification + routing.

## Human report

The human report uses only approved soft copy. When no public resolver proof is found, the verifier emits this exact wording:

> No public resolver proof was found for this MCP target yet. This does not mean the target is unsafe. It means ECZ-ID could not locate machine-readable public proof for the accountable operator. Your local policy decides the action.

Followed by the operator route:

> Operate this server? Improve its resolver posture: https://trustops.ecocitizenz.com/start

And the closing reminders: "Re-check before reliance." and "Local policy decides." If you do not operate the target, share resolver guidance with the operator.

## Troubleshooting

- **Command prints nothing / exits 0 silently:** ensure you are on `0.8.0` or later. `0.8.0` introduced a dedicated bin wrapper (`dist/bin/cli.js`); earlier builds could exit silently when run through a symlinked bin.
- **`UNSUPPORTED_TARGET` (exit 4):** the target is empty, contains whitespace, or is a malformed ECZ-ID. Quote the target and check the supported-shapes table.
- **`REQUIRE` exits 1 offline:** expected — `REQUIRE` fails closed when no public proof is confirmed; use `OPEN`/`PREFER` for informational runs, or drop `--offline`.
- **A non-ECZ-ID target shows `resolver_url: null`:** expected — only ECZ-IDs are resolvable; other shapes are classified and routed, not resolved.
- **Network errors under `REQUIRE`:** exit 5; raise `--timeout-ms` or run `--offline`.

## Public routes

- **Resolver (public proof):** `https://resolver.ecocitizenz.org`
- **Developer Gateway (docs/integration):** `https://developers.ecocitizenz.com`
- **TrustOps (operator setup):** `https://trustops.ecocitizenz.com/start`

When setup is required, the verifier routes the operator to TrustOps; it never performs setup itself. When documentation or guidance is required, it routes to the Developer Gateway. The verifier only **GET**s from the Resolver, requires HTTPS, treats any non-2xx as missing proof rather than inventing proof, and never POSTs, PUTs, PATCHes, or DELETEs.

If you operate the target, TrustOps can guide setup and posture improvement. The verifier never requires a purchase to run, never requires a third party to buy an ECZ-ID, and absence of public proof never means "unsafe" — local policy decides.

## Role split

| Component         | Owns                                          | This verifier may   |
| ----------------- | --------------------------------------------- | ------------------- |
| Backend / Core    | Writing truth.                                | Never write.        |
| Resolver          | Projecting public proof.                      | Read only (GET).    |
| TrustOps          | Setup, acquisition, lifecycle.                | Route users to.     |
| Developer Gateway | Explaining and routing developers.            | Route users to.     |
| **MCP Verifier**  | Local checks, reporting, routing.             | This.               |

Backend remains final authority. Local policy decides. This verifier does **not** write truth.

## No certification / safety / approval / compliance / insurance claims

The verifier does **not** assert that any target is trustworthy, low-risk, sanctioned, insured, or endorsed by any registry, platform, or regulator. It makes no safety, certification, approval, or compliance claim about any target. Every report says: re-check before reliance, local policy decides, backend remains final authority.

## ECZ-ID format

Only a strictly valid identifier classifies as `ecz_id`, builds a Resolver URL, or triggers a lookup; a malformed identifier is reported as an unsupported / invalid target and never produces a Resolver request.

| Form | Template | Example |
| --- | --- | --- |
| Parent (operator) | `ECZ-CC-XXXXXX` | `ECZ-GB-A93K7Q` |
| Child (passport instance) | `ECZ-CC-XXXXXX::PASSPORT_CODE-YYYYYY` | `ECZ-GB-A93K7Q::AGENT-4F9Q2A` |

- `CC` is exactly two uppercase letters (operator country/class code).
- `XXXXXX` and `YYYYYY` are each exactly six uppercase Base36 characters (`0-9A-Z`).
- `PASSPORT_CODE` is one of the **33 public passport-number codes** below; it may contain hyphens, and the six-character instance suffix is split off the final hyphen. Backend semantic registry keys (e.g. `AGENT_CREDENTIAL`) and obsolete codes are **not** valid public child codes.

Resolver routes: a parent resolves to `…/p/{parent}`; a child resolves to `…/p/{parent}/{passport_code}/{instance_suffix}`.

<details>
<summary>Public passport-number codes (33)</summary>

| # | Passport | Public code | Backend key (internal) |
| --- | --- | --- | --- |
| 1 | Agent Credential | `AGENT` | `AGENT_CREDENTIAL` |
| 2 | Cyber Resilience | `CYBER` | `CYBER` |
| 3 | API Passport | `API` | `API` |
| 4 | AI Model | `AI` | `AIMODEL` |
| 5 | Dataset | `DATASET` | `DATASET` |
| 6 | IoT Device | `IOT` | `IOT` |
| 7 | Software Supply Chain | `SSCM` | `SOFTWARE_SUPPLY_CHAIN` |
| 8 | Product | `PRODUCT` | `PRODUCT` |
| 9 | Custody Transfer | `CUSTODY` | `CUSTODY` |
| 10 | Risk Policy | `RISKPOL` | `RISK_POLICY` |
| 11 | Industrial Robot | `ROBOT-IND` | `IROBOT` |
| 12 | Public-Space Robot | `ROBOT-PUB` | `PROBOT` |
| 13 | Domestic Robot | `ROBOT-DOM` | `DROBOT` |
| 14 | Robotaxi | `ROBOTAXI` | `ROBOTAXI` |
| 15 | Autonomous Car | `AUTO-CAR` | `AUTOCAR` |
| 16 | Autonomous Haulage Truck | `AUTO-TRUCK` | `AUTOHAUL` |
| 17 | Cross-Border Haulage Truck | `XHAUL` | `XBRDHAUL` |
| 18 | High-Value Cargo Truck | `HV-CARGO` | `HVCARGO` |
| 19 | D1 Drone | `D1-DRONE` | `D1` |
| 20 | D2 Drone | `D2-DRONE` | `D2` |
| 21 | D3 Drone | `D3-DRONE` | `D3` |
| 22 | D4 Drone | `D4-DRONE` | `D4` |
| 23 | Intermodal Transfer | `INTERMODAL` | `INTERMODAL` |
| 24 | Industrial Site | `IND-SITE` | `INDUSTRIAL_SITE` |
| 25 | Critical Infrastructure | `CRITICAL-INFRA` | `CRITICAL_INFRA` |
| 26 | Financial Authority & Funds Flow | `FUNDS-FLOW` | `FUNDS_FLOW` |
| 27 | Marine Vessel | `MARINE-VESSEL` | `MARINE_VESSEL` |
| 28 | Cargo Container | `CARGO-CONTAINER` | `CONTAINER` |
| 29 | Aircraft | `AIRCRAFT` | `AIRCRAFT` |
| 30 | Aviation Component | `AVIATION-COMP` | `AVIATION_COMP` |
| 31 | Platform Safe-Harbour | `SAFE-HARBOUR` | `SAFE_HARBOUR` |
| 32 | Identity Continuity | `ID-CONTINUITY` | `ID_CONTINUITY` |
| 33 | Licensed Infrastructure Operator | `LIC-INFRA` | `LICENSED_OPERATOR` |

The backend-key column is an internal mapping only; those keys are never valid public child codes. Child `machine_json_url` is `null` (no proven child machine endpoint); the parent machine projection `…/api/p/{parent}.json` is read-only.

</details>

## Security & responsible disclosure

Report suspected vulnerabilities privately via the repository's **GitHub Security tab** — <https://github.com/Ecocitizenz/ecz-id-mcp-verifier/security> (use *Report a vulnerability* / private advisories) — do **not** open public issues for security reports. Include the affected version and reproduction steps. See also [`docs/PRIVACY.md`](docs/PRIVACY.md) and [`docs/ROLE_SPLIT.md`](docs/ROLE_SPLIT.md).

## Support & uninstall

- **Support / issues:** <https://github.com/Ecocitizenz/ecz-id-mcp-verifier/issues>
- **Uninstall:** `npm uninstall -g @ecocitizenz/ecz-id-mcp-verifier` (global) or remove it from your project and delete `node_modules`. For the GitHub Action, remove the `uses:` step. No background services, daemons, or cached credentials are left behind.

## Publication status

- **Published:** npm `@ecocitizenz/ecz-id-mcp-verifier@0.7.0` (live on the public registry) and the GitHub Action `Ecocitizenz/ecz-id-mcp-verifier@v0.7.1` (GitHub Actions Marketplace). GitHub Releases `v0.7.0` and `v0.7.1` are cut and immutable.
- **Candidate:** `0.8.0` (this branch) adds the read-only MCP stdio server and hardening; it is prepared but **not yet published**. After `0.8.0` is published, a plain `npx @ecocitizenz/ecz-id-mcp-verifier …` resolves to it.
- **Future-release trusted publishing (remaining step):** the npm Trusted Publisher (OIDC) and a protected GitHub `npm-release` environment are configured before any *future* version is published. The canonical Git remote (`https://github.com/Ecocitizenz/ecz-id-mcp-verifier.git`) is configured, and `package.json` `repository`/`bugs` URLs match it exactly.
- Published package versions and Action release tags are **immutable**; the default branch may carry preparation for a future npm release.

## Licence

The official, unmodified package and its bundled GitHub Action are **free forever** under the ECZ-ID Proprietary Limited-Use License ([`LICENSE.md`](LICENSE.md)) — free to install and run for personal, organisational, development, CI/CD, and internal business use.

This is **not** open source. Public visibility of the source (for transparency or installation) grants no redistribution, modification, derivative, or competing-product rights — see `LICENSE.md`.

Backend writes truth. TrustOps handles setup. Resolver proves. Machines re-check.
