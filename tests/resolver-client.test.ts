import { describe, it, expect, vi, afterEach } from "vitest";
import {
  lookup,
  deriveResolverUrl,
  deriveResolverUrls,
  isAcceptedEczId,
  interpretResolverResponse,
  type ResolverProofState
} from "../src/resolver-client.js";
import { RESULT_STATES } from "../src/result-states.js";

const RBASE = "https://resolver.ecocitizenz.org";
const ABASE = "https://api.ecocitizenz.com";

// Canonical fixtures: parent + child using a PUBLIC passport-number code.
const PARENT = "ECZ-GB-A93K7Q";
const CHILD = "ECZ-GB-A93K7Q::AGENT-4F9Q2A";

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
    trust_assertion: { revoked: false, ledger_anchored: true, pulse_fresh: true }
  });
}

describe("resolver route contract: ECZ-ID acceptance (public codes)", () => {
  it("accepts a valid parent ECZ-ID", () => {
    expect(isAcceptedEczId(PARENT)).toBe(true);
  });
  it("accepts a valid child with a PUBLIC passport-number code", () => {
    expect(isAcceptedEczId(CHILD)).toBe(true);
    expect(isAcceptedEczId("ECZ-GB-A93K7Q::SSCM-M29F8Q")).toBe(true);
    expect(isAcceptedEczId("ECZ-GB-A93K7Q::D1-DRONE-7A9F2Q")).toBe(true);
  });
  it("rejects backend semantic keys as public child IDs", () => {
    expect(isAcceptedEczId("ECZ-GB-A93K7Q::AGENT_CREDENTIAL-M4X9P2")).toBe(false);
    expect(isAcceptedEczId("ECZ-GB-A93K7Q::SOFTWARE_SUPPLY_CHAIN-M29F8Q")).toBe(false);
    expect(isAcceptedEczId("ECZ-GB-A93K7Q::DRONE_D1-7A9F2Q")).toBe(false);
  });
  it("rejects malformed identifiers", () => {
    expect(isAcceptedEczId("ECZ-GB-EXAMPLE")).toBe(false);
    expect(isAcceptedEczId("ECZ-GB-A93K7Q::AGENT-7F2A")).toBe(false); // 4-char suffix
    expect(isAcceptedEczId("not-an-ecz-id")).toBe(false);
  });
});

describe("resolver route contract: PARENT URLs", () => {
  it("human proof URL is /p/{parent}", () => {
    expect(deriveResolverUrls(PARENT, "ecz_id", RBASE, ABASE)?.human).toBe(
      "https://resolver.ecocitizenz.org/p/ECZ-GB-A93K7Q"
    );
  });
  it("machine JSON is /api/p/{parent}.json (proven)", () => {
    expect(deriveResolverUrls(PARENT, "ecz_id", RBASE, ABASE)?.machine).toBe(
      "https://api.ecocitizenz.com/api/p/ECZ-GB-A93K7Q.json"
    );
  });
  it("kind is parent", () => {
    expect(deriveResolverUrls(PARENT, "ecz_id", RBASE, ABASE)?.kind).toBe("parent");
  });
  it("deriveResolverUrl (back-compat) returns the parent human URL", () => {
    expect(deriveResolverUrl(PARENT, "ecz_id", RBASE)).toBe(
      "https://resolver.ecocitizenz.org/p/ECZ-GB-A93K7Q"
    );
  });
});

