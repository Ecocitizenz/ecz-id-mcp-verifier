#!/usr/bin/env node
// ECZ-ID MCP DUAL-ERA WIRE MATRIX — release-blocking.
//
// Drives the BUILT stdio server (dist/mcp/stdio.js) with real newline-delimited
// JSON-RPC and asserts protocol behaviour at the wire, not in the manifest.
//
// It deliberately does NOT prove modern support by sending a legacy `initialize`
// carrying a 2026 version string. The modern rail is exercised the way the
// specification defines it: no handshake, per-request `_meta` envelope, and
// `server/discover`.
//
//   A. MODERN  (2026-07-28)  — discover, tools/list, all three tools/call,
//                              resultType, cacheable fields, structuredContent,
//                              outputSchema, per-request metadata.
//   B. LEGACY  (2025-11-25 … 2024-10-07) — initialize negotiation, all three
//                              tools, and NO modern-only fields leaking.
//   C. FAILURE / NEUTRALITY  — unsupported + malformed revision, malformed
//                              request, unknown tool, resources, prompts,
//                              policy modes, REQUIRE fail-closed.
//
// Usage: node scripts/mcp-wire-matrix.mjs [--json <outfile>]
// Exit:  0 all checks pass; 1 otherwise.

import { spawn } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = join(ROOT, "dist", "mcp", "stdio.js");

const MODERN = "2026-07-28";
const LEGACY = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05", "2024-10-07"];
const TOOLS = ["ecz_check_target", "ecz_recheck_resolver", "ecz_explain_result"];
/** Cacheable operations under 2026-07-28. tools/call is deliberately absent. */
const CACHEABLE = ["server/discover", "tools/list"];

const checks = [];
const ok = (name, pass, detail = "") => checks.push({ name, pass: Boolean(pass), detail: String(detail) });
/** Null-safe JSON for diagnostics: never throws, never yields `undefined`. */
const j = (v, n = 160) => {
  try { const t = JSON.stringify(v); return (t === undefined ? String(v) : t).slice(0, n); }
  catch { return String(v); }
};

function meta(version) {
  return {
    "io.modelcontextprotocol/protocolVersion": version,
    "io.modelcontextprotocol/clientInfo": { name: "ecz-wire-matrix", version: "1.0.0" },
    "io.modelcontextprotocol/clientCapabilities": {}
  };
}

/**
 * Run one stdio session.
 *
 * Deterministic by construction: it waits until every request id has been
 * answered (or a hard deadline elapses) rather than sleeping for a fixed time,
 * so a busy machine cannot turn a correct server into a failing gate.
 */
function session(messages, { deadlineMs = 20000, bootMs = 1200, quietMs = 400 } = {}) {
  const expected = messages.filter((m) => m.id !== undefined).map((m) => m.id);
  return new Promise((done) => {
    const child = spawn(process.execPath, [ENTRY], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    let settled = false;
    const replies = [];
    let unparsed = 0;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      child.kill();
      done({ replies, stderr: err, unparsed, rawLines: out.split("\n").filter(Boolean) });
    };
    const deadline = setTimeout(finish, deadlineMs);

    child.on("error", () => {});
    child.stderr.on("data", (d) => (err += d));
    child.stdout.on("data", (d) => {
      out += d;
      // Consume only whole lines; a partial line stays buffered.
      const parts = out.split("\n");
      out = parts.pop() ?? "";
      for (const line of parts) {
        if (!line.trim()) continue;
        try {
          replies.push(JSON.parse(line));
        } catch {
          unparsed++;
        }
      }
      // Every request answered -> allow a short quiet period for notifications.
      if (expected.every((id) => replies.some((r) => r.id === id))) {
        setTimeout(finish, quietMs);
      }
    });

    (async () => {
      await new Promise((r) => setTimeout(r, bootMs));
      for (const m of messages) {
        if (settled) return;
        child.stdin.write(JSON.stringify(m) + "\n");
        // Give the entry time to pin the era from the OPENING message before
        // the next one arrives; era selection is a property of the connection.
        await new Promise((r) => setTimeout(r, 250));
      }
    })();
  });
}

const byId = (s, id) => s.replies.find((r) => r.id === id);

