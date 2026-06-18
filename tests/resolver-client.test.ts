import { describe, it, expect, vi, afterEach } from "vitest";
import {
  lookup,
  deriveResolverUrl,
  deriveResolverUrls,
  isAcceptedEczId
} from "../src/resolver-client.js";
import { RESULT_STATES } from "../src/result-states.js";

const RBASE = "https://resolver.ecocitizenz.org";
const ABASE = "https://api.ecocitizenz.com";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(impl: (url: string) => Promise<Response> | Response) {
  vi.spyOn(globalThis, "fetch").mockImplementation(((input: any) =>
    Promise.resolve(impl(String(input)))) as typeof fetch);
}

describe("resolver route contract: ECZ-ID acceptance", () => {
  it("accepts a valid parent ECZ-ID", () => {
    expect(isAcceptedEczId("ECZ-GB-ABC123")).toBe(true);
  });
  it("accepts a valid child passport instance", () => {
    expect(isAcceptedEczId("ECZ-GB-ABC123::AGENT_CREDENTIAL-7F2A")).toBe(true);
  });
  it("rejects an invalid identifier", () => {
    expect(isAcceptedEczId("not-an-ecz-id")).toBe(false);
    expect(isAcceptedEczId("ECZ-GB")).toBe(false);
    expect(isAcceptedEczId("https://example.com")).toBe(false);
  });
});

describe("resolver route contract: URL construction", () => {
  it("constructs the canonical human proof URL (/p/{ecz_id})", () => {
    const u = deriveResolverUrls("ECZ-GB-ABC123", "ecz_id", RBASE, ABASE);
    expect(u?.human).toBe("https://resolver.ecocitizenz.org/p/ECZ-GB-ABC123");
  });
  it("constructs the canonical machine JSON endpoint (api host /api/p/{ecz_id}.json)", () => {
    const u = deriveResolverUrls("ECZ-GB-ABC123", "ecz_id", RBASE, ABASE);
    expect(u?.machine).toBe("https://api.ecocitizenz.com/api/p/ECZ-GB-ABC123.json");
  });
  it("derives the human URL for a child passport instance", () => {
    const u = deriveResolverUrls("ECZ-GB-ABC123::AGENT_CREDENTIAL-7F2A", "ecz_id", RBASE, ABASE);
    expect(u?.human).toBe(
      "https://resolver.ecocitizenz.org/p/ECZ-GB-ABC123%3A%3AAGENT_CREDENTIAL-7F2A"
    );
  });
  it("deriveResolverUrl (back-compat) returns the human /p/ URL for an ECZ-ID", () => {
    expect(deriveResolverUrl("ECZ-GB-ABC123", "ecz_id", RBASE)).toBe(
      "https://resolver.ecocitizenz.org/p/ECZ-GB-ABC123"
    );
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
});

describe("resolver lookup behaviour (ECZ-ID, mocked network)", () => {
  it("no-network mode performs no fetch and returns found=false (applicable)", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const r = await lookup("ECZ-GB-ABC123", "ecz_id", { noNetwork: true });
    expect(r.found).toBe(false);
    expect(r.applicable).toBe(true);
    expect(r.network_attempted).toBe(false);
    expect(r.resolver_url).toBe("https://resolver.ecocitizenz.org/p/ECZ-GB-ABC123");
    expect(spy).not.toHaveBeenCalled();
  });

  it("valid proof: a 2xx machine response yields found=true with both URLs", async () => {
    mockFetch(() => new Response(JSON.stringify({ state: "active" }), { status: 200 }));
    const r = await lookup("ECZ-GB-ABC123", "ecz_id");
    expect(r.found).toBe(true);
    expect(r.network_attempted).toBe(true);
    expect(r.resolver_url).toBe("https://resolver.ecocitizenz.org/p/ECZ-GB-ABC123");
    expect(r.machine_json_url).toBe("https://api.ecocitizenz.com/api/p/ECZ-GB-ABC123.json");
  });

  it("not found: a 404 machine response yields found=false after a real lookup", async () => {
    mockFetch(() => new Response("", { status: 404 }));
    const r = await lookup("ECZ-GB-ABC123", "ecz_id");
    expect(r.found).toBe(false);
    expect(r.network_attempted).toBe(true);
    expect(r.http_status).toBe(404);
    expect(r.resolver_url).toBe("https://resolver.ecocitizenz.org/p/ECZ-GB-ABC123");
  });

  it("unavailable: a network error yields found=false with an error and no fabricated proof", async () => {
    mockFetch(() => {
      throw new Error("boom");
    });
    const r = await lookup("ECZ-GB-ABC123", "ecz_id");
    expect(r.found).toBe(false);
    expect(r.network_attempted).toBe(true);
    expect(typeof r.network_error).toBe("string");
    expect(r.machine_json_url).toBeUndefined();
  });
});

describe("result-state model still supports lifecycle states", () => {
  it("retains REVOKED / SUSPENDED / EXPIRED / MISMATCH / DEGRADED in the 18-state model", () => {
    for (const s of ["REVOKED", "SUSPENDED", "EXPIRED", "MISMATCH", "DEGRADED"]) {
      expect(RESULT_STATES).toContain(s as any);
    }
  });
});
