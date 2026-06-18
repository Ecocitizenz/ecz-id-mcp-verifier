import type { VerifyResult } from "./verify.js";
import type { ActionEnvelope } from "./action-envelope.js";
import { type SetupHandoff } from "./setup-handoff.js";
import { OUTPUT_PRIVACY_FIELDS } from "./privacy.js";
import { type McpActionEnvelope, type AgentActionEnvelope, type RequestToResolve, type ReciprocalRelianceEnvelope } from "./result-actions.js";
export interface JsonOutputOptions {
    exit_code: number;
    action_envelope?: ActionEnvelope | null;
    timestamp?: string;
}
export interface JsonOutputCore {
    schema_version: number;
    verifier: string;
    verifier_version: string;
    target: string;
    target_type: string;
    policy_mode: string;
    operator: string;
    result_state: string;
    reason_codes: string[];
    resolver_url: string | null;
    machine_json_url: string | null;
    trustops_action_url: string;
    developer_guidance_url: string;
    setup_handoff: SetupHandoff;
    primary_action: string;
    secondary_actions: string[];
    mcp_action_envelope: McpActionEnvelope | null;
    agent_action_envelope: AgentActionEnvelope | null;
    request_to_resolve: RequestToResolve | null;
    reciprocal_reliance_envelope: ReciprocalRelianceEnvelope | null;
    backend_remains_final_authority: true;
    verifier_writes_truth: false;
    verifier_activates_proof: false;
    verifier_marks_bound: false;
    timestamp: string;
    exit_code: number;
    action_envelope: ActionEnvelope | null;
}
export type JsonOutput = JsonOutputCore & typeof OUTPUT_PRIVACY_FIELDS;
export declare function buildJsonOutput(result: VerifyResult, opts: JsonOutputOptions): JsonOutput;
export declare function toJson(value: unknown): string;
export declare function buildSarif(result: VerifyResult, exit_code: number): unknown;
/**
 * Backwards-compatible scaffold helper used by the inert pre-Phase-7 CLI path.
 * Kept so any consumer of the previous toHuman() signature does not break.
 */
export declare function toHuman(envelope: {
    result_state: string;
    reason_codes: string[];
}): string;