// ---------------------------------------------------------------------------
// A. MODERN ERA
// ---------------------------------------------------------------------------
async function modernEra() {
  const m = meta(MODERN);
  const msgs = [
    { jsonrpc: "2.0", id: 1, method: "server/discover", params: { _meta: m } },
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: { _meta: m } },
    ...TOOLS.map((name, i) => ({
      jsonrpc: "2.0",
      id: 10 + i,
      method: "tools/call",
      params: {
        name,
        arguments:
          name === "ecz_explain_result"
            ? { reason_codes: ["RESOLVER_READ_ONLY"], result_state: "DEGRADED" }
            : { target: "ECZ-GB-A93K7Q", offline: true },
        _meta: m
      }
    }))
  ];
  const s = await session(msgs);

  // --- server/discover ---
  const d = byId(s, 1)?.result;
  ok("MODERN: server/discover answers", Boolean(d), j(byId(s, 1)?.error ?? "", 120));
  ok("MODERN: discover advertises 2026-07-28", d?.supportedVersions?.includes(MODERN), JSON.stringify(d?.supportedVersions));
  ok("MODERN: discover resultType=complete", d?.resultType === "complete", d?.resultType);
  ok("MODERN: discover declares tools capability", Boolean(d?.capabilities?.tools), JSON.stringify(d?.capabilities));
  ok("MODERN: discover carries serverInfo in _meta",
     Boolean(d?._meta?.["io.modelcontextprotocol/serverInfo"]?.name),
     JSON.stringify(d?._meta));
  ok("MODERN: discover ttlMs is an integer >= 0", Number.isInteger(d?.ttlMs) && d.ttlMs >= 0, String(d?.ttlMs));
  ok("MODERN: discover cacheScope is public|private",
     d?.cacheScope === "public" || d?.cacheScope === "private", String(d?.cacheScope));

  // --- tools/list ---
  const tl = byId(s, 2)?.result;
  const names = (tl?.tools ?? []).map((t) => t.name);
  ok("MODERN: tools/list answers", Boolean(tl));
  ok("MODERN: exactly the three canonical tools",
     names.length === 3 && TOOLS.every((t) => names.includes(t)), names.join(","));
  ok("MODERN: tools/list resultType=complete", tl?.resultType === "complete", tl?.resultType);
  ok("MODERN: tools/list ttlMs is an integer >= 0", Number.isInteger(tl?.ttlMs) && tl.ttlMs >= 0, String(tl?.ttlMs));
  ok("MODERN: tools/list cacheScope present", typeof tl?.cacheScope === "string", String(tl?.cacheScope));
  ok("MODERN: tools/list carries serverInfo in _meta",
     Boolean(tl?._meta?.["io.modelcontextprotocol/serverInfo"]?.name));
  for (const t of tl?.tools ?? []) {
    ok(`MODERN: ${t.name} advertises outputSchema`, Boolean(t.outputSchema), t.outputSchema?.type);
    ok(`MODERN: ${t.name} inputSchema is an object schema`, t.inputSchema?.type === "object", t.inputSchema?.type);
    ok(`MODERN: ${t.name} annotations readOnlyHint=true`, t.annotations?.readOnlyHint === true, JSON.stringify(t.annotations));
    ok(`MODERN: ${t.name} annotations destructiveHint=false`, t.annotations?.destructiveHint === false);
  }

  // --- tools/call, all three ---
  for (let i = 0; i < TOOLS.length; i++) {
    const name = TOOLS[i];
    const r = byId(s, 10 + i)?.result;
    ok(`MODERN: tools/call ${name} succeeds`, Boolean(r) && !byId(s, 10 + i)?.error,
       j(byId(s, 10 + i)?.error ?? "", 160));
    ok(`MODERN: ${name} resultType=complete`, r?.resultType === "complete", r?.resultType);
    ok(`MODERN: ${name} returns structuredContent`, r?.structuredContent !== undefined);
    ok(`MODERN: ${name} retains the text block`, typeof r?.content?.[0]?.text === "string");
    // ONE canonical object: the text block must be the serialisation of it.
    let same = false;
    try {
      same = JSON.stringify(JSON.parse(r.content[0].text)) === JSON.stringify(r.structuredContent);
    } catch {}
    ok(`MODERN: ${name} text block === structuredContent (one truth)`, same);
    // tools/call is NOT a cacheable operation.
    ok(`MODERN: ${name} carries no cache fields`,
       r?.ttlMs === undefined && r?.cacheScope === undefined,
       `ttlMs=${r?.ttlMs} cacheScope=${r?.cacheScope}`);
  }

  // Doctrine, on the modern wire.
  const chk = byId(s, 10)?.result?.structuredContent;
  ok("MODERN: verifier_writes_truth === false", chk?.verifier_writes_truth === false);
  ok("MODERN: verifier_activates_proof === false", chk?.verifier_activates_proof === false);
  ok("MODERN: verifier_marks_bound === false", chk?.verifier_marks_bound === false);
  ok("MODERN: backend_remains_final_authority === true", chk?.backend_remains_final_authority === true);
  ok("MODERN: local_policy_decides === true", chk?.local_policy_decides === true);
  ok("MODERN: recheck_before_reliance === true", chk?.recheck_before_reliance === true);

  // stdio hygiene: stdout carries only MCP messages; stderr carries the rest.
  ok("MODERN: every stdout line is a valid MCP message", s.unparsed === 0, `${s.unparsed} unparsable line(s)`);
  ok("MODERN: readiness diagnostics go to stderr", s.stderr.includes("ready on stdio"), s.stderr.trim().slice(0, 80));
  return { discover: d, toolsList: tl };
}

