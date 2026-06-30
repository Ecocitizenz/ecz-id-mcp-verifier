import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type JsonOutput } from "../output.js";
import { OUTPUT_PRIVACY_FIELDS } from "../privacy.js";
export declare const TOOL_NAMES: readonly ["ecz_check_target", "ecz_recheck_resolver", "ecz_explain_result"];
export type ToolName = (typeof TOOL_NAMES)[number];
export interface CheckTargetArgs {
    target: string;
    target_type?: string;
    policy?: "OPEN" | "PREFER" | "REQUIRE";
    offline?: boolean;
}
export declare function runCheckTarget(args: CheckTargetArgs): Promise<JsonOutput>;
export interface RecheckResolverArgs {
    target: string;
    offline?: boolean;
}
export type ResolverRecheck = {
    type: "ecz.resolver_recheck";
    target: string;
    target_type: string;
    result_state: string;
    reason_codes: string[];
    resolver_url: string | null;
    machine_json_url: string | null;
    network_attempted: boolean;
    verifier_writes_truth: false;
    verifier_activates_proof: false;
    verifier_marks_bound: false;
} & typeof OUTPUT_PRIVACY_FIELDS;
export declare function runRecheckResolver(args: RecheckResolverArgs): Promise<ResolverRecheck>;
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
    result_state: {
        state: string;
        recognized: boolean;
        explanation: string;
    } | null;
    reason_codes: ExplainEntry[];
    no_global_decision: true;
    no_safety_or_approval_inference: true;
    local_policy_decides: true;
    recheck_before_reliance: true;
}
export declare function runExplainResult(args: ExplainResultArgs): ExplainOutput;
export declare function registerTools(server: McpServer): void;
