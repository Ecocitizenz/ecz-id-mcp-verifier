#!/usr/bin/env node
// Release-state transition copy gate.
//
// Public release-channel wording must stay TRUE in every registry state:
//   A) before the candidate is published   (latest = previous stable, next absent)
//   B) candidate published under `next`      (latest = previous stable, next = candidate)
//   C) after promotion                       (latest = candidate)
//
// Timeless channel language is allowed and encouraged, e.g.
//   "use the package name without a tag for the stable release, @next for the
//    current candidate, or an explicit version for exact reproducibility."
//
// This gate FAILS on time-dependent or false claims that are only correct in one
// state (for example "not yet published", "after publication the untagged command
// resolves to the candidate", "plain npx returns next", "candidate becomes latest").
//
// It scans README, package.json description/keywords, examples, CHANGELOG,
// server.json, action.yml and packaged docs. Cross-platform, dependency-free.

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

// Time-dependent / false release-channel claims. Each is only correct in one
// registry state and must never appear on a public surface.
const FORBIDDEN = [
  { name: "not-yet-published", re: /\bnot yet published\b/i },
  { name: "currently-unpublished", re: /\bcurrently unpublished\b/i },
  { name: "unpublished-candidate", re: /\bunpublished candidate\b/i },
  { name: "is-prepared-but-not-published", re: /\bprepared but\b[^.]*\bnot\b[^.]*\bpublish/i },
  { name: "after-published-untagged-resolves", re: /after\b[^.]*\bpublish[^.]*\b(untagged|plain|bare)\b[^.]*\bresolv/i },
  { name: "untagged-resolves-to-candidate", re: /\b(untagged|plain|bare)\b[^.]*\b(npx|npm install|command)\b[^.]*\bresolv[^.]*\b(candidate|next)\b/i },
  { name: "plain-npx-returns-next", re: /\bplain\b[^.]*\b(npx|npm install)\b[^.]*\breturns?\b[^.]*\bnext\b/i },
  { name: "candidate-becomes-latest", re: /\bcandidate\b[^.]*\b(automatically\s+)?becomes\b[^.]*\blatest\b/i },
  { name: "candidate-automatically-latest", re: /\bautomatically\b[^.]*\b(become|promote|resolve)[^.]*\blatest\b/i },
  { name: "latest-and-next-identical", re: /\blatest and next are\b[^.]*\b(identical|the same|treated as identical)\b/i },
  { name: "currently-only-version-available", re: /\bcurrently only version\b[^.]*\bavailable\b/i },
  { name: "will-be-published", re: /\bwill be published\b/i },
  { name: "coming-soon-npm", re: /\bcoming soon\b/i }
];

const findings = [];
for (const { label, text } of surfaces) {
  const lines = text.split(/\r?\n/);
  for (const { name, re } of FORBIDDEN) {
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        findings.push(`${label}:${i + 1} :: ${name} :: ${lines[i].trim().slice(0, 120)}`);
      }
    }
  }
}

if (findings.length) {
  console.error(`[check:release-state-copy] FAIL — ${findings.length} time-dependent/false claim(s):`);
  for (const f of findings) console.error("  " + f);
  console.error("Use timeless channel wording (stable = no tag, @next = candidate, @<version> = exact).");
  process.exit(1);
}
console.log(
  `[check:release-state-copy] PASS — ${surfaces.length} public surface(s) scanned; ` +
    "release-channel wording is timeless (true before/under-next/after promotion)."
);
