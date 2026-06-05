import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const action = readFileSync(join(ROOT, "action.yml"), "utf8");
const readme = readFileSync(join(ROOT, "README.md"), "utf8");

describe("GitHub Action", () => {
  it("declares all required inputs", () => {
    for (const k of [
      "target",
      "target-type",
      "policy",
      "operator",
      "resolver-base",
      "no-network",
      "timeout-ms"
    ]) {
      expect(action).toMatch(new RegExp(`^\\s{2}${k}:`, "m"));
    }
  });
  it("declares all required outputs", () => {
    for (const k of [
      "result-state",
      "reason-codes",
      "action-envelope-json",
      "acquisition-flow-json",
      "mcp-action-envelope-json",
      "request-to-resolve-json",
      "primary-action",
      "trustops-action-url",
      "developer-guidance-url"
    ]) {
      expect(action).toMatch(new RegExp(`^\\s{2}${k}:`, "m"));
    }
  });
  it("uses node20 runtime and the dist/action.js adapter entrypoint", () => {
    expect(action).toMatch(/using:\s*["']?node20["']?/);
    expect(action).toMatch(/main:\s*["']dist\/action\.js["']/);
    // Must NOT run the CLI directly: it parses argv, not INPUT_* env vars.
    expect(action).not.toMatch(/main:\s*["']dist\/cli\.js["']/);
  });
  it("description carries no-truth-write boundary", () => {
    expect(action.toLowerCase()).toMatch(/does not write truth/);
  });
});

describe("README documentation", () => {
  it("documents role split", () => {
    expect(readme).toMatch(/Backend\s*\/\s*Core/);
    expect(readme).toMatch(/Resolver/);
    expect(readme).toMatch(/TrustOps/);
    expect(readme).toMatch(/Developer Gateway/);
    expect(readme).toMatch(/MCP Verifier/);
    expect(readme).toMatch(/does \*\*not\*\* write truth/i);
  });
  it("documents policy modes", () => {
    expect(readme).toMatch(/\bOPEN\b/);
    expect(readme).toMatch(/\bPREFER\b/);
    expect(readme).toMatch(/\bREQUIRE\b/);
  });
  it("documents exit codes 0..6", () => {
    for (const n of [0, 1, 2, 3, 4, 5, 6]) {
      expect(readme).toMatch(new RegExp(`\\|\\s*${n}\\s*\\|`));
    }
  });
  it("documents privacy posture (no-upload, opt-out network)", () => {
    expect(readme.toLowerCase()).toMatch(/no source upload/);
    expect(readme.toLowerCase()).toMatch(/no secrets upload/);
    expect(readme.toLowerCase()).toMatch(/network is opt-out/);
  });
  it("documents canonical URLs", () => {
    expect(readme).toMatch(/https:\/\/resolver\.ecocitizenz\.org/);
    expect(readme).toMatch(/https:\/\/trustops\.ecocitizenz\.com\/start/);
    expect(readme).toMatch(/https:\/\/developers\.ecocitizenz\.com/);
  });
  it("does not introduce MCP Passport or Reciprocity Passport", () => {
    expect(/MCP[_ ]?Passport/i.test(readme)).toBe(false);
    expect(/Reciprocity[_ ]?Passport/i.test(readme)).toBe(false);
  });
});
