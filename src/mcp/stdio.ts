#!/usr/bin/env node
// stdio entrypoint for the ECZ-ID MCP server (bin: ecz-id-mcp-server).
//
// stdio is the sole transport, by deliberate product decision: the verifier is
// local-first and has nothing to serve remotely. Protocol travels on stdout;
// every human or diagnostic line goes to stderr only, so the JSON-RPC stream is
// never corrupted. No background reporting. No source/secret upload. No local
// file access.
//
// Era handling is owned by the SDK's `serveStdio` entry, which inspects the
// opening exchange and pins ONE server instance from the factory for the
// lifetime of the connection:
//   - a modern opening (`server/discover`, or any request carrying the
//     per-request `_meta` envelope) is served statelessly at MCP 2026-07-28;
//   - a legacy opening (`initialize`) is served at the negotiated 2025-era
//     revision, exactly as before.
// `legacy: 'serve'` is the default and is stated explicitly here because
// dual-era support is a product commitment, not an accident of defaults.

import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server.js";
import { MCP_SERVER_NAME, VERIFIER_VERSION } from "../constants.js";

function main(): void {
  serveStdio(() => createServer(), {
    legacy: "serve",
    // Reporting only — never alters what is written to the wire, and stderr
    // keeps the JSON-RPC stream on stdout clean.
    onerror: (err: Error) => {
      process.stderr.write(`[${MCP_SERVER_NAME}] error: ${err.message}\n`);
    }
  });
  // Readiness log on stderr only — never stdout.
  process.stderr.write(`[${MCP_SERVER_NAME}] v${VERIFIER_VERSION} ready on stdio\n`);
}

try {
  main();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[ecz-id-mcp-server] fatal: ${message}\n`);
  process.exit(1);
}
