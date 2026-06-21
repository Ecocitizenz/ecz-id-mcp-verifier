#!/usr/bin/env node
// stdio MCP integration proof for the ECZ-ID MCP server.
//
// Spawns the built server (dist/mcp/stdio.js) and drives it with a real MCP
// SDK client over stdio: initialize, tools/list, tools/call for all three
// tools, and adversarial calls (unknown tool, missing required param). A
// successful tools/list is itself proof that stdout carries only JSON-RPC
// (the server logs to stderr). Requires `npm run build` first.

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = join(ROOT, "dist", "mcp", "stdio.js");
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

if (!existsSync(ENTRY)) {
  console.error(`[mcp-stdio-proof] ${ENTRY} missing — run \`npm run build\` first.`);
  process.exit(2);
}

let failures = 0;
function ok(cond, msg) {
  if (cond) {
    console.log("  ok:   " + msg);
  } else {
    failures++;
    console.error("  FAIL: " + msg);
  }
}
function parseToolText(res) {
  const block = (res?.content ?? []).find((c) => c.type === "text");
  if (!block) throw new Error("tool result had no text content");
  return JSON.parse(block.text);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [ENTRY],
  stderr: "pipe"
});
const client = new Client({ name: "phase3-proof-client", version: "0.0.0" }, { capabilities: {} });

try {
  await client.connect(transport);
  console.log("== initialize ==");
  const info = client.getServerVersion();
  ok(info?.name === "ecz-id-mcp-verifier", `negotiated server name (${info?.name})`);
  ok(info?.version === PKG.version, `negotiated version equals package version (${info?.version})`);

  console.log("== tools/list ==");
  const list = await client.listTools();
  const names = (list.tools ?? []).map((t) => t.name).sort();
  ok(names.length === 3, `exactly 3 tools (got ${names.length})`);
  ok(
    JSON.stringify(names) ===
      JSON.stringify(["ecz_check_target", "ecz_explain_result", "ecz_recheck_resolver"]),
    `tool names exact (${names.join(",")})`
  );
  const checkTool = (list.tools ?? []).find((t) => t.name === "ecz_check_target");
  ok(checkTool?.annotations?.readOnlyHint === true, "ecz_check_target advertises readOnlyHint");

  console.log("== tools/call ecz_check_target (offline, PREFER) ==");
  const r1 = await client.callTool({
    name: "ecz_check_target",
    arguments: { target: "ECZ-GB-ABC123", policy: "PREFER", offline: true }
  });
  const j1 = parseToolText(r1);
  ok(typeof j1.result_state === "string", "result_state present");
  ok(j1.verifier_writes_truth === false, "verifier_writes_truth=false");
  ok(j1.verifier_marks_bound === false, "verifier_marks_bound=false");
  ok(j1.verifier_activates_proof === false, "verifier_activates_proof=false");
  ok(j1.no_telemetry === true, "no_telemetry=true");
  ok(j1.no_source_uploaded === true, "no_source_uploaded=true");
  ok(j1.no_secrets_uploaded === true, "no_secrets_uploaded=true");
  ok(j1.recheck_before_reliance === true, "recheck_before_reliance=true");
  ok(j1.local_policy_decides === true, "local_policy_decides=true");
  ok(/\/start$/.test(j1.trustops_action_url), "trustops_action_url routes to /start");
  ok(j1.exit_code === 0, "OPEN/PREFER offline exit_code=0");

  console.log("== tools/call ecz_check_target (REQUIRE offline, fail-closed) ==");
  const r2 = await client.callTool({
    name: "ecz_check_target",
    arguments: { target: "ECZ-GB-ABC123", policy: "REQUIRE", offline: true }
  });
  const j2 = parseToolText(r2);
  ok(j2.exit_code === 1, "REQUIRE missing-proof fails closed (exit_code=1)");
  ok(r2.isError !== true, "fail-closed is a structured result, not a transport error");

  console.log("== tools/call ecz_recheck_resolver (offline) ==");
  const r3 = await client.callTool({
    name: "ecz_recheck_resolver",
    arguments: { target: "ECZ-GB-ABC123", offline: true }
  });
  const j3 = parseToolText(r3);
  ok(j3.type === "ecz.resolver_recheck", "resolver recheck envelope");
  ok(j3.recheck_before_reliance === true, "recheck_before_reliance=true");
  ok(j3.verifier_writes_truth === false, "recheck never writes truth");

  console.log("== tools/call ecz_explain_result ==");
  const r4 = await client.callTool({
    name: "ecz_explain_result",
    arguments: {
      reason_codes: ["NO_PUBLIC_RESOLVER_PROOF_FOUND", "TOTALLY_BOGUS_CODE"],
      result_state: "RESOLVER_VERIFIABLE"
    }
  });
  const j4 = parseToolText(r4);
  ok(j4.reason_codes?.[0]?.recognized === true, "known reason code recognised");
  ok(j4.reason_codes?.[1]?.recognized === false, "unknown reason code flagged");
  ok(j4.no_global_decision === true, "explanation emits no global decision");

  console.log("== no ALLOW/DENY decision tokens across outputs ==");
  const blob = JSON.stringify([j1, j2, j3, j4]);
  ok(!/\bALLOW\b/.test(blob), "no ALLOW token");
  ok(!/\bDENY\b/.test(blob), "no DENY token");

  console.log("== adversarial: unknown tool ==");
  let unknownErrored = false;
  try {
    const ru = await client.callTool({ name: "ecz_nonexistent_tool", arguments: {} });
    unknownErrored = ru?.isError === true;
  } catch {
    unknownErrored = true;
  }
  ok(unknownErrored, "unknown tool rejected deterministically");

  console.log("== adversarial: missing required param ==");
  let missingErrored = false;
  try {
    const rm = await client.callTool({ name: "ecz_check_target", arguments: {} });
    missingErrored = rm?.isError === true;
  } catch {
    missingErrored = true;
  }
  ok(missingErrored, "missing required target rejected");

  console.log("== liveness after adversarial calls ==");
  const r5 = await client.callTool({
    name: "ecz_check_target",
    arguments: { target: "ECZ-GB-ABC123", offline: true }
  });
  ok(typeof parseToolText(r5).result_state === "string", "server still serves after bad calls");
} catch (err) {
  failures++;
  console.error("  FAIL: integration threw — " + (err instanceof Error ? err.stack : String(err)));
} finally {
  try {
    await client.close();
  } catch {
    /* ignore */
  }
}

if (failures) {
  console.error(`\n[mcp-stdio-proof] FAIL — ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("\n[mcp-stdio-proof] PASS — stdio MCP server initialize/list/call + adversarial matrix green.");
