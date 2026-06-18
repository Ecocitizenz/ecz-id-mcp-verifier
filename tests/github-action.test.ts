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
      "setup-handoff-json",
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
  it("README documents minimum permissions (contents: read) and no-write posture", () => {
    expect(readme).toMatch(/permissions:\s*\n\s*contents:\s*read/);
    expect(readme.toLowerCase()).toMatch(/mutate the repository/);
  });
});

describe("workflows: least-privilege, no NPM_TOKEN, publish prepared-not-run", () => {
  const ci = readFileSync(join(ROOT, ".github", "workflows", "ci.yml"), "utf8");
  const publish = readFileSync(join(ROOT, ".github", "workflows", "publish-npm.yml"), "utf8");

  it("CI runs read-only with contents: read and no publish", () => {
    expect(ci).toMatch(/permissions:\s*\n\s*contents:\s*read/);
    expect(/npm\s+publish/.test(ci)).toBe(false);
  });
  it("publish workflow uses OIDC trusted publishing, not a long-lived NPM_TOKEN", () => {
    expect(publish).toMatch(/id-token:\s*write/);
    expect(publish).toMatch(/contents:\s*read/);
    // No real token usage (a "No NPM_TOKEN" comment is allowed; a secrets/env
    // token reference is not).
    expect(/secrets\.[A-Za-z_]*TOKEN/.test(publish)).toBe(false);
    expect(/NODE_AUTH_TOKEN\s*:/.test(publish)).toBe(false);
  });
  it("publish workflow is gated (manual dispatch + protected environment), not auto-run", () => {
    expect(publish).toMatch(/workflow_dispatch/);
    expect(publish).toMatch(/environment:\s*npm-release/);
    // Must not auto-publish on push.
    expect(/on:\s*\n\s*push:/.test(publish)).toBe(false);
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
