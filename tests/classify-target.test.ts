import { describe, it, expect } from "vitest";
import { classifyTarget, TARGET_TYPES } from "../src/classify-target.js";

describe("classifyTarget", () => {
  it("returns deterministic results across repeated calls", () => {
    const t = "https://github.com/org/repo";
    expect(classifyTarget(t)).toBe(classifyTarget(t));
    expect(classifyTarget(t)).toBe("github_repo");
  });

  it("recognises ECZ-ID pattern", () => {
    expect(classifyTarget("ECZ-CC-ABC123")).toBe("ecz_id");
    expect(classifyTarget("ECZ-AG-XYZ987")).toBe("ecz_id");
    expect(classifyTarget("ECZ-API-AB12")).toBe("ecz_id");
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
