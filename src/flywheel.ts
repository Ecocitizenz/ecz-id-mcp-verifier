// Flywheel builders for the ECZ-ID Action Envelope Stack.
//
// Route-only, read-only guidance objects. These builders never write truth,
// never activate proof, never mark BOUND, never process purchase, and never
// emit background reporting. They derive purely from a VerifyResult and the
// canonical constants.
//
// Stack:
//   1. Resolver Action Envelope  (universal public proof/action metadata)
//   2. MCP Action Envelope       (MCP/tool/server posture path)
//   3. Agent Action Envelope     (agent/KYA/operator/principal path)
//   4. Reciprocal Reliance Env.  (both-sides agent <-> MCP context)
// Plus the Request-to-Resolve local guidance packet.

import type { VerifyResult } from "./verify.js";
import type { TargetType } from "./classify-target.js";
import type { ResultState } from "./result-states.js";
import type { ReasonCode } from "./reason-codes.js";
import type { PolicyMode } from "./policy.js";
import { buildAcquisitionFlow } from "./acquisition-flow.js";

export const FLYWHEEL_VERSION = "1.0" as const;

// Exact approved Request-to-Resolve message. The only place the bare word
// "unsafe" appears is the sanctioned phrase "This does not mean unsafe".
export const REQUEST_TO_RESOLVE_MESSAGE =
  "No public resolver proof found yet. This does not mean unsafe. " +
  "Resolver-verifiable proof may make this easier to review. Local policy decides.";

export const AUTHORITY_BOUNDARY =
  "Backend writes truth. TrustOps handles setup. Resolver proves. Machines re-check.";

export const SHARE_LABEL = "Share resolver guidance";
export const OPERATOR_LABEL = "Open TrustOps setup if you operate this target";

// ---------------------------------------------------------------------------
// Target-type projection used by the Request-to-Resolve packet.
// ---------------------------------------------------------------------------

export type PacketTargetType =
  | "mcp_server"
  | "agent"
  | "api"
  | "domain"
  | "repo"
  | "package"
  | "shopify_store"
  | "unknown";

export function toPacketTargetType(t: TargetType): PacketTargetType {
  switch (t) {
    case "mcp_server":
      return "mcp_server";
    case "agent_manifest":
      return "agent";
    case "api_url":
      return "api";
    case "github_repo":
      return "repo";
    case "npm_package":
    case "pypi_package":
    case "container_image":
      return "package";
    case "ecz_id":
    case "unsupported_target":
    default:
      return "unknown";
  }
}

// ---------------------------------------------------------------------------
// State helpers (read-only classification, never a safety verdict).
// ---------------------------------------------------------------------------

const DEGRADED_OR_LIFECYCLE: ReadonlySet<ResultState> = new Set([
  "MISMATCH",
  "DEGRADED",
  "REVOKED",
  "SUSPENDED",
  "EXPIRED"
]);

const NOT_ROUTABLE: ReadonlySet<ResultState> = new Set([
  "UNSUPPORTED_TARGET",
  "LEGACY_ALIAS_NOT_ACTIVE_SKU",
  "REJECTED_PRODUCT_NOT_SELLABLE",
  "DEFERRED_PRODUCT_NOT_SELLABLE",
  "PARENT_UPGRADE_REQUIRED",
  "UNKNOWN_PHASE1_SKU"
]);

export function isResolved(state: ResultState): boolean {
  return state === "RESOLVER_VERIFIABLE";
}

function recommendedPath(state: ResultState): string {
  if (isResolved(state)) return "view_resolver_proof";
  if (DEGRADED_OR_LIFECYCLE.has(state)) return "repair_resolver_posture";
  if (NOT_ROUTABLE.has(state)) return "view_developer_guidance";
  return "improve_resolver_posture";
}

// ---------------------------------------------------------------------------
// Shared boundary block. Identical, read-only, on every envelope.
// ---------------------------------------------------------------------------

