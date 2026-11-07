import { describe, it, expect, vi, afterEach } from "vitest";
import {
  lookup,
  deriveResolverUrl,
  deriveResolverUrls,
  isAcceptedEczId,
  interpretResolverResponse,
  type ResolverProofState,
} from "../src/resolver-client.js";
import { RESULT_STATES } from "../src/result-states.js";
import { PUBLIC_PASSPORT_CODES } from "../src/ecz-id.js";

const RBASE = "https://resolver.ecocitizenz.org";
const ABASE = "https://api.ecocitizenz.com";
const PARENT = "ECZ-GB-A93K7Q";
const CHILD = "ECZ-GB-A93K7Q::AGENT_PASSPORT-4F9Q2A";

afterEach(() => {
  vi.restoreAllMocks();
});
function mockFetch(impl: (url: string) => Promise<Response> | Response) {
  vi.spyOn(globalThis, "fetch").mockImplementation(((input: any) =>
    Promise.resolve(impl(String(input)))) as typeof fetch);
}
function activeBody(id: string): string {
  return JSON.stringify({
    ecz_id: id,
    status: "active",
    lifecycle_state: "ACTIVE",
    trust_assertion: { revoked: false },
  });
}

describe("resolver route contract: current ECZ-ID acceptance", () => {
  it("accepts parent + all seven current child family codes", () => {
    expect(isAcceptedEczId(PARENT)).toBe(true);
    for (const code of PUBLIC_PASSPORT_CODES) {
      expect(isAcceptedEczId(`${PARENT}::${code}-4F9Q2A`), code).toBe(true);
    }
  });
  it("rejects catalogue-era child codes", () => {
    for (const code of ["AGENT", "API", "IOT", "SSCM", "D1-DRONE"]) {
      expect(isAcceptedEczId(`${PARENT}::${code}-4F9Q2A`)).toBe(false);
    }
  });
});

describe("resolver route contract: one route serves parent and every family", () => {
  it("parent uses /p/{ecz_id} and /api/p/{ecz_id}.json", () => {
    expect(deriveResolverUrls(PARENT, "ecz_id", RBASE, ABASE)).toEqual({
      human: `${RBASE}/p/${PARENT}`,
      machine: `${ABASE}/api/p/${PARENT}.json`,
      kind: "parent",
    });
    expect(deriveResolverUrl(PARENT, "ecz_id", RBASE)).toBe(
      `${RBASE}/p/${PARENT}`,
    );
  });
  it("child remains one identifier on both canonical hosts", () => {
    const u = deriveResolverUrls(CHILD, "ecz_id", RBASE, ABASE)!;
    expect(u.kind).toBe("child");
    expect(u.human).toBe(`${RBASE}/p/${CHILD}`);
    expect(u.machine).toBe(`${ABASE}/api/p/${CHILD}.json`);
  });
  it("all seven child families use the same route form", () => {
    for (const code of PUBLIC_PASSPORT_CODES) {
      const id = `${PARENT}::${code}-4F9Q2A`;
      const u = deriveResolverUrls(id, "ecz_id", RBASE, ABASE)!;
      expect(u.human).toBe(`${RBASE}/p/${id}`);
      expect(u.machine).toBe(`${ABASE}/api/p/${id}.json`);
    }
  });
  it("never fabricates a path for a non-ECZ-ID target", () => {
    expect(
      deriveResolverUrls("https://example.com", "api_url", RBASE, ABASE),
    ).toBeUndefined();
    expect(
      deriveResolverUrls("lodash", "npm_package", RBASE, ABASE),
    ).toBeUndefined();
  });
});

