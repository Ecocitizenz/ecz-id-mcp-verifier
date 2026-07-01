#!/usr/bin/env node
// Cross-platform packed-package matrix harness (Phase 4).
//
// Installs the EXACT downloaded tarball into a fresh temporary consumer project
// (outside the repo, no source fallback) and proves the installed package on the
// current OS + Node: CLI alias matrix, offline runtime + determinism, library
// import (no side effects), and the MCP stdio server (initialise / tools-list /
// call / adversarial / shutdown). Node built-ins only — no repo dependency.
//
// Usage:
//   node scripts/packed-matrix-proof.mjs --tarball <abs.tgz> --out <result.json>
//   node scripts/packed-matrix-proof.mjs --spec <name@version> --out <result.json>   (public registry install)
// Optional: --expect-version <v> (default 0.8.1).

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, createReadStream } from "node:fs";
import { tmpdir, arch, platform } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const TARBALL_ARG = arg("--tarball", "");
const SPEC = arg("--spec", "");                 // registry spec, e.g. @ecocitizenz/ecz-id-mcp-verifier@0.8.1
const TARBALL = TARBALL_ARG ? resolve(TARBALL_ARG) : "";
const OUT = arg("--out", "");
const EXPECT_VERSION = arg("--expect-version", "0.8.2");
const INSTALL_FROM_REGISTRY = SPEC !== "";
const PKG_NAME = "@ecocitizenz/ecz-id-mcp-verifier";
const node = process.execPath;
const isWin = platform() === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

