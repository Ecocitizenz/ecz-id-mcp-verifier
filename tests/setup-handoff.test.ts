import { describe, it, expect } from "vitest";
import {
  SETUP_INTENTS,
  ALLOWED_RETURN_TO_HOSTS,
  HANDOFF_NAME,
  HANDOFF_VERSION,
  NEXT_ACTIONS,
  OPERATOR_MODES,
  allowedTrustopsParams,
  buildSetupHandoff,
  buildTrustopsUrl,
  developerGuidanceUrlFor,
  isAllowedReturnToUrl,
  sanitizeReturnToUrl,
  type BuildSetupHandoffInput
} from "../src/setup-handoff.js";
import type { ReasonCode } from "../src/reason-codes.js";
import {
  RESOLVER_BASE,
  TRUSTOPS_START,
  DEVELOPER_GATEWAY
} from "../src/constants.js";

const baseInput: BuildSetupHandoffInput = {
  target: "https://example.com/.well-known/ecz-mcp.json",
  target_type: "mcp_server",
  result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
  reason_codes: ["NO_PUBLIC_RESOLVER_PROOF_FOUND"] as ReasonCode[],
  policy_mode: "OPEN",
  operator: "unknown",
  resolver_url: null,
  machine_json_url: null
};

describe("setup-handoff: constants", () => {
  it("operator modes are exactly self/third_party/unknown", () => {
    expect([...OPERATOR_MODES]).toEqual(["self", "third_party", "unknown"]);
  });
  it("flow name and version are fixed", () => {
    expect(HANDOFF_NAME).toBe("Deterministic Setup Handoff");
    expect(HANDOFF_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
  it("intent vocabulary is fixed", () => {
    expect([...SETUP_INTENTS]).toEqual([
      "setup",
      "repair",
      "view_proof",
      "guidance",
      "none"
    ]);
  });
  it("next-action vocabulary contains role-safe verbs only", () => {
    for (const a of NEXT_ACTIONS) {
      expect(a).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
    // No purchase/checkout/payment verbs.
    for (const a of NEXT_ACTIONS) {
      expect(/PURCHASE|CHECKOUT|PAYMENT|BUY/.test(a)).toBe(false);
    }
  });
});

describe("setup-handoff: routing matrix", () => {
  it("RESOLVER_VERIFIABLE: primary is VIEW_RESOLVER_PROOF and not purchase", () => {
    for (const operator of OPERATOR_MODES) {
      const f = buildSetupHandoff({
        ...baseInput,
        result_state: "RESOLVER_VERIFIABLE",
        reason_codes: [],
        operator
      });
      expect(f.primary_action).toBe("VIEW_RESOLVER_PROOF");
      expect(f.intent).toBe("view_proof");
      expect(/PURCHASE|CHECKOUT|PAYMENT/.test(f.primary_action)).toBe(false);
    }
  });

  it("MISSING_PROOF / self -> START_TRUSTOPS_SETUP", () => {
    const f = buildSetupHandoff({
      ...baseInput,
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      operator: "self"
    });
    expect(f.primary_action).toBe("START_TRUSTOPS_SETUP");
    expect(f.intent).toBe("setup");
  });

  it("MISSING_PROOF / third_party -> SHARE_DEVELOPER_GUIDANCE", () => {
    const f = buildSetupHandoff({
      ...baseInput,
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      operator: "third_party"
    });
    expect(f.primary_action).toBe("SHARE_DEVELOPER_GUIDANCE");
    expect(f.intent).toBe("guidance");
  });

  it("MISSING_PROOF / unknown -> CHOOSE_OPERATOR_PATH", () => {
    const f = buildSetupHandoff({
      ...baseInput,
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      operator: "unknown"
    });
    expect(f.primary_action).toBe("CHOOSE_OPERATOR_PATH");
    expect(f.secondary_actions).toContain("START_TRUSTOPS_SETUP");
    expect(f.secondary_actions).toContain("SHARE_DEVELOPER_GUIDANCE");
  });

  it("DEGRADED / self -> START_TRUSTOPS_REPAIR", () => {
    const f = buildSetupHandoff({
      ...baseInput,
      result_state: "DEGRADED",
      reason_codes: ["KEYSET_HASH_MISMATCH"],
      operator: "self"
    });
    expect(f.primary_action).toBe("START_TRUSTOPS_REPAIR");
    expect(f.intent).toBe("repair");
  });

  it("DEGRADED / third_party -> RECHECK_BEFORE_RELIANCE", () => {
    const f = buildSetupHandoff({
      ...baseInput,
      result_state: "MISMATCH",
      reason_codes: ["MANIFEST_HASH_MISMATCH"],
      operator: "third_party"
    });
    expect(f.primary_action).toBe("RECHECK_BEFORE_RELIANCE");
  });

  it("NOT_ROUTABLE_AS_ACTIVE: legacy/rejected/deferred do not push purchase", () => {
    for (const state of [
      "LEGACY_ALIAS_NOT_ACTIVE_SKU",
      "REJECTED_PRODUCT_NOT_SELLABLE",
      "DEFERRED_PRODUCT_NOT_SELLABLE",
      "UNKNOWN_PHASE1_SKU"
    ] as const) {
      const f = buildSetupHandoff({
        ...baseInput,
        result_state: state,
        operator: "self"
      });
      expect(f.primary_action).toBe("VIEW_DEVELOPER_GUIDANCE");
      expect(/PURCHASE|CHECKOUT|PAYMENT/.test(f.primary_action)).toBe(false);
    }
  });

  it("PARENT_UPGRADE_REQUIRED / self -> view docs + contact TrustOps secondary", () => {
    const f = buildSetupHandoff({
      ...baseInput,
      result_state: "PARENT_UPGRADE_REQUIRED",
      operator: "self"
    });
    expect(f.primary_action).toBe("VIEW_DEVELOPER_GUIDANCE");
    expect(f.secondary_actions).toContain("CONTACT_TRUSTOPS_SETUP");
  });

  it("UNSUPPORTED_TARGET -> VIEW_DEVELOPER_GUIDANCE", () => {
    const f = buildSetupHandoff({
      ...baseInput,
      target_type: "unsupported_target",
      result_state: "UNSUPPORTED_TARGET",
      operator: "unknown"
    });
    expect(f.primary_action).toBe("VIEW_DEVELOPER_GUIDANCE");
  });

  it("INFORMATIONAL / NOT_APPLICABLE -> RECHECK_BEFORE_RELIANCE", () => {
    const f = buildSetupHandoff({
      ...baseInput,
      result_state: "NOT_APPLICABLE",
      operator: "unknown"
    });
    expect(f.primary_action).toBe("RECHECK_BEFORE_RELIANCE");
    expect(f.intent).toBe("none");
  });
});

describe("setup-handoff: TrustOps URL allow-list", () => {
  it("uses canonical TrustOps base", () => {
    const url = buildTrustopsUrl({
      intent: "setup",
      target_type: "mcp_server",
      policy_mode: "OPEN",
      operator: "self",
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      reason_codes: ["NO_PUBLIC_RESOLVER_PROOF_FOUND"]
    });
    expect(url.startsWith(TRUSTOPS_START)).toBe(true);
  });

  it("only emits params from the allow-list", () => {
    const allowed = new Set(allowedTrustopsParams());
    const url = buildTrustopsUrl({
      intent: "setup",
      target_type: "mcp_server",
      policy_mode: "OPEN",
      operator: "self",
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      reason_codes: ["NO_PUBLIC_RESOLVER_PROOF_FOUND"],
      return_to: "https://developers.ecocitizenz.com/mcp"
    });
    const u = new URL(url);
    for (const [k] of u.searchParams) {
      expect(allowed.has(k), `unexpected param ${k}`).toBe(true);
    }
  });

  it("does not include target value by default", () => {
    const target = "https://example.com/.well-known/ecz-mcp.json";
    const url = buildTrustopsUrl({
      intent: "setup",
      target_type: "mcp_server",
      policy_mode: "OPEN",
      operator: "self",
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      reason_codes: []
    });
    const u = new URL(url);
    expect(u.searchParams.has("target")).toBe(false);
    expect(url.includes(encodeURIComponent(target))).toBe(false);
  });

  it("does not include secrets, env, payment, checkout, source, or target value", () => {
    const url = buildTrustopsUrl({
      intent: "setup",
      target_type: "mcp_server",
      policy_mode: "OPEN",
      operator: "self",
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      reason_codes: ["NO_PUBLIC_RESOLVER_PROOF_FOUND"]
    }).toLowerCase();
    for (const banned of [
      "secret",
      "token",
      "api_key",
      "apikey",
      "password",
      "env=",
      "log=",
      "payment",
      "checkout",
      "card",
      "wallet",
      "cookie"
    ]) {
      expect(url.includes(banned), `URL leaks ${banned}`).toBe(false);
    }
  });

  it("rejects non-https return_to (silently drops)", () => {
    const url = buildTrustopsUrl({
      intent: "setup",
      target_type: "mcp_server",
      policy_mode: "OPEN",
      operator: "self",
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      reason_codes: [],
      return_to: "javascript:alert(1)"
    });
    const u = new URL(url);
    expect(u.searchParams.has("return_to")).toBe(false);
  });
});

describe("setup-handoff: return_to host allow-list (Phase 8A-B)", () => {
  it("allowed hosts are exactly the three canonical ECZ-ID surfaces", () => {
    expect([...ALLOWED_RETURN_TO_HOSTS]).toEqual([
      "developers.ecocitizenz.com",
      "resolver.ecocitizenz.org",
      "trustops.ecocitizenz.com"
    ]);
  });

  it("accepts https Developer Gateway URL", () => {
    expect(isAllowedReturnToUrl("https://developers.ecocitizenz.com/mcp")).toBe(true);
  });
  it("accepts https Resolver URL", () => {
    expect(
      isAllowedReturnToUrl("https://resolver.ecocitizenz.org/p/ECZ-GB-123ABC")
    ).toBe(true);
  });
  it("accepts https TrustOps URL", () => {
    expect(isAllowedReturnToUrl("https://trustops.ecocitizenz.com/start")).toBe(true);
  });

  it("rejects unrelated https host", () => {
    expect(isAllowedReturnToUrl("https://evil.example/mcp")).toBe(false);
  });
  it("rejects http on an allowed host", () => {
    expect(isAllowedReturnToUrl("http://developers.ecocitizenz.com/mcp")).toBe(false);
  });
  it("rejects javascript: scheme", () => {
    expect(isAllowedReturnToUrl("javascript:alert(1)")).toBe(false);
  });
  it("rejects data: scheme", () => {
    expect(isAllowedReturnToUrl("data:text/html,test")).toBe(false);
  });
  it("rejects protocol-relative //evil.example/path", () => {
    expect(isAllowedReturnToUrl("//evil.example/path")).toBe(false);
  });
  it("rejects empty / undefined / non-string", () => {
    expect(isAllowedReturnToUrl("")).toBe(false);
    expect(isAllowedReturnToUrl(undefined)).toBe(false);
    expect(isAllowedReturnToUrl(123 as unknown)).toBe(false);
  });
  it("rejects URLs containing tokens/secrets/billing/log/source/prompt/env/private-header markers", () => {
    const bad = [
      "https://developers.ecocitizenz.com/x?token=abc",
      "https://developers.ecocitizenz.com/x?secret=abc",
      "https://developers.ecocitizenz.com/x?api_key=abc",
      "https://developers.ecocitizenz.com/x?password=abc",
      "https://developers.ecocitizenz.com/x?bearer=abc",
      "https://developers.ecocitizenz.com/x?cookie=abc",
      "https://developers.ecocitizenz.com/x?session=abc",
      "https://developers.ecocitizenz.com/x?" + "pay" + "ment=1",
      "https://developers.ecocitizenz.com/x?" + "check" + "out=1",
      "https://developers.ecocitizenz.com/x?card=4111",
      "https://developers.ecocitizenz.com/x?wallet=0xabc",
      "https://developers.ecocitizenz.com/x?log=stack",
      "https://developers.ecocitizenz.com/x?source=raw",
      "https://developers.ecocitizenz.com/x?prompt=hi",
      "https://developers.ecocitizenz.com/x?env=PROD",
      "https://developers.ecocitizenz.com/x?x-api-key=abc"
    ];
    for (const v of bad) {
      expect(isAllowedReturnToUrl(v), v).toBe(false);
    }
  });

  it("sanitizeReturnToUrl returns the value when allowed, else null", () => {
    expect(sanitizeReturnToUrl("https://developers.ecocitizenz.com/mcp")).toBe(
      "https://developers.ecocitizenz.com/mcp"
    );
    expect(sanitizeReturnToUrl("https://evil.example/x")).toBe(null);
  });

  it("buildTrustopsUrl drops disallowed return_to from the URL", () => {
    const url = buildTrustopsUrl({
      intent: "setup",
      target_type: "mcp_server",
      policy_mode: "OPEN",
      operator: "self",
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      reason_codes: [],
      return_to: "https://evil.example/x"
    });
    const u = new URL(url);
    expect(u.searchParams.has("return_to")).toBe(false);
  });

  it("buildTrustopsUrl keeps allowed return_to in the URL", () => {
    const url = buildTrustopsUrl({
      intent: "setup",
      target_type: "mcp_server",
      policy_mode: "OPEN",
      operator: "self",
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      reason_codes: [],
      return_to: "https://developers.ecocitizenz.com/mcp"
    });
    const u = new URL(url);
    expect(u.searchParams.get("return_to")).toBe(
      "https://developers.ecocitizenz.com/mcp"
    );
  });
});

describe("setup-handoff: Developer Gateway URL mapping", () => {
  it("maps every target_type to a deterministic Developer Gateway path", () => {
    const cases: Record<string, string> = {
      mcp_server: "/mcp",
      agent_manifest: "/agents",
      api_url: "/bindings/openapi-x-ecz-id",
      github_repo: "/mcp/share-resolver-guidance",
      npm_package: "/mcp/share-resolver-guidance",
      pypi_package: "/mcp/share-resolver-guidance",
      container_image: "/mcp/share-resolver-guidance",
      ecz_id: "/action-envelope",
      unsupported_target: "/mcp"
    };
    for (const [t, path] of Object.entries(cases)) {
      const u = developerGuidanceUrlFor(t as any);
      expect(u).toBe(DEVELOPER_GATEWAY + path);
    }
  });
});

describe("setup-handoff: invariants in returned envelope", () => {
  it("never sets verifier-writes-truth/activates-proof/marks-bound", () => {
    const f = buildSetupHandoff({
      ...baseInput,
      result_state: "RESOLVER_VERIFIABLE",
      reason_codes: [],
      operator: "self"
    });
    expect(f.verifier_writes_truth).toBe(false);
    expect(f.verifier_activates_proof).toBe(false);
    expect(f.verifier_marks_bound).toBe(false);
    expect(f.backend_remains_final_authority).toBe(true);
    expect(f.local_policy_decides).toBe(true);
  });

  it("does not depend on the live resolver host for URL synthesis", () => {
    const f = buildSetupHandoff({
      ...baseInput,
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      operator: "self"
    });
    expect(f.developer_guidance_url.startsWith(DEVELOPER_GATEWAY)).toBe(true);
    expect(f.trustops_action_url.startsWith(TRUSTOPS_START)).toBe(true);
    // resolver base is not embedded as the action URL
    expect(f.trustops_action_url.includes(RESOLVER_BASE)).toBe(false);
  });
});
