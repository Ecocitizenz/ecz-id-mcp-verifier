import { describe, it, expect } from "vitest";
import { runCli } from "../src/cli.js";
import {
  buildCapabilities,
  buildMcpConfig,
  runDoctor
} from "../src/capabilities.js";
import { VERIFIER_VERSION, PACKAGE_NAME, MCP_TOOL_NAMES } from "../src/constants.js";

describe("capability profile (--capabilities)", () => {
  const cap = buildCapabilities();

  it("reports the current version and stable profile id", () => {
    expect(cap.version).toBe(VERIFIER_VERSION);
    expect(cap.capability_profile).toBe("ecz-resolver-posture-v1");
    expect(cap.package).toBe(PACKAGE_NAME);
  });

  it("declares the two CLI aliases and the MCP server binary", () => {
    expect(cap.binaries.cli).toEqual(["ecz-id-mcp-verifier", "ecz-mcp-verify"]);
    expect(cap.binaries.mcp_server).toBe("ecz-id-mcp-server");
  });

  it("declares exactly the three read-only MCP tools over stdio", () => {
    expect(cap.mcp.transport).toBe("stdio");
    expect([...cap.mcp.tools]).toEqual([...MCP_TOOL_NAMES]);
    expect(cap.mcp.tools.length).toBe(3);
  });

  it("declares honest capability-scope flags (Resolver posture, not artifact inspection)", () => {
    expect(cap.artifact_binding_performed).toBe(false);
    expect(cap.manifest_inspection_performed).toBe(false);
    expect(cap.runtime_protocol_inspection_performed).toBe(false);
    expect(cap.local_policy_decides).toBe(true);
  });

  it("exposes privacy posture including no telemetry and offline capability", () => {
    expect(cap.privacy.no_source_uploaded).toBe(true);
    expect(cap.privacy.no_secrets_uploaded).toBe(true);
    expect(cap.privacy.no_telemetry).toBe(true);
    expect(cap.privacy.offline_capable).toBe(true);
  });

  it("does NOT overclaim (no safety/approval/certification verbs in does[])", () => {
    const joined = cap.does.join(" ").toLowerCase();
    for (const banned of ["certif", "guarantee", "approv", "safe", "insur", "compliance"]) {
      expect(joined.includes(banned), `does[] must not claim ${banned}`).toBe(false);
    }
    // and the limitations are stated
    const limits = cap.does_not.join(" ").toLowerCase();
    expect(limits).toContain("write canonical truth");
    expect(limits).toContain("mark bound");
  });

  it("routes to canonical public surfaces only", () => {
    expect(cap.routes.resolver).toBe("https://resolver.ecocitizenz.org");
    expect(cap.routes.machine_discovery).toBe(
      "https://machine.ecocitizenz.org/.well-known/ecz-machine.json"
    );
  });

  it("--capabilities CLI flag prints valid JSON and exits 0 with no target", async () => {
    const r = await runCli(["--capabilities"]);
    expect(r.exit_code).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.capability_profile).toBe("ecz-resolver-posture-v1");
    expect(j.version).toBe(VERIFIER_VERSION);
  });
});

describe("MCP host config (--print-mcp-config)", () => {
  it("builds a stdio server block with no secret and npx command", () => {
    const cfg = buildMcpConfig();
    const server = cfg.mcpServers["ecz-id"];
    expect(server.command).toBe("npx");
    expect(server.args).toEqual(["-y", "-p", PACKAGE_NAME, "ecz-id-mcp-server"]);
    // no environment/secret anywhere in the config
    expect(JSON.stringify(cfg).toLowerCase()).not.toContain("secret");
    expect(JSON.stringify(cfg).toLowerCase()).not.toContain("token");
  });

  it("--print-mcp-config CLI flag prints valid JSON and exits 0", async () => {
    const r = await runCli(["--print-mcp-config"]);
    expect(r.exit_code).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.mcpServers["ecz-id"].command).toBe("npx");
  });
});

describe("doctor self-test (--doctor)", () => {
  it("passes all checks with no network and no secret", async () => {
    const report = await runDoctor();
    expect(report.ok).toBe(true);
    expect(report.version).toBe(VERIFIER_VERSION);
    expect(report.no_secret_required).toBe(true);
    expect(report.no_network_required).toBe(true);
    for (const c of report.checks) expect(c.ok, `check ${c.name}`).toBe(true);
    // the offline verify check must confirm no network was attempted
    const offline = report.checks.find((c) => c.name === "offline_no_network_attempted");
    expect(offline?.ok).toBe(true);
  });

  it("--doctor CLI flag exits 0 (json) when healthy", async () => {
    const r = await runCli(["--doctor"]);
    expect(r.exit_code).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.type).toBe("ecz.doctor");
    expect(j.ok).toBe(true);
  });

  it("--doctor --report renders a deterministic human self-test", async () => {
    const r = await runCli(["--doctor", "--report"]);
    expect(r.exit_code).toBe(0);
    expect(r.stdout).toContain("self-test");
    expect(r.stdout.toLowerCase()).toContain("ready to use");
  });
});
