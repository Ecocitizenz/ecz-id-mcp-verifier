#!/usr/bin/env node
// ECZ-ID GOLDEN SEMANTIC SUITE
//
// Feeds deterministic Resolver fixtures through the canonical verifier core and
// the MCP tool path, and emits one normalised JSON document capturing the trust
// semantics that MUST NOT change across an SDK migration:
//
//   result_state · reason_codes · resolver_url · machine_json_url · policy_mode
//   · exit_code · privacy flags · routing fields · read-only boundary flags
//
// Network is never used: globalThis.fetch is replaced per scenario. The only
// non-deterministic field (timestamp) is normalised.
//
// Usage:  node scripts/golden-suite.mjs [outfile]
// Exit:   0 on success; non-zero if a scenario throws.

import { writeFileSync } from "node:fs";

const { verify } = await import("../dist/verify.js");
const { buildJsonOutput } = await import("../dist/output.js");
const { computeExitCode } = await import("../dist/exit-codes.js");
const { runCheckTarget, runRecheckResolver, runExplainResult } = await import(
  "../dist/mcp/tools.js"
);

const PARENT = "ECZ-GB-A93K7Q";
const OTHER = "ECZ-GB-ZZZZZZ";
const POLICIES = ["OPEN", "PREFER", "REQUIRE"];

// --------------------------------------------------------------------------
// Deterministic fetch control. `plan` is one of:
//   { status, body }        -> respond with that status/body
//   { throws: "message" }   -> simulate a transport failure
//   null                    -> fetch must NOT be called (asserted)
// --------------------------------------------------------------------------
const realFetch = globalThis.fetch;
let calls = [];

function install(plan) {
  calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({
      url: String(url),
      method: init?.method ?? "GET",
      hasBody: init?.body !== undefined && init?.body !== null
    });
    if (plan === null) throw new Error("GOLDEN-VIOLATION: network attempted");
    if (plan.throws) throw new Error(plan.throws);
    const b = typeof plan.body === "string" ? plan.body : JSON.stringify(plan.body);
    return new Response(b, { status: plan.status });
  };
}
function restore() {
  globalThis.fetch = realFetch;
}

// --------------------------------------------------------------------------
// Scenarios — every state named in the Phase 1 brief §10, plus the strict
// non-proof interpretations that must never become positive proof.
// --------------------------------------------------------------------------
const SCENARIOS = [
  { id: "active", target: PARENT, expect: "RESOLVER_VERIFIABLE",
    plan: { status: 200, body: { ecz_id: PARENT, status: "active", trust_assertion: { revoked: false } } } },

  { id: "not_found", target: PARENT, expect: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
    plan: { status: 404, body: { error: "not found" } } },

  { id: "gone", target: PARENT, expect: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
    plan: { status: 410, body: { error: "gone" } } },

  { id: "stale_degraded", target: PARENT, expect: "DEGRADED",
    plan: { status: 200, body: { ecz_id: PARENT, status: "stale" } } },

  { id: "degraded", target: PARENT, expect: "DEGRADED",
    plan: { status: 200, body: { ecz_id: PARENT, status: "degraded" } } },

  { id: "pulseguard_stale", target: PARENT, expect: "DEGRADED",
    plan: { status: 200, body: { ecz_id: PARENT, status: "active", pulseguard: { overall_validity: "STALE" } } } },

  { id: "mismatch_proof_invalid", target: PARENT, expect: "MISMATCH",
    plan: { status: 200, body: { ecz_id: PARENT, verification_state: "PROOF_INVALID" } } },

  { id: "mismatch_target", target: PARENT, expect: "MISMATCH",
    plan: { status: 200, body: { ecz_id: OTHER, status: "active" } } },

  { id: "mismatch_abuse", target: PARENT, expect: "MISMATCH",
    plan: { status: 200, body: { ecz_id: PARENT, status: "abuse_flagged" } } },

  { id: "expired", target: PARENT, expect: "EXPIRED",
    plan: { status: 200, body: { ecz_id: PARENT, status: "expired" } } },

  { id: "suspended", target: PARENT, expect: "SUSPENDED",
    plan: { status: 200, body: { ecz_id: PARENT, status: "suspended" } } },

  { id: "revoked_status", target: PARENT, expect: "REVOKED",
    plan: { status: 200, body: { ecz_id: PARENT, status: "revoked" } } },

  { id: "revoked_assertion", target: PARENT, expect: "REVOKED",
    plan: { status: 200, body: { ecz_id: PARENT, status: "active", trust_assertion: { revoked: true } } } },

  { id: "malformed_body", target: PARENT, expect: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
    plan: { status: 200, body: "<<not json>>" } },

  { id: "schema_mismatch", target: PARENT, expect: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
    plan: { status: 200, body: { error: "no ecz_id here" } } },

  { id: "unknown_lifecycle", target: PARENT, expect: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
    plan: { status: 200, body: { ecz_id: PARENT, note: "recognised but no lifecycle signal" } } },

  { id: "server_error", target: PARENT, expect: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
    plan: { status: 503, body: { error: "unavailable" } } },

  { id: "network_failure", target: PARENT, expect: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
    plan: { throws: "simulated transport failure" } },

  { id: "unsupported_target", target: "not a supported target !!", expect: "UNSUPPORTED_TARGET",
    plan: null },

  { id: "offline_zero_egress", target: PARENT, expect: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
    plan: null, offline: true },

  { id: "offline_url_target", target: "https://example.com", expect: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
    plan: null, offline: true }
];

