import type { TargetType } from "./classify-target.js";
import type { ResultState } from "./result-states.js";
import type { ReasonCode } from "./reason-codes.js";
import type { PolicyMode } from "./policy.js";
export declare const HANDOFF_NAME: "Deterministic Setup Handoff";
export declare const HANDOFF_VERSION: "1.0.0";
export declare const OPERATOR_MODES: readonly ["self", "third_party", "unknown"];
export type OperatorMode = (typeof OPERATOR_MODES)[number];
export declare const SETUP_INTENTS: readonly ["setup", "repair", "view_proof", "guidance", "none"];
export type SetupIntent = (typeof SETUP_INTENTS)[number];
export declare const NEXT_ACTIONS: readonly ["START_TRUSTOPS_SETUP", "START_TRUSTOPS_REPAIR", "CONTACT_TRUSTOPS_SETUP", "SHARE_DEVELOPER_GUIDANCE", "SHARE_REPAIR_GUIDANCE", "VIEW_DEVELOPER_GUIDANCE", "VIEW_RESOLVER_PROOF", "REQUEST_RESOLVER_POSTURE", "RECHECK_BEFORE_RELIANCE", "CHOOSE_OPERATOR_PATH"];
export type NextAction = (typeof NEXT_ACTIONS)[number];
export type Posture = "VERIFIABLE" | "MISSING_PROOF" | "DEGRADED" | "NOT_ROUTABLE_AS_ACTIVE" | "INFORMATIONAL";
export interface BuildSetupHandoffInput {
    target: string;
    target_type: TargetType;
    result_state: ResultState;
    reason_codes: ReasonCode[];
    policy_mode: PolicyMode;
    operator: OperatorMode;
    resolver_url: string | null;
    machine_json_url: string | null;
    trustops_base_url?: string;
    developer_base_url?: string;
}
export interface SetupHandoff {
    handoff_name: typeof HANDOFF_NAME;
    handoff_version: typeof HANDOFF_VERSION;
    operator: OperatorMode;
    posture: Posture;
    intent: SetupIntent;
    primary_action: NextAction;
    secondary_actions: NextAction[];
    trustops_action_url: string;
    developer_guidance_url: string;
    resolver_url: string | null;
    machine_json_url: string | null;
    local_policy_decides: true;
    recheck_before_reliance: true;
    no_safety_or_approval_inference: true;
    backend_remains_final_authority: true;
    verifier_writes_truth: false;
    verifier_activates_proof: false;
    verifier_marks_bound: false;
}
export declare function developerGuidanceUrlFor(targetType: TargetType, developerBase?: string): string;
export interface BuildTrustopsUrlInput {
    trustopsBase?: string;
    intent: SetupIntent;
    target_type: TargetType;
    policy_mode: PolicyMode;
    operator: OperatorMode;
    result_state: ResultState;
    reason_codes: ReasonCode[];
    return_to?: string;
}
export declare function allowedTrustopsParams(): readonly string[];
export declare const ALLOWED_RETURN_TO_HOSTS: readonly ["developers.ecocitizenz.com", "resolver.ecocitizenz.org", "trustops.ecocitizenz.com"];
export declare function isAllowedReturnToUrl(value: unknown): boolean;
export declare function sanitizeReturnToUrl(value: unknown): string | null;
export declare function buildTrustopsUrl(input: BuildTrustopsUrlInput): string;
export declare function buildSetupHandoff(input: BuildSetupHandoffInput): SetupHandoff;
