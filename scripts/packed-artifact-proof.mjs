#!/usr/bin/env node
// ECZ-ID PACKED-ARTEFACT + INDEPENDENT-CLIENT PROOF (2026-07-28 era).
//
// The source tree passing is not sufficient evidence. This harness proves the
// EXACT npm tarball a consumer would install:
//
//   1. `npm pack` output is installed into a fresh temporary consumer project
//      OUTSIDE the repository, so there is no source fallback and no path back
//      into the working tree;
//   2. the official MCP client (`@modelcontextprotocol/client`) is installed
//      INDEPENDENTLY in that consumer — it is not a dependency of the package
//      under test and shares no code with this repo's own wire harness;
//   3. both protocol rails are driven through that official client;
//   4. the CLI accelerators are run from the installed bin shims;
//   5. the tarball's own file list and checksum are recorded.
//
// Independence matters: the repo's `mcp-wire-matrix.mjs` is purpose-built and so
// cannot be independent of our own reading of the specification. The client half
// here is written by the specification's authors.
//
// Usage:
//   node scripts/packed-artifact-proof.mjs [--tarball <abs.tgz>] [--out <result.json>]
// With no --tarball, the harness packs the current tree itself.
// Exit 0 only if every check passes.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir, platform, arch, release } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const PKG_NAME = PKG.name;
const EXPECT_VERSION = PKG.version;
const MODERN = "2026-07-28";
const LEGACY = "2025-11-25";
const TOOLS = ["ecz_check_target", "ecz_explain_result", "ecz_recheck_resolver"];

const isWin = platform() === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";
const node = process.execPath;

const arg = (n, d = "") => {
  const i = process.argv.indexOf(n);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const OUT = arg("--out");

const checks = [];
let failures = 0;
const ok = (name, cond, detail = "") => {
  if (cond) checks.push({ name, ok: true, detail: String(detail) });
  else {
    failures++;
    checks.push({ name, ok: false, detail: String(detail) });
  }
};

function run(cmd, args, opts = {}) {
  // On Windows a `.cmd` shim cannot be executed by spawnSync without a shell
  // (Node hardened this in 18.20 / 20.12). Route those through cmd.exe rather
  // than enabling `shell` globally, which would re-introduce argument quoting
  // hazards on POSIX.
  let c = cmd;
  let a = args;
  if (isWin && /\.cmd$|^npm$/i.test(cmd)) {
    a = ["/d", "/s", "/c", cmd, ...args];
    c = process.env.COMSPEC || "cmd.exe";
  }
  const r = spawnSync(c, a, {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: 300_000,
    ...opts
  });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "", spawnError: r.error ? String(r.error.message) : "" };
}

const cell = {
  runner_os: platform(),
  arch: arch(),
  os_release: release(),
  node_version: process.version,
  package: PKG_NAME,
  expected_version: EXPECT_VERSION
};

// ---------------------------------------------------------------------------
// 1. Produce (or accept) the tarball, and record what is in it.
// ---------------------------------------------------------------------------
let tarball = arg("--tarball");
let packDir = "";
if (!tarball) {
  packDir = mkdtempSync(join(tmpdir(), "ecz-pack-"));
  const p = run(npmCmd, ["pack", "--pack-destination", packDir], { cwd: ROOT });
  ok("npm pack succeeded", p.code === 0, (p.spawnError || p.err || "").slice(0, 200));
  const produced = existsSync(packDir) ? readdirSync(packDir).filter((f) => f.endsWith(".tgz")) : [];
  ok("exactly one tarball produced", produced.length === 1, produced.join(","));
  tarball = produced.length === 1 ? join(packDir, produced[0]) : "";
}
tarball = tarball ? resolve(tarball) : "";
ok("tarball exists", Boolean(tarball) && existsSync(tarball), tarball);

