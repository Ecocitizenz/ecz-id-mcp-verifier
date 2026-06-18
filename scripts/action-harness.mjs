#!/usr/bin/env node
// Local GitHub Action harness (Phase 1). No emulation software required.
//
// Runs the committed bundled adapter (dist/action.js) the way GitHub does:
// inputs are passed as INPUT_* environment variables, GITHUB_OUTPUT and
// GITHUB_STEP_SUMMARY point at temp files, and the working directory is a
// throwaway temp dir so we can assert the Action never mutates the repo.
//
// Requires `npm run build` first (the Action runs committed dist/).

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTION = join(ROOT, "dist", "action.js");
if (!existsSync(ACTION)) {
  console.error("[harness] dist/action.js missing — run `npm run build` first.");
  process.exit(2);
}

let failures = 0;
const ok = (c, m) => {
  if (!c) {
    failures++;
    console.error("  FAIL: " + m);
  } else {
    console.log("  ok:   " + m);
  }
};

function runAction(inputs, label) {
  const work = mkdtempSync(join(tmpdir(), "ecz-action-"));
  const ghOut = join(work, "gh_output");
  const ghSum = join(work, "gh_summary");
  writeFileSync(ghOut, "");
  writeFileSync(ghSum, "");
  const env = {
    ...process.env,
    GITHUB_OUTPUT: ghOut,
    GITHUB_STEP_SUMMARY: ghSum,
    GITHUB_ACTIONS: "true"
  };
  for (const [k, v] of Object.entries(inputs)) {
    env["INPUT_" + k.toUpperCase().replace(/ /g, "_")] = String(v);
  }
  const cwdBefore = readdirSync(work).sort().join(",");
  const r = spawnSync(process.execPath, [ACTION], { env, cwd: work, encoding: "utf8" });
  const cwdAfter = readdirSync(work).sort().join(",");
  const out = existsSync(ghOut) ? readFileSync(ghOut, "utf8") : "";
  const sum = existsSync(ghSum) ? readFileSync(ghSum, "utf8") : "";
  const res = { label, code: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", out, sum, cwdBefore, cwdAfter, work };
  return res;
}

console.log("== Scenario 1: PREFER + offline + valid ECZ-ID ==");
{
  const r = runAction({ target: "ECZ-GB-ABC123", policy: "PREFER", "no-network": "true" }, "prefer-offline");
  ok(r.code === 0, `PREFER offline exit 0 (got ${r.code})`);
  ok(/result-state=/.test(r.out), "GITHUB_OUTPUT has result-state");
  ok(/reason-codes=/.test(r.out), "GITHUB_OUTPUT has reason-codes");
  ok(/setup-handoff-json=/.test(r.out), "GITHUB_OUTPUT has setup-handoff-json (renamed)");
  ok(!/acquisition-flow-json=/.test(r.out), "GITHUB_OUTPUT has NO acquisition-flow-json (old name)");
  ok(/primary-action=/.test(r.out), "GITHUB_OUTPUT has primary-action");
  ok(/ECZ-ID MCP Verifier/.test(r.sum) && /Result state/.test(r.sum), "step summary written");
  // offline JSON output carries privacy invariants
  try {
    const j = JSON.parse(r.stdout);
    ok(j.no_source_uploaded === true, "no_source_uploaded=true");
    ok(j.no_secrets_uploaded === true, "no_secrets_uploaded=true");
    ok(j.no_telemetry === true, "no_telemetry=true");
  } catch {
    ok(false, "stdout is JSON");
  }
  ok(r.cwdBefore === r.cwdAfter.replace(/,?$/, "") || r.cwdBefore === r.cwdAfter, "no repo mutation (cwd unchanged besides provided files)");
  rmSync(r.work, { recursive: true, force: true });
}

console.log("== Scenario 2: REQUIRE + offline (fail-closed) ==");
{
  const r = runAction({ target: "ECZ-GB-ABC123", policy: "REQUIRE", "no-network": "true" }, "require-offline");
  ok(r.code !== 0, `REQUIRE offline fails closed, non-zero exit (got ${r.code})`);
  ok(/result-state=/.test(r.out), "GITHUB_OUTPUT has result-state under REQUIRE");
  rmSync(r.work, { recursive: true, force: true });
}

console.log("== Scenario 3: missing/invalid target ==");
{
  const r = runAction({ policy: "PREFER", "no-network": "true" }, "no-target");
  ok(r.code !== 0, `missing target yields non-zero exit (got ${r.code})`);
  rmSync(r.work, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n[harness] FAIL — ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("\n[harness] PASS — local GitHub Action harness green (no network, no repo mutation).");
