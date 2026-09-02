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
import { requestedPassportTypeFor, type RequestedPassportType } from "./setup-handoff.js";

/** Canonical record types, as the acquisition engine names them. */
export const PASSPORT_RECORD_TYPE: Record<RequestedPassportType, string> = {
  agent: "AGENT_PASSPORT",
  mcp: "MCP_PASSPORT"
};

/** Contextual human labels. Never a vague "Set up ECZ-ID" when the type is already known. */
export const PASSPORT_CLAIM_LABEL: Record<RequestedPassportType, string> = {
  agent: "Get FREE ECZ-ID Agent Passport",
  mcp: "Get FREE ECZ-ID MCP Passport"
};

export const PASSPORT_REQUEST_LABEL = "Request ECZ-ID Passport";

/**
 * States where a Passport is genuinely the missing thing.
 *
 * Deliberately narrow. `REVOKED`, `SUSPENDED`, `EXPIRED` and `MISMATCH` describe an
 * identity that EXISTS and has a lifecycle problem — offering "get a free Passport" there
 * would be both wrong and slightly insulting. `NOT_APPLICABLE` and `UNSUPPORTED_TARGET`
 * mean the target shape cannot hold one at all.
 */
const MISSING_PASSPORT_STATES: ReadonlySet<string> = new Set<string>([
  "NO_PUBLIC_RESOLVER_PROOF_FOUND",
  "PARTIAL_PUBLIC_PROOF_FOUND",
  "SETUP_REQUIRED",
  "OBSERVED"
]);

export interface PassportNextAction {
  action:
    | "ACQUIRE_AGENT_PASSPORT"
    | "ACQUIRE_MCP_PASSPORT"
    | "REQUEST_PASSPORT"
    | "CHOOSE_OPERATOR_PATH"
    | "RECHECK_BEFORE_RELIANCE";
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
  detected_from: { target_type: string; result_state: string };
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
export function buildPassportOpportunity(input: {
  target_type: TargetType;
  result_state: ResultState;
  operator: OperatorMode;
  trustops_action_url: string;
}): PassportOpportunity | null {
  const passportType = requestedPassportTypeFor(input.target_type);
  if (passportType === undefined) return null;
  if (!MISSING_PASSPORT_STATES.has(input.result_state)) return null;

  const isSelf = input.operator === "self";
  const isThirdParty = input.operator === "third_party";

  const actions: PassportNextAction[] = [];
  if (isSelf) {
    actions.push({
      action: passportType === "agent" ? "ACQUIRE_AGENT_PASSPORT" : "ACQUIRE_MCP_PASSPORT",
      label: PASSPORT_CLAIM_LABEL[passportType],
      method: "handoff",
      // The handoff already carries requested_passport_type, which the live acquisition
      // door accepts and preserves across login. Nothing is retyped.
      url: input.trustops_action_url,
      enabled: true
    });
  } else if (isThirdParty) {
    // A third party must never be offered a claim. They may ask; they may not take.
    actions.push({
      action: "REQUEST_PASSPORT",
      label: PASSPORT_REQUEST_LABEL,
      method: "route",
      url: null,
      enabled: true
    });
  } else {
    // Unknown operator: present the choice rather than making it. Guessing here is how
    // somebody ends up claiming an identity that is not theirs.
    actions.push({
      action: "CHOOSE_OPERATOR_PATH",
      label: "Do you operate this target?",
      method: "route",
      url: null,
      enabled: true
    });
  }
  actions.push({
    action: "RECHECK_BEFORE_RELIANCE",
    label: "Re-check the public Resolver before relying on this result",
    method: "recheck",
    url: null,
    enabled: true
  });

  return {
    passport_type: PASSPORT_RECORD_TYPE[passportType],
    price: "FREE",
    sellable: false,
    minimum_parent: "DECLARED",
    eligible_acquisition_route: isSelf,
    detected_from: { target_type: input.target_type, result_state: input.result_state },
    acquisition_availability: {
      state: "UNKNOWN_FROM_THIS_SURFACE",
      note:
        "This surface is local-first and does not probe the issuing backend. The Passport " +
        "is canonical regardless; a surface that can resolve availability decides whether " +
        "the route is currently open."
    },
    what_it_is_not: {
      implies_verified: false,
      implies_assured: false,
      implies_safe: false,
      implies_secure: false,
      implies_compliant: false,
      implies_approved: false,
      implies_certified: false,
      implies_endorsed: false
    },
    agent_credential_never_substituted: true,
    next_actions: actions
  };
}

/**
 * One-line human rendering for CLI, Action summary and SARIF help.
 *
 * Absence is never scored, never called unsafe, and never used as leverage. The sentence
 * that follows the offer is the one that keeps it honest.
 */
export function renderPassportOpportunityLine(
  opportunity: PassportOpportunity | null
): string | null {
  if (opportunity === null) return null;
  const claim = opportunity.next_actions.find((a) => a.action.startsWith("ACQUIRE_"));
  const request = opportunity.next_actions.find((a) => a.action === "REQUEST_PASSPORT");
  if (claim !== undefined) return `${claim.label} - free of charge, and no account is needed to verify.`;
  if (request !== undefined) {
    return `${PASSPORT_REQUEST_LABEL} - you can ask the operator for re-checkable evidence.`;
  }
  return "Do you operate this target? If so, a free ECZ-ID Passport is available.";
}
