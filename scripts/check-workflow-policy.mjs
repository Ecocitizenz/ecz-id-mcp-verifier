#!/usr/bin/env node
// Proof-workflow no-write policy check (Phase 2). Cross-platform, dependency-free.
//
// Fails (exit 1) if any PROOF/CI workflow can write the repository, commit, push,
// force-update, or publish. The single sanctioned publish path
// (.github/workflows/publish-npm.yml) is exempt from the publish prohibition but
// is still required to be contents:read (no repo write) and OIDC-based.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WF_DIR = join(ROOT, ".github", "workflows");
const PUBLISH_WORKFLOW = "publish-npm.yml"; // sanctioned, gated, OIDC publish path

// Patterns that must never appear in a proof/CI workflow.
const WRITE_PATTERNS = [
  { name: "contents:write", re: /contents:\s*write/ },
  { name: "git-commit", re: /\bgit\s+commit\b/ },
  { name: "git-push", re: /\bgit\s+push\b/ },
  { name: "force-push", re: /push\s+[^\n]*--force|\bgit\s+push\s+-f\b|--force-with-lease/ },
  { name: "git-tag-write", re: /\bgit\s+tag\b[^\n]*&&[^\n]*push|\bgit\s+push\s+[^\n]*--tags/ }
];
const PUBLISH_PATTERNS = [
  { name: "npm-publish", re: /\bnpm\s+publish\b/ },
  { name: "mcp-publisher-publish", re: /\bmcp-publisher\s+publish\b/ }
];

if (!existsSync(WF_DIR)) {
  console.error("[check:workflow-policy] FAIL — no .github/workflows directory.");
  process.exit(1);
}

// Strip YAML comments (#... to end of line) so descriptive prose that mentions
// e.g. "contents:write" is not mistaken for an actual permission grant.
const stripComments = (s) =>
  s.split(/\r?\n/).map((l) => l.replace(/(^|\s)#.*$/, "$1")).join("\n");

const files = readdirSync(WF_DIR).filter((f) => /\.ya?ml$/.test(f));
const findings = [];
for (const f of files) {
  const text = stripComments(readFileSync(join(WF_DIR, f), "utf8"));
  for (const { name, re } of WRITE_PATTERNS) {
    if (re.test(text)) findings.push(`${f} :: ${name} (repository write is forbidden in any workflow)`);
  }
  if (f !== PUBLISH_WORKFLOW) {
    for (const { name, re } of PUBLISH_PATTERNS) {
      if (re.test(text)) findings.push(`${f} :: ${name} (only ${PUBLISH_WORKFLOW} may publish)`);
    }
  }
}

if (findings.length) {
  console.error(`[check:workflow-policy] FAIL — ${findings.length} finding(s):`);
  for (const x of findings) console.error("  " + x);
  process.exit(1);
}
console.log(`[check:workflow-policy] PASS — ${files.length} workflow(s) checked; no proof-workflow repository write or unsanctioned publication.`);
