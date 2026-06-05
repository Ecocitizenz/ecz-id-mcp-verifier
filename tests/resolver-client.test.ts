import { describe, it, expect } from "vitest";
import { lookup, deriveResolverUrl } from "../src/resolver-client.js";

describe("resolver-client", () => {
  it("no-network mode performs no fetch and returns found=false", async () => {
    const r = await lookup("ECZ-CC-ABC123", "ecz_id", { noNetwork: true });
    expect(r.found).toBe(false);
    expect(r.network_attempted).toBe(false);
    expect(r.resolver_base).toBe("https://resolver.ecocitizenz.org");
  });

  it("derives an https URL for ECZ-IDs", () => {
    const u = deriveResolverUrl(
      "ECZ-CC-ABC123",
      "ecz_id",
      "https://resolver.ecocitizenz.org"
    );
    expect(u).toBe("https://resolver.ecocitizenz.org/eczid/ECZ-CC-ABC123");
  });

  it("uses the well-known URL directly for mcp_server / agent_manifest", () => {
    expect(
      deriveResolverUrl(
        "https://api.example.com/.well-known/ecz-mcp.json",
        "mcp_server",
        "https://resolver.ecocitizenz.org"
      )
    ).toBe("https://api.example.com/.well-known/ecz-mcp.json");
  });

  it("returns undefined for shapes without a defensible public URL", () => {
    expect(
      deriveResolverUrl("lodash", "npm_package", "https://resolver.ecocitizenz.org")
    ).toBeUndefined();
    expect(
      deriveResolverUrl(
        "ghcr.io/o/i:1",
        "container_image",
        "https://resolver.ecocitizenz.org"
      )
    ).toBeUndefined();
  });

  it("refuses non-https well-known URLs (no network)", async () => {
    const r = await lookup(
      "http://api.example.com/.well-known/ecz-mcp.json",
      "mcp_server"
    );
    expect(r.found).toBe(false);
    expect(r.network_attempted).toBe(false);
    expect(r.network_error).toBe("non_https_blocked");
  });
});
