// Canonical constants for ECZ-ID MCP Verifier. Do not mutate at runtime.

export const RESOLVER_BASE = "https://resolver.ecocitizenz.org" as const;
// Canonical machine-readable proof API (verified read-only, Phase 1).
// Human proof:   {RESOLVER_BASE}/p/{ecz_id}
// Machine proof: {RESOLVER_API_BASE}/api/p/{ecz_id}.json
export const RESOLVER_API_BASE = "https://api.ecocitizenz.com" as const;
export const TRUSTOPS_START = "https://trustops.ecocitizenz.com/start" as const;
export const DEVELOPER_GATEWAY = "https://developers.ecocitizenz.com" as const;

export const PACKAGE_NAME = "@ecocitizenz/ecz-id-mcp-verifier" as const;
export const VERIFIER_NAME = "ECZ-ID MCP Verifier" as const;
export const VERIFIER_VERSION = "0.7.0" as const;
export const SCHEMA_VERSION = 1 as const;
export const DEFAULT_TIMEOUT_MS = 5000 as const;
