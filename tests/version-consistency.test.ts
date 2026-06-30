import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { VERIFIER_VERSION } from "../src/constants.js";

const ROOT = resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const server = JSON.parse(readFileSync(join(ROOT, "server.json"), "utf8"));
const lock = JSON.parse(readFileSync(join(ROOT, "package-lock.json"), "utf8"));

const EXPECTED = "0.8.0";

describe("version invariants (single source of truth across all surfaces)", () => {
  it("package.json version is the target release version", () => {
    expect(pkg.version).toBe(EXPECTED);
  });
  it("runtime constant VERIFIER_VERSION matches", () => {
    expect(VERIFIER_VERSION).toBe(EXPECTED);
  });
  it("server.json version matches", () => {
    expect(server.version).toBe(EXPECTED);
  });
  it("package-lock.json (top + root package) version matches", () => {
    expect(lock.version).toBe(EXPECTED);
    expect(lock.packages?.[""]?.version).toBe(EXPECTED);
  });
});

describe("identity invariants (mcpName === server.json.name)", () => {
  it("package.json.mcpName equals server.json.name", () => {
    expect(pkg.mcpName).toBe(server.name);
    expect(pkg.mcpName).toBe("io.github.ecocitizenz/ecz-id-mcp-verifier");
  });
  it("server.json declares the npm package identity at the same version", () => {
    const npmPkg = (server.packages || []).find(
      (p: { registryType?: string; identifier?: string }) =>
        p.registryType === "npm" && p.identifier === pkg.name
    );
    expect(npmPkg, "npm package entry in server.json").toBeTruthy();
    expect(npmPkg.version).toBe(pkg.version);
  });
});

describe("engine policy (Node >= 22.14.0)", () => {
  it("package.json engines.node is the supported floor", () => {
    expect(pkg.engines?.node).toBe(">=22.14.0");
  });
  it("package-lock.json root engines matches package.json", () => {
    expect(lock.packages?.[""]?.engines?.node).toBe(pkg.engines?.node);
  });
  it("package-lock.json root bin matches package.json bin", () => {
    expect(lock.packages?.[""]?.bin).toEqual(pkg.bin);
  });
});