describe("resolver route contract: CHILD URLs are decomposed, machine is unproven", () => {
  it("human URL is /p/{parent}/{passport_code}/{instance_suffix}", () => {
    expect(deriveResolverUrls("ECZ-GB-A93K7Q::AGENT-4F9Q2A", "ecz_id", RBASE, ABASE)?.human).toBe(
      "https://resolver.ecocitizenz.org/p/ECZ-GB-A93K7Q/AGENT/4F9Q2A"
    );
    expect(deriveResolverUrls("ECZ-GB-A93K7Q::SSCM-M29F8Q", "ecz_id", RBASE, ABASE)?.human).toBe(
      "https://resolver.ecocitizenz.org/p/ECZ-GB-A93K7Q/SSCM/M29F8Q"
    );
    expect(deriveResolverUrls("ECZ-GB-A93K7Q::D1-DRONE-7A9F2Q", "ecz_id", RBASE, ABASE)?.human).toBe(
      "https://resolver.ecocitizenz.org/p/ECZ-GB-A93K7Q/D1-DRONE/7A9F2Q"
    );
  });
  it("NEVER uses a percent-encoded internal child ID as a path", () => {
    const u = deriveResolverUrls(CHILD, "ecz_id", RBASE, ABASE)!;
    expect(u.human.includes("%3A%3A")).toBe(false);
    expect(u.human.includes("::")).toBe(false);
  });
  it("child has no machine JSON URL (endpoint unproven)", () => {
    const u = deriveResolverUrls(CHILD, "ecz_id", RBASE, ABASE)!;
    expect(u.kind).toBe("child");
    expect(u.machine).toBeUndefined();
  });
});