// ---------------------------------------------------------------------------
// B. LEGACY ERA
// ---------------------------------------------------------------------------
async function legacyEra() {
  for (const v of LEGACY) {
    const s = await session([
      { jsonrpc: "2.0", id: 1, method: "initialize",
        params: { protocolVersion: v, capabilities: {}, clientInfo: { name: "ecz-wire-matrix", version: "1.0.0" } } },
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      { jsonrpc: "2.0", id: 3, method: "tools/call",
        params: { name: "ecz_check_target", arguments: { target: "ECZ-GB-A93K7Q", offline: true } } }
    ]);
    const init = byId(s, 1)?.result;
    ok(`LEGACY ${v}: initialize negotiates exactly`, init?.protocolVersion === v,
       `${init?.protocolVersion ?? JSON.stringify(byId(s, 1)?.error)}`);
    const tl = byId(s, 2)?.result;
    const names = (tl?.tools ?? []).map((t) => t.name);
    ok(`LEGACY ${v}: all three tools listed`, names.length === 3 && TOOLS.every((t) => names.includes(t)), names.join(","));
    // A legacy client must not receive modern-only fields.
    ok(`LEGACY ${v}: tools/list carries no resultType`, tl?.resultType === undefined, String(tl?.resultType));
    ok(`LEGACY ${v}: tools/list carries no cache fields`,
       tl?.ttlMs === undefined && tl?.cacheScope === undefined, `ttlMs=${tl?.ttlMs}`);
    const call = byId(s, 3)?.result;
    ok(`LEGACY ${v}: tools/call succeeds`, Boolean(call?.content?.[0]?.text));
    ok(`LEGACY ${v}: tools/call carries no resultType`, call?.resultType === undefined, String(call?.resultType));
    // The legacy text block must still be the canonical contract.
    let st = null;
    try { st = JSON.parse(call.content[0].text).result_state; } catch {}
    ok(`LEGACY ${v}: canonical result contract intact`, typeof st === "string" && st.length > 0, String(st));
    ok(`LEGACY ${v}: stdout is pure MCP`, s.unparsed === 0, `${s.unparsed} unparsable`);
  }
}

