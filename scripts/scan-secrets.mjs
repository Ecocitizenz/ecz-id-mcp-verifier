#!/usr/bin/env node
// Secret + internal-document scanner (Phase 2). Cross-platform, dependency-free.
//
// Fails (exit 1) if credential/secret VALUES or internal-document markers appear
// in the publishable source surfaces. Matches secret *values* (key blocks, known
// token prefixes, quoted high-length assignments) rather than the bare words, so
// privacy disclaimers ("no_secrets_upload") and canonical reason-code identifiers
// ("AGENT_CREDENTIAL", "API_PASSPORT") are not false positives.

import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Scan the publishable / source-of-record surfaces (mirrors scan:public).
// Private/dev areas are intentionally NOT scanned: build output (dist), internal
// docs (docs/flywheel), references, evidence, dependencies, and the dev/release
// tooling scripts (which legitimately contain secret-pattern *literals* and would
// otherwise self-match). Published docs (ROLE_SPLIT, PRIVACY) ARE scanned.
const SCAN_DIRS = ["src", "examples", "docs/specs", "docs/distribution"];
const SCAN_FILES = ["README.md", "CHANGELOG.md", "action.yml", "server.json", "package.json", "docs/ROLE_SPLIT.md", "docs/PRIVACY.md"];
const EXCLUDE = /(^|\/)(node_modules|dist|_EVIDENCE|_reference|\.git|scripts|docs\/flywheel)(\/|$)/;
const TEXT = /\.(ts|js|mjs|cjs|json|md|yml|yaml)$/;

// Secret VALUE patterns (not bare keywords).
const SECRET_PATTERNS = [
  { name: "private-key-block", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "aws-access-key-id", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "npm-token", re: /\bnpm_[A-Za-z0-9]{36}\b/ },
  { name: "github-token", re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b/ },
  { name: "github-pat", re: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/ },
  { name: "slack-token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "google-api-key", re: /\bAIza[0-9A-Za-z_\-]{35}\b/ },
  { name: "private-rsa-pem", re: /-----BEGIN PRIVATE KEY-----/ },
  {
    name: "quoted-credential-assignment",
    // (api_key|apikey|secret|password|passwd|access_token|auth_token|client_secret) = "<16+ non-space chars>"
    re: /\b(?:api[_-]?key|secret(?:_key)?|password|passwd|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key)\b\s*[:=]\s*["'][^"'\s]{16,}["']/i
  }
];

// Internal-document markers that must never ship in the public package.
const INTERNAL_DOC_PATTERNS = [
  { name: "ssot-marker", re: /\bOFF-?SSOT\b/i },
  { name: "build-plan", re: /\bBuild Plan \d/i },
  { name: "mandate-strategy", re: /\bmandate strategy\b/i },
  { name: "evidence-dir-leak", re: /_EVIDENCE[\\/]/ }
];

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const rel = p.slice(ROOT.length + 1).replace(/\\/g, "/");
    if (EXCLUDE.test(rel)) continue;
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
  const text = readFileSync(f, "utf8");
  for (const { name, re } of [...SECRET_PATTERNS, ...INTERNAL_DOC_PATTERNS]) {
    if (re.test(text)) findings.push(`${rel} :: ${name}`);
  }
}

if (findings.length) {
  console.error(`[scan:secrets] FAIL — ${findings.length} finding(s):`);
  for (const x of findings) console.error("  " + x);
  process.exit(1);
}
console.log(`[scan:secrets] CLEAN — scanned ${files.length} files; no secret values or internal-document markers.`);
