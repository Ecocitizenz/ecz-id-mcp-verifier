#!/usr/bin/env node
// Dedicated executable entrypoint for the ECZ-ID MCP Verifier CLI.
//
// This wrapper's ONLY responsibility is to invoke the CLI main() function. It
// performs no path-equality / self-execution heuristic, so the CLI runs
// correctly however the bin was resolved — direct path, relative path, a path
// containing "..", an npm-installed .bin symlink (Linux/macOS), a Windows
// junction, or a shim. The CLI implementation lives in `../cli.js` and is
// import-only (importing it has no side effect); this wrapper is the sole bin
// target for both `ecz-id-mcp-verifier` and `ecz-mcp-verify`.
import { main } from "../cli.js";
main()
    .then((code) => {
    process.exit(code);
})
    .catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`ecz-id-mcp-verifier: fatal: ${message}\n`);
    process.exit(1);
});
