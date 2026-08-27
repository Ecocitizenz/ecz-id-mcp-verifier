export declare const RESOLVER_BASE: "https://resolver.ecocitizenz.org";
export declare const RESOLVER_API_BASE: "https://api.ecocitizenz.com";
export declare const TRUSTOPS_START: "https://trustops.ecocitizenz.com/start";
export declare const DEVELOPER_GATEWAY: "https://developers.ecocitizenz.com";
export declare const MACHINE_DISCOVERY_URL: "https://machine.ecocitizenz.org/.well-known/ecz-machine.json";
export declare const PACKAGE_NAME: "@ecocitizenz/ecz-id-mcp-verifier";
export declare const VERIFIER_NAME: "ECZ-ID MCP Verifier";
export declare const VERIFIER_VERSION: "0.8.2";
export declare const SCHEMA_VERSION: 1;
export declare const DEFAULT_TIMEOUT_MS: 5000;
export declare const CAPABILITY_PROFILE: "ecz-resolver-posture-v1";
export declare const MCP_SERVER_NAME: "ecz-id-mcp-verifier";
export declare const MCP_REGISTRY_NAME: "io.github.Ecocitizenz/ecz-id-mcp-verifier";
export declare const CLI_BIN_NAMES: readonly ["ecz-id-mcp-verifier", "ecz-mcp-verify"];
export declare const MCP_SERVER_BIN: "ecz-id-mcp-server";
export declare const MCP_TOOL_NAMES: readonly ["ecz_check_target", "ecz_recheck_resolver", "ecz_explain_result"];
/** The MODERN revision this server implements (per-request `_meta`, stateless). */
export declare const MCP_MODERN_PROTOCOL_VERSION: "2026-07-28";
/** LEGACY (`initialize`-handshake) revisions deliberately retained. */
export declare const MCP_LEGACY_PROTOCOL_VERSIONS: readonly ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05", "2024-10-07"];
/** Every revision this server accepts, newest first. Declared to the SDK. */
export declare const MCP_SUPPORTED_PROTOCOL_VERSIONS: readonly ["2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05", "2024-10-07"];
export declare const MCP_DISCOVER_TTL_MS: 3600000;
export declare const MCP_TOOLS_LIST_TTL_MS: 300000;
export declare const MCP_CACHE_SCOPE: "public";
