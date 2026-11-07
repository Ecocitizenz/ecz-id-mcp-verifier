import { describe, it, expect } from "vitest";
import {
  PASSPORT_FAMILY_INPUTS, normalizePassportFamilyInput, resolvePassportFamily,
  passportQuickstartUrl, freePassportUrl
} from "../src/passport-family.js";

describe("seven-family acquisition routing", () => {
  it("accepts exactly auto + seven family hints", () => {
    expect([...PASSPORT_FAMILY_INPUTS]).toEqual([
      "auto", "agent", "mcp", "plugin", "api", "iot", "sdk", "service_workload"
    ]);
    expect(normalizePassportFamilyInput("Service & Workload")).toBe("service_workload");
    expect(normalizePassportFamilyInput("eighth_family")).toBeUndefined();
  });
  it("infers only unambiguous target shapes", () => {
    expect(resolvePassportFamily({ target: "https://x/.well-known/ecz-mcp.json", target_type: "mcp_server" }).family).toBe("mcp");
    expect(resolvePassportFamily({ target: "agent.json", target_type: "agent_manifest" }).family).toBe("agent");
    expect(resolvePassportFamily({ target: "https://api.example", target_type: "api_url" }).family).toBe("api");
    for (const type of ["github_repo", "npm_package", "pypi_package"] as const) {
      expect(resolvePassportFamily({ target: "x", target_type: type }).family, type).toBeNull();
    }
  });
  it("derives family exactly from a current child ECZ-ID", () => {
    const r = resolvePassportFamily({ target: "ECZ-GB-A93K7Q::PLUGIN_PASSPORT-4F9Q2A", target_type: "ecz_id" });
    expect(r.family).toBe("plugin");
    expect(r.source).toBe("child_ecz_id");
    expect(r.type_code).toBe("PLUGIN_PASSPORT");
  });
  it("explicit family is routing guidance only and disambiguates packages", () => {
    const r = resolvePassportFamily({ target: "@example/tool", target_type: "npm_package", explicit: "sdk" });
    expect(r.family).toBe("sdk");
    expect(r.source).toBe("explicit");
    expect(r.guidance_url).toBe(passportQuickstartUrl("sdk"));
  });
  it("container image routes to Service & Workload guidance without making the image a Passport", () => {
    const r = resolvePassportFamily({ target: "ghcr.io/o/svc:1", target_type: "container_image" });
    expect(r.family).toBe("service_workload");
    expect(r.subject_note).toMatch(/image.*not itself.*Passport/i);
  });
  it("ambiguous targets route to the generic free-Passport chooser", () => {
    const r = resolvePassportFamily({ target: "github.com/a/b", target_type: "github_repo" });
    expect(r.family).toBeNull();
    expect(r.guidance_url).toBe(freePassportUrl());
  });
});
