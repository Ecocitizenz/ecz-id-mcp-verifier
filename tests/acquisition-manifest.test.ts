import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// Spec instances live under docs/specs/action-envelopes/. They are route-only,
// docs-only artifacts (excluded from the npm package by `files`). These tests
// prove the Acquisition Mandate manifest (Phase 7) and the example envelopes
// (Phase 1/10) satisfy the boundary + copy contracts without adding deps.

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

describe("acquisition manifest: structure & Phase 6/7 contract", () => {
  const manifest = readJson(join(SPEC_DIR, "trustops-acquisition-manifest.json"));

  it("declares the canonical manifest type and boundaries", () => {
    expect(manifest.manifest_type).toBe("ecz.trustops_product_action_manifest");
    expect(manifest.global_boundaries.not_safety_certification).toBe(true);
    expect(manifest.global_boundaries.local_policy_decides).toBe(true);
    expect(manifest.global_boundaries.marketplace_native_entitlement).toBe("forbidden");
    expect(manifest.global_boundaries.payment_is_not_proof).toBe(true);
  });

  it("rejects mcp_passport and resolver_clone", () => {
    expect(manifest.rejected).toContain("mcp_passport");
    expect(manifest.rejected).toContain("resolver_clone");
  });

  it("lists exactly the seven Phase 6 products with canonical prices and statuses", () => {
    const byName: Record<string, any> = {};
    for (const p of manifest.products) byName[p.product_name] = p;

    const expected: Array<[string, string, string]> = [
      ["Agent Credential Entry Pack", "£24.99/mo", "canonical"],
      ["KYA Starter", "£34.99/mo", "canonical"],
      ["Verified KYA Ready Pack", "£149.97/mo", "canonical"],
      ["Assured KYA Ready Pack", "£179.97/mo", "canonical"],
      ["MCP Assurance", "£199/mo", "off_ssot_provisional"],
      ["MCP Assurance Plus", "£499/mo", "off_ssot_provisional"],
      ["MCP Policy", "£1,499/mo", "off_ssot_provisional"]
    ];
    expect(manifest.products.length).toBe(expected.length);
    for (const [name, price, status] of expected) {
      expect(byName[name], `missing product ${name}`).toBeDefined();
      expect(byName[name].price).toBe(price);
      expect(byName[name].product_status).toBe(status);
    }
  });

  it("keeps Agent Credential Entry an identity floor, not KYA Lite", () => {
    const ace = manifest.products.find((p: any) => p.product_name === "Agent Credential Entry Pack");
    expect(ace.classification).toBe("identity_floor_not_kya_lite");
  });

  it("keeps the whole MCP stack OFF-SSOT provisional", () => {
    const mcp = manifest.products.filter((p: any) => p.product_name.startsWith("MCP"));
    expect(mcp.length).toBe(3);
    for (const p of mcp) expect(p.product_status).toBe("off_ssot_provisional");
  });

  it("carries proof/purchase/backend/resolver boundaries on every product", () => {
    for (const p of manifest.products) {
      expect(typeof p.proof_boundary).toBe("string");
      expect(typeof p.purchase_boundary).toBe("string");
      expect(typeof p.backend_truth_boundary).toBe("string");
      expect(typeof p.resolver_projection_boundary).toBe("string");
      expect(p.not_safety_certification).toBe(true);
      expect(p.local_policy_decides).toBe(true);
    }
  });

  it("routes are TrustOps deep links only and never imply checkout/purchase", () => {
    const routes = [
      ...manifest.products.map((p: any) => p.route),
      ...manifest.acquisition_routing.map((r: any) => r.route)
    ];
    for (const route of routes) {
      expect(route).toMatch(/^https:\/\/trustops\.ecocitizenz\.com\/start/);
      expect(/check\s*out|purchase|\bbuy\b|\bcart\b|\bpay\b/i.test(route)).toBe(false);
    }
  });

  it("exposes the six Phase 6 acquisition intentions", () => {
    const intentions = manifest.acquisition_routing.map((r: any) => r.intention);
    expect(intentions).toContain("I operate this MCP server");
    expect(intentions).toContain("I operate this agent");
    expect(intentions).toContain("I represent a business/principal");
    expect(intentions).toContain("I am checking someone else");
    expect(intentions).toContain("I need enterprise policy");
    expect(intentions).toContain("I am a merchant preparing for agentic commerce");
  });

  it("contains no forbidden public-copy wording", () => {
    assertNoForbidden(JSON.stringify(manifest), "acquisition manifest");
  });
});

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