let tarballInfo = null;
if (tarball && existsSync(tarball)) {
  const bytes = readFileSync(tarball);
  const listing = run(npmCmd, ["pack", "--dry-run", "--json"], { cwd: ROOT });
  let files = [];
  try {
    files = JSON.parse(listing.out)[0].files.map((f) => f.path);
  } catch {}
  tarballInfo = {
    file: tarball.split(/[\\/]/).pop(),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    file_count: files.length,
    files
  };
  ok("tarball has a recorded sha256", tarballInfo.sha256.length === 64, tarballInfo.sha256.slice(0, 16) + "…");
  ok("tarball file list recorded", files.length > 0, `${files.length} files`);
  // The packed artefact must not carry source, tests or proof scripts.
  const leaked = files.filter((f) => /^(src|tests|scripts)\//.test(f) || f === "golden.json");
  ok("no source / tests / scripts leaked into the tarball", leaked.length === 0, leaked.slice(0, 5).join(","));
  ok("dist/mcp present in the tarball", files.some((f) => f.startsWith("dist/mcp/")), "dist/mcp");
}

// ---------------------------------------------------------------------------
// 2. Fresh consumer project, OUTSIDE the repo.
// ---------------------------------------------------------------------------
const consumer = mkdtempSync(join(tmpdir(), "ecz-consumer-"));
let installedPkg = "";

try {
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify({ name: "ecz-packed-consumer", private: true, version: "0.0.0", type: "module" }, null, 2)
  );

  const inst = run(npmCmd, ["install", tarball, "--no-audit", "--no-fund"], { cwd: consumer });
  ok("tarball installs into a clean project", inst.code === 0, (inst.spawnError || inst.err || "").slice(0, 300));

  installedPkg = join(consumer, "node_modules", "@ecocitizenz", "ecz-id-mcp-verifier");
  ok("package materialised in node_modules", existsSync(installedPkg), installedPkg);

  let installedPj = null;
  try {
    installedPj = JSON.parse(readFileSync(join(installedPkg, "package.json"), "utf8"));
  } catch {}
  ok(`installed version is ${EXPECT_VERSION}`, installedPj?.version === EXPECT_VERSION, installedPj?.version);
  ok(
    "three bin declarations present",
    Boolean(installedPj?.bin?.["ecz-id-mcp-verifier"] && installedPj?.bin?.["ecz-mcp-verify"] && installedPj?.bin?.["ecz-id-mcp-server"]),
    JSON.stringify(installedPj?.bin)
  );

  // No unlisted local source dependency: nothing may resolve back into the repo,
  // and no dependency may be a file:/link: spec.
  const deps = installedPj?.dependencies ?? {};
  const localSpecs = Object.entries(deps).filter(([, v]) => /^(file:|link:|portal:|\.\.?[\\/])/.test(String(v)));
  ok("no file:/link: dependency in the packed manifest", localSpecs.length === 0, JSON.stringify(localSpecs));
  ok("packed manifest declares the MCP server SDK", Boolean(deps["@modelcontextprotocol/server"]), JSON.stringify(deps));
  ok("packed manifest does NOT ship the client SDK", !deps["@modelcontextprotocol/client"], JSON.stringify(Object.keys(deps)));

  // Nothing in the installed tree may reference the repo path.
  const distIdx = join(installedPkg, "dist", "index.js");
  const distTxt = existsSync(distIdx) ? readFileSync(distIdx, "utf8") : "";
  ok("installed dist contains no absolute repo path", !distTxt.includes(ROOT.replace(/\\/g, "/")) && !distTxt.includes(ROOT), "clean");

  // --- 3. CLI accelerators, from the INSTALLED bin shims -------------------
  const binDir = join(consumer, "node_modules", ".bin");
  const binPrimary = join(binDir, isWin ? "ecz-id-mcp-verifier.cmd" : "ecz-id-mcp-verifier");
  const binAlias = join(binDir, isWin ? "ecz-mcp-verify.cmd" : "ecz-mcp-verify");
  const callBin = (bin, args) =>
    isWin ? run(process.env.COMSPEC || "cmd.exe", ["/d", "/s", "/c", bin, ...args], { cwd: consumer })
          : run(bin, args, { cwd: consumer });
  const asJson = (s) => {
    try { return JSON.parse(s); } catch { return null; }
  };

  const jVer = callBin(binPrimary, ["--version"]);
  ok(`--version reports ${EXPECT_VERSION}`, jVer.out.includes(EXPECT_VERSION), jVer.out.trim().slice(0, 60));

  const jAlias = callBin(binAlias, ["--version"]);
  ok("alias bin ecz-mcp-verify works", jAlias.code === 0 && jAlias.out.includes(EXPECT_VERSION), jAlias.out.trim().slice(0, 60));

  const jDoc = asJson(callBin(binPrimary, ["--doctor"]).out);
  ok("--doctor returns a healthy report", jDoc?.ok === true && jDoc?.type === "ecz.doctor", JSON.stringify(jDoc)?.slice(0, 120));

  const jCap = asJson(callBin(binPrimary, ["--capabilities"]).out);
  ok(
    "--capabilities reports the profile and the installed version",
    jCap?.capability_profile === "ecz-resolver-posture-v1" && jCap?.version === EXPECT_VERSION,
    `${jCap?.capability_profile} ${jCap?.version}`
  );

  const jCfg = asJson(callBin(binPrimary, ["--print-mcp-config"]).out);
  ok(
    "--print-mcp-config emits a usable stdio block",
    Boolean(jCfg?.mcpServers?.["ecz-id"]?.command),
    JSON.stringify(jCfg?.mcpServers?.["ecz-id"])?.slice(0, 120)
  );

  // --- 4. Offline zero-egress, from the packed artefact --------------------
  const offline = callBin(binPrimary, ["--target", "ECZ-GB-A93K7Q", "--policy", "OPEN", "--offline"]);
  const jOff = asJson(offline.out);
  ok("offline run succeeds from the packed artefact", offline.code === 0 && Boolean(jOff), `exit ${offline.code}`);
  ok("offline result is a canonical ResultState", typeof jOff?.result_state === "string" && jOff.result_state.length > 0, jOff?.result_state);
  ok("offline result keeps the read-only boundary", jOff?.verifier_writes_truth === false && jOff?.verifier_activates_proof === false && jOff?.verifier_marks_bound === false, "boundary");
  ok("offline result declares no telemetry", jOff?.no_telemetry === true, String(jOff?.no_telemetry));

  const jReq = asJson(callBin(binPrimary, ["--target", "ECZ-GB-A93K7Q", "--policy", "REQUIRE", "--offline"]).out);
  ok("REQUIRE fails closed from the packed artefact", Number.isInteger(jReq?.exit_code) && jReq.exit_code !== 0, String(jReq?.exit_code));

  // --- 5. INDEPENDENT official MCP client, installed separately -----------
  const cli = run(npmCmd, ["install", "@modelcontextprotocol/client@^2.0.0", "--no-audit", "--no-fund"], { cwd: consumer });
  ok("official MCP client installs independently", cli.code === 0, (cli.spawnError || cli.err || "").slice(0, 200));
  let clientVersion = null;
  try {
    clientVersion = JSON.parse(
      readFileSync(join(consumer, "node_modules", "@modelcontextprotocol", "client", "package.json"), "utf8")
    ).version;
  } catch {}
  ok("official client version recorded", Boolean(clientVersion), String(clientVersion));
  cell.official_client_version = clientVersion;

  const serverEntry = join(installedPkg, "dist", "mcp", "stdio.js");
  ok("packed MCP server entrypoint exists", existsSync(serverEntry), serverEntry);

  const clientFile = join(consumer, "interop.mjs");
  writeFileSync(clientFile, interopClientSource());
  const interop = run(node, [clientFile, serverEntry, MODERN, LEGACY], { cwd: consumer, timeout: 180_000 });
  let v = null;
  try {
    v = JSON.parse(interop.out.trim().split(/\r?\n/).pop());
  } catch {}

  if (!v) {
    ok("independent client harness ran", false, `exit ${interop.code} :: ${(interop.err || interop.out).slice(0, 300)}`);
  } else {
    cell.negotiated = { modern: v.modern?.era, legacy: v.legacy?.negotiated };

    // MODERN rail, pinned — the client refuses to fall back.
    ok("MODERN: official client connects with mode pin 2026-07-28", v.modern?.connected === true, v.modern?.error || "");
    ok("MODERN: client reports the modern era", v.modern?.era === "modern", String(v.modern?.era));
    ok("MODERN: server/discover offers 2026-07-28", v.modern?.discover_offers_modern === true, JSON.stringify(v.modern?.supportedVersions));
    ok("MODERN: server identity received", v.modern?.server_name === "ecz-id-mcp-verifier", String(v.modern?.server_name));
    ok(`MODERN: server version ${EXPECT_VERSION}`, v.modern?.server_version === EXPECT_VERSION, String(v.modern?.server_version));
    ok("MODERN: exactly the three canonical tools", JSON.stringify(v.modern?.tools) === JSON.stringify(TOOLS), (v.modern?.tools || []).join(","));
    ok("MODERN: every tool advertises an outputSchema", v.modern?.tools_with_output_schema === 3, String(v.modern?.tools_with_output_schema));
    ok("MODERN: all three tools invoke successfully", v.modern?.calls_ok === 3, `${v.modern?.calls_ok}/3`);
    ok("MODERN: structuredContent is readable by the official client", v.modern?.structured_ok === 3, `${v.modern?.structured_ok}/3`);
    ok("MODERN: structuredContent matches the text block", v.modern?.structured_matches_text === 3, `${v.modern?.structured_matches_text}/3`);
    ok("MODERN: cacheable list carries ttlMs + cacheScope", v.modern?.tools_list_cacheable === true, JSON.stringify(v.modern?.cache));
    ok("MODERN: read-only boundary visible to the client", v.modern?.boundary_ok === true, "boundary");

    // LEGACY rail.
    ok("LEGACY: official client connects via initialize", v.legacy?.connected === true, v.legacy?.error || "");
    ok(`LEGACY: negotiated exactly ${LEGACY}`, v.legacy?.negotiated === LEGACY, String(v.legacy?.negotiated));
    ok("LEGACY: client reports the legacy era", v.legacy?.era === "legacy", String(v.legacy?.era));
    ok("LEGACY: exactly the three canonical tools", JSON.stringify(v.legacy?.tools) === JSON.stringify(TOOLS), (v.legacy?.tools || []).join(","));
    ok("LEGACY: all three tools invoke successfully", v.legacy?.calls_ok === 3, `${v.legacy?.calls_ok}/3`);

    // Refusal, driven raw (no client required).
    ok("unsupported revision refused with -32022", v.refusal?.code === -32022, String(v.refusal?.code));
    ok("refusal names the supported versions", Array.isArray(v.refusal?.supported) && v.refusal.supported.includes(MODERN), JSON.stringify(v.refusal?.supported));
  }
} catch (e) {
  ok("harness completed without throwing", false, e instanceof Error ? e.message : String(e));
} finally {
  for (const d of [consumer, packDir]) {
    if (d) { try { rmSync(d, { recursive: true, force: true }); } catch {} }
  }
}

