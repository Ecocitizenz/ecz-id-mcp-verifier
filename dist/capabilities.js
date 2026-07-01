// Machine-readable capability surface + onboarding helpers for the ECZ-ID MCP
// Verifier. Everything here is deterministic, local and read-only: no network,
// no background reporting, no truth-writing, no new authority. These power three
// convenience commands (--capabilities, --print-mcp-config, --doctor) that make
// the package easier to adopt without changing what it actually verifies.
import { VERIFIER_NAME, VERIFIER_VERSION, PACKAGE_NAME, SCHEMA_VERSION, CAPABILITY_PROFILE, MCP_SERVER_NAME, MCP_REGISTRY_NAME, MCP_TOOL_NAMES, CLI_BIN_NAMES, MCP_SERVER_BIN, RESOLVER_BASE, RESOLVER_API_BASE, TRUSTOPS_START, DEVELOPER_GATEWAY, MACHINE_DISCOVERY_URL } from "./constants.js";
import { TARGET_TYPES } from "./classify-target.js";
import { RESULT_STATES } from "./result-states.js";
import { REASON_CODES } from "./reason-codes.js";
import { POLICY_MODES } from "./policy.js";
import { OPERATOR_MODES } from "./setup-handoff.js";
import { OUTPUT_PRIVACY_FIELDS } from "./privacy.js";
import { verify } from "./verify.js";
const REPOSITORY_URL = "https://github.com/Ecocitizenz/ecz-id-mcp-verifier";
export function buildCapabilities() {
    return {
        name: VERIFIER_NAME,
        package: PACKAGE_NAME,
        version: VERIFIER_VERSION,
        capability_profile: CAPABILITY_PROFILE,
        schema_version: SCHEMA_VERSION,
        binaries: { cli: CLI_BIN_NAMES, mcp_server: MCP_SERVER_BIN },
        mcp: {
            server_name: MCP_SERVER_NAME,
            registry_name: MCP_REGISTRY_NAME,
            transport: "stdio",
            tools: MCP_TOOL_NAMES
        },
        supported_target_types: TARGET_TYPES,
        result_states: RESULT_STATES,
        reason_codes_count: REASON_CODES.length,
        policy_modes: POLICY_MODES,
        operator_modes: OPERATOR_MODES,
        outputs: ["json", "human_report", "sarif", "action_envelope", "github_action_outputs"],
        exit_codes: {
            "0": "OK / informational / resolver-verifiable / OPEN missing proof",
            "1": "policy-required proof missing or unresolved under REQUIRE",
            "2": "deterministic mismatch",
            "3": "revoked / suspended / expired",
            "4": "unsupported target or invalid input",
            "5": "network / timeout error where policy requires fail-closed",
            "6": "internal verifier error"
        },
        does: [
            "classify a supported target shape",
            "check public ECZ-ID Resolver posture where available",
            "produce a deterministic local result state and reason codes",
            "apply local policy (OPEN / PREFER / REQUIRE)",
            "emit machine-readable JSON and SARIF, plus a human report",
            "expose three read-only MCP tools over stdio",
            "route operators and integrators to the correct public surface"
        ],
        does_not: [
            "write canonical truth",
            "issue an ECZ-ID",
            "activate proof",
            "mark BOUND",
            "grant entitlement",
            "perform a purchase step",
            "inspect artifact contents, manifests or runtime protocol",
            "decide global allow/deny",
            "assert safety, approval, certification, compliance or insurability",
            "emit background reporting or upload source, secrets, prompts or tool payloads"
        ],
        artifact_binding_performed: false,
        manifest_inspection_performed: false,
        runtime_protocol_inspection_performed: false,
        local_policy_decides: true,
        privacy: { ...OUTPUT_PRIVACY_FIELDS, offline_capable: true },
        routes: {
            resolver: RESOLVER_BASE,
            resolver_api: RESOLVER_API_BASE,
            trustops: TRUSTOPS_START,
            developer_gateway: DEVELOPER_GATEWAY,
            repository: REPOSITORY_URL,
            machine_discovery: MACHINE_DISCOVERY_URL
        }
    };
}
export function buildMcpConfig() {
    return {
        mcpServers: {
            "ecz-id": {
                command: "npx",
                args: ["-y", "-p", PACKAGE_NAME, MCP_SERVER_BIN]
            }
        }
    };
}
export async function runDoctor() {
    const checks = [];
    const add = (name, ok, detail) => checks.push({ name, ok, detail });
    add("version_reported", VERIFIER_VERSION.length > 0, VERIFIER_VERSION);
    add("cli_aliases_declared", CLI_BIN_NAMES.length === 2, CLI_BIN_NAMES.join(", "));
    add("mcp_server_declared", MCP_SERVER_BIN.length > 0, MCP_SERVER_BIN);
    add("mcp_tools_exactly_three", MCP_TOOL_NAMES.length === 3, MCP_TOOL_NAMES.join(", "));
    // Offline verify must run without network and return a deterministic state.
    try {
        const r = await verify({ target: "ECZ-GB-A93K7Q", policy: "OPEN", noNetwork: true });
        add("offline_verify_runs", typeof r.result_state === "string" && r.result_state.length > 0, r.result_state);
        add("offline_no_network_attempted", r.network_attempted === false, `network_attempted=${r.network_attempted}`);
    }
    catch (e) {
        add("offline_verify_runs", false, e instanceof Error ? e.message : String(e));
        add("offline_no_network_attempted", false, "verify threw");
    }
    add("no_secret_required", true, "no environment secret is read to run");
    add("no_source_or_secret_upload", OUTPUT_PRIVACY_FIELDS.no_source_uploaded === true && OUTPUT_PRIVACY_FIELDS.no_secrets_uploaded === true, "no source/secret upload; no background reporting");
    const ok = checks.every((c) => c.ok);
    return {
        type: "ecz.doctor",
        ok,
        name: VERIFIER_NAME,
        version: VERIFIER_VERSION,
        package: PACKAGE_NAME,
        checks,
        no_secret_required: true,
        no_network_required: true,
        local_policy_decides: true
    };
}
// Compact, human-friendly doctor rendering (deterministic).
export function toDoctorHuman(report) {
    const lines = [];
    lines.push(`${report.name} v${report.version} — self-test`);
    for (const c of report.checks)
        lines.push(`  ${c.ok ? "ok  " : "FAIL"} ${c.name}${c.detail ? " — " + c.detail : ""}`);
    lines.push(report.ok ? "All checks passed. Ready to use. Local policy decides." : "One or more checks failed.");
    return lines.join("\n");
}
