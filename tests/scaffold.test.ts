import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { RESULT_STATES } from "../src/result-states.js";
import { REASON_CODES } from "../src/reason-codes.js";
import { POLICY_MODES } from "../src/policy.js";
import { PRIVACY } from "../src/privacy.js";
import {
  RESOLVER_BASE,
  TRUSTOPS_START,
  DEVELOPER_GATEWAY
} from "../src/constants.js";

const ROOT = resolve(__dirname, "..");

function readAllSourceFiles(): { path: string; content: string }[] {
  const out: { path: string; content: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (p.endsWith(".ts")) out.push({ path: p, content: readFileSync(p, "utf8") });
    }
  };
  walk(join(ROOT, "src"));
  return out;
}

describe("scaffold: package", () => {
  it("package.json exists and is private", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(pkg.private).toBe(true);
    expect(pkg.name).toBe("@ecocitizenz/ecz-id-mcp-verifier");
    expect(pkg.scripts.test).toBeDefined();
    expect(pkg.scripts.typecheck).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts["verify:scaffold"]).toBeDefined();
  });
});

describe("scaffold: ResultStates", () => {
  it("has exactly 18 canonical values", () => {
    expect(RESULT_STATES.length).toBe(18);
    expect(new Set(RESULT_STATES).size).toBe(18);
  });

  it("does not contain FAILED_VERIFICATION", () => {
    expect((RESULT_STATES as readonly string[]).includes("FAILED_VERIFICATION")).toBe(false);
  });
});

describe("scaffold: ReasonCodes", () => {
  it("are all uppercase snake-case", () => {
    for (const c of REASON_CODES) {
      expect(c).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });
});

describe("scaffold: canonical URLs", () => {
  it("match canonical hosts", () => {
    expect(RESOLVER_BASE).toBe("https://resolver.ecocitizenz.org");
    expect(TRUSTOPS_START).toBe("https://trustops.ecocitizenz.com/start");
    expect(DEVELOPER_GATEWAY).toBe("https://developers.ecocitizenz.com");
  });
});

describe("scaffold: policy modes", () => {
  it("are exactly OPEN / PREFER / REQUIRE", () => {
    expect([...POLICY_MODES]).toEqual(["OPEN", "PREFER", "REQUIRE"]);
  });
});

describe("scaffold: privacy invariants", () => {
  it("assert privacy posture", () => {
    expect(PRIVACY.no_source_upload).toBe(true);
    expect(PRIVACY.no_secrets_upload).toBe(true);
    expect(PRIVACY.no_telemetry).toBe(true);
    expect(PRIVACY.local_policy_decides).toBe(true);
    expect(PRIVACY.recheck_before_reliance).toBe(true);
    expect(PRIVACY.no_safety_or_approval_inference).toBe(true);
  });
});

describe("scaffold: forbidden imports", () => {
  const sources = readAllSourceFiles();
  const forbidden = [
    "openai",
    "@anthropic",
    "anthropic",
    "langchain",
    "autogen",
    "crewai",
    "llamaindex",
    "@sentry",
    "posthog"
  ];

  for (const f of forbidden) {
    it(`no source imports ${f}`, () => {
      for (const { path, content } of sources) {
        const importRe = new RegExp(`(from|require)\\s*\\(?['"\`][^'"\`]*${f}[^'"\`]*['"\`]`, "i");
        expect(importRe.test(content), `forbidden import ${f} in ${path}`).toBe(false);
      }
    });
  }
});

describe("scaffold: forbidden telemetry tokens", () => {
  const sources = readAllSourceFiles();
  const forbidden = ["telemetry", "analytics", "sentry", "posthog"];

  for (const token of forbidden) {
    it(`no source mentions ${token} as a runtime call`, () => {
      for (const { path, content } of sources) {
        // Allow the word inside privacy.ts (boundary statement file).
        if (path.endsWith("privacy.ts")) continue;
        expect(content.toLowerCase().includes(token), `${token} found in ${path}`).toBe(false);
      }
    });
  }
});

describe("scaffold: forbidden operations", () => {
  const sources = readAllSourceFiles();
  const forbidden = [
    "checkout",
    "payment",
    "activate_proof",
    "activateProof",
    "mark_bound",
    "markBound"
  ];

  for (const token of forbidden) {
    it(`no source contains ${token}`, () => {
      for (const { path, content } of sources) {
        expect(content.includes(token), `${token} found in ${path}`).toBe(false);
      }
    });
  }
});

describe("scaffold: no passport concepts", () => {
  const sources = readAllSourceFiles();
  it("does not introduce MCP Passport or Reciprocity Passport", () => {
    for (const { path, content } of sources) {
      expect(/MCP[_ ]?Passport/i.test(content), `MCP Passport in ${path}`).toBe(false);
      expect(/Reciprocity[_ ]?Passport/i.test(content), `Reciprocity Passport in ${path}`).toBe(false);
    }
  });
});

describe("scaffold: no mojibake", () => {
  const sources = readAllSourceFiles();
  it("source contains no mojibake replacement characters", () => {
    for (const { path, content } of sources) {
      expect(content.includes("\uFFFD"), `mojibake in ${path}`).toBe(false);
      expect(/Ã.|â€™|â€œ|â€\u009d/.test(content), `mojibake-like sequence in ${path}`).toBe(false);
    }
  });
});

describe("scaffold: README role split", () => {
  const readme = readFileSync(join(ROOT, "README.md"), "utf8");
  it("contains role-split rows", () => {
    expect(readme).toMatch(/Backend\s*\/\s*Core/);
    expect(readme).toMatch(/Resolver/);
    expect(readme).toMatch(/TrustOps/);
    expect(readme).toMatch(/Developer Gateway/);
    expect(readme).toMatch(/MCP Verifier/);
    expect(readme).toMatch(/does \*\*not\*\* write truth/i);
  });
});

describe("scaffold: action.yml", () => {
  const action = readFileSync(join(ROOT, "action.yml"), "utf8");
  it("declares required inputs", () => {
    for (const input of ["target", "target-type", "policy", "resolver-base", "no-network", "timeout-ms"]) {
      expect(action).toMatch(new RegExp(`^\\s{2}${input}:`, "m"));
    }
  });
  it("declares required outputs", () => {
    for (const out of ["result-state", "reason-codes", "action-envelope-json"]) {
      expect(action).toMatch(new RegExp(`^\\s{2}${out}:`, "m"));
    }
  });
});