const pass = failures === 0;
const report = { suite: "ecz-id-packed-artifact-proof-v1", cell, tarball: tarballInfo, totals: { checks: checks.length, passed: checks.length - failures, failed: failures }, checks };
if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n", "utf8");

for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.ok ? "" : "   << " + c.detail}`);
console.log(`\n[packed-artifact] ${pass ? "PASS" : "FAIL"} — ${checks.length - failures}/${checks.length} on ${cell.runner_os}/${cell.arch} node ${cell.node_version}`);
if (tarballInfo) console.log(`  tarball ${tarballInfo.file}  ${tarballInfo.bytes} bytes  sha256 ${tarballInfo.sha256}`);
process.exit(pass ? 0 : 1);

// ---------------------------------------------------------------------------
// The independent client. Uses ONLY the official @modelcontextprotocol/client
// installed in the consumer project. It does not import anything from this repo.
// ---------------------------------------------------------------------------
function interopClientSource() {
  return `
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { spawn } from "node:child_process";

const [entry, MODERN, LEGACY] = process.argv.slice(2);
const TOOLS = ["ecz_check_target", "ecz_explain_result", "ecz_recheck_resolver"];
const out = { modern: {}, legacy: {}, refusal: {} };

const transport = () => new StdioClientTransport({
  command: process.execPath, args: [entry], stderr: "pipe", env: { PATH: process.env.PATH }
});
const textOf = (r) => {
  const b = (r?.content ?? []).find((x) => x.type === "text");
  return b ? JSON.parse(b.text) : null;
};

