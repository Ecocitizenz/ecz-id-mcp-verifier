import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { UNRESOLVED_PROOF_COPY, operateRouteLine } from "../src/copy.js";

/** The one version this release ships; every public pin in README must match it. */
const PKG_VERSION: string = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
).version;

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
    // (Ecocitizenz/ecz-id-mcp-verifier@v<version>); match case-insensitively.
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
    // Derived from package.json rather than hardcoded: a release must not be
    // able to move the version and leave the README behind, and the guard must
    // not have to be edited (and possibly weakened) at every release. This is
    // strictly stronger than the previous literal — it now fails on drift in
    // either direction.
    expect(readme).toContain(`@ecocitizenz/ecz-id-mcp-verifier@${PKG_VERSION}`);
    expect(readme).toContain(`Ecocitizenz/ecz-id-mcp-verifier@v${PKG_VERSION}`);
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

// ---------------------------------------------------------------------------
// Every exact pin of this package on a public surface must be the version this
// tree ships. 0.8.2 -> 0.9.0 -> 0.9.1 each left at least one stale @<old> pin
// behind (the 0.9.1 tarball itself shipped a README that still said 0.8.2 and
// v0.8.4), so the rule is derived from package.json and covers every surface a
// reader installs from, not only README.
// ---------------------------------------------------------------------------
describe("copy guardrails: every public pin tracks package.json", () => {
  const esc = (v: string) => v.replace(/\./g, "\\.");
  const PIN = /ecz-id-mcp-verifier@v?(\d+\.\d+\.\d+)\b/g;
  const surfaces: Record<string, string> = {
    "README.md": readme,
    "AGENTS.md": readFileSync(join(ROOT, "AGENTS.md"), "utf8"),
    "SUPPORT.md": readFileSync(join(ROOT, "SUPPORT.md"), "utf8"),
    ".github/ISSUE_TEMPLATE/mcp-host-setup.yml": readFileSync(
      join(ROOT, ".github", "ISSUE_TEMPLATE", "mcp-host-setup.yml"),
      "utf8"
    ),
    "examples/github-action.yml": readFileSync(join(ROOT, "examples", "github-action.yml"), "utf8")
  };

  it("the shipped GitHub Action example pins the immutable release tag for this version", () => {
    expect(surfaces["examples/github-action.yml"]).toMatch(
      new RegExp(`uses:\\s*Ecocitizenz/ecz-id-mcp-verifier@v${esc(PKG_VERSION)}\\b`)
    );
  });

  it("no public surface carries an exact pin of any other version (drift in either direction)", () => {
    for (const [name, text] of Object.entries(surfaces)) {
      const versions = [...text.matchAll(PIN)].map((m) => m[1]);
      expect(versions.length, `${name}: expected at least one exact pin`).toBeGreaterThan(0);
      expect(new Set(versions), `${name}: pinned versions`).toEqual(new Set([PKG_VERSION]));
    }
  });

  it("SECURITY.md names this version as the supported release", () => {
    const security = readFileSync(join(ROOT, "SECURITY.md"), "utf8");
    expect(security).toMatch(new RegExp(`\\|\\s*${esc(PKG_VERSION)}\\s*\\|\\s*✅`));
    expect(security).toContain(`The current supported release is \`${PKG_VERSION}\`.`);
  });

  it("the shipped example outputs report this version", () => {
    for (const f of ["json-output-missing-proof.json", "json-output-resolver-verifiable.json"]) {
      const ex = JSON.parse(readFileSync(join(ROOT, "examples", f), "utf8"));
      expect(ex.verifier_version, `examples/${f}`).toBe(PKG_VERSION);
    }
    expect(readme).toContain(`"verifier_version": "${PKG_VERSION}"`);
  });
});