describe("resolver route contract: no fabricated paths for non-ECZ-ID / invalid targets", () => {
  it("no route for arbitrary URL / repo / package / image", () => {
    expect(deriveResolverUrls("https://example.com", "api_url", RBASE, ABASE)).toBeUndefined();
    expect(deriveResolverUrls("lodash", "npm_package", RBASE, ABASE)).toBeUndefined();
    expect(deriveResolverUrls("ghcr.io/o/i:1", "container_image", RBASE, ABASE)).toBeUndefined();
  });
  it("no route for an invalid ECZ-ID", () => {
    expect(deriveResolverUrls("ECZ-GB-EXAMPLE", "ecz_id", RBASE, ABASE)).toBeUndefined();
    expect(deriveResolverUrls("ECZ-GB-A93K7Q::AGENT_CREDENTIAL-M4X9P2", "ecz_id", RBASE, ABASE)).toBeUndefined();
  });
  it("lookup on a non-ECZ-ID attempts no request", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const r = await lookup("https://api.example.com/.well-known/ecz-mcp.json", "mcp_server");
    expect(r.applicable).toBe(false);
    expect(r.network_attempted).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
  it("lookup on an invalid ECZ-ID never fetches", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const r = await lookup("ECZ-GB-EXAMPLE", "ecz_id");
    expect(r.applicable).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("resolver lookup behaviour", () => {
  it("no-network parent: no fetch, applicable, human URL set", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const r = await lookup(PARENT, "ecz_id", { noNetwork: true });
    expect(r.found).toBe(false);
    expect(r.applicable).toBe(true);
    expect(r.resolver_url).toBe("https://resolver.ecocitizenz.org/p/ECZ-GB-A93K7Q");
    expect(spy).not.toHaveBeenCalled();
  });

  it("CHILD lookup: no fetch, human decomposed URL retained, machine null, unproven", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const r = await lookup(CHILD, "ecz_id");
    expect(r.applicable).toBe(true);
    expect(r.found).toBe(false);
    expect(r.proof_state).toBe("child_machine_unproven");
    expect(r.resolver_url).toBe("https://resolver.ecocitizenz.org/p/ECZ-GB-A93K7Q/AGENT/4F9Q2A");
    expect(r.machine_json_url).toBeUndefined();
    expect(r.network_attempted).toBe(false);
    expect(spy).not.toHaveBeenCalled(); // no fabricated child machine fetch
  });

  it("PARENT 200 active projection yields found=true with both URLs", async () => {
    mockFetch(() => new Response(activeBody(PARENT), { status: 200 }));
    const r = await lookup(PARENT, "ecz_id");
    expect(r.found).toBe(true);
    expect(r.proof_state).toBe("active");
    expect(r.machine_json_url).toBe("https://api.ecocitizenz.com/api/p/ECZ-GB-A93K7Q.json");
  });

  it("HTTP 200 ALONE (empty body) is never proof", async () => {
    mockFetch(() => new Response("", { status: 200 }));
    const r = await lookup(PARENT, "ecz_id");
    expect(r.found).toBe(false);
    expect(r.proof_state).toBe("malformed");
    expect(r.machine_json_url).toBeUndefined();
  });

  it("404 -> not_found; network error -> unavailable", async () => {
    mockFetch(() => new Response(JSON.stringify({ error: "x" }), { status: 404 }));
    expect((await lookup(PARENT, "ecz_id")).proof_state).toBe("not_found");
    mockFetch(() => { throw new Error("boom"); });
    const e = await lookup(PARENT, "ecz_id");
    expect(e.proof_state).toBe("unavailable");
    expect(typeof e.network_error).toBe("string");
  });
});

// Strict, bounded lifecycle interpretation (preserved + still green).
describe("interpretResolverResponse: HTTP + body -> proof state", () => {
  const id = PARENT;
  const cases: Array<[string, number, unknown, ResolverProofState]> = [
    ["200 active", 200, { ecz_id: id, status: "active", trust_assertion: { revoked: false } }, "active"],
    ["200 revoked (trust_assertion)", 200, { ecz_id: id, status: "active", trust_assertion: { revoked: true } }, "revoked"],
    ["200 revoked (status)", 200, { ecz_id: id, status: "revoked" }, "revoked"],
    ["200 suspended", 200, { ecz_id: id, status: "suspended" }, "suspended"],
    ["200 expired", 200, { ecz_id: id, status: "expired" }, "expired"],
    ["200 abuse_flagged", 200, { ecz_id: id, status: "abuse_flagged", verification_state: "SUSPECTED_REUSE" }, "abuse"],
    ["200 stale", 200, { ecz_id: id, status: "active", pulseguard: { overall_validity: "STALE" } }, "stale"],
    ["200 degraded", 200, { ecz_id: id, status: "degraded" }, "degraded"],
    ["200 proof_invalid", 200, { ecz_id: id, verification_state: "PROOF_INVALID" }, "proof_invalid"],
    ["200 target mismatch", 200, { ecz_id: "ECZ-GB-ZZZZZZ", status: "active" }, "target_mismatch"],
    ["200 unknown schema", 200, { hello: "world" }, "schema_mismatch"],
    ["200 unknown lifecycle", 200, { ecz_id: id, status: "frobnicated" }, "unknown"],
    ["410 gone", 410, { error: "gone" }, "not_found"],
    ["429", 429, { error: "rate" }, "unavailable"],
    ["500", 500, { error: "boom" }, "unavailable"],
    ["503", 503, { error: "down" }, "unavailable"]
  ];
  for (const [label, status, body, expected] of cases) {
    it(`${label} -> ${expected}`, () => {
      expect(interpretResolverResponse(status, JSON.stringify(body), id)).toBe(expected);
    });
  }
  it("200 non-JSON -> malformed", () => {
    expect(interpretResolverResponse(200, "<html>", id)).toBe("malformed");
  });
  it("revoked dominates an active claim", () => {
    expect(interpretResolverResponse(200, JSON.stringify({ ecz_id: id, status: "active", lifecycle_state: "REVOKED" }), id)).toBe("revoked");
  });
  it("subject match is case-insensitive", () => {
    expect(interpretResolverResponse(200, JSON.stringify({ ecz_id: id.toLowerCase(), status: "active" }), id)).toBe("active");
  });
});

describe("result-state model still supports lifecycle states", () => {
  it("retains REVOKED / SUSPENDED / EXPIRED / MISMATCH / DEGRADED in the 18-state model", () => {
    for (const s of ["REVOKED", "SUSPENDED", "EXPIRED", "MISMATCH", "DEGRADED"]) {
      expect(RESULT_STATES).toContain(s as any);
    }
  });
});