// ---- MODERN, pinned. No fallback is permitted by this mode. ----
try {
  const c = new Client({ name: "ecz-independent-interop", version: "1.0.0" }, {
    capabilities: {},
    versionNegotiation: { mode: { pin: MODERN } }
  });
  await c.connect(transport());
  out.modern.connected = true;
  out.modern.era = c.getProtocolEra?.();
  const info = c.getServerVersion?.();
  out.modern.server_name = info?.name;
  out.modern.server_version = info?.version;

  const list = await c.listTools();
  out.modern.tools = (list.tools ?? []).map((t) => t.name).sort();
  out.modern.tools_with_output_schema = (list.tools ?? []).filter((t) => t.outputSchema).length;
  out.modern.cache = { ttlMs: list.ttlMs, cacheScope: list.cacheScope };
  out.modern.tools_list_cacheable =
    Number.isInteger(list.ttlMs) && list.ttlMs >= 0 && typeof list.cacheScope === "string";
  // The pinned connect performs server/discover itself; read the official
  // client's own record of that result rather than re-issuing the request.
  const disc = c.getDiscoverResult?.();
  out.modern.supportedVersions = disc?.supportedVersions;
  out.modern.discover_offers_modern =
    Array.isArray(disc?.supportedVersions) && disc.supportedVersions.includes(MODERN);
  out.modern.negotiated = c.getNegotiatedProtocolVersion?.();
  out.modern.instructions_present = typeof c.getInstructions?.() === "string";

  let calls = 0, structured = 0, matches = 0;
  const args = {
    ecz_check_target: { target: "ECZ-GB-A93K7Q", policy: "OPEN", offline: true },
    ecz_recheck_resolver: { target: "ECZ-GB-A93K7Q", offline: true },
    ecz_explain_result: { reason_codes: ["RESOLVER_READ_ONLY", "BOGUS"], result_state: "DEGRADED" }
  };
  let boundarySeen = false;
  for (const name of TOOLS) {
    const r = await c.callTool({ name, arguments: args[name] });
    if (r && !r.isError) calls++;
    if (r?.structuredContent !== undefined) structured++;
    const t = textOf(r);
    if (t && r?.structuredContent && JSON.stringify(t) === JSON.stringify(r.structuredContent)) matches++;
    if (name === "ecz_check_target" && r?.structuredContent) {
      const s = r.structuredContent;
      boundarySeen = s.verifier_writes_truth === false && s.verifier_activates_proof === false && s.verifier_marks_bound === false;
    }
  }
  out.modern.calls_ok = calls;
  out.modern.structured_ok = structured;
  out.modern.structured_matches_text = matches;
  out.modern.boundary_ok = boundarySeen;
  await c.close();
} catch (e) {
  out.modern.connected = out.modern.connected ?? false;
  out.modern.error = String(e?.message ?? e).slice(0, 300);
}

