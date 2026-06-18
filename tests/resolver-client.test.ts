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

// Canonical fixtures (exact format): parent + child with a 6-char instance suffix.
const PARENT = "ECZ-GB-A93K7Q";
const CHILD = "ECZ-GB-A93K7Q::AGENT_CREDENTIAL-M4X9P2";

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

describe("resolver route contract: ECZ-ID acceptance (exact format)", () => {
  it("accepts a valid parent ECZ-ID", () => {
    expect(isAcceptedEczId(PARENT)).toBe(true);
  });
  it("accepts a valid child passport instance (6-char suffix)", () => {
    expect(isAcceptedEczId(CHILD)).toBe(true);
  });
  it("rejects malformed identifiers", () => {
    expect(isAcceptedEczId("ECZ-GB-EXAMPLE")).toBe(false);
    expect(isAcceptedEczId("ECZ-GB-A93K7Q::AGENT_CREDENTIAL-7F2A")).toBe(false); // 4-char suffix
    expect(isAcceptedEczId("not-an-ecz-id")).toBe(false);
    expect(isAcceptedEczId("ECZ-GB")).toBe(false);
    expect(isAcceptedEczId("https://example.com")).toBe(false);
  });
});

describe("resolver route contract: URL construction (parent + child)", () => {
  it("constructs the canonical human proof URL for a parent (/p/{ecz_id})", () => {
    const u = deriveResolverUrls(PARENT, "ecz_id", RBASE, ABASE);
    expect(u?.human).toBe("https://resolver.ecocitizenz.org/p/ECZ-GB-A93K7Q");
  });
  it("constructs the canonical machine JSON endpoint for a parent", () => {
    const u = deriveResolverUrls(PARENT, "ecz_id", RBASE, ABASE);
    expect(u?.machine).toBe("https://api.ecocitizenz.com/api/p/ECZ-GB-A93K7Q.json");
  });
  it("derives the human + machine URL for a child passport instance", () => {
    const u = deriveResolverUrls(CHILD, "ecz_id", RBASE, ABASE);
    expect(u?.human).toBe(
      "https://resolver.ecocitizenz.org/p/ECZ-GB-A93K7Q%3A%3AAGENT_CREDENTIAL-M4X9P2"
    );
    expect(u?.machine).toBe(
      "https://api.ecocitizenz.com/api/p/ECZ-GB-A93K7Q%3A%3AAGENT_CREDENTIAL-M4X9P2.json"
    );
  });
  it("deriveResolverUrl (back-compat) returns the human /p/ URL for an ECZ-ID", () => {
    expect(deriveResolverUrl(PARENT, "ecz_id", RBASE)).toBe(
      "https://resolver.ecocitizenz.org/p/ECZ-GB-A93K7Q"
    );
  });
  it("never fabricates a route for an invalid ECZ-ID", () => {
    expect(deriveResolverUrls("ECZ-GB-EXAMPLE", "ecz_id", RBASE, ABASE)).toBeUndefined();
  });
});

