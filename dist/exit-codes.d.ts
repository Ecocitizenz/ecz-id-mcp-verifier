import type { ResultState } from "./result-states.js";
import type { PolicyMode } from "./policy.js";
export declare const EXIT_OK = 0;
export declare const EXIT_POLICY_REQUIRED_PROOF_MISSING = 1;
export declare const EXIT_MISMATCH = 2;
export declare const EXIT_REVOKED_SUSPENDED_EXPIRED = 3;
export declare const EXIT_UNSUPPORTED_OR_INVALID = 4;
export declare const EXIT_NETWORK_FAIL_CLOSED = 5;
export declare const EXIT_INTERNAL = 6;
export interface ExitCodeOptions {
    network_attempted_and_failed?: boolean;
}
export declare function computeExitCode(state: ResultState, policy: PolicyMode, opts?: ExitCodeOptions): number;