// ---- LEGACY ----
try {
  const c = new Client({ name: "ecz-independent-interop", version: "1.0.0" }, {
    capabilities: {},
    versionNegotiation: { mode: "legacy" }
  });
  await c.connect(transport());
  out.legacy.connected = true;
  out.legacy.era = c.getProtocolEra?.();
  out.legacy.negotiated = c.getNegotiatedProtocolVersion?.();
  const list = await c.listTools();
  out.legacy.tools = (list.tools ?? []).map((t) => t.name).sort();
  let calls = 0;
  const args = {
    ecz_check_target: { target: "ECZ-GB-A93K7Q", policy: "OPEN", offline: true },
    ecz_recheck_resolver: { target: "ECZ-GB-A93K7Q", offline: true },
    ecz_explain_result: { reason_codes: ["RESOLVER_READ_ONLY"], result_state: "DEGRADED" }
  };
  for (const name of TOOLS) {
    const r = await c.callTool({ name, arguments: args[name] });
    if (r && !r.isError) calls++;
  }
  out.legacy.calls_ok = calls;
  await c.close();
} catch (e) {
  out.legacy.connected = out.legacy.connected ?? false;
  out.legacy.error = String(e?.message ?? e).slice(0, 300);
}

// ---- Refusal of an unsupported revision, raw JSON-RPC ----
await new Promise((done) => {
  const p = spawn(process.execPath, [entry], { stdio: ["pipe", "pipe", "pipe"] });
  let buf = "";
  p.stdout.on("data", (d) => {
    buf += d;
    const parts = buf.split("\\n"); buf = parts.pop() ?? "";
    for (const line of parts) {
      if (!line.trim()) continue;
      try {
        const j = JSON.parse(line);
        if (j.id === 1 && j.error) {
          out.refusal.code = j.error.code;
          out.refusal.supported = j.error.data?.supported;
        }
      } catch {}
    }
  });
  setTimeout(() => {
    p.stdin.write(JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "server/discover",
      params: { _meta: {
        "io.modelcontextprotocol/protocolVersion": "2099-01-01",
        "io.modelcontextprotocol/clientCapabilities": {}
      } }
    }) + "\\n");
    setTimeout(() => { p.kill(); done(); }, 2500);
  }, 1500);
});

console.log(JSON.stringify(out));
`;
}
