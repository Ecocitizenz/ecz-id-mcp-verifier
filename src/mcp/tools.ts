// ECZ-ID MCP server tools. Exactly three, all read-only, all calling the one
// canonical verifier core. No tool writes truth, activates proof, marks BOUND,
// issues an ECZ-ID, creates entitlement or checkout, manufactures Resolver
// proof, certifies safety/approval/compliance, decides a global allow/deny,
// or emits telemetry. External content (target strings, Resolver responses,
// error text) is treated as data, never as instructions.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { verify } from "../verify.js";
import { buildJsonOutput, toJson, type JsonOutput } from "../output.js";
import { computeExitCode } from "../exit-codes.js";
import { REASON_CODES, type ReasonCode } from "../reason-codes.js";
import { RESULT_STATES, type ResultState } from "../result-states.js";
import {
  checkTargetShape,
  recheckResolverShape,
  explainResultShape
} from "./schemas.js";

export const TOOL_NAMES = [
  "ecz_check_target",
  "ecz_recheck_resolver",
  "ecz_explain_result"
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

interface TextResult {
  content: { type: "text"; text: string }[];
}

function asText(value: unknown): TextResult {
  return { content: [{ type: "text" as const, text: toJson(value) }] };
}

// ---------------------------------------------------------------------------
// 1. ecz_check_target — canonical verifier result contract, verbatim.
// ---------------------------------------------------------------------------

export interface CheckTargetArgs {
  target: string;
  target_type?: string;
  policy?: "OPEN" | "PREFER" | "REQUIRE";
  offline?: boolean;
}

export async function runCheckTarget(args: CheckTargetArgs): Promise<JsonOutput> {
  const result = await verify({
    target: args.target,
    targetType: args.target_type === "auto" ? undefined : args.target_type,
    policy: args.policy,
    noNetwork: args.offline === true
  });
  // REQUIRE under missing proof returns a fail-closed exit code inside the
  // structured result. It is never thrown — the session must not crash.
  const exit_code = computeExitCode(result.result_state, result.policy_mode, {
    network_attempted_and_failed: result.network_attempted && Boolean(result.network_error)
  });
  return buildJsonOutput(result, { exit_code });
}

// ---------------------------------------------------------------------------
// 2. ecz_recheck_resolver — read-only public Resolver re-check (canonical
//    client via verify(), OPEN so the projection stays informational).
// ---------------------------------------------------------------------------

export interface RecheckResolverArgs {
  target: string;
  offline?: boolean;
}

export interface ResolverRecheck {
  type: "ecz.resolver_recheck";
  target: string;
  target_type: string;
  result_state: string;
  reason_codes: string[];
  resolver_url: string | null;
  machine_json_url: string | null;
  network_attempted: boolean;
  // Read-only boundary — identical to the canonical contract.
  recheck_before_reliance: true;
  local_policy_decides: true;
  verifier_writes_truth: false;
  verifier_activates_proof: false;
  verifier_marks_bound: false;
  no_safety_or_approval_inference: true;
  no_telemetry: true;
}

export async function runRecheckResolver(args: RecheckResolverArgs): Promise<ResolverRecheck> {
  const result = await verify({
    target: args.target,
    policy: "OPEN",
    noNetwork: args.offline === true
  });
  return {
    type: "ecz.resolver_recheck",
    target: result.target,
    target_type: result.target_type,
    result_state: result.result_state,
    reason_codes: [...result.reason_codes],
    resolver_url: result.resolver_url,
    machine_json_url: result.machine_json_url,
    network_attempted: result.network_attempted,
    recheck_before_reliance: true,
    local_policy_decides: true,
    verifier_writes_truth: false,
    verifier_activates_proof: false,
    verifier_marks_bound: false,
    no_safety_or_approval_inference: true,
    no_telemetry: true
  };
}

// ---------------------------------------------------------------------------
// 3. ecz_explain_result — public-safe explanations of EXISTING canonical
//    states/reason codes. Neutral by construction: no new state or code, no
//    global allow/deny decision, no safety/approval/compliance verdict.
// ---------------------------------------------------------------------------

const STATE_EXPLANATIONS: Record<ResultState, string> = {
  RESOLVER_VERIFIABLE:
    "Public Resolver proof was found for this target. Informational only; re-check before reliance and let local policy decide.",
  NO_PUBLIC_RESOLVER_PROOF_FOUND:
    "No public Resolver proof was found yet. This does not indicate a problem with the target; it only means no public proof is published. Local policy decides.",
  PARTIAL_PUBLIC_PROOF_FOUND:
    "Some, but not all, expected public proof was found. Informational only; local policy decides.",
  SETUP_REQUIRED:
    "Public proof would require the operator to complete setup. Routing-only; the verifier never completes setup.",
  CHALLENGE_ISSUED: "A public verification challenge is outstanding. Informational only.",
  OBSERVED: "The target was observed without full public proof. Informational only.",
  DEGRADED:
    "The public proof projection is degraded (for example stale). Treated as missing proof for re-check purposes; never as positive proof.",
  MISMATCH:
    "Observed public attributes did not match the expected proof. Informational only; not a safety verdict.",
  EXPIRED: "A previously published proof posture has expired. Lifecycle posture only.",
  SUSPENDED: "A previously published proof posture is suspended. Lifecycle posture only.",
  REVOKED: "A previously published proof posture is revoked. Lifecycle posture only.",
  NOT_APPLICABLE: "Public Resolver proof is not applicable to this target shape. Informational only.",
  UNSUPPORTED_TARGET:
    "This target shape is not supported for public Resolver proof. No network lookup is performed.",
  LEGACY_ALIAS_NOT_ACTIVE_SKU:
    "The target resolves to a legacy alias that is not an active product. Routing-only.",
  REJECTED_PRODUCT_NOT_SELLABLE:
    "The target maps to a product that is not currently sellable. Routing-only.",
  DEFERRED_PRODUCT_NOT_SELLABLE:
    "The target maps to a product that is deferred and not currently sellable. Routing-only.",
  PARENT_UPGRADE_REQUIRED: "A parent upgrade would be required before proof applies. Routing-only.",
  UNKNOWN_PHASE1_SKU: "The target maps to an unknown identifier. Routing-only."
};

const REASON_EXPLANATIONS: Record<ReasonCode, string> = {
  NO_PUBLIC_RESOLVER_PROOF_FOUND:
    "No public Resolver proof was found yet. Not a problem signal; local policy decides.",
  OPERATOR_PROOF_NOT_FOUND: "No public operator proof was found yet.",
  ORIGIN_PROOF_NOT_FOUND: "No public origin proof was found yet.",
  MANIFEST_NOT_FOUND: "No public manifest was found at the expected location.",
  MANIFEST_HASH_MISMATCH: "The manifest content did not match the expected published value.",
  AGENT_CREDENTIAL_NOT_FOUND: "No public agent credential proof was found yet.",
  AGENT_CREDENTIAL_REUSED: "An agent credential appeared to be reused. Informational only.",
  API_PASSPORT_NOT_FOUND: "No public API passport proof was found yet.",
  API_PASSPORT_MISMATCH: "The API passport did not match the expected published value.",
  IDENTITY_CONTINUITY_NOT_FOUND: "No public identity-continuity proof was found yet.",
  SOFTWARE_SUPPLY_CHAIN_PROOF_NOT_FOUND: "No public software supply-chain proof was found yet.",
  PACKAGE_OWNERSHIP_CHANGED: "Published package ownership appears to have changed. Informational only.",
  REPO_TRANSFER_DETECTED: "A repository transfer was observed. Informational only.",
  CONTAINER_DIGEST_CHANGED: "The container digest changed from the expected published value.",
  KEYSET_HASH_MISMATCH: "A key-set hash did not match the expected published value.",
  PULSEGUARD_STALE: "The freshness signal is stale; treated as missing proof for re-check.",
  REVOKED_PARENT: "A parent posture is revoked. Lifecycle posture only.",
  REVOKED_AGENT_CREDENTIAL: "An agent credential is revoked. Lifecycle posture only.",
  SUSPENDED_API_PASSPORT: "An API passport is suspended. Lifecycle posture only.",
  DECLARED_PARENT_CANNOT_ACTIVATE: "A declared parent cannot activate proof. The verifier never activates proof.",
  PARENT_UPGRADE_REQUIRED: "A parent upgrade would be required. Routing-only.",
  LEGACY_ALIAS_NOT_ACTIVE_SKU: "The target is a legacy alias, not an active product. Routing-only.",
  REJECTED_PRODUCT_NOT_SELLABLE: "The mapped product is not currently sellable. Routing-only.",
  DEFERRED_PRODUCT_NOT_SELLABLE: "The mapped product is deferred and not currently sellable. Routing-only.",
  SHOPIFY_CANNOT_ACTIVATE_PROOF: "Setup surfaces cannot activate proof. The verifier never activates proof.",
  TRUSTOPS_CANNOT_MARK_BOUND: "Setup surfaces cannot mark BOUND. The verifier never marks BOUND.",
  RESOLVER_READ_ONLY: "The Resolver is read-only. The verifier only reads public proof; it never writes truth.",
  RESOLVER_RESPONSE_UNVERIFIABLE:
    "A Resolver response could not be safely interpreted as valid proof; treated as missing proof, never as positive proof.",
  MARKETPLACE_CHECKOUT_NOT_ALLOWED: "The verifier does not perform checkout. Routing-only.",
  LOCAL_POLICY_DECIDES: "The caller's local policy decides what to do with this result.",
  UNKNOWN_PHASE1_SKU: "The target maps to an unknown identifier. Routing-only."
};

const NEUTRAL_UNKNOWN =
  "Unrecognised code; no canonical explanation. Not a decision and not a safety verdict.";

export interface ExplainResultArgs {
  reason_codes?: string[];
  result_state?: string;
}

export interface ExplainEntry {
  code: string;
  recognized: boolean;
  explanation: string;
}

export interface ExplainOutput {
  type: "ecz.result_explanation";
  result_state: { state: string; recognized: boolean; explanation: string } | null;
  reason_codes: ExplainEntry[];
  // Universal read-only framing. Never a decision.
  no_global_decision: true;
  no_safety_or_approval_inference: true;
  local_policy_decides: true;
  recheck_before_reliance: true;
}

export function runExplainResult(args: ExplainResultArgs): ExplainOutput {
  const codes = Array.isArray(args.reason_codes) ? args.reason_codes : [];
  const reason_codes: ExplainEntry[] = codes.map((c) => {
    const recognized = (REASON_CODES as readonly string[]).includes(c);
    return {
      code: c,
      recognized,
      explanation: recognized ? REASON_EXPLANATIONS[c as ReasonCode] : NEUTRAL_UNKNOWN
    };
  });

  let stateBlock: ExplainOutput["result_state"] = null;
  if (typeof args.result_state === "string" && args.result_state.length > 0) {
    const recognized = (RESULT_STATES as readonly string[]).includes(args.result_state);
    stateBlock = {
      state: args.result_state,
      recognized,
      explanation: recognized ? STATE_EXPLANATIONS[args.result_state as ResultState] : NEUTRAL_UNKNOWN
    };
  }

  return {
    type: "ecz.result_explanation",
    result_state: stateBlock,
    reason_codes,
    no_global_decision: true,
    no_safety_or_approval_inference: true,
    local_policy_decides: true,
    recheck_before_reliance: true
  };
}

// ---------------------------------------------------------------------------
// Registration — exactly three read-only tools.
// ---------------------------------------------------------------------------

export function registerTools(server: McpServer): void {
  server.registerTool(
    "ecz_check_target",
    {
      title: "Check a target's public ECZ-ID posture",
      description:
        "Read-only. Returns the canonical ECZ-ID verifier result contract for a target (result_state, reason_codes, routing, and read-only boundary flags). Does not write truth, activate proof, mark BOUND, or decide global allow/deny. Local policy decides.",
      inputSchema: checkTargetShape,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
        destructiveHint: false,
        idempotentHint: true
      }
    },
    async (args) => asText(await runCheckTarget(args as CheckTargetArgs))
  );

  server.registerTool(
    "ecz_recheck_resolver",
    {
      title: "Re-check the public Resolver",
      description:
        "Read-only public Resolver re-check using the canonical Resolver client (GET only). Returns the current public proof projection with recheck_before_reliance. Never writes truth or activates proof.",
      inputSchema: recheckResolverShape,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
        destructiveHint: false,
        idempotentHint: true
      }
    },
    async (args) => asText(await runRecheckResolver(args as RecheckResolverArgs))
  );

  server.registerTool(
    "ecz_explain_result",
    {
      title: "Explain canonical result_state and reason_codes",
      description:
        "Read-only. Returns public-safe explanations for existing canonical result_state and reason_codes. Invents no new states or codes and emits no global allow/deny decision.",
      inputSchema: explainResultShape,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
        idempotentHint: true
      }
    },
    async (args) => asText(runExplainResult(args as ExplainResultArgs))
  );
}
