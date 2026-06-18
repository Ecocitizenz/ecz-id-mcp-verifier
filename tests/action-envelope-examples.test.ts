import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// Action-envelope example instances live under docs/specs/action-envelopes/.
// They are route-only, docs-only artifacts (excluded from the npm package by
// `files`). These tests prove the example envelopes satisfy the boundary + copy
// contracts without adding deps.
//
// NOTE (Phase 1): the former "Acquisition Mandate" product/pricing manifest and
// its schema were P2 commercial material (TrustOps-owned). They have been
// removed from the public spec set; pricing and product catalogues never ship
// in public source. The public-disclosure guard test enforces their absence.

const ROOT = resolve(__dirname, "..");
const SPEC_DIR = join(ROOT, "docs", "specs", "action-envelopes");
const EX_DIR = join(SPEC_DIR, "examples");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

// Forbidden public-copy tokens. The single sanctioned negation
// "This does not mean unsafe" is stripped before scanning.
const FORBIDDEN: RegExp[] = [
  /\bsafe\b/i,
  /\bunsafe\b/i,
  /\bcertified\b/i,
  /\bapproved\b/i,
  /\bguaranteed\b/i,
  /\bfully compliant\b/i,
  /\becz-certified\b/i,
  /\bnpm verified\b/i,
  /\bpypi endorsed\b/i,
  /\bshopify endorsed\b/i,
  /\bgithub approved\b/i,
  /\bai safety certified\b/i,
  /\btrusted by platform\b/i,
  /\bproof required by ecz-id\b/i,
  /\bblocked because no ecz-id\b/i,
  /\bfailed safety verification\b/i,
  /\bdemand proof\b/i,
  /\bmust buy\b/i,
  /\bforce provider\b/i
];

function assertNoForbidden(raw: string, label: string): void {
  const stripped = raw.split("This does not mean unsafe").join("");
  for (const re of FORBIDDEN) {
    expect(re.test(stripped), `forbidden token ${re} in ${label}`).toBe(false);
  }
}

describe("action-envelope examples: boundary flags & copy", () => {
  const files = readdirSync(EX_DIR).filter((f) => f.endsWith(".json"));

  it("has the five required scenario examples plus the re-check instance", () => {
    expect(files).toContain("mcp-unresolved.json");
    expect(files).toContain("agent-unresolved.json");
    expect(files).toContain("reciprocal-mcp-resolved-agent-unresolved.json");
    expect(files).toContain("reciprocal-both-resolved.json");
    expect(files).toContain("reciprocal-both-unresolved.json");
    expect(files).toContain("resolver-recheck-contract.json");
  });

  it("every envelope example carries the read-only boundary flags", () => {
    for (const f of files) {
      const obj = readJson(join(EX_DIR, f));
      if (f === "resolver-recheck-contract.json") {
        expect(obj.recheck_before_reliance).toBe(true);
        expect(obj.resolver_unavailable_behaviour).toBe("no_hallucinated_proof");
        continue;
      }
      expect(obj.local_policy_decides).toBe(true);
      expect(obj.recheck_before_reliance).toBe(true);
      expect(obj.no_safety_or_approval_inference).toBe(true);
      expect(obj.verifier_writes_truth).toBe(false);
      expect(obj.verifier_activates_proof).toBe(false);
      expect(obj.verifier_marks_bound).toBe(false);
    }
  });

  it("reciprocal examples never decide external authorisation", () => {
    for (const f of files.filter((x) => x.startsWith("reciprocal-"))) {
      const obj = readJson(join(EX_DIR, f));
      expect(obj.type).toBe("ecz.reciprocal_reliance_envelope");
      expect(obj.external_authorisation).toBe("not_determined_by_eczid");
    }
  });

  it("contains no forbidden public-copy wording across all examples", () => {
    for (const f of files) {
      assertNoForbidden(readFileSync(join(EX_DIR, f), "utf8"), f);
    }
  });
});
