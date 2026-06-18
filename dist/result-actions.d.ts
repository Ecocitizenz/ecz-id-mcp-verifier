import type { VerifyResult } from "./verify.js";
import type { TargetType } from "./classify-target.js";
import type { ResultState } from "./result-states.js";
import type { ReasonCode } from "./reason-codes.js";
import type { PolicyMode } from "./policy.js";
export declare const RESULT_ACTIONS_VERSION: "1.0";
export declare const REQUEST_TO_RESOLVE_MESSAGE: string;
export declare const AUTHORITY_BOUNDARY = "Backend writes truth. TrustOps handles setup. Resolver proves. Machines re-check.";
export declare const SHARE_LABEL = "Share resolver guidance";
export declare const OPERATOR_LABEL = "Open TrustOps setup if you operate this target";
export type PacketTargetType = "mcp_server" | "agent" | "api" | "domain" | "repo" | "package" | "shopify_store" | "unknown";
export declare function toPacketTargetType(t: TargetType): PacketTargetType;
export declare function isResolved(state: ResultState): boolean;
interface BoundaryFlags {
    authority_boundary: string;
    local_policy_decides: true;
    recheck_before_reliance: true;
    no_safety_or_approval_inference: true;
    verifier_writes_truth: false;
    verifier_activates_proof: false;
    verifier_marks_bound: false;
}
export interface RouteAction {
    label: string;
    kind: "route" | "recheck";
    url: string | null;
}
export interface McpActionEnvelope extends BoundaryFlags {
    type: "ecz.mcp_action_envelope";
    version: typeof RESULT_ACTIONS_VERSION;
    subject: {
        target: string;
        target_type: TargetType;
    };
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
export declare function buildMcpActionEnvelope(result: VerifyResult): McpActionEnvelope | null;
export interface AgentActionEnvelope extends BoundaryFlags {
    type: "ecz.agent_action_envelope";
    version: typeof RESULT_ACTIONS_VERSION;
    subject: {
        target: string;
        target_type: TargetType;
    };
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
export declare function buildAgentActionEnvelope(result: VerifyResult): AgentActionEnvelope | null;
export interface RequestToResolve {
    type: "ecz.request_to_resolve";
    version: typeof RESULT_ACTIONS_VERSION;
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
export declare function buildRequestToResolve(result: VerifyResult): RequestToResolve | null;
export interface ReciprocalSubject {
    target: string;
    target_type: TargetType;
    posture: ResultState;
}
export interface ReciprocalRelianceEnvelope extends BoundaryFlags {
    type: "ecz.reciprocal_reliance_envelope";
    version: typeof RESULT_ACTIONS_VERSION;
    agent_subject: ReciprocalSubject | null;
    mcp_subject: ReciprocalSubject | null;
    policy_hint: PolicyMode;
    recommended_posture_paths: string[];
    external_authorisation: "not_determined_by_eczid";
}
export declare function buildReciprocalRelianceEnvelope(result: VerifyResult): ReciprocalRelianceEnvelope | null;
export {};
