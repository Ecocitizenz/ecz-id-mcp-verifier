// ECZ-ID MCP server factory. One McpServer; exactly three read-only tools;
// no resources; no prompts; no sampling; no elicitation. The negotiated server
// name is stable and the negotiated version equals the package version
// (VERIFIER_VERSION). Built once here and shared by the stdio entrypoint.
//
// Protocol: DUAL-ERA by deliberate choice. MCP 2026-07-28 (modern: per-request
// `_meta`, stateless, `server/discover`) is declared explicitly — the SDK's own
// default version list is legacy-only, so nothing speaks 2026-07-28 unless it
// is named here. The retained legacy revisions keep every 2025-era host that
// works today working unchanged.
import { McpServer } from "@modelcontextprotocol/server";
import { registerTools } from "./tools.js";
import { MCP_SERVER_NAME, VERIFIER_VERSION, MCP_SUPPORTED_PROTOCOL_VERSIONS, MCP_DISCOVER_TTL_MS, MCP_TOOLS_LIST_TTL_MS, MCP_CACHE_SCOPE } from "../constants.js";
export function createServer() {
    const server = new McpServer({
        name: MCP_SERVER_NAME,
        version: VERIFIER_VERSION
    }, {
        // Tools only. No resources, prompts, sampling, roots, logging or
        // elicitation are declared, so none can be negotiated.
        capabilities: { tools: {} },
        // Explicit 2026-07-28 adoption + retained legacy rails.
        supportedProtocolVersions: [...MCP_SUPPORTED_PROTOCOL_VERSIONS],
        // 2026-07-28 CacheableResult fields. Both results are identical for
        // every caller and carry no authorization-specific data, so `public` is
        // safe. Tool results are not cacheable under the revision.
        cacheHints: {
            "server/discover": { ttlMs: MCP_DISCOVER_TTL_MS, cacheScope: MCP_CACHE_SCOPE },
            "tools/list": { ttlMs: MCP_TOOLS_LIST_TTL_MS, cacheScope: MCP_CACHE_SCOPE }
        }
    });
    registerTools(server);
    return server;
}
