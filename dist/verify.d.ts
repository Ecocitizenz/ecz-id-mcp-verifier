import { type TargetType } from "./classify-target.js";
import { type ResolverProofState } from "./resolver-client.js";
import type { ResultState } from "./result-states.js";
import type { ReasonCode } from "./reason-codes.js";
import type { PolicyMode } from "./policy.js";
import type { OperatorMode } from "./setup-handoff.js";
export interface VerifyOptions {
    target: string;
    targetType?: string;
    policy?: PolicyMode;
    operator?: OperatorMode;
    resolverBase?: string;
    trustopsUrl?: string;
    developerBase?: string;
    noNetwork?: boolean;
    timeoutMs?: number;
}
export interface VerifyResult {
    target: string;
    target_type: TargetType;
    policy_mode: PolicyMode;
    operator: OperatorMode;
    result_state: ResultState;
    reason_codes: ReasonCode[];
    resolver_url: string | null;
    machine_json_url: string | null;
    trustops_action_url: string;
    developer_guidance_url: string;
    trustops_base_url: string;
    developer_base_url: string;
    network_attempted: boolean;
    network_error?: string;
}
export declare function verify(opts: VerifyOptions): Promise<VerifyResult>;
interface MappedState {
    result_state: ResultState;
    reason_codes: ReasonCode[];
}
/**
 * Map the strict Resolver proof interpretation onto the canonical 18-state
 * model + reason codes. HTTP 200 alone is NEVER proof; revoked/suspended/
 * expired/stale/mismatch/malformed bodies map to the safest applicable
 * existing ResultState and ReasonCode and are never cached as positive proof.
 */
export declare function mapProofState(state: ResolverProofState | undefined): MappedState;
export {};
