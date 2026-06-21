import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { UNRESOLVED_PROOF_COPY, operateRouteLine } from "../src/copy.js";

const ROOT = resolve(__dirname, "..");
const readme = readFileSync(join(ROOT, "README.md"), "utf8");

describe("copy guardrails: unresolved proof copy", () => {
  it("matches the exact approved wording", () => {
    expect(UNRESOLVED_PROOF_COPY).toBe(
      "No public resolver proof was found for this MCP target yet. " +
        "This does not mean the target is unsafe. " +
        "It means ECZ-ID could not locate machine-readable public proof " +
        "for the accountable operator. Your local policy decides the action."
    );
  });

  it("contains no forbidden positive claims (allowing the sanctioned negation)", () => {
    // Remove the single approved negation phrase, then scan the remainder.
    const stripped = UNRESOLVED_PROOF_COPY.replace(
      "This does not mean the target is unsafe. ",
      ""
    );
    const forbidden = [
      /\bsafe\b/i,
      /\bunsafe\b/i,
      /\bcertified\b/i,
      /\bapproved\b/i,
      /\bguaranteed\b/i,
      /\bfully compliant\b/i,
      /\becz-certified\b/i,
      /\bnpm verified\b/i,
      /\bpypi endorsed\b/i,
      /\bgithub approved\b/i,
      /\bai safety certified\b/i,
      /\btrusted by platform\b/i
    ];
    for (const re of forbidden) {
      expect(re.test(stripped), `forbidden token ${re} in unresolved copy`).toBe(false);
    }
  });

  it("operate route uses the canonical TrustOps start URL", () => {
    expect(operateRouteLine()).toBe(
      "Operate this server? Improve its resolver posture: https://trustops.ecocitizenz.com/start"
    );
  });
});

describe("copy guardrails: README", () => {
  it("documents the npx first-use check command", () => {
    expect(readme).toMatch(/npx @ecocitizenz\/ecz-id-mcp-verifier check --target/);
  });

  it("documents a GitHub Action usage example with target and policy", () => {
    // v0.7.1 README pins the immutable tag with canonical owner casing
    // (Ecocitizenz/ecz-id-mcp-verifier@v0.7.1); match case-insensitively.
    expect(readme).toMatch(/uses:\s*ecocitizenz\/ecz-id-mcp-verifier/i);
    expect(readme).toMatch(/^\s*target:/m);
    expect(readme).toMatch(/^\s*policy:/m);
  });

  it("includes the exact unresolved proof copy verbatim", () => {
    expect(readme).toContain(UNRESOLVED_PROOF_COPY);
  });

  it("includes the operator resolver-posture route", () => {
    expect(readme).toContain(
      "Operate this server? Improve its resolver posture: https://trustops.ecocitizenz.com/start"
    );
  });

  it("states the free-forever proprietary (not open source) posture", () => {
    expect(readme).toMatch(/free forever/i);
    expect(readme).toMatch(/not\b[^.]*open source/i);
    // README now asserts the published posture (the obsolete readiness heading was removed).
    expect(readme).toContain("## Publication status");
    expect(readme).toContain("@ecocitizenz/ecz-id-mcp-verifier@0.7.0");
    expect(readme).toContain("Ecocitizenz/ecz-id-mcp-verifier@v0.7.1");
    expect(readme).toMatch(
      /Published package versions and Action release tags are[\s\S]{0,40}\*\*immutable\*\*/i
    );
  });

  it("contains no forbidden overclaim wording", () => {
    const forbidden = [
      /\bis safe\b/i,
      /\bare safe\b/i,
      /\bis certified\b/i,
      /\bare certified\b/i,
      /\bis approved\b/i,
      /\bare approved\b/i,
      /\bguaranteed\b/i,
      /\bfully compliant\b/i,
      /\bnpm verified\b/i,
      /\bpypi endorsed\b/i,
      /\bgithub approved\b/i,
      /\bai safety certified\b/i,
      /\becz-certified\b/i,
      /\btrusted by platform\b/i,
      /\bproof required by ecz-id\b/i,
      /\bblocked because no ecz-id\b/i,
      /\bfailed safety verification\b/i
    ];
    for (const re of forbidden) {
      expect(re.test(readme), `forbidden README wording ${re}`).toBe(false);
    }
  });
});
