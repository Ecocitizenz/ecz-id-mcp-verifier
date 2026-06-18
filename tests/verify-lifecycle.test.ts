import { describe, it, expect, vi, afterEach } from "vitest";
import { verify, mapProofState } from "../src/verify.js";
import { computeExitCode } from "../src/exit-codes.js";
import type { ResolverProofState } from "../src/resolver-client.js";
import { REASON_CODES } from "../src/reason-codes.js";
import { RESULT_STATES } from "../src/result-states.js";

const PARENT = "ECZ-GB-A93K7Q";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(status: number, body: unknown, asText = false) {
  vi.spyOn(globalThis, "fetch").mockImplementation((() =>
    Promise.resolve(
      new Response(asText ? String(body) : JSON.stringify(body), { status })
    )) as typeof fetch);
}

// ISSUE 3 — every lifecycle state maps to the safest applicable existing
// ResultState + ReasonCode; HTTP 200 alone never becomes valid proof.
describe("verify(): Resolver lifecycle mapping (mocked network)", () => {
  const cases: Array<{
    label: string;
    status: number;
    body: unknown;
    text?: boolean;
    result_state: string;
    contains: string[];
    exitOpen: number;
    exitRequire: number;
  }> = [
    {
      label: "200 active",
      status: 200,
      body: { ecz_id: PARENT, status: "active", trust_assertion: { revoked: false } },
      result_state: "RESOLVER_VERIFIABLE",
      contains: [],
      exitOpen: 0,
      exitRequire: 0
    },
    {
      label: "200 revoked",
      status: 200,
      body: { ecz_id: PARENT, status: "revoked" },
      result_state: "REVOKED",
      contains: ["REVOKED_PARENT"],
      exitOpen: 3,
      exitRequire: 3
    },
    {
      label: "200 suspended",
      status: 200,
      body: { ecz_id: PARENT, status: "suspended" },
      result_state: "SUSPENDED",
      contains: ["LOCAL_POLICY_DECIDES"],
      exitOpen: 3,
      exitRequire: 3
    },
    {
      label: "200 expired",
      status: 200,
      body: { ecz_id: PARENT, status: "expired" },
      result_state: "EXPIRED",
      contains: ["LOCAL_POLICY_DECIDES"],
      exitOpen: 3,
      exitRequire: 3
    },
    {
      label: "200 stale",
      status: 200,
      body: { ecz_id: PARENT, status: "active", pulseguard: { overall_validity: "STALE" } },
      result_state: "DEGRADED",
      contains: ["PULSEGUARD_STALE"],
      exitOpen: 0,
      exitRequire: 1
    },
    {
      label: "200 target mismatch",
      status: 200,
      body: { ecz_id: "ECZ-GB-ZZZZZZ", status: "active" },
      result_state: "MISMATCH",
      contains: ["RESOLVER_RESPONSE_UNVERIFIABLE"],
      exitOpen: 2,
      exitRequire: 2
    },
    {
      label: "200 abuse",
      status: 200,
      body: { ecz_id: PARENT, verification_state: "SUSPECTED_REUSE" },
      result_state: "MISMATCH",
      contains: ["AGENT_CREDENTIAL_REUSED"],
      exitOpen: 2,
      exitRequire: 2
    },
    {
      label: "200 malformed body",
      status: 200,
      body: "<not json>",
      text: true,
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      contains: ["RESOLVER_RESPONSE_UNVERIFIABLE"],
      exitOpen: 0,
      exitRequire: 1
    },
    {
      label: "200 unknown schema",
      status: 200,
      body: { hello: "world" },
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      contains: ["RESOLVER_RESPONSE_UNVERIFIABLE"],
      exitOpen: 0,
      exitRequire: 1
    },
    {
      label: "404",
      status: 404,
      body: { error: "not found" },
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      contains: ["NO_PUBLIC_RESOLVER_PROOF_FOUND"],
      exitOpen: 0,
      exitRequire: 1
    },
    {
      label: "410 gone",
      status: 410,
      body: { error: "gone" },
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      contains: ["NO_PUBLIC_RESOLVER_PROOF_FOUND"],
      exitOpen: 0,
      exitRequire: 1
    },
    {
      label: "429",
      status: 429,
      body: { error: "rate" },
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      contains: ["NO_PUBLIC_RESOLVER_PROOF_FOUND"],
      exitOpen: 0,
      exitRequire: 1
    },
    {
      label: "503",
      status: 503,
      body: { error: "down" },
      result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
      contains: ["NO_PUBLIC_RESOLVER_PROOF_FOUND"],
      exitOpen: 0,
      exitRequire: 1
    }
  ];

  for (const c of cases) {
    it(`${c.label} -> ${c.result_state}`, async () => {
      mockFetch(c.status, c.body, c.text);
      const res = await verify({ target: PARENT, policy: "OPEN" });
      expect(res.result_state).toBe(c.result_state);
      for (const code of c.contains) {
        expect(res.reason_codes).toContain(code as any);
      }
      // Never advertise machine proof unless active.
      if (c.result_state !== "RESOLVER_VERIFIABLE") {
        expect(res.machine_json_url).toBeNull();
      } else {
        expect(res.machine_json_url).not.toBeNull();
      }
      const failed = res.network_attempted && Boolean(res.network_error);
      expect(computeExitCode(res.result_state, "OPEN", { network_attempted_and_failed: failed })).toBe(c.exitOpen);
      expect(computeExitCode(res.result_state, "REQUIRE", { network_attempted_and_failed: failed })).toBe(c.exitRequire);
    });
  }

  it("timeout / transport failure -> unavailable -> fail-closed exit 5 under REQUIRE", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((() => {
      const e = new Error("aborted");
      e.name = "AbortError";
      return Promise.reject(e);
    }) as typeof fetch);
    const res = await verify({ target: PARENT, policy: "REQUIRE" });
    expect(res.result_state).toBe("NO_PUBLIC_RESOLVER_PROOF_FOUND");
    expect(res.network_attempted).toBe(true);
    expect(typeof res.network_error).toBe("string");
    const failed = res.network_attempted && Boolean(res.network_error);
    expect(computeExitCode(res.result_state, "REQUIRE", { network_attempted_and_failed: failed })).toBe(5);
  });

  it("invalid ECZ-ID target is unsupported and never triggers a fetch", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const res = await verify({ target: "ECZ-GB-EXAMPLE", policy: "REQUIRE" });
    expect(res.result_state).toBe("UNSUPPORTED_TARGET");
    expect(spy).not.toHaveBeenCalled();
    expect(res.resolver_url).toBeNull();
  });
});

describe("mapProofState: total + safe mapping", () => {
  const states: ResolverProofState[] = [
    "active", "not_found", "unavailable", "malformed", "schema_mismatch",
    "target_mismatch", "revoked", "suspended", "expired", "stale", "degraded",
    "abuse", "proof_invalid", "unknown"
  ];
  it("maps every proof state to a canonical ResultState and canonical ReasonCodes", () => {
    for (const s of states) {
      const m = mapProofState(s);
      expect(RESULT_STATES).toContain(m.result_state as any);
      for (const rc of m.reason_codes) {
        expect(REASON_CODES).toContain(rc as any);
      }
    }
  });
  it("only 'active' is positive proof", () => {
    expect(mapProofState("active").result_state).toBe("RESOLVER_VERIFIABLE");
    for (const s of states.filter((x) => x !== "active")) {
      expect(mapProofState(s).result_state).not.toBe("RESOLVER_VERIFIABLE");
    }
  });
  it("undefined (offline / no lookup) maps to missing proof, never proof", () => {
    expect(mapProofState(undefined).result_state).toBe("NO_PUBLIC_RESOLVER_PROOF_FOUND");
  });
});
