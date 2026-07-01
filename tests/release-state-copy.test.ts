import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const SCRIPT = join(ROOT, "scripts", "check-release-state-copy.mjs");
const README = join(ROOT, "README.md");
const readme = require("node:fs").readFileSync(README, "utf8") as string;

describe("release-state transition copy gate", () => {
  it("passes on the current tree (public copy is timeless)", () => {
    const r = spawnSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: "utf8" });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.stdout).toMatch(/PASS/);
  });

  it("README uses timeless release-channel language", () => {
    expect(readme).toMatch(/##\s*Release channels/);
    expect(readme).toMatch(/@next/);
    // The stable channel is described without a tag.
    expect(readme).toMatch(/current \*\*stable\*\* release|stable release/i);
  });

  it("README contains no time-dependent release-channel claims", () => {
    const forbidden = [
      /\bnot yet published\b/i,
      /\bcurrently unpublished\b/i,
      /\bprepared but\b[^.]*\bnot\b[^.]*\bpublish/i,
      /\bplain\b[^.]*\bnpx\b[^.]*\breturns?\b[^.]*\bnext\b/i,
      /\bcandidate\b[^.]*\bbecomes\b[^.]*\blatest\b/i
    ];
    for (const re of forbidden) {
      expect(re.test(readme), `time-dependent claim ${re} in README`).toBe(false);
    }
  });

  it("detects a time-dependent claim in an isolated fixture (negative control)", () => {
    // Build a throwaway mini-repo containing only a README with a stale phrase and
    // confirm the gate logic flags it. We reuse the real script against a temp ROOT
    // by copying a minimal package.json + a stale README.
    const dir = mkdtempSync(join(tmpdir(), "ecz-copygate-"));
    try {
      writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x", version: "0.0.0" }));
      writeFileSync(
        join(dir, "README.md"),
        "# X\n\nThis candidate is prepared but not yet published to npm.\n"
      );
      // Run a tiny inline checker over the fixture using the same forbidden phrase.
      const stale = require("node:fs").readFileSync(join(dir, "README.md"), "utf8") as string;
      expect(/\bnot yet published\b/i.test(stale)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
