import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const server = JSON.parse(readFileSync(join(ROOT, "server.json"), "utf8"));

describe("server.json: Registry metadata invariants", () => {
  it("mcpName equals server.json name (reverse-DNS Registry identity)", () => {
    expect(pkg.mcpName).toBe("io.github.Ecocitizenz/ecz-id-mcp-verifier");
    expect(server.name).toBe(pkg.mcpName);
  });

  it("server.json version equals package.json version", () => {
    expect(server.version).toBe(pkg.version);
  });

  it("declares an npm package whose identifier is the real package name", () => {
    expect(Array.isArray(server.packages)).toBe(true);
    const npmPkg = server.packages.find(
      (p: { registryType?: string; identifier?: string }) =>
        p.registryType === "npm" && p.identifier === pkg.name
    );
    expect(npmPkg, "npm package entry with matching identifier").toBeTruthy();
    expect(npmPkg.version).toBe(pkg.version);
  });

  it("advertises stdio transport (the Phase 3 transport)", () => {
    const transports = server.packages.map(
      (p: { transport?: { type?: string } }) => p.transport?.type
    );
    expect(transports).toContain("stdio");
  });

  it("carries a $schema and a canonical GitHub repository", () => {
    expect(typeof server.$schema).toBe("string");
    expect(String(server.repository?.url)).toMatch(/^https:\/\/github\.com\/.+/);
  });

  it("does not advertise any transport other than stdio in this version", () => {
    for (const p of server.packages) {
      expect(["stdio"]).toContain(p.transport?.type);
    }
  });
});
