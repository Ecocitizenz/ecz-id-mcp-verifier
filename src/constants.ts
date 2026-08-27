// Canonical constants for ECZ-ID MCP Verifier. Do not mutate at runtime.

export const RESOLVER_BASE = "https://resolver.ecocitizenz.org" as const;
// Canonical machine-readable proof API (verified read-only, Phase 1).
// Human proof:   {RESOLVER_BASE}/p/{ecz_id}
// Machine proof: {RESOLVER_API_BASE}/api/p/{ecz_id}.json
export const RESOLVER_API_BASE = "https://api.ecocitizenz.com" as const;
export const TRUSTOPS_START = "https://trustops.ecocitizenz.com/start" as const;
export const DEVELOPER_GATEWAY = "https://developers.ecocitizenz.com" as const;
// Canonical machine-discovery pointer (public facts, read-only; a pointer, not a
// second manifest system). Agents and machines can read canonical discovery here.
export const MACHINE_DISCOVERY_URL =
  "https://machine.ecocitizenz.org/.well-known/ecz-machine.json" as const;

export const PACKAGE_NAME = "@ecocitizenz/ecz-id-mcp-verifier" as const;
export const VERIFIER_NAME = "ECZ-ID MCP Verifier" as const;
export const VERIFIER_VERSION = "0.8.2" as const;
export const SCHEMA_VERSION = 1 as const;
export const DEFAULT_TIMEOUT_MS = 5000 as const;
// Stable capability-profile identifier for the machine-readable capability
// summary (--capabilities). Bump only when the capability contract changes.
export const CAPABILITY_PROFILE = "ecz-resolver-posture-v1" as const;

// MCP server identity. MCP_SERVER_NAME is the runtime (initialize-handshake)
// name; MCP_REGISTRY_NAME is the reverse-DNS Registry identity and must equal
// both package.json.mcpName and server.json.name.
export const MCP_SERVER_NAME = "ecz-id-mcp-verifier" as const;
// Reverse-DNS Official MCP Registry identity. Uses the CANONICAL GitHub login
// casing (Ecocitizenz) so GitHub-OIDC namespace ownership (io.github.Ecocitizenz/*)
// matches exactly. Must equal package.json.mcpName and server.json.name.
export const MCP_REGISTRY_NAME = "io.github.Ecocitizenz/ecz-id-mcp-verifier" as const;
// Canonical CLI executable names (the two aliases point at the same CLI).
export const CLI_BIN_NAMES = ["ecz-id-mcp-verifier", "ecz-mcp-verify"] as const;
// Canonical MCP stdio server executable name.
export const MCP_SERVER_BIN = "ecz-id-mcp-server" as const;
// Canonical MCP tool names (exactly three, all read-only).
export const MCP_TOOL_NAMES = [
  "ecz_check_target",
  "ecz_recheck_resolver",
  "ecz_explain_result"
] as const;

// ---------------------------------------------------------------------------
// MCP protocol revisions.
//
// The SDK's own default list is LEGACY-only, so 2026-07-28 is never put on the
// wire unless it is declared here explicitly. Support is deliberately DUAL-ERA:
// the modern revision first, then every legacy revision we choose to keep
// serving. Dropping the legacy entries would make the server modern-only and
// break the 2025-era hosts that use it today.
// ---------------------------------------------------------------------------

/** The MODERN revision this server implements (per-request `_meta`, stateless). */
export const MCP_MODERN_PROTOCOL_VERSION = "2026-07-28" as const;

/** LEGACY (`initialize`-handshake) revisions deliberately retained. */
export const MCP_LEGACY_PROTOCOL_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
  "2024-10-07"
] as const;

/** Every revision this server accepts, newest first. Declared to the SDK. */
export const MCP_SUPPORTED_PROTOCOL_VERSIONS = [
  MCP_MODERN_PROTOCOL_VERSION,
  ...MCP_LEGACY_PROTOCOL_VERSIONS
] as const;

// ---------------------------------------------------------------------------
// Cache policy for 2026-07-28 CacheableResult operations.
//
// The revision REQUIRES ttlMs (>= 0) and cacheScope on `server/discover` and
// `tools/list`. The SDK default (ttlMs 0, private) is already protocol-correct;
// the values below are a DELIBERATE choice, justified because both results are
// byte-identical for every caller:
//   - the tool catalogue is a fixed, compile-time set of three tools;
//   - `server/discover` returns only static identity, capabilities and versions.
// Neither depends on the caller, on authorization, or on any Resolver lookup,
// so `public` cannot leak caller-specific data. Tool RESULTS are not cacheable
// under the revision and never receive cache fields.
// ---------------------------------------------------------------------------
export const MCP_DISCOVER_TTL_MS = 3_600_000 as const;
export const MCP_TOOLS_LIST_TTL_MS = 300_000 as const;
export const MCP_CACHE_SCOPE = "public" as const;