// ---------------------------------------------------------------------------
// C. FAILURE / NEUTRALITY
// ---------------------------------------------------------------------------
async function failureAndNeutrality() {
  // C1 — an unsupported but well-formed modern revision.
  {
    const s = await session([
      { jsonrpc: "2.0", id: 1, method: "server/discover", params: { _meta: meta("2099-01-01") } }
    ]);
    const r = byId(s, 1);
    const isErr = Boolean(r?.error);
    ok("FAIL: unsupported revision is refused, not silently downgraded", isErr,
       j(r?.error ?? r?.result, 160));
    if (isErr) {
      ok("FAIL: refusal uses -32022 UnsupportedProtocolVersion", r.error.code === -32022, String(r.error.code));
      ok("FAIL: refusal lists the supported versions", Array.isArray(r.error.data?.supported),
         JSON.stringify(r.error.data?.supported));
      ok("FAIL: refusal is not a safety verdict",
         !/unsafe|danger|malicious|insecure|reject.*trust/i.test(JSON.stringify(r.error)),
         JSON.stringify(r.error.message));
    }
  }
  // C2 — a structurally malformed revision.
  {
    const s = await session([
      { jsonrpc: "2.0", id: 1, method: "server/discover", params: { _meta: meta("not-a-date") } }
    ]);
    const r = byId(s, 1);
    ok("FAIL: malformed revision is refused", Boolean(r?.error), JSON.stringify(r?.error?.code));
    ok("FAIL: malformed revision is not a safety verdict",
       !/unsafe|danger|malicious/i.test(JSON.stringify(r?.error ?? {})));
  }
  // C3 — era classification is BODY-PRIMARY: a claim-less request is 2025-era
  //      traffic, never a modern request served without a declared version.
  {
    const s = await session([
      { jsonrpc: "2.0", id: 1, method: "server/discover", params: { _meta: {} } },
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: { _meta: {} } }
    ]);
    const disc = byId(s, 1);
    const list = byId(s, 2);
    // `server/discover` does not exist in the legacy era.
    ok("ERA: claim-less server/discover answers -32601 (no such legacy method)",
       disc?.error?.code === -32601, j(disc?.error ?? disc?.result, 140));
    // `tools/list` does exist there, so it is served — as LEGACY.
    ok("ERA: claim-less tools/list is served as legacy, not refused",
       Array.isArray(list?.result?.tools), j(list?.error, 140));
    ok("ERA: claim-less tools/list carries NO modern-only resultType",
       list?.result?.resultType === undefined, String(list?.result?.resultType));
    ok("ERA: claim-less tools/list carries NO modern-only cache fields",
       list?.result?.ttlMs === undefined && list?.result?.cacheScope === undefined,
       `ttlMs=${list?.result?.ttlMs} cacheScope=${list?.result?.cacheScope}`);
    ok("ERA: a claim-less request is never given a modern envelope",
       list?.result?._meta?.["io.modelcontextprotocol/serverInfo"] === undefined,
       j(list?.result?._meta, 120));
  }
  // C4 — unknown tool, malformed params, resources, prompts.
  {
    const m = meta(MODERN);
    const s = await session([
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "no_such_tool", arguments: {}, _meta: m } },
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "ecz_check_target", arguments: {}, _meta: m } },
      { jsonrpc: "2.0", id: 3, method: "resources/list", params: { _meta: m } },
      { jsonrpc: "2.0", id: 4, method: "prompts/list", params: { _meta: m } }
    ]);
    const unknown = byId(s, 1);
    ok("FAIL: unknown tool is an error, never a fabricated result",
       Boolean(unknown?.error) || unknown?.result?.isError === true,
       j(unknown?.error ?? unknown?.result, 140));
    const bad = byId(s, 2);
    ok("FAIL: malformed tool arguments are rejected",
       Boolean(bad?.error) || bad?.result?.isError === true,
       j(bad?.error ?? "", 140));
    ok("FAIL: resources are absent (method not found)", byId(s, 3)?.error?.code === -32601,
       String(byId(s, 3)?.error?.code));
    ok("FAIL: prompts are absent (method not found)", byId(s, 4)?.error?.code === -32601,
       String(byId(s, 4)?.error?.code));
    ok("FAIL: server stays alive after every error", s.replies.length >= 4, `${s.replies.length} replies`);
  }
  // C5 — policy modes over the modern rail, including REQUIRE fail-closed.
  {
    const m = meta(MODERN);
    const s = await session(
      ["OPEN", "PREFER", "REQUIRE"].map((p, i) => ({
        jsonrpc: "2.0", id: 20 + i, method: "tools/call",
        params: { name: "ecz_check_target", arguments: { target: "ECZ-GB-A93K7Q", offline: true, policy: p }, _meta: m }
      }))
    );
    const got = {};
    ["OPEN", "PREFER", "REQUIRE"].forEach((p, i) => {
      got[p] = byId(s, 20 + i)?.result?.structuredContent;
    });
    ok("POLICY: OPEN returns a result and exit_code 0", got.OPEN?.exit_code === 0, String(got.OPEN?.exit_code));
    ok("POLICY: PREFER returns a result", typeof got.PREFER?.exit_code === "number", String(got.PREFER?.exit_code));
    ok("POLICY: REQUIRE fails closed with a non-zero exit_code",
       Number.isInteger(got.REQUIRE?.exit_code) && got.REQUIRE.exit_code !== 0, String(got.REQUIRE?.exit_code));
    ok("POLICY: REQUIRE fail-closed is IN-BAND, the session never crashes",
       Boolean(got.REQUIRE) && s.replies.length === 3, `${s.replies.length} replies`);
    ok("POLICY: policy_mode is echoed exactly",
       got.OPEN?.policy_mode === "OPEN" && got.REQUIRE?.policy_mode === "REQUIRE");
  }
}

// ---------------------------------------------------------------------------
const started = Date.now();
const modern = await modernEra();
await legacyEra();
await failureAndNeutrality();

const failed = checks.filter((c) => !c.pass);
const report = {
  suite: "ecz-id-mcp-dual-era-wire-matrix-v1",
  entry: ENTRY,
  modern_revision: MODERN,
  legacy_revisions: LEGACY,
  cacheable_operations: CACHEABLE,
  totals: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  discover_result: modern.discover ?? null,
  checks
};

const jsonIdx = process.argv.indexOf("--json");
if (jsonIdx !== -1 && process.argv[jsonIdx + 1]) {
  writeFileSync(process.argv[jsonIdx + 1], JSON.stringify(report, null, 2) + "\n", "utf8");
}

for (const c of checks) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}${c.pass ? "" : "   << " + c.detail}`);
console.log(`\nwire-matrix: ${checks.length - failed.length}/${checks.length} passed in ${Date.now() - started}ms`);
if (failed.length) {
  console.error(`\nWIRE MATRIX FAILED (${failed.length}):`);
  for (const c of failed) console.error(`  - ${c.name}   << ${c.detail}`);
  process.exit(1);
}
