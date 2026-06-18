// Result actions builders for the ECZ-ID Action Envelope Stack.
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
import { buildSetupHandoff } from "./setup-handoff.js";
export const RESULT_ACTIONS_VERSION = "1.0";
// Exact approved Request-to-Resolve message. The only place the bare word
// "unsafe" appears is the sanctioned phrase "This does not mean unsafe".
export const REQUEST_TO_RESOLVE_MESSAGE = "No public resolver proof found yet. This does not mean unsafe. " +
    "Resolver-verifiable proof may make this easier to review. Local policy decides.";
export const AUTHORITY_BOUNDARY = "Backend writes truth. TrustOps handles setup. Resolver proves. Machines re-check.";
export const SHARE_LABEL = "Share resolver guidance";
export const OPERATOR_LABEL = "Open TrustOps setup if you operate this target";
export function toPacketTargetType(t) {
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
const DEGRADED_OR_LIFECYCLE = new Set([
    "MISMATCH",
    "DEGRADED",
    "REVOKED",
    "SUSPENDED",
    "EXPIRED"
]);
const NOT_ROUTABLE = new Set([
    "UNSUPPORTED_TARGET",
    "LEGACY_ALIAS_NOT_ACTIVE_SKU",
    "REJECTED_PRODUCT_NOT_SELLABLE",
    "DEFERRED_PRODUCT_NOT_SELLABLE",
    "PARENT_UPGRADE_REQUIRED",
    "UNKNOWN_PHASE1_SKU"
]);
export function isResolved(state) {
    return state === "RESOLVER_VERIFIABLE";
}
function recommendedPath(state) {
    if (isResolved(state))
        return "view_resolver_proof";
    if (DEGRADED_OR_LIFECYCLE.has(state))
        return "repair_resolver_posture";
    if (NOT_ROUTABLE.has(state))
        return "view_developer_guidance";
    return "improve_resolver_posture";
}
const BOUNDARY = {
    authority_boundary: AUTHORITY_BOUNDARY,
    local_policy_decides: true,
    recheck_before_reliance: true,
    no_safety_or_approval_inference: true,
    verifier_writes_truth: false,
    verifier_activates_proof: false,
    verifier_marks_bound: false
};
function flowFor(result) {
    return buildSetupHandoff({
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
function routeActions(result, trustopsUrl, developerUrl) {
    const actions = [];
    if (!isResolved(result.result_state)) {
        actions.push({ label: OPERATOR_LABEL, kind: "route", url: trustopsUrl });
        actions.push({ label: SHARE_LABEL, kind: "route", url: developerUrl });
    }
    else {
        actions.push({ label: "View Resolver guidance", kind: "route", url: developerUrl });
    }
    actions.push({ label: "Re-check before reliance", kind: "recheck", url: result.resolver_url });
    return actions;
}
export function buildMcpActionEnvelope(result) {
    if (result.target_type !== "mcp_server")
        return null;
    const flow = flowFor(result);
    return {
        type: "ecz.mcp_action_envelope",
        version: RESULT_ACTIONS_VERSION,
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
export function buildAgentActionEnvelope(result) {
    if (result.target_type !== "agent_manifest")
        return null;
    const flow = flowFor(result);
    return {
        type: "ecz.agent_action_envelope",
        version: RESULT_ACTIONS_VERSION,
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
export function buildRequestToResolve(result) {
    // Only meaningful when there is no public resolver proof yet and the target
    // is a supported shape. Never claimed signed or server-rate-limited locally.
    if (isResolved(result.result_state))
        return null;
    if (result.target_type === "unsupported_target")
        return null;
    return {
        type: "ecz.request_to_resolve",
        version: RESULT_ACTIONS_VERSION,
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
export function buildReciprocalRelianceEnvelope(result) {
    const isMcp = result.target_type === "mcp_server";
    const isAgent = result.target_type === "agent_manifest";
    if (!isMcp && !isAgent)
        return null;
    const subject = {
        target: result.target,
        target_type: result.target_type,
        posture: result.result_state
    };
    const paths = [];
    paths.push(isResolved(result.result_state) ? "view_resolver_proof" : "improve_resolver_posture");
    paths.push("recheck_before_reliance");
    return {
        type: "ecz.reciprocal_reliance_envelope",
        version: RESULT_ACTIONS_VERSION,
        agent_subject: isAgent ? subject : null,
        mcp_subject: isMcp ? subject : null,
        policy_hint: result.policy_mode,
        recommended_posture_paths: paths,
        external_authorisation: "not_determined_by_eczid",
        ...BOUNDARY
    };
}
