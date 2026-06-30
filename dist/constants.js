// Canonical constants for ECZ-ID MCP Verifier. Do not mutate at runtime.
export const RESOLVER_BASE = "https://resolver.ecocitizenz.org";
// Canonical machine-readable proof API (verified read-only, Phase 1).
// Human proof:   {RESOLVER_BASE}/p/{ecz_id}
// Machine proof: {RESOLVER_API_BASE}/api/p/{ecz_id}.json
export const RESOLVER_API_BASE = "https://api.ecocitizenz.com";
export const TRUSTOPS_START = "https://trustops.ecocitizenz.com/start";
export const DEVELOPER_GATEWAY = "https://developers.ecocitizenz.com";
export const PACKAGE_NAME = "@ecocitizenz/ecz-id-mcp-verifier";
export const VERIFIER_NAME = "ECZ-ID MCP Verifier";
export const VERIFIER_VERSION = "0.8.0";
export const SCHEMA_VERSION = 1;
export const DEFAULT_TIMEOUT_MS = 5000;
// MCP server identity. MCP_SERVER_NAME is the runtime (initialize-handshake)
// name; MCP_REGISTRY_NAME is the reverse-DNS Registry identity and must equal
// both package.json.mcpName and server.json.name.
export const MCP_SERVER_NAME = "ecz-id-mcp-verifier";
export const MCP_REGISTRY_NAME = "io.github.ecocitizenz/ecz-id-mcp-verifier";
