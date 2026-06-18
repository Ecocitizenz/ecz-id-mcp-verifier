import { describe, it, expect } from "vitest";
import { buildJsonOutput, buildSarif } from "../src/output.js";
import { buildEnvelope, emptyEnvelope } from "../src/action-envelope.js";
import { verify } from "../src/verify.js";

describe("JSON output schema", () => {
  it("contains every required field with canonical values", async () => {
    const result = await verify({
      target: "ECZ-CC-ABC123",
      policy: "OPEN",
      noNetwork: true
    });
    const out = buildJsonOutput(result, { exit_code: 0 });
    const required = [
      "schema_version",
      "verifier",
      "verifier_version",
      "target",
      "target_type",
      "policy_mode",
      "operator",
      "result_state",
      "reason_codes",
      "resolver_url",
      "machine_json_url",
      "trustops_action_url",
      "developer_guidance_url",
      "setup_handoff",
      "primary_action",
      "secondary_actions",
      "backend_remains_final_authority",
      "verifier_writes_truth",
      "verifier_activates_proof",
      "verifier_marks_bound",
      "local_policy_decides",
      "recheck_before_reliance",
      "no_safety_or_approval_inference",
      "no_source_uploaded",
      "no_secrets_uploaded",
      "no_telemetry",
      "timestamp",
      "exit_code",
      "action_envelope"
    ];
    for (const k of required) expect(out).toHaveProperty(k);
    expect(out.verifier).toBe("ECZ-ID MCP Verifier");
    expect(out.operator).toBe("unknown");
    expect(out.local_policy_decides).toBe(true);
    expect(out.recheck_before_reliance).toBe(true);
    expect(out.no_safety_or_approval_inference).toBe(true);
    expect(out.no_source_uploaded).toBe(true);
    expect(out.no_secrets_uploaded).toBe(true);
    expect(out.no_telemetry).toBe(true);
    expect(out.backend_remains_final_authority).toBe(true);
    expect(out.verifier_writes_truth).toBe(false);
    expect(out.verifier_activates_proof).toBe(false);
    expect(out.verifier_marks_bound).toBe(false);
    expect(out.trustops_action_url.startsWith("https://trustops.ecocitizenz.com/start")).toBe(true);
    expect(out.developer_guidance_url.startsWith("https://developers.ecocitizenz.com")).toBe(true);
    expect(out.setup_handoff.handoff_name).toBe("Deterministic Setup Handoff");
  });

  it("missing proof uses canonical NO_PUBLIC_RESOLVER_PROOF_FOUND, never FAILED_VERIFICATION", async () => {
    const result = await verify({
      target: "ECZ-CC-ABC123",
      policy: "OPEN",
      noNetwork: true
    });
    expect(result.result_state).toBe("NO_PUBLIC_RESOLVER_PROOF_FOUND");
    expect(result.reason_codes).toContain("NO_PUBLIC_RESOLVER_PROOF_FOUND");
    for (const c of result.reason_codes) {
      expect(c).toMatch(/^[A-Z][A-Z0-9_]*$/);
      expect(c).not.toBe("FAILED_VERIFICATION");
    }
  });
});

describe("Action envelope shape", () => {
  it("populates every required field", async () => {
    const result = await verify({
      target: "https://api.example.com/.well-known/ecz-mcp.json",
      policy: "PREFER",
      noNetwork: true
    });
    const env = buildEnvelope(result);
    const required = [
      "schema_version",
      "envelope_type",
      "target_type",
      "target_value",
      "result_state",
      "reason_codes",
      "resolver_url",
      "machine_json_url",
      "recommended_next_steps",
      "trustops_action_url",
      "developer_guidance_url",
      "policy_mode",
      "operator",
      "setup_handoff",
      "primary_action",
      "secondary_actions",
      "backend_remains_final_authority",
      "verifier_writes_truth",
      "verifier_activates_proof",
      "verifier_marks_bound",
      "local_policy_decides",
      "recheck_before_reliance",
      "no_safety_or_approval_inference"
    ];
    for (const k of required) expect(env).toHaveProperty(k);
    expect(env.envelope_type).toBe("MCP");
    expect(env.operator).toBe("unknown");
    expect(env.local_policy_decides).toBe(true);
    expect(env.recheck_before_reliance).toBe(true);
    expect(env.no_safety_or_approval_inference).toBe(true);
    expect(env.backend_remains_final_authority).toBe(true);
    expect(env.verifier_writes_truth).toBe(false);
    expect(env.verifier_activates_proof).toBe(false);
    expect(env.verifier_marks_bound).toBe(false);
    expect(env.recommended_next_steps.length).toBeGreaterThan(0);
    expect(env.setup_handoff.handoff_name).toBe("Deterministic Setup Handoff");
  });

  it("emptyEnvelope is a valid baseline", () => {
    const e = emptyEnvelope();
    expect(e.result_state).toBe("NOT_APPLICABLE");
    expect(e.policy_mode).toBe("OPEN");
    expect(e.local_policy_decides).toBe(true);
  });
});

describe("SARIF output", () => {
  it("produces a minimal SARIF 2.1.0 document", async () => {
    const result = await verify({
      target: "ECZ-CC-ABC123",
      policy: "OPEN",
      noNetwork: true
    });
    const sarif = buildSarif(result, 0) as {
      version: string;
      runs: { tool: { driver: { name: string } }; results: unknown[] }[];
    };
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0].tool.driver.name).toBe("ECZ-ID MCP Verifier");
    expect(sarif.runs[0].results.length).toBe(1);
  });
});
