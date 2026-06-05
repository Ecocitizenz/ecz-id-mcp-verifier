import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

describe("package metadata: publish guard stays in place", () => {
  it("remains private", () => {
    expect(pkg.private).toBe(true);
  });

  it("keeps the prepublishOnly publish guard", () => {
    expect(String(pkg.scripts?.prepublishOnly)).toMatch(/publishing is disabled/i);
  });

  it("keeps the canonical package name", () => {
    expect(pkg.name).toBe("@ecocitizenz/ecz-id-mcp-verifier");
  });
});

describe("package metadata: repository field", () => {
  it("is present and well-formed only when a git remote was detected; otherwise publish stays blocked", () => {
    if (pkg.repository) {
      const url =
        typeof pkg.repository === "string" ? pkg.repository : pkg.repository.url;
      expect(typeof url).toBe("string");
      // Trusted publishing/provenance requires an exact git+https GitHub URL.
      expect(url).toMatch(/^git\+https:\/\/github\.com\/.+/);
    } else {
      // No canonical Git remote was detected during the fix pass.
      // We did not invent a URL; publish proof remains blocked via private/guard.
      expect(pkg.private).toBe(true);
    }
  });
});
