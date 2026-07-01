import { describe, it, expect } from "vitest";
import {
  TOOL_NAMES,
  runCheckTarget,
  runRecheckResolver,
  runExplainResult
} from "../src/mcp/tools.js";
import { verify } from "../src/verify.js";
import { buildJsonOutput } from "../src/output.js";
import { computeExitCode } from "../src/exit-codes.js";

const ECZ_ID = "ECZ-GB-ABC123";

describe("MCP tool inventory", () => {
  it("exposes exactly three tools with the canonical names", () => {
    expect(TOOL_NAMES).toEqual([
      "ecz_check_target",
      "ecz_recheck_resolver",
      "ecz_explain_result"
    ]);
    expect(TOOL_NAMES).toHaveLength(3);
  });
});

describe("ecz_check_target returns the canonical contract verbatim", () => {
  it("carries every read-only boundary + privacy flag", async () => {
    const out = await runCheckTarget({ target: ECZ_ID, policy: "PREFER", offline: true });
    expect(typeof out.result_state).toBe("string");
    expect(Array.isArray(out.reason_codes)).toBe(true);
    expect(out.verifier).toBe("ECZ-ID MCP Verifier");
    expect(out.verifier_version).toBe("0.8.2");
    expect(out.schema_version).toBe(1);
    expect(out.verifier_writes_truth).toBe(false);
    expect(out.verifier_activates_proof).toBe(false);
    expect(out.verifier_marks_bound).toBe(false);
    expect(out.backend_remains_final_authority).toBe(true);
    expect(out.local_policy_decides).toBe(true);
    expect(out.recheck_before_reliance).toBe(true);
    expect(out.no_safety_or_approval_inference).toBe(true);
    expect(out.no_source_uploaded).toBe(true);
    expect(out.no_secrets_uploaded).toBe(true);
    expect(out.no_telemetry).toBe(true);
    expect(out.trustops_action_url).toMatch(/\/start(\?|$)/);
    expect(out.exit_code).toBe(0);
  });

  it("is one verifier core — output equals a direct verify()+buildJsonOutput call (sans timestamp)", async () => {
    const direct = await verify({ target: ECZ_ID, policy: "PREFER", noNetwork: true });
    const exit = computeExitCode(direct.result_state, direct.policy_mode, {
      network_attempted_and_failed: direct.network_attempted && Boolean(direct.network_error)
    });
    const expected = buildJsonOutput(direct, { exit_code: exit });
    const out = await runCheckTarget({ target: ECZ_ID, policy: "PREFER", offline: true });
    const strip = (o: Record<string, unknown>) => ({ ...o, timestamp: "X" });
    expect(strip(out as unknown as Record<string, unknown>)).toEqual(
      strip(expected as unknown as Record<string, unknown>)
    );
  });

  it("REQUIRE under missing proof fails closed in the result, never throws", async () => {
    const out = await runCheckTarget({ target: ECZ_ID, policy: "REQUIRE", offline: true });
    expect(out.exit_code).toBe(1);
    expect(typeof out.result_state).toBe("string");
  });

  it("does not emit an ALLOW/DENY decision token", async () => {
    const out = await runCheckTarget({ target: ECZ_ID, policy: "OPEN", offline: true });
    const s = JSON.stringify(out);
    expect(/\bALLOW\b/.test(s)).toBe(false);
    expect(/\bDENY\b/.test(s)).toBe(false);
  });
});

describe("ecz_recheck_resolver is a read-only Resolver projection", () => {
  it("returns recheck framing with the read-only boundary", async () => {
    const out = await runRecheckResolver({ target: ECZ_ID, offline: true });
    expect(out.type).toBe("ecz.resolver_recheck");
    expect(typeof out.result_state).toBe("string");
    expect(out.recheck_before_reliance).toBe(true);
    expect(out.local_policy_decides).toBe(true);
    expect(out.verifier_writes_truth).toBe(false);
    expect(out.verifier_activates_proof).toBe(false);
    expect(out.verifier_marks_bound).toBe(false);
    expect(out.no_telemetry).toBe(true);
  });
});

describe("ecz_explain_result maps canonical codes without deciding", () => {
  it("recognises canonical codes/states and flags unknown ones", () => {
    const out = runExplainResult({
      reason_codes: ["NO_PUBLIC_RESOLVER_PROOF_FOUND", "TOTALLY_BOGUS_CODE"],
      result_state: "RESOLVER_VERIFIABLE"
    });
    expect(out.type).toBe("ecz.result_explanation");
    expect(out.reason_codes[0]).toMatchObject({
      code: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      recognized: true
    });
    expect(out.reason_codes[0].explanation.length).toBeGreaterThan(0);
    expect(out.reason_codes[1].recognized).toBe(false);
    expect(out.result_state?.recognized).toBe(true);
    expect(out.no_global_decision).toBe(true);
    expect(out.no_safety_or_approval_inference).toBe(true);
    expect(out.local_policy_decides).toBe(true);
    expect(out.recheck_before_reliance).toBe(true);
  });

  it("invents no new states or codes and emits no ALLOW/DENY", () => {
    const out = runExplainResult({ reason_codes: ["LOCAL_POLICY_DECIDES"], result_state: "MISMATCH" });
    const s = JSON.stringify(out);
    expect(/\bALLOW\b/.test(s)).toBe(false);
    expect(/\bDENY\b/.test(s)).toBe(false);
  });

  it("handles an unknown result_state as unrecognised, not an error", () => {
    const out = runExplainResult({ reason_codes: [], result_state: "NOT_A_REAL_STATE" });
    expect(out.result_state?.recognized).toBe(false);
    expect(out.reason_codes).toEqual([]);
  });
});
