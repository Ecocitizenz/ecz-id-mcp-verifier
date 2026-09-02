import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

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

describe("privacy / safety: no forbidden runtime libraries", () => {
  const sources = readAllSourceFiles();
  const libs = [
    /\bopenai\b/i,
    /@anthropic/i,
    /\banthropic\b/i,
    /\blangchain\b/i,
    /\bautogen\b/i,
    /\bcrewai\b/i,
    /\bllamaindex\b/i,
    /@sentry/i,
    /\bposthog\b/i
  ];
  for (const re of libs) {
    it(`src contains no reference to ${re}`, () => {
      for (const { path, content } of sources) {
        expect(re.test(content), `${re} in ${path}`).toBe(false);
      }
    });
  }
});

describe("privacy / safety: no mutation HTTP methods to resolver", () => {
  const sources = readAllSourceFiles();
  it("no source uses POST/PUT/PATCH/DELETE as a fetch method", () => {
    for (const { path, content } of sources) {
      expect(
        /method\s*:\s*["'`](POST|PUT|PATCH|DELETE)["'`]/.test(content),
        `mutation method in ${path}`
      ).toBe(false);
    }
  });
});

describe("privacy / safety: no source / secrets upload", () => {
  const sources = readAllSourceFiles();
  it("no source reads or transmits known secret env vars", () => {
    const banned = /\bprocess\.env\.(OPENAI|ANTHROPIC|SHOPIFY|TRUSTOPS|RESOLVER|BACKEND)_[A-Z_]+\b/;
    for (const { path, content } of sources) {
      expect(banned.test(content), `secret env read in ${path}`).toBe(false);
    }
  });

  it("no fetch call sends a body", () => {
    for (const { path, content } of sources) {
      expect(/fetch\([^)]*body\s*:/.test(content), `fetch body in ${path}`).toBe(false);
    }
  });
});

describe("privacy / safety: no Backend/Core or TrustOps-checkout call sites", () => {
  const sources = readAllSourceFiles();
  it("no source references a Backend/Core write endpoint", () => {
    for (const { path, content } of sources) {
      expect(/backend\.ecocitizenz/i.test(content), `backend host in ${path}`).toBe(false);
      expect(/core\.ecocitizenz/i.test(content), `core host in ${path}`).toBe(false);
    }
  });

  it("no source references TrustOps checkout/payment endpoints", () => {
    for (const { path, content } of sources) {
      expect(/\/checkout/i.test(content), `checkout path in ${path}`).toBe(false);
      expect(/\/payment/i.test(content), `payment path in ${path}`).toBe(false);
    }
  });
});

describe("privacy / safety: no passport MINTING (narrowed 2026-09-02)", () => {
  const sources = readAllSourceFiles();

  /**
   * HISTORY, because narrowing a safety guard deserves an explanation in the guard.
   *
   * This assertion used to be a blanket text ban: any occurrence of "MCP Passport" in
   * any source file failed the build. It encoded the then-current canon that ECZ-ID MCP
   * Passport was REJECTED as a product.
   *
   * An explicit owner decision on 2026-09-02 superseded that: ECZ-ID MCP Passport
   * (`MCP_PASSPORT`) and ECZ-ID Agent Passport (`AGENT_PASSPORT`) are canonical FREE
   * child Passports, minimum Parent DECLARED, no sellable SKU - and the verifier is
   * required to offer their acquisition at the point of need.
   *
   * A blanket ban would now block a requirement rather than protect one. So the guard is
   * NARROWED, not removed, and the property it defends is stated precisely:
   *
   *   the verifier may NAME and ROUTE TO a Passport.
   *   the verifier may NEVER CREATE, ISSUE, MINT or FABRICATE one.
   *
   * That is the boundary that always mattered. TrustOps and Backend/Core issue canonical
   * truth; this package initiates and reports. Naming a product in order to route to it
   * was never the risk - minting one is.
   */
  it("no source creates, issues or mints a Passport", () => {
    const mintingPatterns = [
      /\b(create|issue|mint|generate|allocate|provision)[A-Za-z]*Passport\b/i,
      /\bPassport[A-Za-z]*\.(create|issue|mint)\b/i,
      /\bnew\s+[A-Za-z]*Passport\b/,
      /passport_state\s*=/i,
      /\bissuePassport\b/i
    ];
    for (const { path, content } of sources) {
      for (const re of mintingPatterns) {
        expect(re.test(content), `passport minting (${re}) in ${path}`).toBe(false);
      }
    }
  });

  it("still forbids Reciprocity Passport outright", () => {
    // No owner decision has adopted this. The blanket ban stands.
    for (const { path, content } of sources) {
      expect(
        /Reciprocity[_ ]?Passport/i.test(content),
        `Reciprocity Passport in ${path}`
      ).toBe(false);
    }
  });

  it("keeps the read-only boundary flags false", () => {
    // The positive form of the same property: whatever the verifier says about a
    // Passport, it must keep asserting that it does not write truth or mark BOUND.
    const handoff = sources.find((s) => s.path.endsWith("setup-handoff.ts"));
    expect(handoff, "setup-handoff.ts must exist").toBeDefined();
    expect(handoff!.content).toMatch(/verifier_writes_truth:\s*false/);
    expect(handoff!.content).toMatch(/verifier_activates_proof:\s*false/);
    expect(handoff!.content).toMatch(/verifier_marks_bound:\s*false/);
  });
});

describe("privacy / safety: no autonomous LLM/agent runtime", () => {
  const sources = readAllSourceFiles();
  it("no source instantiates an LLM client or agent runtime", () => {
    const patterns = [
      /new\s+OpenAI\b/,
      /new\s+Anthropic\b/,
      /AgentExecutor/,
      /\bAutoGen\b/,
      /\bCrewAI\b/,
      /\bLlamaIndex\b/
    ];
    for (const { path, content } of sources) {
      for (const re of patterns) {
        expect(re.test(content), `${re} in ${path}`).toBe(false);
      }
    }
  });
});

describe("privacy / safety: no forbidden overclaim copy in src", () => {
  const sources = readAllSourceFiles();
  const forbiddenClaims = [
    /\bis\s+safe\b/i,
    /\bare\s+safe\b/i,
    /\bis\s+certified\b/i,
    /\bare\s+certified\b/i,
    /\bregulator-approved\b/i,
    /\bplatform-approved\b/i,
    /\bfully\s+compliant\b/i,
    /\bguaranteed\b/i,
    /\binsured\b/i,
    /\bdemand\s+proof\b/i,
    /\bmust\s+buy\b/i,
    /\bblocked\s+because\s+no\s+ECZ-ID\b/i,
    /\bunsafe\s+server\b/i,
    /\buntrusted\s+agent\b/i,
    /\bactivate_proof\b/
  ];
  for (const re of forbiddenClaims) {
    it(`src contains no overclaim copy matching ${re}`, () => {
      for (const { path, content } of sources) {
        expect(re.test(content), `${re} in ${path}`).toBe(false);
      }
    });
  }
});

describe("privacy / safety: no mojibake in src", () => {
  const sources = readAllSourceFiles();
  it("source contains no replacement chars or mojibake-like sequences", () => {
    for (const { path, content } of sources) {
      expect(content.includes("\uFFFD"), `replacement char in ${path}`).toBe(false);
      expect(/Ã.|â€™|â€œ|â€\u009d|â€¦|Â\u00a3/.test(content), `mojibake in ${path}`).toBe(false);
    }
  });
});

describe("_reference is quarantined", () => {
  const sources = readAllSourceFiles();
  it("no src file imports from _reference", () => {
    for (const { path, content } of sources) {
      expect(/from\s+["'`][^"'`]*_reference/.test(content), `_reference import in ${path}`).toBe(false);
      expect(/require\(\s*["'`][^"'`]*_reference/.test(content), `_reference require in ${path}`).toBe(false);
    }
  });
  it("_reference is git-ignored and npm-ignored", () => {
    const gi = readFileSync(join(ROOT, ".gitignore"), "utf8");
    const ni = readFileSync(join(ROOT, ".npmignore"), "utf8");
    expect(gi).toMatch(/_reference/);
    expect(ni).toMatch(/_reference/);
  });
  it("_reference is tsc-excluded and vitest-excluded", () => {
    const ts = readFileSync(join(ROOT, "tsconfig.json"), "utf8");
    const vt = readFileSync(join(ROOT, "vitest.config.ts"), "utf8");
    expect(ts).toMatch(/_reference/);
    expect(vt).toMatch(/_reference/);
  });
  it("the quarantined DeepAgent reference is not present in public source", () => {
    // The internal DeepAgent audit was relocated to gitignored _reference/ in
    // Phase 1; it is not public source. What matters for safety is that the
    // quarantine holds: nothing public imports it and it stays ignore-listed.
    expect(existsSync(join(ROOT, "docs", "DEEPAGENT_REFERENCE_AUDIT.md"))).toBe(false);
  });
});
