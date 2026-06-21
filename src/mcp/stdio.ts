#!/usr/bin/env node
// stdio entrypoint for the ECZ-ID MCP server (bin: ecz-id-mcp-server).
//
// stdio is the sole Phase 3 transport. Protocol travels on stdout; every human
// or diagnostic line goes to stderr only, so the JSON-RPC stream is never
// corrupted. No background reporting. No source/secret upload. No local file access.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { MCP_SERVER_NAME, VERIFIER_VERSION } from "../constants.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Readiness log on stderr only — never stdout.
  process.stderr.write(`[${MCP_SERVER_NAME}] v${VERIFIER_VERSION} ready on stdio\n`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[ecz-id-mcp-server] fatal: ${message}\n`);
  process.exit(1);
});
