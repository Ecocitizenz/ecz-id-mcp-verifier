#!/usr/bin/env node
// Latest-first public-copy gate.
//
// Public acquisition/onboarding copy must present a single latest-first path:
//   - a plain `npm install @ecocitizenz/ecz-id-mcp-verifier` / `npx …` is the primary route;
//   - an exact `@<version>` pin is secondary reproducibility guidance only;
//   - no public next/candidate/pre-release channel machinery.
//
// The npm `next` dist-tag remains a real internal compatibility fact — it simply must not
// appear in the public acquisition surfaces (README.md, AGENTS.md).
//
// This gate ALSO fails any scanned public surface on time-dependent/false release-channel
// claims that are only correct in one registry state (e.g. "not yet published").
//
// Cross-platform, dependency-free.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(p) {
  try { return readFileSync(p, "utf8"); } catch { return ""; }
}
function collectDocs(dir, acc) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) collectDocs(p, acc);
    else if (/\.(md|txt)$/i.test(e)) acc.push(p);
  }
}

const surfaces = [];
const add = (label, text) => { if (text) surfaces.push({ label, text }); };

add("README.md", read(join(ROOT, "README.md")));
add("AGENTS.md", read(join(ROOT, "AGENTS.md")));
add("CHANGELOG.md", read(join(ROOT, "CHANGELOG.md")));
add("action.yml", read(join(ROOT, "action.yml")));

try {
  const pkg = JSON.parse(read(join(ROOT, "package.json")) || "{}");
  add("package.json:description", pkg.description || "");
  add("package.json:keywords", (pkg.keywords || []).join(" "));
} catch { /* ignore */ }
try {
  const srv = JSON.parse(read(join(ROOT, "server.json")) || "{}");
  add("server.json:description", srv.description || "");
} catch { /* ignore */ }

const docFiles = [];
collectDocs(join(ROOT, "examples"), docFiles);
collectDocs(join(ROOT, "docs"), docFiles);
for (const f of docFiles) add(f.replace(ROOT + "/", "").replace(ROOT + "\\", ""), read(f));

// Time-dependent / false release-channel claims — forbidden on ALL scanned surfaces.
const FORBIDDEN = [
  { name: "not-yet-published", re: /\bnot yet published\b/i },
  { name: "currently-unpublished", re: /\bcurrently unpublished\b/i },
  { name: "unpublished-candidate", re: /\bunpublished candidate\b/i },
  { name: "is-prepared-but-not-published", re: /\bprepared but\b[^.]*\bnot\b[^.]*\bpublish/i },
  { name: "after-published-untagged-resolves", re: /after\b[^.]*\bpublish[^.]*\b(untagged|plain|bare)\b[^.]*\bresolv/i },
  { name: "untagged-resolves-to-candidate", re: /\b(untagged|plain|bare)\b[^.]*\b(npx|npm install|command)\b[^.]*\bresolv[^.]*\b(candidate|next)\b/i },
  { name: "candidate-becomes-latest", re: /\bcandidate\b[^.]*\b(automatically\s+)?becomes\b[^.]*\blatest\b/i },
  { name: "will-be-published", re: /\bwill be published\b/i },
  { name: "coming-soon", re: /\bcoming soon\b/i }
];

// Latest-first violations — forbidden only on the public ACQUISITION surfaces.
const LATEST_FIRST_FILES = new Set(["README.md", "AGENTS.md"]);
const LATEST_FIRST_FORBIDDEN = [
  { name: "release-channels-heading", re: /^##\s*Release channels\b/im },
  { name: "at-next-example", re: /@next\b/ },
  { name: "next-tag", re: /\bnext tag\b/i },
  { name: "candidate-channel", re: /\bcandidate channel\b/i },
  { name: "pre-release", re: /\bpre-?release\b/i },
  { name: "choose-a-channel", re: /\bchoose a channel\b/i },
  { name: "promotion-to-latest", re: /\bpromotion to latest\b/i },
  { name: "backend-key-internal", re: /Backend key \(internal\)/i },
  // Forbid a STALE exact pin to the previous release (0.8.2 is the current version).
  { name: "stale-version-pin-0-8-1", re: /@v?0\.8\.1\b/ }
];

const findings = [];
for (const { label, text } of surfaces) {
  const lines = text.split(/\r?\n/);
  for (const { name, re } of FORBIDDEN) {
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) findings.push(`${label}:${i + 1} :: ${name} :: ${lines[i].trim().slice(0, 120)}`);
    }
  }
  if (LATEST_FIRST_FILES.has(label)) {
    for (const { name, re } of LATEST_FIRST_FORBIDDEN) {
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) findings.push(`${label}:${i + 1} :: latest-first:${name} :: ${lines[i].trim().slice(0, 120)}`);
      }
    }
  }
}

if (findings.length) {
  console.error(`[check:release-state-copy] FAIL — ${findings.length} finding(s):`);
  for (const f of findings) console.error("  " + f);
  console.error("Public acquisition copy must be latest-first: plain install/npx primary; exact @<version> pin secondary; no next/candidate/channel machinery.");
  process.exit(1);
}
console.log(
  `[check:release-state-copy] PASS — ${surfaces.length} public surface(s) scanned; ` +
    "acquisition copy is latest-first (plain install primary, exact pin secondary, no next/candidate machinery)."
);
