import { describe, it, expect } from "vitest";
import { verify, type VerifyResult } from "../src/verify.js";
import { runCli } from "../src/cli.js";
import { buildJsonOutput } from "../src/output.js";
import {
  buildMcpActionEnvelope,
  buildAgentActionEnvelope,
  buildRequestToResolve,
  buildReciprocalRelianceEnvelope,
  REQUEST_TO_RESOLVE_MESSAGE,
  AUTHORITY_BOUNDARY
} from "../src/result-actions.js";

const MCP_TARGET = "https://mcp.example.com/.well-known/ecz-mcp.json";
const AGENT_TARGET = "https://agent.example.com/.well-known/ecz-agent.json";

async function verifyMcpUnresolved(policy: "OPEN" | "PREFER" | "REQUIRE" = "OPEN") {
  return verify({ target: MCP_TARGET, policy, noNetwork: true });
}

// Synthetic resolved MCP result for deterministic resolved-branch coverage.
function resolvedMcpResult(): VerifyResult {
  return {
    target: MCP_TARGET,
    target_type: "mcp_server",
    policy_mode: "PREFER",
    operator: "unknown",
    result_state: "RESOLVER_VERIFIABLE",
    reason_codes: [],
    resolver_url: "https://resolver.ecocitizenz.org/eczid/example",
    machine_json_url: "https://resolver.ecocitizenz.org/eczid/example.json",
    trustops_action_url: "https://trustops.ecocitizenz.com/start",
    developer_guidance_url: "https://developers.ecocitizenz.com",
    trustops_base_url: "https://trustops.ecocitizenz.com/start",
    developer_base_url: "https://developers.ecocitizenz.com",
    network_attempted: false
  };
}

describe("result-actions: MCP Action Envelope", () => {
  it("exists for an unresolved MCP target", async () => {
    const env = buildMcpActionEnvelope(await verifyMcpUnresolved());
    expect(env).not.toBeNull();
    expect(env!.type).toBe("ecz.mcp_action_envelope");
    expect(env!.version).toBe("1.0");
    expect(env!.subject.target_type).toBe("mcp_server");
    expect(env!.posture).toBe("NO_PUBLIC_RESOLVER_PROOF_FOUND");
    expect(env!.recommended_path).toBe("improve_resolver_posture");
    expect(env!.missing_evidence).toContain("NO_PUBLIC_RESOLVER_PROOF_FOUND");
    expect(env!.authority_boundary).toBe(AUTHORITY_BOUNDARY);
  });

  it("carries the read-only authority boundary flags", async () => {
    const env = buildMcpActionEnvelope(await verifyMcpUnresolved())!;
    expect(env.local_policy_decides).toBe(true);
    expect(env.recheck_before_reliance).toBe(true);
    expect(env.no_safety_or_approval_inference).toBe(true);
    expect(env.verifier_writes_truth).toBe(false);
    expect(env.verifier_activates_proof).toBe(false);
    expect(env.verifier_marks_bound).toBe(false);
  });

  it("exposes TrustOps and Developer Gateway routes as route-only actions", async () => {
    const env = buildMcpActionEnvelope(await verifyMcpUnresolved())!;
    const labels = env.actions.map((a) => a.label);
    expect(labels).toContain("Open TrustOps setup if you operate this target");
    expect(labels).toContain("Share resolver guidance");
    expect(env.trustops_action_url).toMatch(/^https:\/\/trustops\.ecocitizenz\.com\/start/);
    expect(env.developer_guidance_url).toMatch(/^https:\/\/developers\.ecocitizenz\.com/);
    // No action is a checkout/purchase button: kinds are route or recheck only.
    for (const a of env.actions) expect(["route", "recheck"]).toContain(a.kind);
  });

  it("is null for a non-MCP target", async () => {
    const res = await verify({ target: "ECZ-CC-ABC123", noNetwork: true });
    expect(buildMcpActionEnvelope(res)).toBeNull();
  });

  it("uses view_resolver_proof for a resolved MCP target", () => {
    const env = buildMcpActionEnvelope(resolvedMcpResult())!;
    expect(env.recommended_path).toBe("view_resolver_proof");
    expect(env.missing_evidence).toEqual([]);
  });
});

describe("result-actions: Request-to-Resolve packet", () => {
  it("exists for an unresolved MCP target with the exact contract", async () => {
    const p = buildRequestToResolve(await verifyMcpUnresolved())!;
    expect(p).not.toBeNull();
    expect(p.type).toBe("ecz.request_to_resolve");
    expect(p.version).toBe("1.0");
    expect(p.target_type).toBe("mcp_server");
    expect(p.message).toBe(REQUEST_TO_RESOLVE_MESSAGE);
    expect(p.message).toContain("This does not mean unsafe");
    expect(p.share_label).toBe("Share resolver guidance");
    expect(p.operator_label).toBe("Open TrustOps setup if you operate this target");
    expect(p.trustops_url).toBe("https://trustops.ecocitizenz.com/start");
    expect(p.developer_guidance_url).toBe("https://developers.ecocitizenz.com");
    expect(p.ttl_hint).toBe("generated_locally_no_server_claim");
  });

  it("never claims to be signed or server-created locally", async () => {
    const p = buildRequestToResolve(await verifyMcpUnresolved())!;
    expect(p.signed_request).toBe(false);
    expect(p.server_side_status).toBe("not_created_by_cli");
  });

  it("is null for a resolved target", () => {
    expect(buildRequestToResolve(resolvedMcpResult())).toBeNull();
  });

  it("is null for an unsupported target", async () => {
    const res = await verify({ target: "hello world nonsense", noNetwork: true });
    expect(buildRequestToResolve(res)).toBeNull();
  });
});

