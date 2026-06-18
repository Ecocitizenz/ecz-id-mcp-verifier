import { describe, it, expect } from "vitest";
import { classifyTarget, TARGET_TYPES } from "../src/classify-target.js";

describe("classifyTarget", () => {
  it("returns deterministic results across repeated calls", () => {
    const t = "https://github.com/org/repo";
    expect(classifyTarget(t)).toBe(classifyTarget(t));
    expect(classifyTarget(t)).toBe("github_repo");
  });

  it("recognises a valid parent ECZ-ID pattern", () => {
    expect(classifyTarget("ECZ-CC-ABC123")).toBe("ecz_id");
    expect(classifyTarget("ECZ-AG-XYZ987")).toBe("ecz_id");
    expect(classifyTarget("ECZ-GB-A93K7Q")).toBe("ecz_id");
  });

  it("recognises a valid child passport-instance ECZ-ID (PUBLIC code, incl. final 11)", () => {
    expect(classifyTarget("ECZ-GB-A93K7Q::AGENT-4F9Q2A")).toBe("ecz_id");
    expect(classifyTarget("ECZ-GB-A93K7Q::SSCM-M29F8Q")).toBe("ecz_id");
    expect(classifyTarget("ECZ-GB-A93K7Q::D1-DRONE-7A9F2Q")).toBe("ecz_id");
    expect(classifyTarget("ECZ-GB-A93K7Q::CRITICAL-INFRA-4F9Q2A")).toBe("ecz_id");
    expect(classifyTarget("ECZ-GB-A93K7Q::LIC-INFRA-4F9Q2A")).toBe("ecz_id");
    expect(classifyTarget("ECZ-GB-A93K7Q::ID-CONTINUITY-4F9Q2A")).toBe("ecz_id");
  });

  it("does NOT classify malformed / backend-key / obsolete ECZ-shaped strings as ecz_id", () => {
    // 7-char identity suffix, 3-letter country/4-char suffix, lowercase, bad char.
    expect(classifyTarget("ECZ-GB-EXAMPLE")).toBe("unsupported_target");
    expect(classifyTarget("ECZ-API-AB12")).toBe("unsupported_target");
    expect(classifyTarget("ECZ-gb-ABC123")).toBe("unsupported_target");
    expect(classifyTarget("ECZ-GB-ABC12!")).toBe("unsupported_target");
    expect(classifyTarget("ECZ-GB-A93K7Q::UNKNOWN-ABC123")).toBe("unsupported_target");
    // backend semantic keys are NOT public child codes.
    expect(classifyTarget("ECZ-GB-A93K7Q::AGENT_CREDENTIAL-4F9Q2A")).toBe("unsupported_target");
    expect(classifyTarget("ECZ-GB-A93K7Q::DRONE_D1-7A9F2Q")).toBe("unsupported_target");
    expect(classifyTarget("ECZ-GB-A93K7Q::LICENSED_OPERATOR-4F9Q2A")).toBe("unsupported_target");
    // obsolete earlier-taxonomy codes are rejected for new identifiers.
    expect(classifyTarget("ECZ-GB-A93K7Q::DATA-EXCHANGE-4F9Q2A")).toBe("unsupported_target");
    expect(classifyTarget("ECZ-GB-A93K7Q::POLICY-ENFORCE-4F9Q2A")).toBe("unsupported_target");
  });

  it("recognises MCP server well-known manifest URL", () => {
    expect(
      classifyTarget("https://api.example.com/.well-known/ecz-mcp.json")
    ).toBe("mcp_server");
  });

  it("recognises agent manifest well-known URL", () => {
    expect(
      classifyTarget("https://api.example.com/.well-known/ecz-agent.json")
    ).toBe("agent_manifest");
  });

  it("recognises GitHub repo URLs", () => {
    expect(classifyTarget("https://github.com/org/repo")).toBe("github_repo");
    expect(classifyTarget("http://github.com/foo/bar")).toBe("github_repo");
  });

  it("recognises npm package URLs and names", () => {
    expect(classifyTarget("https://www.npmjs.com/package/foo")).toBe(
      "npm_package"
    );
    expect(classifyTarget("npm:lodash")).toBe("npm_package");
    expect(classifyTarget("lodash")).toBe("npm_package");
    expect(classifyTarget("@scope/pkg")).toBe("npm_package");
  });

  it("recognises PyPI package URLs and prefixes", () => {
    expect(classifyTarget("https://pypi.org/project/requests")).toBe(
      "pypi_package"
    );
    expect(classifyTarget("pypi:requests")).toBe("pypi_package");
  });

  it("recognises container image references", () => {
    expect(classifyTarget("ghcr.io/org/img:1.0")).toBe("container_image");
    expect(classifyTarget("docker.io/library/nginx:latest")).toBe(
      "container_image"
    );
    expect(
      classifyTarget(
        "ghcr.io/org/img@sha256:0000000000000000000000000000000000000000000000000000000000000000"
      )
    ).toBe("container_image");
  });

  it("classifies arbitrary https URLs as api_url", () => {
    expect(classifyTarget("https://api.example.com/v1/foo")).toBe("api_url");
  });

  it("returns unsupported_target for empty / whitespace / nonsense", () => {
    expect(classifyTarget("")).toBe("unsupported_target");
    expect(classifyTarget("   ")).toBe("unsupported_target");
    expect(classifyTarget("hello world with spaces")).toBe(
      "unsupported_target"
    );
  });

  it("honours an explicit valid type hint over inference", () => {
    expect(classifyTarget("https://github.com/x/y", "npm_package")).toBe(
      "npm_package"
    );
  });

  it("ignores 'auto' / empty hint and infers", () => {
    expect(classifyTarget("https://github.com/x/y", "auto")).toBe(
      "github_repo"
    );
    expect(classifyTarget("https://github.com/x/y", "")).toBe("github_repo");
  });

  it("returns only canonical lowercase TARGET_TYPES", () => {
    const samples = [
      "ECZ-CC-ABC123",
      "https://api.example.com/.well-known/ecz-mcp.json",
      "https://api.example.com/.well-known/ecz-agent.json",
      "https://github.com/o/r",
      "lodash",
      "pypi:foo",
      "ghcr.io/o/i:1",
      "https://api.example.com/v1",
      ""
    ];
    for (const s of samples) {
      expect((TARGET_TYPES as readonly string[]).includes(classifyTarget(s))).toBe(true);
    }
  });
});
