#!/usr/bin/env node
// HARD Registry-metadata gate for Phase 3.
//
// Fails (exit 1) unless BOTH hold:
//   1. server.json identity/ownership invariants (mcpName == name == npm
//      identity; version match; stdio transport; no remote endpoint claim; no
//      required/secret env vars; no certification/approval claim);
//   2. server.json validates against the CURRENT official MCP server schema,
//      fetched live by the exact URL pinned in server.json's own `$schema`
//      (TASK 7 option B — schema pinned by URL/version, fetched, validated).
//
// There is no "warn and continue": Registry eligibility must be PROVEN. If the
// official schema cannot be fetched, that is a FAILURE (it surfaces a wrong or
// stale `$schema` URL rather than silently passing). Uses Node 22 global fetch
// and the ajv already present via the MCP SDK dependency tree.

import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ajvMod = require("ajv/dist/2020.js");
const Ajv2020 = ajvMod.Ajv2020 || ajvMod.default || ajvMod;
const formatsMod = require("ajv-formats");
const addFormats = formatsMod.default || formatsMod;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const server = JSON.parse(readFileSync(join(ROOT, "server.json"), "utf8"));

let failures = 0;
const ok = (m) => console.log("  ok:   " + m);
const fail = (m) => {
  failures++;
  console.error("  FAIL: " + m);
};

// --- 1. Identity / ownership invariants (TASK 7) ---------------------------
pkg.mcpName === server.name
  ? ok(`mcpName === server.json.name (${server.name})`)
  : fail(`mcpName (${pkg.mcpName}) !== server.json.name (${server.name})`);

server.name === "io.github.ecocitizenz/ecz-id-mcp-verifier"
  ? ok("Registry name exact")
  : fail(`Registry name unexpected: ${server.name}`);

server.version === pkg.version
  ? ok(`server.json version (${server.version}) === package version`)
  : fail(`server.json version ${server.version} != package ${pkg.version}`);

const npmPkg = (server.packages || []).find(
  (p) => p.registryType === "npm" && p.identifier === "@ecocitizenz/ecz-id-mcp-verifier"
);
npmPkg ? ok("npm identifier exact (@ecocitizenz/ecz-id-mcp-verifier)") : fail("npm identifier missing/wrong");
if (npmPkg) {
  npmPkg.version === pkg.version
    ? ok(`npm package version (${npmPkg.version}) matches`)
    : fail(`npm package version ${npmPkg.version} != ${pkg.version}`);
  npmPkg.transport && npmPkg.transport.type === "stdio"
    ? ok("transport stdio")
    : fail(`transport not stdio: ${npmPkg.transport && npmPkg.transport.type}`);
}

const transports = (server.packages || []).map((p) => p.transport && p.transport.type);
transports.length > 0 && transports.every((t) => t === "stdio")
  ? ok("no non-stdio / remote transport claimed")
  : fail(`non-stdio transport present: ${JSON.stringify(transports)}`);

Array.isArray(server.remotes) && server.remotes.length > 0
  ? fail("server.json claims a remote endpoint (none is deployed)")
  : ok("no remote endpoint claim");

const envReq = (server.packages || []).some(
  (p) =>
    Array.isArray(p.environmentVariables) &&
    p.environmentVariables.some((e) => e && (e.isRequired || e.isSecret))
);
envReq ? fail("server.json declares required/secret env vars (false requirement)") : ok("no false environment requirements");

const blob = JSON.stringify(server).toLowerCase();
/certif|approv|complian/.test(blob)
  ? fail("server.json text implies certification/approval/compliance")
  : ok("no certification/approval/compliance claim");

// --- 2. Live official-schema validation (TASK 7 option B) ------------------
const schemaUrl = server.$schema;
if (typeof schemaUrl !== "string" || !/^https:\/\//.test(schemaUrl)) {
  fail(`server.json $schema is not an https URL: ${String(schemaUrl)}`);
} else {
  try {
    const res = await fetch(schemaUrl, { redirect: "follow" });
    if (!res.ok) {
      fail(
        `could not fetch official schema (HTTP ${res.status}) at ${schemaUrl} — ` +
          `set server.json $schema to the CURRENT official server.schema.json URL`
      );
    } else {
      const schema = await res.json();
      const ajv = new Ajv2020({ allErrors: true, strict: false });
      addFormats(ajv);
      const validate = ajv.compile(schema);
      if (validate(server)) {
        ok(`server.json validates against official schema (${schemaUrl})`);
      } else {
        const errs = (validate.errors || [])
          .map((e) => `    ${e.instancePath || "(root)"} ${e.message}`)
          .join("\n");
        fail(`server.json does NOT validate against the official schema:\n${errs}`);
      }
    }
  } catch (e) {
    fail(`schema fetch/validate error at ${schemaUrl}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

if (failures) {
  console.error(`\n[validate-server-json] FAIL — ${failures} issue(s). Registry eligibility NOT proven.`);
  process.exit(1);
}
console.log("\n[validate-server-json] PASS — identity/ownership invariants + live official-schema validation green.");
