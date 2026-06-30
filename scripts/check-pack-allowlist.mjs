#!/usr/bin/env node
// Package-content / allowlist inspection (Phase 2). Cross-platform.
//
// Computes the exact npm publish file set via `npm pack --dry-run --json
// --ignore-scripts` (no lifecycle recursion, no network) and asserts the
// allowlist: required public artifacts present, no source/tests/internal leakage.

import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let raw;
try {
  // Use execSync (shell) so the platform npm launcher (npm / npm.cmd) resolves
  // correctly on Windows and POSIX. --dry-run + --ignore-scripts: no network,
  // no lifecycle recursion, no tarball written.
  raw = execSync("npm pack --dry-run --json --ignore-scripts", {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
} catch (e) {
  console.error("[check:pack] FAIL — npm pack --dry-run failed: " + (e && e.message ? e.message : String(e)));
  process.exit(1);
}

let parsed;
try {
  // npm prints the JSON array as the last JSON value on stdout.
  const start = raw.indexOf("[");
  parsed = JSON.parse(raw.slice(start));
} catch (e) {
  console.error("[check:pack] FAIL — could not parse npm pack JSON: " + e.message);
  process.exit(1);
}

const entry = Array.isArray(parsed) ? parsed[0] : parsed;
const files = (entry.files || []).map((f) => f.path.replace(/\\/g, "/"));

const REQUIRED = [
  "dist/bin/cli.js",
  "dist/cli.js",
  "dist/mcp/stdio.js",
  "dist/index.js",
  "server.json",
  "README.md",
  "LICENSE.md",
  "action.yml"
];
const FORBIDDEN = [/^src\//, /^tests\//, /^_reference\//, /^_EVIDENCE\//, /^node_modules\//, /\.test\.(ts|js)$/];

const problems = [];
for (const r of REQUIRED) if (!files.includes(r)) problems.push(`missing required file: ${r}`);
for (const f of files) for (const re of FORBIDDEN) if (re.test(f)) problems.push(`forbidden packaged path: ${f}`);

if (problems.length) {
  console.error(`[check:pack] FAIL — ${problems.length} allowlist problem(s) (of ${files.length} packaged files):`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(`[check:pack] PASS — ${files.length} packaged files; required artifacts present, no source/tests/internal leakage.`);
