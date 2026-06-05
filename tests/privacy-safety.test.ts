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

describe("privacy / safety: no MCP Passport / Reciprocity Passport", () => {
  const sources = readAllSourceFiles();
  it("no source introduces passport concepts", () => {
    for (const { path, content } of sources) {
      expect(/MCP[_ ]?Passport/i.test(content), `MCP Passport in ${path}`).toBe(false);
      expect(/Reciprocity[_ ]?Passport/i.test(content), `Reciprocity Passport in ${path}`).toBe(false);
    }
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
  it("DeepAgent audit document exists", () => {
    expect(existsSync(join(ROOT, "docs", "DEEPAGENT_REFERENCE_AUDIT.md"))).toBe(true);
  });
});
