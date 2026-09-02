/**
 * Passport opportunity — the free Passport offered at the point its absence was found.
 *
 * OWNER DECISION 2026-09-02. `AGENT_PASSPORT` and `MCP_PASSPORT` are canonical FREE child
 * Passports: non-sellable, minimum Parent DECLARED, one-auth child-first acquisition that
 * reuses or creates the free DECLARED Parent in the same journey, costs nothing, Resolver
 * publication, automatic re-check.
 *
 * THE BOUNDARY THIS FILE MUST NOT CROSS
 * -------------------------------------
 * Nothing here may alter `verification_result`. Truth and conversion are separate planes
 * and this is the conversion plane. The opportunity is computed FROM the result; it never
 * feeds back into it.
 *
 * The verifier never mints. It initiates. TrustOps/Universal Acquisition and Backend/Core
 * issue canonical truth.
 *
 * WHY AVAILABILITY IS NOT ASSERTED HERE
 * ------------------------------------
 * The verifier is local-first and offline-capable; it cannot know whether the issuing
 * backend is currently accepting acquisitions without making a network call it has no
 * business making. So it presents the OPPORTUNITY (the product is canonical regardless)
 * and marks the route `UNKNOWN_FROM_THIS_SURFACE` rather than guessing. A surface that
 * can probe availability resolves it; a surface that cannot says so.
 */
import type { ResultState } from "./result-states.js";
import type { TargetType } from "./classify-target.js";
import type { OperatorMode } from "./setup-handoff.js";
import { type RequestedPassportType } from "./setup-handoff.js";
/** Canonical record types, as the acquisition engine names them. */
export declare const PASSPORT_RECORD_TYPE: Record<RequestedPassportType, string>;
/** Contextual human labels. Never a vague "Set up ECZ-ID" when the type is already known. */
export declare const PASSPORT_CLAIM_LABEL: Record<RequestedPassportType, string>;
export declare const PASSPORT_REQUEST_LABEL = "Request ECZ-ID Passport";
export interface PassportNextAction {
    action: "ACQUIRE_AGENT_PASSPORT" | "ACQUIRE_MCP_PASSPORT" | "REQUEST_PASSPORT" | "CHOOSE_OPERATOR_PATH" | "RECHECK_BEFORE_RELIANCE";
    label: string;
    method: "handoff" | "route" | "recheck";
    url: string | null;
    /** Route-level enablement is decided by the surface that can resolve availability. */
    enabled: boolean;
}
export interface PassportOpportunity {
    passport_type: string;
    price: "FREE";
    sellable: false;
    minimum_parent: "DECLARED";
    eligible_acquisition_route: boolean;
    detected_from: {
        target_type: string;
        result_state: string;
    };
    acquisition_availability: {
        state: "UNKNOWN_FROM_THIS_SURFACE";
        note: string;
    };
    what_it_is_not: {
        implies_verified: false;
        implies_assured: false;
        implies_safe: false;
        implies_secure: false;
        implies_compliant: false;
        implies_approved: false;
        implies_certified: false;
        implies_endorsed: false;
    };
    /** Restated on the object itself so it cannot be separated from the offer. */
    agent_credential_never_substituted: true;
    next_actions: PassportNextAction[];
}
/**
 * Build the opportunity, or return null when a Passport is not the missing thing.
 *
 * Returning null is the common case and the correct one: most results do not warrant an
 * offer, and manufacturing one would turn a verification tool into a sales channel.
 */
export declare function buildPassportOpportunity(input: {
    target_type: TargetType;
    result_state: ResultState;
    operator: OperatorMode;
    trustops_action_url: string;
}): PassportOpportunity | null;
/**
 * One-line human rendering for CLI, Action summary and SARIF help.
 *
 * Absence is never scored, never called unsafe, and never used as leverage. The sentence
 * that follows the offer is the one that keeps it honest.
 */
export declare function renderPassportOpportunityLine(opportunity: PassportOpportunity | null): string | null;
