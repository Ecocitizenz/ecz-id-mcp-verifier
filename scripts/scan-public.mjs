#!/usr/bin/env node
// Public-disclosure scanner (Phase 1). Cross-platform, dependency-free.
//
// Fails (exit 1) if internal-strategy terminology, product/pricing catalogues,
// or P2 recommendation/affinity logic appear in public source surfaces.
// Private/ignored areas (_reference, docs/flywheel, node_modules, .git) are
// intentionally not scanned.

import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SCAN_DIRS = ["src", "examples", "docs/specs", "docs/distribution"];
const SCAN_FILES = ["README.md", "CHANGELOG.md", "action.yml", "docs/ROLE_SPLIT.md", "docs/PRIVACY.md", "package.json"];
const TEXT = /\.(ts|js|json|md|yml|yaml)$/;

const INTERNAL_TERMS = [
  /flywheel/i,
  /acquisition[-_ ]?flow/i,
  /mandated acquisition/i,
  /\bfive[-_ ]?cart\b/i,
  /\bbasket\b/i,
  /product[-_ ]affinity/i,
  /cross[-_ ]sell/i,
  /scoring weights?/i,
  /market (capture|domination)/i,
  /secret sauce/i,
  /internal playbook/i
];
const PRICING_TERMS = [/£\s?\d/, /\b\d+(?:\.\d{2})?\s*\/\s*mo\b/i, /"price"\s*:/];
const FILENAME_TERMS = [/flywheel/i, /acquisition-flow/i];

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    statSync(p).isDirectory() ? walk(p, acc) : acc.push(p);
  }
  return acc;
}

const files = [];
for (const d of SCAN_DIRS) files.push(...walk(join(ROOT, d)));
for (const f of SCAN_FILES) if (existsSync(join(ROOT, f))) files.push(join(ROOT, f));

const findings = [];
for (const f of files.filter((x) => TEXT.test(x))) {
  const rel = f.slice(ROOT.length + 1).replace(/\\/g, "/");
  for (const re of FILENAME_TERMS) if (re.test(rel)) findings.push(`[filename] ${rel} :: ${re}`);
  const text = readFileSync(f, "utf8");
  for (const re of [...INTERNAL_TERMS, ...PRICING_TERMS]) {
    if (re.test(text)) findings.push(`[content]  ${rel} :: ${re}`);
  }
}

if (findings.length) {
  console.error(`[scan:public] FAIL — ${findings.length} disclosure finding(s):`);
  for (const x of findings) console.error("  " + x);
  process.exit(1);
}
console.log(`[scan:public] CLEAN — scanned ${files.length} public files; no internal-strategy, pricing, or P2 leakage.`);
