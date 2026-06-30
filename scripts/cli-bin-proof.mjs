#!/usr/bin/env node
// CLI wrapper + symlink/realpath regression proof (Phase 2, runs AFTER build).
//
// Proves the P0B-1 silent-zero-exit defect is FIXED: the compiled bin wrapper
// (dist/bin/cli.js) invokes main() regardless of how its path was resolved
// (direct, relative, "..", junction/symlink). Also proves importing the package
// has NO side effect (CLI main() does not run on import). Any CLI invocation
// that exits 0 with empty stdout FAILS this proof (zero-output regression).

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BIN = join(ROOT, "dist", "bin", "cli.js");
const INDEX = join(ROOT, "dist", "index.js");
const node = process.execPath;
const results = [];
const fail = (name, detail) => results.push({ name, ok: false, detail });
const pass = (name, detail) => results.push({ name, ok: true, detail });

function runNode(args, opts = {}) {
  const r = spawnSync(node, args, { encoding: "utf8", timeout: 30000, cwd: opts.cwd || ROOT });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
}

// Helper: a CLI invocation that must produce non-empty stdout and the given exit code.
function expectOutput(name, args, expectCode = 0, opts = {}) {
  const r = runNode(args, opts);
  if (r.out.trim().length === 0) return fail(name, `EMPTY stdout (exit ${r.code}) — zero-output regression`);
  if (r.code !== expectCode) return fail(name, `exit ${r.code} != ${expectCode}`);
  pass(name, `exit ${r.code}, ${r.out.length} bytes`);
}

// 1. direct wrapper execution
expectOutput("direct --help", [BIN, "--help"]);
expectOutput("direct --version", [BIN, "--version"]);

// 2. relative-path invocation (Node normalizes; must still run)
const relBin = relative(ROOT, BIN).replace(/\\/g, "/");
expectOutput("relative --version", [relBin, "--version"], 0, { cwd: ROOT });

// 3. path containing ".."
const dotdot = join(ROOT, "dist", "bin", "..", "bin", "cli.js");
expectOutput("dotdot --version", [dotdot, "--version"]);

// 4. junction/symlink invocation — the exact condition that triggered P0B-1
const tmp = mkdtempSync(join(tmpdir(), "ecz-cli-bin-"));
try {
  const linkDir = join(tmp, "binlink");
  const linkType = process.platform === "win32" ? "junction" : "dir";
  let linked = false;
  try {
    symlinkSync(join(ROOT, "dist", "bin"), linkDir, linkType);
    linked = true;
  } catch (e) {
    fail("symlink/junction setup", `could not create ${linkType}: ${e.code || e.message}`);
  }
  if (linked) {
    expectOutput("junction/symlink --help", [join(linkDir, "cli.js"), "--help"]);
    expectOutput("junction/symlink --version", [join(linkDir, "cli.js"), "--version"]);
  }

  // 5. valid offline result through the wrapper; JSON parses; exit consistent
  const off = runNode([BIN, "--target", "ECZ-CC-ABC123", "--policy", "OPEN", "--offline"]);
  if (off.out.trim().length === 0) fail("offline result", "EMPTY stdout");
  else {
    try {
      const j = JSON.parse(off.out);
      if (j.result_state && off.code === (j.exit_code ?? off.code)) pass("offline result JSON", `state=${j.result_state} exit=${off.code}`);
      else fail("offline result JSON", `state/exit mismatch (exit ${off.code}, json ${j.exit_code})`);
    } catch (e) {
      fail("offline result JSON", "stdout not valid JSON: " + e.message);
    }
  }

  // 6. malformed + missing target → exit 4
  const missing = runNode([BIN, "--offline"]);
  missing.code === 4 ? pass("missing target exit 4", `exit ${missing.code}`) : fail("missing target exit 4", `exit ${missing.code}`);
  const malformed = runNode([BIN, "--target", "hello world nonsense", "--offline"]);
  malformed.code === 4 ? pass("malformed target exit 4", `exit ${malformed.code}`) : fail("malformed target exit 4", `exit ${malformed.code}`);

  // 7. import side-effect: importing the package index must NOT run the CLI
  const code = `import(${JSON.stringify(pathToFileURL(INDEX).href)}).then((m)=>{process.stdout.write("IMPORT_OK:"+(typeof m.verify))}).catch((e)=>{process.stderr.write(String(e));process.exit(3)})`;
  const imp = runNode(["--input-type=module", "-e", code]);
  if (imp.out.trim() === "IMPORT_OK:function" && imp.code === 0) pass("import side-effect", "no CLI output on import; verify() exported");
  else fail("import side-effect", `unexpected import behaviour: out=${JSON.stringify(imp.out.slice(0, 80))} code=${imp.code}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.name} — ${r.detail}`);
if (failed.length) {
  console.error(`[proof:cli-bin] FAIL — ${failed.length}/${results.length} checks failed.`);
  process.exit(1);
}
console.log(`[proof:cli-bin] PASS — ${results.length} checks; CLI runs via direct/relative/dotdot/junction; import has no side effect; no zero-output regression.`);
