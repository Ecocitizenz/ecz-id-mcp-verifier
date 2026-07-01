import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

describe("package metadata: intentionally publishable (release candidate)", () => {
  it("is not marked private", () => {
    expect(pkg.private).not.toBe(true);
  });

  it("declares public access (and provenance) via publishConfig", () => {
    expect(pkg.publishConfig?.access).toBe("public");
    expect(pkg.publishConfig?.provenance).toBe(true);
  });

  it("replaces the deliberate publish-blocker with the complete release gate", () => {
    const pre = String(pkg.scripts?.prepublishOnly ?? "");
    expect(pre).toMatch(/release:full/);
    expect(pre).not.toMatch(/publishing is disabled/i);
    // The release gate must not recursively call npm pack from a lifecycle hook.
    expect(pre).not.toMatch(/npm pack|pack:inspect/);
    expect(String(pkg.scripts?.["release:check"] ?? "")).not.toMatch(/npm pack/);
    expect(String(pkg.scripts?.["release:full"] ?? "")).not.toMatch(/npm pack\b|pack:inspect/);
  });

  it("exposes the required release scripts (incl. the complete gate)", () => {
    for (const s of [
      "build", "typecheck", "test", "scan:public", "scan:secrets",
      "release:check", "release:full", "pack:inspect",
      "check:workflow-policy", "check:pack", "proof:mcp-stdio", "proof:cli-bin", "validate:server-json"
    ]) {
      expect(typeof pkg.scripts?.[s], `missing script ${s}`).toBe("string");
    }
  });

  it("requires Node >= 22.14.0", () => {
    expect(pkg.engines?.node).toBe(">=22.14.0");
  });

  it("keeps the canonical package name and version", () => {
    expect(pkg.name).toBe("@ecocitizenz/ecz-id-mcp-verifier");
    expect(pkg.version).toBe("0.8.2");
  });

  it("references the proprietary licence file (no invented SPDX id)", () => {
    expect(pkg.license).toBe("SEE LICENSE IN LICENSE.md");
  });

  it("keeps a strict files allow-list with no source/tests/internal docs", () => {
    expect(Array.isArray(pkg.files)).toBe(true);
    expect(pkg.files).toEqual(
      expect.arrayContaining(["dist", "action.yml", "README.md", "LICENSE.md", "examples"])
    );
    expect(pkg.files).not.toContain("src");
    expect(pkg.files).not.toContain("tests");
    expect(pkg.files.some((f: string) => f.includes("distribution"))).toBe(false);
  });

  it("preserves correct bin / main / types / exports", () => {
    expect(pkg.bin?.["ecz-mcp-verify"]).toBe("dist/bin/cli.js");
    expect(pkg.bin?.["ecz-id-mcp-verifier"]).toBe("dist/bin/cli.js");
    expect(pkg.main).toBe("dist/index.js");
    expect(pkg.types).toBe("dist/index.d.ts");
    expect(pkg.exports?.["."]?.default).toBe("./dist/index.js");
  });
});

describe("package metadata: repository field (provenance/OIDC)", () => {
  it("is present and an exact git+https GitHub URL", () => {
    const url = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
    expect(typeof url).toBe("string");
    expect(url).toMatch(/^git\+https:\/\/github\.com\/.+\.git$/);
  });

  it("carries a bugs URL on the same repo", () => {
    expect(String(pkg.bugs?.url)).toMatch(/^https:\/\/github\.com\/.+\/issues$/);
  });
});
