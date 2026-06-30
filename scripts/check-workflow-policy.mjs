#!/usr/bin/env node
// Proof-workflow no-write + sanctioned-publisher policy check.
// Phase 2: no proof/CI workflow may write the repository or publish.
// Phase 5: the single sanctioned publish path (publish-npm.yml) is hardened — manual-only,
//          OIDC, Node 24, pinned npm, full gate, exact commit + exact tarball hash, next-only,
//          protected environment, repository-variable kill switch, SBOM + attestations.
// Cross-platform, dependency-free.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WF_DIR = join(ROOT, ".github", "workflows");
const PUBLISH_WORKFLOW = "publish-npm.yml"; // sanctioned, gated, OIDC publish path
const KILL_SWITCH = "NPM_RELEASE_WRITE_ENABLED";
const REQUIRED_ENVIRONMENT = "npm-release";
const MIN_NODE = 24;
const MIN_NPM = [11, 15, 0];

// Strip YAML comments (#... to end of line) so descriptive prose that mentions e.g.
// "contents:write", "npm publish", "latest", "NPM_TOKEN" is not mistaken for real config.
const stripComments = (s) =>
  s.split(/\r?\n/).map((l) => l.replace(/(^|\s)#.*$/, "$1")).join("\n");

if (!existsSync(WF_DIR)) {
  console.error("[check:workflow-policy] FAIL — no .github/workflows directory.");
  process.exit(1);
}

const files = readdirSync(WF_DIR).filter((f) => /\.ya?ml$/.test(f));
const findings = [];

// Repository-write patterns forbidden in EVERY workflow.
const WRITE_PATTERNS = [
  { name: "contents:write", re: /contents:\s*write/ },
  { name: "packages:write", re: /packages:\s*write/ },
  { name: "git-commit", re: /\bgit\s+commit\b/ },
  { name: "git-push", re: /\bgit\s+push\b/ },
  { name: "force-push", re: /push\s+[^\n]*--force|\bgit\s+push\s+-f\b|--force-with-lease/ },
  { name: "git-tag-write", re: /\bgit\s+tag\b[^\n]*&&[^\n]*push|\bgit\s+push\s+[^\n]*--tags/ }
];
const MCP_PUBLISH = /\bmcp-publisher\s+publish\b/; // MCP Registry publication — forbidden everywhere
const NPM_PUBLISH_G = /\bnpm\s+publish\b/g;

const texts = {};
for (const f of files) texts[f] = stripComments(readFileSync(join(WF_DIR, f), "utf8"));

for (const f of files) {
  const text = texts[f];
  for (const { name, re } of WRITE_PATTERNS) {
    if (re.test(text)) findings.push(`${f} :: ${name} (repository write is forbidden in any workflow)`);
  }
  if (MCP_PUBLISH.test(text)) {
    findings.push(`${f} :: mcp-publisher publish (MCP Registry publication is forbidden in all workflows)`);
  }
  const npmPublishCount = (text.match(NPM_PUBLISH_G) || []).length;
  if (f !== PUBLISH_WORKFLOW && npmPublishCount > 0) {
    findings.push(`${f} :: npm publish (only ${PUBLISH_WORKFLOW} may publish)`);
  }
}

// Hardening contract for the sanctioned publish workflow.
if (!files.includes(PUBLISH_WORKFLOW)) {
  findings.push(`${PUBLISH_WORKFLOW} :: missing (the sanctioned publish workflow must exist)`);
} else {
  const pub = texts[PUBLISH_WORKFLOW];
  const need = (cond, msg) => { if (!cond) findings.push(`${PUBLISH_WORKFLOW} :: ${msg}`); };

  // Exactly one sanctioned npm publish command.
  const npmPublishCount = (pub.match(NPM_PUBLISH_G) || []).length;
  need(npmPublishCount === 1, `must contain exactly one npm publish command (found ${npmPublishCount})`);

  // Manual-only trigger; isolate the on: block.
  need(/workflow_dispatch:/.test(pub), "must be triggered by workflow_dispatch");
  const onMatch = pub.match(/^on:\s*([\s\S]*?)^[a-z]/m);
  const onBlock = onMatch ? onMatch[1] : pub;
  need(!/^\s*push:/m.test(onBlock), "must NOT have a push trigger");
  need(!/^\s*pull_request:/m.test(onBlock), "must NOT have a pull_request trigger");
  need(!/^\s*release:/m.test(onBlock), "must NOT have a release trigger");
  need(!/^\s*schedule:/m.test(onBlock), "must NOT have a schedule trigger");
  need(!/^\s*workflow_call:/m.test(onBlock), "must NOT be a reusable workflow (workflow_call)");
  need(!/tags:/.test(onBlock), "must NOT have a tag trigger");

  // No npm write token anywhere.
  need(!/secrets\.[A-Za-z_]*TOKEN/.test(pub), "must not reference a secret token");
  need(!/NODE_AUTH_TOKEN/.test(pub), "must not reference NODE_AUTH_TOKEN");
  need(!/NPM_TOKEN/.test(pub), "must not reference NPM_TOKEN");

  // Protected environment + kill switch.
  need(new RegExp(`environment:\\s*${REQUIRED_ENVIRONMENT}`).test(pub), `must use environment: ${REQUIRED_ENVIRONMENT}`);
  need(pub.includes(KILL_SWITCH), `must gate publish on ${KILL_SWITCH}`);
  need(new RegExp(`${KILL_SWITCH}\\s*==\\s*'true'`).test(pub), `must require ${KILL_SWITCH} == 'true'`);

  // next-only, never latest.
  need(/--tag\s+next\b/.test(pub), "publish must use --tag next");
  need(!/--tag\s+latest\b/.test(pub), "must NOT publish to latest");

  // Publish the prepared tarball, not source.
  need(/npm\s+publish\s+(?!--)\S/.test(pub), "must publish a tarball artifact (not bare npm publish from source)");
  need(/download-artifact/.test(pub), "publish job must download the prepared artifact");

  // Exact commit required.
  need(/release_commit/.test(pub), "must require an exact release_commit input");
  need(/\{40\}/.test(pub), "must validate a full 40-character commit SHA");

  // Full gate.
  need(/release:full/.test(pub), "must run the release:full gate");

  // Node >= 24.
  const nodeMatch = pub.match(/NODE_VERSION:\s*"?(\d+)/);
  need(nodeMatch && Number(nodeMatch[1]) >= MIN_NODE, `must use Node >= ${MIN_NODE}`);
  const lowNode = pub.match(/node-version:\s*["'](\d+)["']/);
  if (lowNode && Number(lowNode[1]) < MIN_NODE) need(false, `node-version ${lowNode[1]} < ${MIN_NODE}`);

  // npm >= 11.15.0.
  const npmMatch = pub.match(/NPM_VERSION:\s*"?(\d+)\.(\d+)\.(\d+)/);
  let npmOK = false;
  if (npmMatch) {
    const v = [Number(npmMatch[1]), Number(npmMatch[2]), Number(npmMatch[3])];
    npmOK = v[0] > MIN_NPM[0] ||
      (v[0] === MIN_NPM[0] && (v[1] > MIN_NPM[1] || (v[1] === MIN_NPM[1] && v[2] >= MIN_NPM[2])));
  }
  need(npmOK, `must pin npm >= ${MIN_NPM.join(".")}`);

  // No dependency caching.
  need(/package-manager-cache:\s*false/.test(pub), "must set package-manager-cache: false");
  need(!/^\s*cache:\s*['"]?(npm|yarn|pnpm)/m.test(pub), "must not enable dependency caching");

  // No repository-write permission in the publish workflow.
  need(!/contents:\s*write/.test(pub), "must not grant contents: write");
  need(!/packages:\s*write/.test(pub), "must not grant packages: write");

  // Exact hash verification.
  need(/expected_tarball_sha256/.test(pub), "must verify expected_tarball_sha256");
  need(/sha256sum/.test(pub), "must compute the tarball sha256");

  // Attestations.
  need(/actions\/attest/.test(pub), "must create attestations (actions/attest)");
  need(/attestations:\s*write/.test(pub), "must grant attestations: write in the integrity job");
}

if (findings.length) {
  console.error(`[check:workflow-policy] FAIL — ${findings.length} finding(s):`);
  for (const x of findings) console.error("  " + x);
  process.exit(1);
}
console.log(
  `[check:workflow-policy] PASS — ${files.length} workflow(s) checked; no repository write, ` +
    `MCP Registry publication forbidden, single hardened sanctioned npm publisher (${PUBLISH_WORKFLOW}).`
);
