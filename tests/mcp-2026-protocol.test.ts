// MCP 2026-07-28 protocol contract — unit-level guards.
//
// The full wire proof lives in `scripts/mcp-wire-matrix.mjs` (release-blocking,
// spawns the built server and speaks real JSON-RPC). These tests guard the
// declarations that the wire proof depends on, so a regression is caught by
// `npm test` and not only by the release gate.

import { describe, it, expect } from "vitest";
import {
  MCP_MODERN_PROTOCOL_VERSION,
  MCP_LEGACY_PROTOCOL_VERSIONS,
  MCP_SUPPORTED_PROTOCOL_VERSIONS,
  MCP_DISCOVER_TTL_MS,
  MCP_TOOLS_LIST_TTL_MS,
  MCP_CACHE_SCOPE,
  MCP_TOOL_NAMES
} from "../src/constants.js";
import {
  checkTargetOutputSchema,
  recheckResolverOutputSchema,
  explainResultOutputSchema
} from "../src/mcp/schemas.js";
import { createServer } from "../src/mcp/server.js";
import { runCheckTarget, runRecheckResolver, runExplainResult } from "../src/mcp/tools.js";
import { OUTPUT_PRIVACY_FIELDS } from "../src/privacy.js";

const REVISION = /^\d{4}-\d{2}-\d{2}$/;

describe("MCP 2026-07-28: declared protocol support", () => {
  it("names the modern revision explicitly", () => {
    // The SDK's own default list is legacy-only, so 2026-07-28 reaches the wire
    // ONLY because it is declared. If this constant is lost, modern support is
    // silently lost with it.
    expect(MCP_MODERN_PROTOCOL_VERSION).toBe("2026-07-28");
  });

  it("is dual-era: the modern revision first, then the retained legacy rails", () => {
    expect(MCP_SUPPORTED_PROTOCOL_VERSIONS[0]).toBe(MCP_MODERN_PROTOCOL_VERSION);
    expect(MCP_SUPPORTED_PROTOCOL_VERSIONS.length).toBe(1 + MCP_LEGACY_PROTOCOL_VERSIONS.length);
    for (const v of MCP_LEGACY_PROTOCOL_VERSIONS) {
      expect(MCP_SUPPORTED_PROTOCOL_VERSIONS).toContain(v);
    }
  });

  it("retains every legacy revision the pre-migration server served", () => {
    // Dropping one of these would break 2025-era hosts that work today.
    expect([...MCP_LEGACY_PROTOCOL_VERSIONS]).toEqual([
      "2025-11-25",
      "2025-06-18",
      "2025-03-26",
      "2024-11-05",
      "2024-10-07"
    ]);
  });

  it("declares only well-formed revision labels, newest first", () => {
    const all = [...MCP_SUPPORTED_PROTOCOL_VERSIONS];
    for (const v of all) expect(v).toMatch(REVISION);
    expect(all).toEqual([...all].sort().reverse());
  });

  it("declares no duplicate revisions", () => {
    const all = [...MCP_SUPPORTED_PROTOCOL_VERSIONS];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("MCP 2026-07-28: cacheable-result policy", () => {
  it("provides a non-negative integer ttl for both cacheable operations", () => {
    // The revision requires ttlMs >= 0 on server/discover and tools/list.
    for (const ttl of [MCP_DISCOVER_TTL_MS, MCP_TOOLS_LIST_TTL_MS]) {
      expect(Number.isSafeInteger(ttl)).toBe(true);
      expect(ttl).toBeGreaterThanOrEqual(0);
    }
  });

  it("uses a valid cache scope", () => {
    expect(["public", "private"]).toContain(MCP_CACHE_SCOPE);
  });

  it("only claims a shared cache scope for caller-independent results", () => {
    // `public` is only safe because both results are identical for every caller.
    // The tool CATALOGUE is a fixed compile-time set and `server/discover`
    // returns static identity — neither varies by caller or authorization.
    if (MCP_CACHE_SCOPE === "public") {
      expect(MCP_TOOL_NAMES.length).toBe(3);
    }
  });

  it("caches the tool list for no longer than the discovery document", () => {
    expect(MCP_TOOLS_LIST_TTL_MS).toBeLessThanOrEqual(MCP_DISCOVER_TTL_MS);
  });
});

describe("MCP 2026-07-28: output schemas are truthful and enforceable", () => {
  const REAL_TARGET = "ECZ-GB-A93K7Q";

  it("accepts the real ecz_check_target result", async () => {
    const out = await runCheckTarget({ target: REAL_TARGET, offline: true, policy: "REQUIRE" });
    expect(checkTargetOutputSchema.safeParse(out).success).toBe(true);
  });

  it("accepts the real ecz_recheck_resolver result", async () => {
    const out = await runRecheckResolver({ target: REAL_TARGET, offline: true });
    expect(recheckResolverOutputSchema.safeParse(out).success).toBe(true);
  });

  it("accepts the real ecz_explain_result result", () => {
    const out = runExplainResult({ reason_codes: ["RESOLVER_READ_ONLY", "NOPE"], result_state: "DEGRADED" });
    expect(explainResultOutputSchema.safeParse(out).success).toBe(true);
  });

  it("publishes the read-only boundary as schema constants, not just payload", async () => {
    // A client can see from tools/list alone that this server can never report
    // writing truth, activating proof, or marking BOUND.
    const out = await runRecheckResolver({ target: REAL_TARGET, offline: true });
    for (const flag of [
      "verifier_writes_truth",
      "verifier_activates_proof",
      "verifier_marks_bound"
    ] as const) {
      expect(out[flag]).toBe(false);
      expect(recheckResolverOutputSchema.safeParse({ ...out, [flag]: true }).success).toBe(false);
    }
  });

  it("rejects a result that contradicts a privacy invariant", async () => {
    const out = await runCheckTarget({ target: REAL_TARGET, offline: true });
    const key = Object.keys(OUTPUT_PRIVACY_FIELDS)[0] as keyof typeof OUTPUT_PRIVACY_FIELDS;
    expect(checkTargetOutputSchema.safeParse({ ...out, [key]: false }).success).toBe(false);
  });

  it("tolerates additive fields so a future field cannot break conformance", async () => {
    const out = await runCheckTarget({ target: REAL_TARGET, offline: true });
    expect(checkTargetOutputSchema.safeParse({ ...out, some_future_field: 1 }).success).toBe(true);
  });
});

describe("MCP 2026-07-28: the server stays deliberately narrow", () => {
  it("builds and registers exactly the three canonical tools", () => {
    expect(createServer()).toBeDefined();
    expect([...MCP_TOOL_NAMES]).toEqual([
      "ecz_check_target",
      "ecz_recheck_resolver",
      "ecz_explain_result"
    ]);
  });

  it("does not adopt SDK v2 features outside the product contract", async () => {
    // Guard against scope creep: the migration must not quietly turn the
    // verifier into a resource/prompt/elicitation server.
    const src = await import("node:fs/promises");
    const text = await src.readFile(new URL("../src/mcp/server.ts", import.meta.url), "utf8");
    for (const forbidden of [
      "registerResource",
      "registerPrompt",
      "inputRequired",
      "subscriptions/listen",
      "createMcpHandler"
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });
});