interface BoundaryFlags {
  authority_boundary: string;
  local_policy_decides: true;
  recheck_before_reliance: true;
  no_safety_or_approval_inference: true;
  verifier_writes_truth: false;
  verifier_activates_proof: false;
  verifier_marks_bound: false;
}

const BOUNDARY: BoundaryFlags = {
  authority_boundary: AUTHORITY_BOUNDARY,
  local_policy_decides: true,
  recheck_before_reliance: true,
  no_safety_or_approval_inference: true,
  verifier_writes_truth: false,
  verifier_activates_proof: false,
  verifier_marks_bound: false
};

export interface RouteAction {
  label: string;
  kind: "route" | "recheck";
  url: string | null;
}

function flowFor(result: VerifyResult) {
  return buildAcquisitionFlow({
    target: result.target,
    target_type: result.target_type,
    result_state: result.result_state,
    reason_codes: result.reason_codes,
    policy_mode: result.policy_mode,
    operator: result.operator,
    resolver_url: result.resolver_url,
    machine_json_url: result.machine_json_url,
    trustops_base_url: result.trustops_base_url,
    developer_base_url: result.developer_base_url
  });
}

function routeActions(
  result: VerifyResult,
  trustopsUrl: string,
  developerUrl: string
): RouteAction[] {
  const actions: RouteAction[] = [];
  if (!isResolved(result.result_state)) {
    actions.push({ label: OPERATOR_LABEL, kind: "route", url: trustopsUrl });
    actions.push({ label: SHARE_LABEL, kind: "route", url: developerUrl });
  } else {
    actions.push({ label: "View Resolver guidance", kind: "route", url: developerUrl });
  }
  actions.push({ label: "Re-check before reliance", kind: "recheck", url: result.resolver_url });
  return actions;
}

// ---------------------------------------------------------------------------
// 2. MCP Action Envelope
// ---------------------------------------------------------------------------

export interface McpActionEnvelope extends BoundaryFlags {
  type: "ecz.mcp_action_envelope";
  version: typeof FLYWHEEL_VERSION;
  subject: { target: string; target_type: TargetType };
  posture: ResultState;
  result: ResultState;
  missing_evidence: ReasonCode[];
  recommended_path: string;
  actions: RouteAction[];
  trustops_action_url: string;
  developer_guidance_url: string;
  resolver_url: string | null;
  machine_json_url: string | null;
}

export function buildMcpActionEnvelope(result: VerifyResult): McpActionEnvelope | null {
  if (result.target_type !== "mcp_server") return null;
  const flow = flowFor(result);
  return {
    type: "ecz.mcp_action_envelope",
    version: FLYWHEEL_VERSION,
    subject: { target: result.target, target_type: result.target_type },
    posture: result.result_state,
    result: result.result_state,
    missing_evidence: isResolved(result.result_state) ? [] : [...result.reason_codes],
    recommended_path: recommendedPath(result.result_state),
    actions: routeActions(result, flow.trustops_action_url, flow.developer_guidance_url),
    trustops_action_url: flow.trustops_action_url,
    developer_guidance_url: flow.developer_guidance_url,
    resolver_url: result.resolver_url,
    machine_json_url: result.machine_json_url,
    ...BOUNDARY
  };
}

// ---------------------------------------------------------------------------
// 3. Agent Action Envelope (agent/KYA posture path)
// ---------------------------------------------------------------------------

export interface AgentActionEnvelope extends BoundaryFlags {
  type: "ecz.agent_action_envelope";
  version: typeof FLYWHEEL_VERSION;
  subject: { target: string; target_type: TargetType };
  posture: ResultState;
  result: ResultState;
  missing_evidence: ReasonCode[];
  recommended_path: string;
  actions: RouteAction[];
  trustops_action_url: string;
  developer_guidance_url: string;
  resolver_url: string | null;
  machine_json_url: string | null;
}