describe("result-actions: Reciprocal Reliance Envelope", () => {
  it("populates the mcp_subject for an MCP target and never decides authorisation", async () => {
    const env = buildReciprocalRelianceEnvelope(await verifyMcpUnresolved())!;
    expect(env.type).toBe("ecz.reciprocal_reliance_envelope");
    expect(env.mcp_subject).not.toBeNull();
    expect(env.agent_subject).toBeNull();
    expect(env.external_authorisation).toBe("not_determined_by_eczid");
    expect(env.local_policy_decides).toBe(true);
    expect(env.no_safety_or_approval_inference).toBe(true);
  });

  it("populates the agent_subject for an agent target", async () => {
    const res = await verify({ target: AGENT_TARGET, noNetwork: true });
    const env = buildReciprocalRelianceEnvelope(res)!;
    expect(env.agent_subject).not.toBeNull();
    expect(env.mcp_subject).toBeNull();
    expect(buildAgentActionEnvelope(res)!.type).toBe("ecz.agent_action_envelope");
  });

  it("is null for a non agent/mcp target", async () => {
    const res = await verify({ target: "ECZ-CC-ABC123", noNetwork: true });
    expect(buildReciprocalRelianceEnvelope(res)).toBeNull();
  });
});

describe("result-actions: JSON output integration", () => {
  it("includes the new result-actions fields with boundary flags", async () => {
    const res = await verifyMcpUnresolved();
    const out = buildJsonOutput(res, { exit_code: 0 });
    expect(out).toHaveProperty("mcp_action_envelope");
    expect(out).toHaveProperty("request_to_resolve");
    expect(out).toHaveProperty("reciprocal_reliance_envelope");
    expect(out.mcp_action_envelope).not.toBeNull();
    expect(out.request_to_resolve).not.toBeNull();
    expect(out.verifier_writes_truth).toBe(false);
    expect(out.verifier_activates_proof).toBe(false);
    expect(out.verifier_marks_bound).toBe(false);
    // Backward-compatible: prior fields remain.
    expect(out).toHaveProperty("setup_handoff");
    expect(out).toHaveProperty("action_envelope");
    expect(out.trustops_action_url).toMatch(/trustops\.ecocitizenz\.com\/start/);
    expect(out.developer_guidance_url).toMatch(/developers\.ecocitizenz\.com/);
  });
});

describe("result-actions: GitHub Action outputs", () => {
  it("emits mcp-action-envelope-json and request-to-resolve-json plus existing outputs", async () => {
    const r = await runCli(["--target", MCP_TARGET, "--offline"]);
    expect(r.gh_outputs).toMatch(/^mcp-action-envelope-json=/m);
    expect(r.gh_outputs).toMatch(/^request-to-resolve-json=/m);
    // Backward compatibility: existing outputs still present.
    expect(r.gh_outputs).toMatch(/^result-state=/m);
    expect(r.gh_outputs).toMatch(/^reason-codes=/m);
    expect(r.gh_outputs).toMatch(/^action-envelope-json=/m);
    expect(r.gh_outputs).toMatch(/^setup-handoff-json=/m);
    expect(r.gh_outputs).toMatch(/^primary-action=/m);
    expect(r.gh_outputs).toMatch(/^trustops-action-url=/m);
    expect(r.gh_outputs).toMatch(/^developer-guidance-url=/m);
    // The emitted packet must not claim to be signed.
    const line = r.gh_outputs!.split("\n").find((l) => l.startsWith("request-to-resolve-json="))!;
    const packet = JSON.parse(line.slice("request-to-resolve-json=".length));
    expect(packet.signed_request).toBe(false);
    expect(packet.server_side_status).toBe("not_created_by_cli");
  });
});

describe("result-actions: human report next step", () => {
  it("renders a Next step block for unresolved targets", async () => {
    const r = await runCli(["--target", MCP_TARGET, "--offline", "--report"]);
    expect(r.stdout).toMatch(/Next step:/);
    expect(r.stdout).toContain(REQUEST_TO_RESOLVE_MESSAGE);
    expect(r.stdout).toMatch(/Share resolver guidance:/);
    expect(r.stdout).toMatch(/Open TrustOps setup if you operate this target:/);
    expect(r.stdout).toMatch(/Re-check before reliance/);
  });
});

describe("result-actions: copy guardrails on serialized objects", () => {
  it("contains no forbidden wording except the sanctioned 'This does not mean unsafe'", async () => {
    const res = await verifyMcpUnresolved();
    const blob = JSON.stringify([
      buildMcpActionEnvelope(res),
      buildAgentActionEnvelope(res),
      buildRequestToResolve(res),
      buildReciprocalRelianceEnvelope(res)
    ]);
    const stripped = blob.split("This does not mean unsafe").join("");
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
      /\bshopify endorsed\b/i,
      /\bgithub approved\b/i,
      /\bdemand proof\b/i,
      /\bmust buy\b/i,
      /\bforce provider\b/i
    ];
    for (const re of forbidden) {
      expect(re.test(stripped), `forbidden token ${re}`).toBe(false);
    }
  });
});

describe("result-actions: re-check contract (Require fails closed)", () => {
  it("REQUIRE on unresolved MCP fails closed (non-zero) while OPEN/PREFER do not", async () => {
    const req = await runCli(["--target", MCP_TARGET, "--policy", "require", "--offline"]);
    expect(req.exit_code).not.toBe(0);
    for (const p of ["open", "prefer"]) {
      const r = await runCli(["--target", MCP_TARGET, "--policy", p, "--offline"]);
      expect(r.exit_code).toBe(0);
    }
  });
});
