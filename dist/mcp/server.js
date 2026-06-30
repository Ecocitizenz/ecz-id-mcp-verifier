// ECZ-ID MCP server factory. One McpServer; exactly three read-only tools;
// no resources; no prompts; no sampling; no elicitation. The negotiated server
// name is stable and the negotiated version equals the package version
// (VERIFIER_VERSION). Built once here and shared by the stdio entrypoint.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools.js";
import { MCP_SERVER_NAME, VERIFIER_VERSION } from "../constants.js";
export function createServer() {
    const server = new McpServer({
        name: MCP_SERVER_NAME,
        version: VERIFIER_VERSION
    });
    registerTools(server);
    return server;
}