export function buildAgentActionEnvelope(result: VerifyResult): AgentActionEnvelope | null {
  if (result.target_type !== "agent_manifest") return null;
  const flow = flowFor(result);
  return {
    type: "ecz.agent_action_envelope",
    version: FLYWHEEL_VERSION,
    subject: { target: result.target, target_type: result.target_type },
    posture: result.result_state,
    result: result.result_state,
    missing_evidence: isResolved(result.result_state) ? [] : [...result.reason_codes],
    recommended_path: recommendedPath(result.result_state),
    actions: routeActions(result, flow.trustops_action_url, flow.developer_guidance_url),
    trustops_action_url: flow.trustops_action_url,
    developer_guidance_url: flow.developer_guidance_url,
    resolver_url: result.resolver_url,
    machine_json_url: result.machine_json_url,
    ...BOUNDARY
  };
}

// ---------------------------------------------------------------------------
// Request-to-Resolve local guidance packet
// ---------------------------------------------------------------------------

export interface RequestToResolve {
  type: "ecz.request_to_resolve";
  version: typeof FLYWHEEL_VERSION;
  target: string;
  target_type: PacketTargetType;
  state: string;
  reason_codes: string[];
  message: string;
  share_label: string;
  operator_label: string;
  trustops_url: string;
  developer_guidance_url: string;
  ttl_hint: "generated_locally_no_server_claim";
  signed_request: false;
  server_side_status: "not_created_by_cli";
}

export function buildRequestToResolve(result: VerifyResult): RequestToResolve | null {
  // Only meaningful when there is no public resolver proof yet and the target
  // is a supported shape. Never claimed signed or server-rate-limited locally.
  if (isResolved(result.result_state)) return null;
  if (result.target_type === "unsupported_target") return null;
  return {
    type: "ecz.request_to_resolve",
    version: FLYWHEEL_VERSION,
    target: result.target,
    target_type: toPacketTargetType(result.target_type),
    state: result.result_state,
    reason_codes: [...result.reason_codes],
    message: REQUEST_TO_RESOLVE_MESSAGE,
    share_label: SHARE_LABEL,
    operator_label: OPERATOR_LABEL,
    trustops_url: result.trustops_base_url,
    developer_guidance_url: result.developer_base_url,
    ttl_hint: "generated_locally_no_server_claim",
    signed_request: false,
    server_side_status: "not_created_by_cli"
  };
}

// ---------------------------------------------------------------------------
// 4. Reciprocal Reliance Envelope (both-sides context, read-only)
// ---------------------------------------------------------------------------

export interface ReciprocalSubject {
  target: string;
  target_type: TargetType;
  posture: ResultState;
}

export interface ReciprocalRelianceEnvelope extends BoundaryFlags {
  type: "ecz.reciprocal_reliance_envelope";
  version: typeof FLYWHEEL_VERSION;
  agent_subject: ReciprocalSubject | null;
  mcp_subject: ReciprocalSubject | null;
  policy_hint: PolicyMode;
  recommended_posture_paths: string[];
  // ECZ-ID never decides whether an agent may spend, transact, or call tools.
  external_authorisation: "not_determined_by_eczid";
}

export function buildReciprocalRelianceEnvelope(
  result: VerifyResult
): ReciprocalRelianceEnvelope | null {
  const isMcp = result.target_type === "mcp_server";
  const isAgent = result.target_type === "agent_manifest";
  if (!isMcp && !isAgent) return null;

  const subject: ReciprocalSubject = {
    target: result.target,
    target_type: result.target_type,
    posture: result.result_state
  };

  const paths: string[] = [];
  paths.push(isResolved(result.result_state) ? "view_resolver_proof" : "improve_resolver_posture");
  paths.push("recheck_before_reliance");

  return {
    type: "ecz.reciprocal_reliance_envelope",
    version: FLYWHEEL_VERSION,
    agent_subject: isAgent ? subject : null,
    mcp_subject: isMcp ? subject : null,
    policy_hint: result.policy_mode,
    recommended_posture_paths: paths,
    external_authorisation: "not_determined_by_eczid",
    ...BOUNDARY
  };
}