// --------------------------------------------------------------------------
// Normalisation — strip the only non-deterministic field.
// --------------------------------------------------------------------------
const TS = "<normalised>";
function normalise(v) {
  if (Array.isArray(v)) return v.map(normalise);
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      out[k] = k === "timestamp" || k === "checked_at" ? TS : normalise(val);
    }
    return out;
  }
  return v;
}

// --------------------------------------------------------------------------
// Run
// --------------------------------------------------------------------------
const results = [];
let violations = [];

for (const sc of SCENARIOS) {
  for (const policy of POLICIES) {
    install(sc.plan);
    let core, mcp, err = null;
    try {
      const r = await verify({
        target: sc.target,
        policy,
        noNetwork: sc.offline === true
      });
      const exit_code = computeExitCode(r.result_state, r.policy_mode, {
        network_attempted_and_failed: r.network_attempted && Boolean(r.network_error)
      });
      core = normalise(buildJsonOutput(r, { exit_code }));

      // Same fixture through the MCP tool path — must agree.
      mcp = normalise(
        await runCheckTarget({ target: sc.target, policy, offline: sc.offline === true })
      );
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
    const observedCalls = calls.slice();
    restore();

    if (err) violations.push(`${sc.id}/${policy}: threw ${err}`);
    if (core && core.result_state !== sc.expect) {
      violations.push(`${sc.id}/${policy}: result_state ${core.result_state} != expected ${sc.expect}`);
    }
    if (sc.offline === true && observedCalls.length > 0) {
      violations.push(`${sc.id}/${policy}: OFFLINE PERFORMED NETWORK (${observedCalls.length} call(s))`);
    }
    for (const c of observedCalls) {
      if (c.method !== "GET") violations.push(`${sc.id}/${policy}: non-GET Resolver call (${c.method})`);
      if (c.hasBody) violations.push(`${sc.id}/${policy}: Resolver call carried a body`);
      if (!c.url.startsWith("https://")) violations.push(`${sc.id}/${policy}: non-HTTPS Resolver call (${c.url})`);
    }

    results.push({
      scenario: sc.id,
      policy,
      offline: sc.offline === true,
      error: err,
      network: { calls: observedCalls.length, methods: [...new Set(observedCalls.map(c => c.method))] },
      core,
      mcp_agrees: core && mcp ? JSON.stringify(core) === JSON.stringify(mcp) : null
    });
  }
}

// Deterministic non-network tool: ecz_explain_result over every canonical code.
install(null);
const { REASON_CODES } = await import("../dist/reason-codes.js");
const { RESULT_STATES } = await import("../dist/result-states.js");
const explain = normalise(
  runExplainResult({ reason_codes: [...REASON_CODES, "NOT_A_REAL_CODE"], result_state: "RESOLVER_VERIFIABLE" })
);
const explainAllStates = RESULT_STATES.map(s =>
  normalise(runExplainResult({ reason_codes: [], result_state: s }))
);
// Resolver re-check tool on a deterministic offline path.
const recheck = normalise(await runRecheckResolver({ target: PARENT, offline: true }));
if (calls.length > 0) violations.push("explain/recheck offline path performed network");
restore();

const doc = {
  suite: "ecz-id-golden-semantic-v1",
  verifier_version: (await import("../dist/constants.js")).VERIFIER_VERSION,
  counts: {
    scenarios: SCENARIOS.length,
    policies: POLICIES.length,
    rows: results.length,
    result_states: RESULT_STATES.length,
    reason_codes: REASON_CODES.length
  },
  canonical_result_states: [...RESULT_STATES],
  canonical_reason_codes: [...REASON_CODES],
  rows: results,
  explain_all_codes: explain,
  explain_each_state: explainAllStates,
  recheck_offline: recheck
};

const out = process.argv[2] ?? "golden.json";
writeFileSync(out, JSON.stringify(doc, null, 2) + "\n", "utf8");

const mcpDisagree = results.filter(r => r.mcp_agrees === false).length;
if (mcpDisagree > 0) violations.push(`${mcpDisagree} row(s): MCP tool path disagrees with core`);

console.log(`golden-suite: ${results.length} rows -> ${out}`);
console.log(`  result_states=${RESULT_STATES.length} reason_codes=${REASON_CODES.length}`);
if (violations.length) {
  console.error(`GOLDEN VIOLATIONS (${violations.length}):`);
  for (const v of violations) console.error("  - " + v);
  process.exit(1);
}
console.log("golden-suite: OK (no violations)");
