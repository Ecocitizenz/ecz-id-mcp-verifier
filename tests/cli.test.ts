import { describe, it, expect } from "vitest";
import { runCli } from "../src/cli.js";

describe("CLI", () => {
  it("--help prints usage and exits 0", async () => {
    const r = await runCli(["--help"]);
    expect(r.exit_code).toBe(0);
    expect(r.stdout).toMatch(/Usage:/);
    expect(r.stdout).toMatch(/ECZ-ID MCP Verifier/);
    expect(r.stdout).toMatch(/Local policy decides/);
  });

  it("--version prints version and exits 0", async () => {
    const r = await runCli(["--version"]);
    expect(r.exit_code).toBe(0);
    expect(r.stdout).toMatch(/ECZ-ID MCP Verifier v\d+\.\d+\.\d+/);
  });

  it("missing --target errors with exit 4", async () => {
    const r = await runCli([]);
    expect(r.exit_code).toBe(4);
    expect(r.stderr).toMatch(/--target is required/);
  });

  it("invalid --policy errors with exit 4", async () => {
    const r = await runCli(["--target", "ECZ-CC-ABC123", "--policy", "BOGUS"]);
    expect(r.exit_code).toBe(4);
    expect(r.stderr).toMatch(/invalid --policy/);
  });

  it("offline ECZ-ID with OPEN policy exits 0 and emits JSON", async () => {
    const r = await runCli([
      "--target",
      "ECZ-CC-ABC123",
      "--policy",
      "OPEN",
      "--offline"
    ]);
    expect(r.exit_code).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.verifier).toBe("ECZ-ID MCP Verifier");
    expect(out.target_type).toBe("ecz_id");
    expect(out.policy_mode).toBe("OPEN");
    expect(out.result_state).toBe("NO_PUBLIC_RESOLVER_PROOF_FOUND");
    expect(out.reason_codes).toContain("NO_PUBLIC_RESOLVER_PROOF_FOUND");
    expect(out.no_source_uploaded).toBe(true);
  });

  it("offline ECZ-ID with REQUIRE policy exits 1", async () => {
    const r = await runCli([
      "--target",
      "ECZ-CC-ABC123",
      "--policy",
      "REQUIRE",
      "--offline"
    ]);
    expect(r.exit_code).toBe(1);
  });

  it("PREFER policy warns on missing proof but exits 0", async () => {
    const r = await runCli([
      "--target",
      "ECZ-CC-ABC123",
      "--policy",
      "PREFER",
      "--offline"
    ]);
    expect(r.exit_code).toBe(0);
    expect(r.stderr).toMatch(/no public resolver proof found yet/i);
  });

  it("unsupported target exits 4", async () => {
    const r = await runCli([
      "--target",
      "hello world nonsense",
      "--offline"
    ]);
    expect(r.exit_code).toBe(4);
  });

  it("--report uses the exact unresolved soft copy", async () => {
    const r = await runCli([
      "--target",
      "ECZ-CC-ABC123",
      "--offline",
      "--report"
    ]);
    expect(r.exit_code).toBe(0);
    expect(r.stdout).toMatch(
      /No public resolver proof was found for this MCP target yet/
    );
    expect(r.stdout).toMatch(/This does not mean the target is unsafe/);
    expect(r.stdout).toMatch(
      /Operate this server\? Improve its resolver posture:/
    );
    expect(r.stdout).toMatch(/Re-check before reliance/);
    expect(r.stdout).toMatch(/Local policy decides/);
    // No certification / approval / guarantee claims.
    expect(r.stdout).not.toMatch(/\bis safe\b/i);
    expect(r.stdout).not.toMatch(/\bis certified\b/i);
    expect(r.stdout).not.toMatch(/\bregulator-approved\b/i);
    expect(r.stdout).not.toMatch(/\bguaranteed\b/i);
  });

  it("accepts an optional 'check' subcommand token", async () => {
    const r = await runCli([
      "check",
      "--target",
      "ECZ-CC-ABC123",
      "--offline"
    ]);
    expect(r.exit_code).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.target).toBe("ECZ-CC-ABC123");
    expect(out.target_type).toBe("ecz_id");
  });

  it("--actions includes a populated action envelope in JSON", async () => {
    const r = await runCli([
      "--target",
      "ECZ-CC-ABC123",
      "--offline",
      "--actions"
    ]);
    const out = JSON.parse(r.stdout);
    expect(out.action_envelope).not.toBeNull();
    expect(out.action_envelope.envelope_type).toBe("RESOLVER");
    expect(out.action_envelope.recommended_next_steps.length).toBeGreaterThan(0);
  });

  it("--output writes to file instead of stdout", async () => {
    const { mkdtempSync, readFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "ecz-cli-"));
    const out = join(dir, "result.json");
    try {
      const r = await runCli([
        "--target",
        "ECZ-CC-ABC123",
        "--offline",
        "--output",
        out
      ]);
      expect(r.exit_code).toBe(0);
      const parsed = JSON.parse(readFileSync(out, "utf8"));
      expect(parsed.target).toBe("ECZ-CC-ABC123");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("emits GitHub Action outputs (result-state, reason-codes, action-envelope-json)", async () => {
    const r = await runCli([
      "--target",
      "ECZ-CC-ABC123",
      "--offline"
    ]);
    expect(r.gh_outputs).toMatch(/^result-state=/m);
    expect(r.gh_outputs).toMatch(/^reason-codes=/m);
    expect(r.gh_outputs).toMatch(/^action-envelope-json=/m);
    expect(r.gh_outputs).toMatch(/^setup-handoff-json=/m);
    expect(r.gh_outputs).toMatch(/^primary-action=/m);
    expect(r.gh_outputs).toMatch(/^trustops-action-url=/m);
    expect(r.gh_outputs).toMatch(/^developer-guidance-url=/m);
  });

  it("--operator defaults to unknown", async () => {
    const r = await runCli([
      "--target",
      "ECZ-CC-ABC123",
      "--offline"
    ]);
    expect(r.exit_code).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.operator).toBe("unknown");
  });

  it("--operator accepts self / third_party / unknown", async () => {
    for (const mode of ["self", "third_party", "unknown"]) {
      const r = await runCli([
        "--target",
        "ECZ-CC-ABC123",
        "--offline",
        "--operator",
        mode
      ]);
      expect(r.exit_code).toBe(0);
      const out = JSON.parse(r.stdout);
      expect(out.operator).toBe(mode);
    }
  });

  it("invalid --operator errors with exit 4", async () => {
    const r = await runCli([
      "--target",
      "ECZ-CC-ABC123",
      "--offline",
      "--operator",
      "boss"
    ]);
    expect(r.exit_code).toBe(4);
    expect(r.stderr).toMatch(/invalid --operator/);
  });

  it("--help documents --operator", async () => {
    const r = await runCli(["--help"]);
    expect(r.stdout).toMatch(/--operator/);
  });
});