describe("resolver lookup behaviour", () => {
  it("offline child retains human route and performs no request", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const r = await lookup(CHILD, "ecz_id", { noNetwork: true });
    expect(r.applicable).toBe(true);
    expect(r.found).toBe(false);
    expect(r.proof_state).toBeUndefined();
    expect(r.resolver_url).toBe(`${RBASE}/p/${CHILD}`);
    expect(r.network_attempted).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
  it("child machine projection is actually read when network is enabled", async () => {
    mockFetch((url) => {
      expect(url).toBe(`${ABASE}/api/p/${CHILD}.json`);
      return new Response(activeBody(CHILD), { status: 200 });
    });
    const r = await lookup(CHILD, "ecz_id");
    expect(r.found).toBe(true);
    expect(r.proof_state).toBe("active");
    expect(r.machine_json_url).toBe(`${ABASE}/api/p/${CHILD}.json`);
  });
  it("parent active projection remains positive proof", async () => {
    mockFetch(() => new Response(activeBody(PARENT), { status: 200 }));
    const r = await lookup(PARENT, "ecz_id");
    expect(r.found).toBe(true);
    expect(r.proof_state).toBe("active");
  });
  it("404 is absence, never an adverse verdict", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
    );
    const r = await lookup(CHILD, "ecz_id");
    expect(r.found).toBe(false);
    expect(r.proof_state).toBe("not_found");
  });
});

// Strict, bounded lifecycle interpretation (preserved + still green).
describe("interpretResolverResponse: HTTP + body -> proof state", () => {
  const id = PARENT;
  const cases: Array<[string, number, unknown, ResolverProofState]> = [
    [
      "200 active",
      200,
      { ecz_id: id, status: "active", trust_assertion: { revoked: false } },
      "active",
    ],
    [
      "200 revoked (trust_assertion)",
      200,
      { ecz_id: id, status: "active", trust_assertion: { revoked: true } },
      "revoked",
    ],
    ["200 revoked (status)", 200, { ecz_id: id, status: "revoked" }, "revoked"],
    ["200 suspended", 200, { ecz_id: id, status: "suspended" }, "suspended"],
    ["200 expired", 200, { ecz_id: id, status: "expired" }, "expired"],
    [
      "200 abuse_flagged",
      200,
      {
        ecz_id: id,
        status: "abuse_flagged",
        verification_state: "SUSPECTED_REUSE",
      },
      "abuse",
    ],
    [
      "200 stale",
      200,
      {
        ecz_id: id,
        status: "active",
        pulseguard: { overall_validity: "STALE" },
      },
      "stale",
    ],
    ["200 degraded", 200, { ecz_id: id, status: "degraded" }, "degraded"],
    [
      "200 proof_invalid",
      200,
      { ecz_id: id, verification_state: "PROOF_INVALID" },
      "proof_invalid",
    ],
    [
      "200 target mismatch",
      200,
      { ecz_id: "ECZ-GB-ZZZZZZ", status: "active" },
      "target_mismatch",
    ],
    ["200 unknown schema", 200, { hello: "world" }, "schema_mismatch"],
    [
      "200 unknown lifecycle",
      200,
      { ecz_id: id, status: "frobnicated" },
      "unknown",
    ],
    ["410 gone", 410, { error: "gone" }, "not_found"],
    ["429", 429, { error: "rate" }, "unavailable"],
    ["500", 500, { error: "boom" }, "unavailable"],
    ["503", 503, { error: "down" }, "unavailable"],
  ];
  for (const [label, status, body, expected] of cases) {
    it(`${label} -> ${expected}`, () => {
      expect(interpretResolverResponse(status, JSON.stringify(body), id)).toBe(
        expected,
      );
    });
  }
  it("200 non-JSON -> malformed", () => {
    expect(interpretResolverResponse(200, "<html>", id)).toBe("malformed");
  });
  it("revoked dominates an active claim", () => {
    expect(
      interpretResolverResponse(
        200,
        JSON.stringify({
          ecz_id: id,
          status: "active",
          lifecycle_state: "REVOKED",
        }),
        id,
      ),
    ).toBe("revoked");
  });
  it("subject match is case-insensitive", () => {
    expect(
      interpretResolverResponse(
        200,
        JSON.stringify({ ecz_id: id.toLowerCase(), status: "active" }),
        id,
      ),
    ).toBe("active");
  });
});

describe("result-state model still supports lifecycle states", () => {
  it("retains REVOKED / SUSPENDED / EXPIRED / MISMATCH / DEGRADED in the 18-state model", () => {
    for (const s of [
      "REVOKED",
      "SUSPENDED",
      "EXPIRED",
      "MISMATCH",
      "DEGRADED",
    ]) {
      expect(RESULT_STATES).toContain(s as any);
    }
  });
});

