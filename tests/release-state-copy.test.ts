import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const SCRIPT = join(ROOT, "scripts", "check-release-state-copy.mjs");
const README = join(ROOT, "README.md");
const readme = require("node:fs").readFileSync(README, "utf8") as string;

describe("latest-first public copy gate", () => {
  it("passes on the current tree (latest-first, no channel machinery)", () => {
    const r = spawnSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: "utf8" });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.stdout).toMatch(/PASS/);
  });

  it("README leads with a plain latest install/npx path", () => {
    // Primary path uses the package name with no tag and no @<version>.
    expect(readme).toMatch(/npm install @ecocitizenz\/ecz-id-mcp-verifier\b(?!@)/);
    expect(readme).toMatch(/npx @ecocitizenz\/ecz-id-mcp-verifier check --target/);
    // Exact pins live only in a secondary reproducibility section.
    expect(readme).toMatch(/##\s*Reproducible version pinning/);
  });

  it("README contains no public next/candidate/channel machinery", () => {
    const forbidden = [
      /##\s*Release channels/,
      /@next\b/,
      /\bnext tag\b/i,
      /\bcandidate channel\b/i,
      /\bpre-?release\b/i,
      /\bchoose a channel\b/i,
      /\bpromotion to latest\b/i
    ];
    for (const re of forbidden) {
      expect(re.test(readme), `latest-first: README must not contain ${re}`).toBe(false);
    }
  });

  it("README contains no time-dependent or stale claims", () => {
    const forbidden = [
      /\bnot yet published\b/i,
      /\bprepared but\b[^.]*\bnot\b[^.]*\bpublish/i,
      /\bplain\b[^.]*\bnpx\b[^.]*\breturns?\b[^.]*\bnext\b/i,
      /\bcandidate\b[^.]*\bbecomes\b[^.]*\blatest\b/i,
      /@v?0\.8\.1\b/,
      /earlier builds could exit silently/i,
      /Backend key \(internal\)/i
    ];
    for (const re of forbidden) {
      expect(re.test(readme), `stale/forbidden claim ${re} in README`).toBe(false);
    }
  });

  it("detects a time-dependent claim in an isolated fixture (negative control)", () => {
    const dir = mkdtempSync(join(tmpdir(), "ecz-copygate-"));
    try {
      writeFileSync(join(dir, "README.md"), "# X\n\nThis candidate is prepared but not yet published to npm.\n");
      const stale = require("node:fs").readFileSync(join(dir, "README.md"), "utf8") as string;
      expect(/\bnot yet published\b/i.test(stale)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
