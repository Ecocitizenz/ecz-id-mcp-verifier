import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { MCP_REGISTRY_NAME, MCP_SERVER_NAME } from "../src/constants.js";

const ROOT = resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const server = JSON.parse(readFileSync(join(ROOT, "server.json"), "utf8"));

const CANONICAL = "io.github.Ecocitizenz/ecz-id-mcp-verifier";
const LOWERCASE = "io.github.ecocitizenz/ecz-id-mcp-verifier";

describe("Official MCP Registry identity — canonical GitHub casing (case-sensitive)", () => {
  it("package.json.mcpName uses the exact canonical GitHub login casing (capital E)", () => {
    expect(pkg.mcpName).toBe(CANONICAL);
  });

  it("server.json.name uses the exact canonical GitHub login casing (capital E)", () => {
    expect(server.name).toBe(CANONICAL);
  });

  it("mcpName === server.json.name === runtime MCP_REGISTRY_NAME", () => {
    expect(pkg.mcpName).toBe(server.name);
    expect(MCP_REGISTRY_NAME).toBe(CANONICAL);
    expect(pkg.mcpName).toBe(MCP_REGISTRY_NAME);
  });

  it("explicitly REJECTS the lowercase namespace (the 0.8.1 casing that caused the 403)", () => {
    expect(pkg.mcpName).not.toBe(LOWERCASE);
    expect(server.name).not.toBe(LOWERCASE);
    expect(MCP_REGISTRY_NAME).not.toBe(LOWERCASE);
  });

  it("server.json repository, package identifier and stdio transport are exact", () => {
    expect(server.repository?.url).toBe("https://github.com/Ecocitizenz/ecz-id-mcp-verifier");
    expect(server.repository?.source).toBe("github");
    const npmPkg = (server.packages || []).find(
      (p: { registryType?: string }) => p.registryType === "npm"
    );
    expect(npmPkg?.identifier).toBe("@ecocitizenz/ecz-id-mcp-verifier");
    expect(npmPkg?.transport?.type).toBe("stdio");
  });

  it("the runtime MCP server name stays lowercase and is NOT the Registry identity", () => {
    // Registry identity (reverse-DNS) differs from the runtime initialize-handshake name.
    expect(MCP_SERVER_NAME).toBe("ecz-id-mcp-verifier");
    expect(MCP_SERVER_NAME).not.toBe(MCP_REGISTRY_NAME);
  });
});
