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

// ---------------------------------------------------------------------------
// D6 (second half, distribution channel): a CALLER must not silently re-pin the
// per-attempt timeout.
//
// `verify.ts` used to collapse an absent `--timeout-ms` to the 5 s constant,
// which would have overridden any new transport default. `action.yml` did the
// same thing by a different route: a declared input default is ALWAYS
// materialised into INPUT_TIMEOUT-MS by the runner, so the adapter always
// passed `--timeout-ms 5000` and every Action user kept a 5 s per-attempt
// timeout after the fix shipped. Measured against the real 28.7 s cold start
// that turned one failed attempt into three, and still answered `unavailable`.
// ---------------------------------------------------------------------------
describe("D6: the Action does not pin the per-attempt timeout", () => {
  const actionYml = readFileSync(join(ROOT, "action.yml"), "utf8");

  it("action.yml still declares the timeout-ms input", () => {
    expect(actionYml).toMatch(/^\s{2}timeout-ms:/m);
  });

  it("action.yml declares NO default for timeout-ms", () => {
    // The input block runs to the next top-level input key or the outputs block.
    const block = actionYml.split(/^\s{2}timeout-ms:/m)[1] ?? "";
    const untilNextKey = block.split(/^\s{2}\S|^outputs:/m)[0] ?? "";
    expect(untilNextKey).not.toMatch(/^\s*default:/m);
  });

  it("omits --timeout-ms entirely when the input is unset", () => {
    const argv = actionArgv(env({ INPUT_TARGET: "ECZ-CC-ABC123", INPUT_OFFLINE: "true" }));
    expect(argv).not.toContain("--timeout-ms");
  });

  it("still forwards --timeout-ms when an operator sets it deliberately", () => {
    const argv = actionArgv(
      env({ INPUT_TARGET: "ECZ-CC-ABC123", INPUT_OFFLINE: "true", "INPUT_TIMEOUT-MS": "2500" })
    );
    expect(argv).toContain("--timeout-ms");
    expect(argv[argv.indexOf("--timeout-ms") + 1]).toBe("2500");
  });

  it("treats an empty timeout-ms input as unset, not as zero", () => {
    const argv = actionArgv(
      env({ INPUT_TARGET: "ECZ-CC-ABC123", INPUT_OFFLINE: "true", "INPUT_TIMEOUT-MS": "   " })
    );
    expect(argv).not.toContain("--timeout-ms");
  });
});

// ---------------------------------------------------------------------------
// The published help and README must state the timeout that the client ACTUALLY
// uses. A stale "default: 5000" is not a cosmetic error: it tells an operator
// the lookup gives up after 5 s, so a `unavailable` result looks like a settled
// answer rather than a budget that can be raised.
// ---------------------------------------------------------------------------
describe("D6: public copy states the real timeout behaviour", () => {
  const readmeText = readFileSync(join(ROOT, "README.md"), "utf8");

  it("CLI help no longer advertises a 5000 ms network timeout", async () => {
    const r = await runCli(["--help"]);
    expect(r.stdout).not.toMatch(/timeout-ms[\s\S]{0,80}default:\s*5000/);
    expect(r.stdout).toMatch(/--timeout-ms/);
    expect(r.stdout).toMatch(/10000/);
  });

  it("README documents a per-attempt timeout and a bounded retry", () => {
    expect(readmeText).toMatch(/per-\*\*attempt\*\*|Per-\*\*attempt\*\*/i);
    expect(readmeText).toMatch(/3 attempts/);
    expect(readmeText).toMatch(/32 s total budget/);
  });

  it("no public surface still pins the example timeout to 5000", () => {
    const example = readFileSync(join(ROOT, "examples", "github-action.yml"), "utf8");
    expect(example).not.toMatch(/^\s*timeout-ms:\s*"5000"/m);
    expect(readmeText).not.toMatch(/^\s*timeout-ms:\s*"5000"/m);
  });
});
