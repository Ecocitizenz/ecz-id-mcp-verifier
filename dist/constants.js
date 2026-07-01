// Canonical constants for ECZ-ID MCP Verifier. Do not mutate at runtime.
export const RESOLVER_BASE = "https://resolver.ecocitizenz.org";
// Canonical machine-readable proof API (verified read-only, Phase 1).
// Human proof:   {RESOLVER_BASE}/p/{ecz_id}
// Machine proof: {RESOLVER_API_BASE}/api/p/{ecz_id}.json
export const RESOLVER_API_BASE = "https://api.ecocitizenz.com";
export const TRUSTOPS_START = "https://trustops.ecocitizenz.com/start";
export const DEVELOPER_GATEWAY = "https://developers.ecocitizenz.com";
// Canonical machine-discovery pointer (public facts, read-only; a pointer, not a
// second manifest system). Agents and machines can read canonical discovery here.
export const MACHINE_DISCOVERY_URL = "https://machine.ecocitizenz.org/.well-known/ecz-machine.json";
export const PACKAGE_NAME = "@ecocitizenz/ecz-id-mcp-verifier";
export const VERIFIER_NAME = "ECZ-ID MCP Verifier";
export const VERIFIER_VERSION = "0.8.2";
export const SCHEMA_VERSION = 1;
export const DEFAULT_TIMEOUT_MS = 5000;
// Stable capability-profile identifier for the machine-readable capability
// summary (--capabilities). Bump only when the capability contract changes.
export const CAPABILITY_PROFILE = "ecz-resolver-posture-v1";
// MCP server identity. MCP_SERVER_NAME is the runtime (initialize-handshake)
// name; MCP_REGISTRY_NAME is the reverse-DNS Registry identity and must equal
// both package.json.mcpName and server.json.name.
export const MCP_SERVER_NAME = "ecz-id-mcp-verifier";
// Reverse-DNS Official MCP Registry identity. Uses the CANONICAL GitHub login
// casing (Ecocitizenz) so GitHub-OIDC namespace ownership (io.github.Ecocitizenz/*)
// matches exactly. Must equal package.json.mcpName and server.json.name.
export const MCP_REGISTRY_NAME = "io.github.Ecocitizenz/ecz-id-mcp-verifier";
// Canonical CLI executable names (the two aliases point at the same CLI).
export const CLI_BIN_NAMES = ["ecz-id-mcp-verifier", "ecz-mcp-verify"];
// Canonical MCP stdio server executable name.
export const MCP_SERVER_BIN = "ecz-id-mcp-server";
// Canonical MCP tool names (exactly three, all read-only).
export const MCP_TOOL_NAMES = [
    "ecz_check_target",
    "ecz_recheck_resolver",
    "ecz_explain_result"
];
