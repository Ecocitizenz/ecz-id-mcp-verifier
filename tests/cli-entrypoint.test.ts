import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const cliSrc = readFileSync(join(ROOT, "src", "cli.ts"), "utf8");
const binSrc = readFileSync(join(ROOT, "src", "bin", "cli.ts"), "utf8");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

describe("CLI entrypoint architecture (P0B-1 fix: dedicated wrapper, no path guard)", () => {
  it("src/cli.ts no longer self-executes via a fragile path-equality guard", () => {
    // The defect was: runAsScript = fileURLToPath(import.meta.url) === process.argv[1].
    expect(cliSrc).not.toMatch(/runAsScript/);
    expect(cliSrc).not.toMatch(/process\.argv\[1\][\s\S]{0,80}import\.meta\.url/);
    expect(cliSrc).not.toMatch(/import\.meta\.url[\s\S]{0,80}process\.argv\[1\]/);
    // cli.ts must not call main() at module top-level (import-only).
    expect(cliSrc).not.toMatch(/^\s*main\(\)/m);
  });

  it("src/cli.ts still exports the importable CLI surface", () => {
    expect(cliSrc).toMatch(/export async function main/);
    expect(cliSrc).toMatch(/export async function runCli/);
    expect(cliSrc).toMatch(/export function parseArgs/);
  });

  it("src/bin/cli.ts is a dedicated wrapper that imports and invokes main()", () => {
    expect(binSrc).toMatch(/from\s+["']\.\.\/cli\.js["']/);
    expect(binSrc).toMatch(/\bmain\(\)/);
    expect(binSrc).toMatch(/process\.exit/);
    // Wrapper must not reintroduce the path-equality guard.
    expect(binSrc).not.toMatch(/runAsScript/);
    expect(binSrc).not.toMatch(/import\.meta\.url/);
  });

  it("both CLI aliases point at the compiled wrapper (dist/bin/cli.js)", () => {
    expect(pkg.bin?.["ecz-id-mcp-verifier"]).toBe("dist/bin/cli.js");
    expect(pkg.bin?.["ecz-mcp-verify"]).toBe("dist/bin/cli.js");
    // Both aliases invoke the SAME compiled wrapper.
    expect(pkg.bin?.["ecz-id-mcp-verifier"]).toBe(pkg.bin?.["ecz-mcp-verify"]);
    // The MCP server bin is unchanged.
    expect(pkg.bin?.["ecz-id-mcp-server"]).toBe("dist/mcp/stdio.js");
  });
});