// ---------------------------------------------------------------------------
// D6: bounded retry for a cold Core.
//
// Core answered in 28.7 s cold and 1.8-3.1 s warm, against a single 5 s attempt,
// so the first lookup of the day reported `unavailable` for a projection that was
// perfectly good. These pin BOTH halves: a cold read now recovers, and the retry
// stays bounded and never re-requests a definite answer.
// ---------------------------------------------------------------------------
describe("D6: bounded retry for a cold Core", () => {
  /** Counts attempts and replies per-attempt. */
  function mockSequence(steps: Array<() => Response | never>) {
    let i = 0;
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation((() => {
      const step = steps[Math.min(i, steps.length - 1)];
      i += 1;
      try {
        return Promise.resolve(step());
      } catch (e) {
        return Promise.reject(e);
      }
    }) as typeof fetch);
    return spy;
  }

  const abort = () => {
    const e = new Error("The operation was aborted");
    e.name = "AbortError";
    throw e;
  };

  it("COLD: a timed-out first attempt recovers on the retry and yields real proof", async () => {
    const spy = mockSequence([
      abort,
      () => new Response(activeBody(PARENT), { status: 200 }),
    ]);
    const r = await lookup(PARENT, "ecz_id");
    expect(r.proof_state).toBe("active");
    expect(r.found).toBe(true);
    expect(r.machine_json_url).toBe(`${ABASE}/api/p/${PARENT}.json`);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("WARM: a first-attempt answer is returned without any retry", async () => {
    const spy = mockSequence([
      () => new Response(activeBody(PARENT), { status: 200 }),
    ]);
    const r = await lookup(PARENT, "ecz_id");
    expect(r.proof_state).toBe("active");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("BOUNDED: a persistently dead endpoint stops at the attempt ceiling", async () => {
    const spy = mockSequence([abort]);
    const r = await lookup(PARENT, "ecz_id");
    expect(r.proof_state).toBe("unavailable");
    expect(r.found).toBe(false);
    expect(r.network_attempted).toBe(true);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("maxAttempts: 1 restores single-shot behaviour exactly", async () => {
    const spy = mockSequence([abort]);
    const r = await lookup(PARENT, "ecz_id", { maxAttempts: 1 });
    expect(r.proof_state).toBe("unavailable");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("BUDGET: the overall wall-clock ceiling is never exceeded", async () => {
    mockSequence([abort]);
    const started = Date.now();
    const r = await lookup(PARENT, "ecz_id", {
      totalBudgetMs: 300,
      timeoutMs: 100,
    });
    expect(r.proof_state).toBe("unavailable");
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it("a DEFINITE answer is never re-requested: 404 and 500 are asked once", async () => {
    const notFound = mockSequence([
      () => new Response(JSON.stringify({ error: "x" }), { status: 404 }),
    ]);
    expect((await lookup(PARENT, "ecz_id")).proof_state).toBe("not_found");
    expect(notFound).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();

    const boom = mockSequence([
      () => new Response(JSON.stringify({ error: "boom" }), { status: 500 }),
    ]);
    expect((await lookup(PARENT, "ecz_id")).proof_state).toBe("unavailable");
    expect(boom).toHaveBeenCalledTimes(1);
  });

  it("a TRANSIENT server code is retried and can then succeed", async () => {
    const spy = mockSequence([
      () => new Response(JSON.stringify({ error: "down" }), { status: 503 }),
      () => new Response(activeBody(PARENT), { status: 200 }),
    ]);
    const r = await lookup(PARENT, "ecz_id");
    expect(r.proof_state).toBe("active");
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("retrying never turns a negative lifecycle into proof", async () => {
    const spy = mockSequence([
      abort,
      () =>
        new Response(JSON.stringify({ ecz_id: PARENT, status: "revoked" }), {
          status: 200,
        }),
    ]);
    const r = await lookup(PARENT, "ecz_id");
    expect(r.proof_state).toBe("revoked");
    expect(r.found).toBe(false);
    expect(r.machine_json_url).toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("offline still performs no request at all", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const r = await lookup(PARENT, "ecz_id", { noNetwork: true });
    expect(r.network_attempted).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});