const results = [];
let failures = 0;
const ok = (name, cond, detail) => {
  if (cond) results.push({ name, ok: true, detail });
  else { failures++; results.push({ name, ok: false, detail }); }
  console.log(`  ${cond ? "ok  " : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};

function sha256(file) {
  const h = createHash("sha256");
  h.update(readFileSync(file));
  return h.digest("hex");
}
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 120000, shell: opts.shell || false, cwd: opts.cwd });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
}

if (!INSTALL_FROM_REGISTRY && (!TARBALL || !existsSync(TARBALL))) { console.error("[packed-matrix] tarball not found: " + TARBALL); process.exit(2); }

const cell = {
  os: platform(),
  runner_os: process.env.RUNNER_OS || platform(),
  arch: arch(),
  node_version: process.version,
  npm_version: run(npmCmd, ["--version"], { shell: isWin }).out.trim(),
  commit: process.env.ECZ_COMMIT || "",
  install_source: INSTALL_FROM_REGISTRY ? "public-registry" : "tarball",
  install_spec: INSTALL_FROM_REGISTRY ? SPEC : (TARBALL.split(/[\\/]/).pop() || ""),
  expect_version: EXPECT_VERSION,
  tarball_sha256: INSTALL_FROM_REGISTRY ? "" : sha256(TARBALL)
};
console.log("== cell ==", JSON.stringify(cell));

const consumer = mkdtempSync(join(tmpdir(), "ecz-cell-"));
let installedPkg = "";
try {
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ name: "ecz-cell-consumer", version: "1.0.0", private: true }) + "\n");
  const installTarget = INSTALL_FROM_REGISTRY ? SPEC : TARBALL;
  console.log(`== install ${INSTALL_FROM_REGISTRY ? "from public registry" : "tarball"}: ${installTarget} ==`);
  const inst = run(npmCmd, ["install", installTarget, "--no-audit", "--no-fund"], { cwd: consumer, shell: isWin });
  ok(`npm install ${INSTALL_FROM_REGISTRY ? "(registry)" : "tarball"}`, inst.code === 0, `exit ${inst.code}`);
  if (INSTALL_FROM_REGISTRY) {
    let lock = {}; try { lock = JSON.parse(readFileSync(join(consumer, "package-lock.json"), "utf8")); } catch {}
    const node_pkg = lock.packages && lock.packages["node_modules/@ecocitizenz/ecz-id-mcp-verifier"];
    const resolvedUrl = node_pkg && node_pkg.resolved || "";
    ok("resolved from public npm registry (no file:/link:/git)", /^https:\/\/registry\.npmjs\.org\//.test(resolvedUrl), resolvedUrl.slice(0, 80));
  }
  installedPkg = join(consumer, "node_modules", "@ecocitizenz", "ecz-id-mcp-verifier");
  const installedPj = existsSync(join(installedPkg, "package.json")) ? JSON.parse(readFileSync(join(installedPkg, "package.json"), "utf8")) : {};
  ok(`installed version ${EXPECT_VERSION}`, installedPj.version === EXPECT_VERSION, `version ${installedPj.version}`);
  ok("installed name", installedPj.name === PKG_NAME, installedPj.name);
  ok("three bin declarations", installedPj.bin && installedPj.bin["ecz-id-mcp-verifier"] && installedPj.bin["ecz-mcp-verify"] && installedPj.bin["ecz-id-mcp-server"], JSON.stringify(installedPj.bin));
  ok("no package lifecycle install script", !(installedPj.scripts && (installedPj.scripts.install || installedPj.scripts.preinstall || installedPj.scripts.postinstall)), "scripts.{pre,post,}install absent");
  ok("no source-tree fallback (dist present, src absent)", existsSync(join(installedPkg, "dist", "bin", "cli.js")) && !existsSync(join(installedPkg, "src")), "dist/bin/cli.js present, src/ absent");

  const binDir = join(consumer, "node_modules", ".bin");
  const binPrimary = join(binDir, isWin ? "ecz-id-mcp-verifier.cmd" : "ecz-id-mcp-verifier");
  const binAlias = join(binDir, isWin ? "ecz-mcp-verify.cmd" : "ecz-mcp-verify");
  const callBin = (bin, args) => run(bin, args, { cwd: consumer, shell: isWin });

  // --- CLI alias matrix (the installed bins; symlink on POSIX, shim on Windows) ---
  console.log("== CLI alias matrix ==");
  for (const [label, bin] of [["primary", binPrimary], ["alias", binAlias]]) {
    const h = callBin(bin, ["--help"]);
    ok(`${label} --help non-empty exit0`, h.code === 0 && h.out.trim().length > 0, `exit ${h.code} bytes ${h.out.length}`);
    const v = callBin(bin, ["--version"]);
    ok(`${label} --version ${EXPECT_VERSION}`, v.code === 0 && v.out.includes(EXPECT_VERSION), v.out.trim());
  }

  // --- offline runtime matrix (via primary bin) ---
  console.log("== offline runtime matrix ==");
  const jOpen = callBin(binPrimary, ["--target", "ECZ-GB-A93K7Q", "--policy", "OPEN", "--offline"]);
  let openJson = null;
  try { openJson = JSON.parse(jOpen.out); } catch {}
  ok("OPEN JSON parses", openJson !== null, `exit ${jOpen.code}`);
  if (openJson) {
    ok("OPEN result_state present", typeof openJson.result_state === "string", openJson.result_state);
    ok("OPEN reason_codes present", Array.isArray(openJson.reason_codes) && openJson.reason_codes.length > 0, JSON.stringify(openJson.reason_codes));
    ok("OPEN policy_mode correct", openJson.policy_mode === "OPEN", openJson.policy_mode);
    ok("OPEN target_type ecz_id", openJson.target_type === "ecz_id", openJson.target_type);
    ok("OPEN exit agrees with json", jOpen.code === openJson.exit_code && jOpen.code === 0, `exit ${jOpen.code} json ${openJson.exit_code}`);
    ok("OPEN no ALLOW/DENY token", !/\bALLOW\b/.test(jOpen.out) && !/\bDENY\b/.test(jOpen.out), "none");
    ok("OPEN missing-proof not called unsafe", !/\bis unsafe\b/i.test(jOpen.out) || /does not mean/i.test(jOpen.out), "ok");
    ok("OPEN no source/secret upload + no telemetry flags", openJson.no_source_uploaded === true && openJson.no_secrets_uploaded === true && openJson.no_telemetry === true, "flags true");
  }
  const jPrefer = callBin(binPrimary, ["--target", "ECZ-GB-A93K7Q", "--policy", "PREFER", "--offline"]);
  ok("PREFER exit0 non-empty", jPrefer.code === 0 && jPrefer.out.trim().length > 0, `exit ${jPrefer.code}`);
  const jReq = callBin(binPrimary, ["--target", "ECZ-GB-A93K7Q", "--policy", "REQUIRE", "--offline"]);
  ok("REQUIRE fail-closed exit1", jReq.code === 1, `exit ${jReq.code}`);
  const jReport = callBin(binPrimary, ["--target", "ECZ-GB-A93K7Q", "--offline", "--report"]);
  ok("human report non-empty", jReport.code === 0 && jReport.out.trim().length > 0, `bytes ${jReport.out.length}`);
  const jAct = callBin(binPrimary, ["--target", "ECZ-GB-A93K7Q", "--offline", "--actions"]);
  let actJson = null; try { actJson = JSON.parse(jAct.out); } catch {}
  ok("action envelope present", actJson && actJson.action_envelope && actJson.action_envelope.envelope_type, actJson && actJson.action_envelope ? actJson.action_envelope.envelope_type : "missing");
  const sarifPath = join(consumer, "r.sarif");
  const jSarif = callBin(binPrimary, ["--target", "ECZ-GB-A93K7Q", "--offline", "--sarif", sarifPath]);
  let sarifOk = false; try { JSON.parse(readFileSync(sarifPath, "utf8")); sarifOk = true; } catch {}
  ok("SARIF valid JSON", jSarif.code === 0 && sarifOk, "sarif");
  // Malformed ECZ-ID (space-free so cross-platform shells never re-split it):
  // uppercase + hyphens fails the ECZ-ID, npm-name and URL classifiers -> unsupported.
  const jMal = callBin(binPrimary, ["--target", "ECZ-GB-EXAMPLE", "--offline"]);
  ok("malformed target exit4", jMal.code === 4, `exit ${jMal.code}`);
  const jMiss = callBin(binPrimary, ["--offline"]);
  ok("missing target exit4", jMiss.code === 4, `exit ${jMiss.code}`);
  const jUns = callBin(binPrimary, ["--target", "mailto:x@y.z", "--offline"]);
  ok("unsupported target exit4", jUns.code === 4, `exit ${jUns.code}`);

  // --- convenience accelerators (deterministic, offline, no secret) ---
  console.log("== accelerators ==");
  const jDoc = callBin(binPrimary, ["--doctor"]);
  let docJson = null; try { docJson = JSON.parse(jDoc.out); } catch {}
  ok("--doctor healthy exit0", jDoc.code === 0 && docJson && docJson.ok === true && docJson.type === "ecz.doctor", `exit ${jDoc.code}`);
  const jCap = callBin(binPrimary, ["--capabilities"]);
  let capJson = null; try { capJson = JSON.parse(jCap.out); } catch {}
  ok("--capabilities profile + version + honest scope", jCap.code === 0 && capJson && capJson.capability_profile === "ecz-resolver-posture-v1" && capJson.version === EXPECT_VERSION && capJson.artifact_binding_performed === false, capJson ? capJson.version : "no-json");
  const jCfg = callBin(binPrimary, ["--print-mcp-config"]);
  let cfgJson = null; try { cfgJson = JSON.parse(jCfg.out); } catch {}
  ok("--print-mcp-config valid stdio block", jCfg.code === 0 && cfgJson && cfgJson.mcpServers && cfgJson.mcpServers["ecz-id"] && cfgJson.mcpServers["ecz-id"].command === "npx", "config");

  // --- determinism: repeat offline OPEN, normalise timestamp, compare ---
  console.log("== determinism ==");
  const d1 = callBin(binPrimary, ["--target", "ECZ-GB-A93K7Q", "--policy", "OPEN", "--offline"]);
  const d2 = callBin(binPrimary, ["--target", "ECZ-GB-A93K7Q", "--policy", "OPEN", "--offline"]);
  const norm = (s) => { try { const o = JSON.parse(s); const strip = (x) => { if (x && typeof x === "object") { for (const k of Object.keys(x)) { if (k === "timestamp") x[k] = "X"; else strip(x[k]); } } return x; }; return JSON.stringify(strip(o)); } catch { return s; } };
  ok("deterministic (state/reasons/policy/type/exit) across repeats", norm(d1.out) === norm(d2.out) && d1.code === d2.code, "match");

  // --- library import (from the consumer; no side effects) ---
  console.log("== library import ==");
  const impCode = 'import * as m from "@ecocitizenz/ecz-id-mcp-verifier";' +
    'const r = await m.verify({target:"ECZ-GB-A93K7Q",policy:"OPEN",noNetwork:true});' +
    'process.stdout.write("IMPORT_OK|"+(typeof m.verify)+"|"+r.result_state+"|"+(Array.isArray(m.RESULT_STATES)?m.RESULT_STATES.length:0));';
  const imp = run(node, ["--input-type=module", "-e", impCode], { cwd: consumer });
  const impClean = imp.out.trim();
  ok("ESM import + verify() + no side effects", imp.code === 0 && /^IMPORT_OK\|function\|/.test(impClean) && impClean.endsWith("|18"), impClean.slice(0, 80));

  // --- MCP stdio server (drive via a client using the consumer's bundled SDK) ---
  console.log("== MCP stdio server ==");
  const serverEntry = join(installedPkg, "dist", "mcp", "stdio.js");
  const clientFile = join(consumer, "mcp-client.mjs");
  writeFileSync(clientFile, mcpClientSource());
  const mcp = run(node, [clientFile, serverEntry], { cwd: consumer });
  let mcpVerdict = null; try { mcpVerdict = JSON.parse(mcp.out.trim().split(/\r?\n/).pop()); } catch {}
  if (!mcpVerdict) { ok("MCP client ran", false, `exit ${mcp.code} err ${mcp.err.slice(0, 200)}`); }
  else {
    ok("MCP server identity name", mcpVerdict.server_name === "ecz-id-mcp-verifier", mcpVerdict.server_name);
    ok(`MCP server version ${EXPECT_VERSION}`, mcpVerdict.server_version === EXPECT_VERSION, mcpVerdict.server_version);
    ok("MCP exactly 3 tools", JSON.stringify(mcpVerdict.tools) === JSON.stringify(["ecz_check_target", "ecz_explain_result", "ecz_recheck_resolver"]), (mcpVerdict.tools || []).join(","));
    ok("MCP each tool callable", mcpVerdict.check_ok && mcpVerdict.recheck_ok && mcpVerdict.explain_ok, "3/3");
    ok("MCP invalid inputs rejected + session survives", mcpVerdict.unknown_rejected && mcpVerdict.missing_rejected && mcpVerdict.survives, "adversarial");
    ok("MCP controlled shutdown", mcpVerdict.shutdown_ok === true, "closed");
    ok("MCP no secret/env required to start", mcpVerdict.started_no_secret === true, "started");
  }
} catch (e) {
  ok("harness completed without throwing", false, e instanceof Error ? e.message : String(e));
} finally {
  try { rmSync(consumer, { recursive: true, force: true }); } catch {}
}

const pass = failures === 0;
const out = { cell, pass, failures, checks: results };
if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`\n[packed-matrix] ${pass ? "PASS" : "FAIL"} — ${results.filter(r => r.ok).length}/${results.length} checks on ${cell.runner_os} node ${cell.node_version}.`);
process.exit(pass ? 0 : 1);

function mcpClientSource() {
  return [
    'import { Client } from "@modelcontextprotocol/sdk/client/index.js";',
    'import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";',
    'const entry = process.argv[2];',
    'const v = { started_no_secret:false, server_name:null, server_version:null, tools:null, check_ok:false, recheck_ok:false, explain_ok:false, unknown_rejected:false, missing_rejected:false, survives:false, shutdown_ok:false };',
    'const t = new StdioClientTransport({ command: process.execPath, args:[entry], stderr:"pipe", env:{ PATH: process.env.PATH } });',
    'const c = new Client({ name:"phase4-matrix-client", version:"0.0.0" }, { capabilities:{} });',
    'function txt(r){ const b=(r?.content??[]).find(x=>x.type==="text"); return b?JSON.parse(b.text):null; }',
    'try {',
    '  await c.connect(t); v.started_no_secret=true;',
    '  const info=c.getServerVersion(); v.server_name=info?.name; v.server_version=info?.version;',
    '  const list=await c.listTools(); v.tools=(list.tools??[]).map(x=>x.name).sort();',
    '  const r1=await c.callTool({name:"ecz_check_target",arguments:{target:"ECZ-GB-A93K7Q",policy:"OPEN",offline:true}}); const j1=txt(r1); v.check_ok=typeof j1?.result_state==="string" && j1.verifier_writes_truth===false;',
    '  const r2=await c.callTool({name:"ecz_recheck_resolver",arguments:{target:"ECZ-GB-A93K7Q",offline:true}}); const j2=txt(r2); v.recheck_ok=j2?.type==="ecz.resolver_recheck";',
    '  const r3=await c.callTool({name:"ecz_explain_result",arguments:{reason_codes:["NO_PUBLIC_RESOLVER_PROOF_FOUND","BOGUS"],result_state:"RESOLVER_VERIFIABLE"}}); const j3=txt(r3); v.explain_ok=j3?.reason_codes?.[0]?.recognized===true && j3?.reason_codes?.[1]?.recognized===false;',
    '  try { const ru=await c.callTool({name:"ecz_nope",arguments:{}}); v.unknown_rejected=ru?.isError===true; } catch { v.unknown_rejected=true; }',
    '  try { const rm=await c.callTool({name:"ecz_check_target",arguments:{}}); v.missing_rejected=rm?.isError===true; } catch { v.missing_rejected=true; }',
    '  const r5=await c.callTool({name:"ecz_check_target",arguments:{target:"ECZ-GB-A93K7Q",offline:true}}); v.survives=typeof txt(r5)?.result_state==="string";',
    '  await c.close(); v.shutdown_ok=true;',
    '} catch(e){ process.stderr.write(String(e&&e.stack||e)); }',
    'process.stdout.write(JSON.stringify(v));'
  ].join("\n");
}
