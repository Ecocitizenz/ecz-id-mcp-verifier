import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

// Public-disclosure guard (Phase 1).
//
// Enforces the corrective-closure rules: public/source surfaces must contain no
// internal-strategy terminology, no product/pricing catalogue, and no P2
// recommendation/affinity logic. These are deterministic, dependency-free
// scans over the public source tree (the npm `files` allow-list ships only a
// subset of this, so guarding the broader tree is strictly safer).

const ROOT = resolve(__dirname, "..");

// Directories that are public (tracked) and must stay clean. `_reference`,
// `docs/flywheel`, `node_modules`, `.git` are private/ignored and excluded.
const SCAN_DIRS = ["src", "examples", join("docs", "specs"), join("docs", "distribution")];
const SCAN_FILES = ["README.md", "CHANGELOG.md", "action.yml", join("docs", "ROLE_SPLIT.md"), join("docs", "PRIVACY.md")];

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function collectFiles(): string[] {
  const files: string[] = [];
  for (const d of SCAN_DIRS) files.push(...walk(join(ROOT, d)));
  for (const f of SCAN_FILES) {
    const p = join(ROOT, f);
    if (existsSync(p)) files.push(p);
  }
  // Only scan text-like files.
  return files.filter((f) => /\.(ts|js|json|md|yml|yaml)$/.test(f));
}

const FILES = collectFiles();

// Internal-strategy terminology that must not appear in public source/filenames.
const INTERNAL_TERMS: RegExp[] = [
  /flywheel/i,
  /acquisition[-_ ]?flow/i,
  /mandated acquisition/i,
  /\bfive[-_ ]?cart\b/i,
  /\bbasket\b/i,
  /product[-_ ]affinity/i,
  /cross[-_ ]sell/i,
  /scoring weights?/i,
  /market (capture|domination)/i,
  /secret sauce/i,
  /internal playbook/i
];

// Commercial/pricing tokens (TrustOps-owned) that must not appear publicly.
const PRICING_TERMS: RegExp[] = [/£\s?\d/, /\b\d+(?:\.\d{2})?\s*\/\s*mo\b/i, /"price"\s*:/];

describe("public-disclosure: internal-strategy terminology absent", () => {
  it("no public source filename uses internal terms", () => {
    for (const f of FILES) {
      const base = f.slice(ROOT.length + 1);
      expect(/flywheel|acquisition-flow/i.test(base), `internal filename: ${base}`).toBe(false);
    }
  });

  it("no public source content uses internal-strategy terminology", () => {
    for (const f of FILES) {
      const text = readFileSync(f, "utf8");
      for (const re of INTERNAL_TERMS) {
        expect(re.test(text), `internal term ${re} in ${f.slice(ROOT.length + 1)}`).toBe(false);
      }
    }
  });
});

describe("public-disclosure: no product/pricing (P2) leakage", () => {
  it("no public source file embeds pricing or a product catalogue", () => {
    for (const f of FILES) {
      const text = readFileSync(f, "utf8");
      for (const re of PRICING_TERMS) {
        expect(re.test(text), `pricing token ${re} in ${f.slice(ROOT.length + 1)}`).toBe(false);
      }
    }
  });

  it("the removed TrustOps product/pricing manifests are absent from public specs", () => {
    const specDir = join(ROOT, "docs", "specs", "action-envelopes");
    const present = existsSync(specDir) ? readdirSync(specDir) : [];
    expect(present).not.toContain("trustops-acquisition-manifest.json");
    expect(present).not.toContain("trustops-product-action-manifest.schema.json");
  });

  it("no src file references a removed product/acquisition manifest", () => {
    for (const f of FILES.filter((x) => x.includes(`${join("", "src")}`) || x.endsWith(".ts"))) {
      const text = readFileSync(f, "utf8");
      expect(/trustops-acquisition-manifest|trustops-product-action-manifest/i.test(text), f).toBe(
        false
      );
    }
  });
});

describe("public-disclosure: renamed public interface is present", () => {
  it("setup-handoff and result-actions modules exist (renamed from internal terms)", () => {
    expect(existsSync(join(ROOT, "src", "setup-handoff.ts"))).toBe(true);
    expect(existsSync(join(ROOT, "src", "result-actions.ts"))).toBe(true);
    expect(existsSync(join(ROOT, "src", "flywheel.ts"))).toBe(false);
    expect(existsSync(join(ROOT, "src", "acquisition-flow.ts"))).toBe(false);
  });

  it("action.yml exposes the renamed setup-handoff output, not the internal name", () => {
    const action = readFileSync(join(ROOT, "action.yml"), "utf8");
    expect(action).toContain("setup-handoff-json");
    expect(action.includes("acquisition-flow-json")).toBe(false);
  });

  it("example output uses the renamed setup_handoff field, not the internal name", () => {
    const ex = readFileSync(join(ROOT, "examples", "action-envelope-output.json"), "utf8");
    expect(ex).toContain("setup_handoff");
    expect(ex.includes("acquisition_flow")).toBe(false);
  });

  it("README and shipped docs carry no internal-strategy terminology", () => {
    for (const f of ["README.md", join("docs", "ROLE_SPLIT.md"), join("docs", "PRIVACY.md")]) {
      const text = readFileSync(join(ROOT, f), "utf8");
      expect(/flywheel|acquisition[-_ ]?flow/i.test(text), `internal term in ${f}`).toBe(false);
    }
  });
});