describe("resolver route contract: no fabricated paths for non-ECZ-ID targets", () => {
  it("does not fabricate a route for an arbitrary domain / URL", () => {
    expect(deriveResolverUrls("https://api.example.com/.well-known/ecz-mcp.json", "mcp_server", RBASE, ABASE)).toBeUndefined();
    expect(deriveResolverUrls("https://example.com", "api_url", RBASE, ABASE)).toBeUndefined();
  });
  it("does not fabricate a route for an arbitrary repo / package / image", () => {
    expect(deriveResolverUrls("github.com/org/repo", "github_repo", RBASE, ABASE)).toBeUndefined();
    expect(deriveResolverUrls("lodash", "npm_package", RBASE, ABASE)).toBeUndefined();
    expect(deriveResolverUrls("ghcr.io/o/i:1", "container_image", RBASE, ABASE)).toBeUndefined();
  });
  it("lookup on a non-ECZ-ID target is not applicable and attempts no request", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const r = await lookup("https://api.example.com/.well-known/ecz-mcp.json", "mcp_server");
    expect(r.applicable).toBe(false);
    expect(r.found).toBe(false);
    expect(r.network_attempted).toBe(false);
    expect(r.resolver_url).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });
  it("lookup on an invalid ECZ-ID never fetches (invalid IDs never trigger fetch)", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    // Even if mis-classified as ecz_id, the client refuses an invalid identifier.
    const r = await lookup("ECZ-GB-EXAMPLE", "ecz_id");
    expect(r.applicable).toBe(false);
    expect(r.network_attempted).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("resolver lookup behaviour (ECZ-ID, mocked network)", () => {
  it("no-network mode performs no fetch and returns found=false (applicable)", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const r = await lookup(PARENT, "ecz_id", { noNetwork: true });
    expect(r.found).toBe(false);
    expect(r.applicable).toBe(true);
    expect(r.network_attempted).toBe(false);
    expect(r.resolver_url).toBe("https://resolver.ecocitizenz.org/p/ECZ-GB-A93K7Q");
    expect(spy).not.toHaveBeenCalled();
  });

  it("200 active projection yields found=true with both URLs", async () => {
    mockFetch(() => new Response(activeBody(PARENT), { status: 200 }));
    const r = await lookup(PARENT, "ecz_id");
    expect(r.found).toBe(true);
    expect(r.proof_state).toBe("active");
    expect(r.network_attempted).toBe(true);
    expect(r.resolver_url).toBe("https://resolver.ecocitizenz.org/p/ECZ-GB-A93K7Q");
    expect(r.machine_json_url).toBe("https://api.ecocitizenz.com/api/p/ECZ-GB-A93K7Q.json");
  });

  it("HTTP 200 ALONE (empty/2xx-only body) is never proof", async () => {
    mockFetch(() => new Response("", { status: 200 }));
    const r = await lookup(PARENT, "ecz_id");
    expect(r.found).toBe(false);
    expect(r.proof_state).toBe("malformed");
    expect(r.machine_json_url).toBeUndefined();
  });

  it("200 child active projection yields found=true", async () => {
    mockFetch(() => new Response(activeBody(CHILD), { status: 200 }));
    const r = await lookup(CHILD, "ecz_id");
    expect(r.found).toBe(true);
    expect(r.proof_state).toBe("active");
  });

  it("404 yields not_found after a real lookup", async () => {
    mockFetch(() => new Response(JSON.stringify({ error: "ECZ-ID not found" }), { status: 404 }));
    const r = await lookup(PARENT, "ecz_id");
    expect(r.found).toBe(false);
    expect(r.proof_state).toBe("not_found");
    expect(r.http_status).toBe(404);
    expect(r.resolver_url).toBe("https://resolver.ecocitizenz.org/p/ECZ-GB-A93K7Q");
  });

  it("network error yields unavailable with no fabricated proof", async () => {
    mockFetch(() => {
      throw new Error("boom");
    });
    const r = await lookup(PARENT, "ecz_id");
    expect(r.found).toBe(false);
    expect(r.proof_state).toBe("unavailable");
    expect(r.network_attempted).toBe(true);
    expect(typeof r.network_error).toBe("string");
    expect(r.machine_json_url).toBeUndefined();
  });
});

// ISSUE 3 — strict, bounded lifecycle-body interpretation.
describe("interpretResolverResponse: HTTP + body -> proof state", () => {
  const id = "ECZ-GB-A93K7Q";
  const cases: Array<[string, number, unknown, ResolverProofState]> = [
    ["200 active", 200, { ecz_id: id, status: "active", trust_assertion: { revoked: false } }, "active"],
    ["200 revoked (trust_assertion)", 200, { ecz_id: id, status: "active", trust_assertion: { revoked: true } }, "revoked"],
    ["200 revoked (status)", 200, { ecz_id: id, status: "revoked" }, "revoked"],
    ["200 suspended", 200, { ecz_id: id, status: "suspended" }, "suspended"],
    ["200 expired", 200, { ecz_id: id, status: "expired" }, "expired"],
    ["200 abuse_flagged", 200, { ecz_id: id, status: "abuse_flagged", verification_state: "SUSPECTED_REUSE" }, "abuse"],
    ["200 stale (pulseguard)", 200, { ecz_id: id, status: "active", pulseguard: { overall_validity: "STALE" } }, "stale"],
    ["200 degraded", 200, { ecz_id: id, status: "degraded" }, "degraded"],
    ["200 proof_invalid", 200, { ecz_id: id, verification_state: "PROOF_INVALID" }, "proof_invalid"],
    ["200 target mismatch", 200, { ecz_id: "ECZ-GB-ZZZZZZ", status: "active" }, "target_mismatch"],
    ["200 unknown schema (no ecz_id)", 200, { hello: "world" }, "schema_mismatch"],
    ["200 unknown lifecycle", 200, { ecz_id: id, status: "frobnicated" }, "unknown"],
    ["410 gone", 410, { error: "gone" }, "not_found"],
    ["429 rate limited", 429, { error: "slow down" }, "unavailable"],
    ["500", 500, { error: "boom" }, "unavailable"],
    ["503", 503, { error: "maintenance" }, "unavailable"]
  ];
  for (const [label, status, body, expected] of cases) {
    it(`${label} -> ${expected}`, () => {
      expect(interpretResolverResponse(status, JSON.stringify(body), id)).toBe(expected);
    });
  }

  it("200 with non-JSON body -> malformed (never proof)", () => {
    expect(interpretResolverResponse(200, "<html>not json</html>", id)).toBe("malformed");
  });

  it("revoked dominates an active status claim (200 never overrides revoked)", () => {
    const body = JSON.stringify({ ecz_id: id, status: "active", lifecycle_state: "REVOKED" });
    expect(interpretResolverResponse(200, body, id)).toBe("revoked");
  });

  it("subject match is case-insensitive", () => {
    const body = JSON.stringify({ ecz_id: id.toLowerCase(), status: "active" });
    expect(interpretResolverResponse(200, body, id)).toBe("active");
  });
});

describe("result-state model still supports lifecycle states", () => {
  it("retains REVOKED / SUSPENDED / EXPIRED / MISMATCH / DEGRADED in the 18-state model", () => {
    for (const s of ["REVOKED", "SUSPENDED", "EXPIRED", "MISMATCH", "DEGRADED"]) {
      expect(RESULT_STATES).toContain(s as any);
    }
  });
});
