import { describe, expect, it } from "vitest";
import { verify } from "../src/verify.js";
import { buildJsonOutput } from "../src/output.js";
import {
  buildPassportOpportunity,
  renderPassportOpportunityLine
} from "../src/passport-opportunity.js";

async function outputFor(targetType: string, operator: string) {
  const result = await verify({
    target: "https://x.example/",
    targetType: targetType as never,
    operator: operator as never,
    noNetwork: true
  });
  return buildJsonOutput(result, { exit_code: 0 });
}

describe("passport opportunity: offered only where a Passport is the missing thing", () => {
  it("offers the correct free Passport for the two machine-identity shapes", async () => {
    const mcp = await outputFor("mcp_server", "self");
    expect(mcp.passport_opportunity?.passport_type).toBe("MCP_PASSPORT");
    const agent = await outputFor("agent_manifest", "self");
    expect(agent.passport_opportunity?.passport_type).toBe("AGENT_PASSPORT");
  });

  it("offers nothing for target shapes that cannot hold one", async () => {
    for (const t of ["npm_package", "github_repo", "api_url", "container_image", "ecz_id"]) {
      const out = await outputFor(t, "self");
      expect(out.passport_opportunity, `${t} must not be offered a Passport`).toBeNull();
    }
  });

  it("offers nothing for lifecycle problems on an identity that already exists", () => {
    // REVOKED/SUSPENDED/EXPIRED/MISMATCH describe an identity that EXISTS and has a
    // problem. "Get a free Passport" there would be wrong, and slightly insulting.
    for (const state of ["REVOKED", "SUSPENDED", "EXPIRED", "MISMATCH", "RESOLVER_VERIFIABLE"]) {
      const opp = buildPassportOpportunity({
        target_type: "mcp_server",
        result_state: state as never,
        operator: "self",
        trustops_action_url: "https://trustops.ecocitizenz.com/start"
      });
      expect(opp, `${state} must not trigger an offer`).toBeNull();
    }
  });
});

describe("passport opportunity: the product law travels with the offer", () => {
  it("always says FREE, non-sellable, DECLARED minimum Parent", async () => {
    for (const t of ["mcp_server", "agent_manifest"]) {
      const opp = (await outputFor(t, "self")).passport_opportunity!;
      expect(opp.price).toBe("FREE");
      expect(opp.sellable).toBe(false);
      expect(opp.minimum_parent).toBe("DECLARED");
    }
  });

  it("never implies the free identity is an assurance", async () => {
    const opp = (await outputFor("mcp_server", "self")).passport_opportunity!;
    for (const [k, v] of Object.entries(opp.what_it_is_not)) {
      expect(v, `${k} must be false`).toBe(false);
    }
  });

  it("never substitutes the paid Agent Credential", async () => {
    const out = await outputFor("agent_manifest", "self");
    const blob = JSON.stringify(out.passport_opportunity);
    expect(blob).not.toContain("AGENT_CREDENTIAL");
    expect(blob).not.toContain("5.99");
    expect(out.passport_opportunity!.agent_credential_never_substituted).toBe(true);
  });

  it("does not assert an availability it cannot observe", async () => {
    // The verifier is local-first and offline-capable. Claiming the route is open would
    // be a guess; claiming it is closed would be equally unfounded.
    const opp = (await outputFor("mcp_server", "self")).passport_opportunity!;
    expect(opp.acquisition_availability.state).toBe("UNKNOWN_FROM_THIS_SURFACE");
  });
});

describe("passport opportunity: owner versus requester", () => {
  it("lets the operator claim and carries the zero-retype handoff", async () => {
    const opp = (await outputFor("mcp_server", "self")).passport_opportunity!;
    const claim = opp.next_actions.find((a) => a.action === "ACQUIRE_MCP_PASSPORT");
    expect(claim).toBeDefined();
    expect(claim!.url).toContain("requested_passport_type=mcp");
    expect(opp.eligible_acquisition_route).toBe(true);
  });

  it("offers a third party only a request, never a claim", async () => {
    const opp = (await outputFor("mcp_server", "third_party")).passport_opportunity!;
    expect(opp.next_actions.some((a) => a.action.startsWith("ACQUIRE_"))).toBe(false);
    expect(opp.next_actions.some((a) => a.action === "REQUEST_PASSPORT")).toBe(true);
    expect(opp.eligible_acquisition_route).toBe(false);
  });

  it("does not infer operator status when it is unknown", async () => {
    const opp = (await outputFor("mcp_server", "unknown")).passport_opportunity!;
    expect(opp.next_actions[0]!.action).toBe("CHOOSE_OPERATOR_PATH");
  });

  it("always offers a re-check", async () => {
    for (const op of ["self", "third_party", "unknown"]) {
      const opp = (await outputFor("mcp_server", op)).passport_opportunity!;
      expect(opp.next_actions.some((a) => a.action === "RECHECK_BEFORE_RELIANCE")).toBe(true);
    }
  });
});

describe("passport opportunity: verification truth is untouched", () => {
  it("does not alter any verification field", async () => {
    // The conversion plane computes FROM the result and never feeds back into it.
    const withOffer = await outputFor("mcp_server", "self");
    const withoutOffer = await outputFor("npm_package", "self");
    expect(withOffer.passport_opportunity).not.toBeNull();
    expect(withoutOffer.passport_opportunity).toBeNull();

    // The result state is the same missing-proof state in both cases; only the offer differs.
    expect(withOffer.result_state).toBe("NO_PUBLIC_RESOLVER_PROOF_FOUND");
    expect(withoutOffer.result_state).toBe("NO_PUBLIC_RESOLVER_PROOF_FOUND");
    expect(withOffer.verifier_writes_truth).toBe(false);
    expect(withOffer.verifier_activates_proof).toBe(false);
    expect(withOffer.verifier_marks_bound).toBe(false);
  });

  it("renders a human line that never scores absence", async () => {
    const opp = (await outputFor("mcp_server", "self")).passport_opportunity;
    const line = renderPassportOpportunityLine(opp)!;
    expect(line.toLowerCase()).toContain("free");
    for (const banned of ["unsafe", "untrusted", "risk", "non-compliant", "dangerous"]) {
      expect(line.toLowerCase()).not.toContain(banned);
    }
    expect(renderPassportOpportunityLine(null)).toBeNull();
  });
});
