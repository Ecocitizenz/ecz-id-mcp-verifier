import { describe, it, expect } from "vitest";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { actionArgv, readActionInput } from "../src/action.js";
import { runCli, main } from "../src/cli.js";

const ROOT = resolve(__dirname, "..");

// Helper to keep the casts readable.
function env(o: Record<string, string>): NodeJS.ProcessEnv {
  return o as NodeJS.ProcessEnv;
}

describe("GitHub Action input adapter: mapping", () => {
  it("maps INPUT_TARGET to the verifier target", async () => {
    const argv = actionArgv(env({ INPUT_TARGET: "ECZ-CC-ABC123", INPUT_OFFLINE: "true" }));
    expect(argv).toContain("--target");
    expect(argv[argv.indexOf("--target") + 1]).toBe("ECZ-CC-ABC123");

    const r = await runCli(argv);
    const out = JSON.parse(r.stdout);
    expect(out.target).toBe("ECZ-CC-ABC123");
    expect(out.target_type).toBe("ecz_id");
  });

  it("maps INPUT_POLICY to the policy mode", async () => {
    const argv = actionArgv(
      env({ INPUT_TARGET: "ECZ-CC-ABC123", INPUT_POLICY: "require", INPUT_OFFLINE: "true" })
    );
    expect(argv[argv.indexOf("--policy") + 1]).toBe("require");

    const r = await runCli(argv);
    const out = JSON.parse(r.stdout);
    expect(out.policy_mode).toBe("REQUIRE");
  });

  it("supports JSON output", async () => {
    const argv = actionArgv(
      env({ INPUT_TARGET: "ECZ-CC-ABC123", INPUT_OFFLINE: "true", INPUT_JSON: "true" })
    );
    const r = await runCli(argv);
    const out = JSON.parse(r.stdout);
    expect(out.verifier).toBe("ECZ-ID MCP Verifier");
  });

  it("accepts both resolver-base and resolver-url, mapping to --resolver-base", () => {
    const a = actionArgv(env({ INPUT_TARGET: "X", INPUT_RESOLVER_URL: "https://r.example.test" }));
    expect(a[a.indexOf("--resolver-base") + 1]).toBe("https://r.example.test");

    const b = actionArgv(env({ INPUT_TARGET: "X", "INPUT_RESOLVER-BASE": "https://b.example.test" }));
    expect(b[b.indexOf("--resolver-base") + 1]).toBe("https://b.example.test");
  });

  it("only reads INPUT_-prefixed env, never arbitrary secrets", () => {
    expect(
      readActionInput("target", env({ SECRET_TOKEN: "x", GITHUB_TOKEN: "y", TRUSTOPS_KEY: "z" }))
    ).toBeUndefined();
    expect(readActionInput("target", env({ INPUT_TARGET: "ok" }))).toBe("ok");
  });
});

describe("GitHub Action input adapter: behaviour / exit codes", () => {
  it("missing target returns the invalid-input exit code (4)", async () => {
    const r = await runCli(actionArgv(env({ INPUT_OFFLINE: "true" })));
    expect(r.exit_code).toBe(4);
    expect(r.stderr).toMatch(/--target is required/);
  });

  it("unresolved target under REQUIRE returns non-zero", async () => {
    const r = await runCli(
      actionArgv(env({ INPUT_TARGET: "ECZ-CC-ABC123", INPUT_POLICY: "require", INPUT_OFFLINE: "true" }))
    );
    expect(r.exit_code).not.toBe(0);
    expect(r.exit_code).toBe(1);
  });

  it("unresolved target under OPEN/PREFER does not hard-fail", async () => {
    for (const policy of ["open", "prefer"]) {
      const r = await runCli(
        actionArgv(env({ INPUT_TARGET: "ECZ-CC-ABC123", INPUT_POLICY: policy, INPUT_OFFLINE: "true" }))
      );
      expect(r.exit_code).toBe(0);
    }
  });

  it("preserves no-telemetry and no-upload invariants in output", async () => {
    const r = await runCli(actionArgv(env({ INPUT_TARGET: "ECZ-CC-ABC123", INPUT_OFFLINE: "true" })));
    const out = JSON.parse(r.stdout);
    expect(out.no_telemetry).toBe(true);
    expect(out.no_source_uploaded).toBe(true);
    expect(out.no_secrets_uploaded).toBe(true);
  });

  it("preserves $GITHUB_OUTPUT behaviour via cli.main()", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ecz-action-"));
    const outFile = join(dir, "gh_output");
    const prev = process.env.GITHUB_OUTPUT;
    process.env.GITHUB_OUTPUT = outFile;
    try {
      const code = await main(
        actionArgv(env({ INPUT_TARGET: "ECZ-CC-ABC123", INPUT_OFFLINE: "true" }))
      );
      expect(code).toBe(0);
      const written = readFileSync(outFile, "utf8");
      expect(written).toMatch(/result-state=/m);
      expect(written).toMatch(/primary-action=/m);
      expect(written).toMatch(/trustops-action-url=/m);
    } finally {
      if (prev === undefined) delete process.env.GITHUB_OUTPUT;
      else process.env.GITHUB_OUTPUT = prev;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("action.yml wiring", () => {
  const action = readFileSync(join(ROOT, "action.yml"), "utf8");
  it("runs the adapter (dist/action.js), not dist/cli.js directly", () => {
    expect(action).toMatch(/main:\s*["']dist\/action\.js["']/);
    expect(action).not.toMatch(/main:\s*["']dist\/cli\.js["']/);
  });
});
