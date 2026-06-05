// Canonical human-facing copy for the ECZ-ID MCP Verifier.
//
// This module is a single source of truth for the unresolved-proof wording so
// the human report and the guardrail tests cannot drift. The copy reports only:
// it never asserts certification, approval, or guarantee. The one permitted
// negation phrase ("does not mean the target is unsafe") is part of the
// approved unresolved wording below.
import { TRUSTOPS_START } from "./constants.js";
// Exact approved copy emitted when no public resolver proof is found.
export const UNRESOLVED_PROOF_COPY = "No public resolver proof was found for this MCP target yet. " +
    "This does not mean the target is unsafe. " +
    "It means ECZ-ID could not locate machine-readable public proof " +
    "for the accountable operator. Your local policy decides the action.";
// Approved operator route for improving resolver posture.
export const OPERATE_ROUTE_PREFIX = "Operate this server? Improve its resolver posture: ";
export function operateRouteLine(trustopsBase = TRUSTOPS_START) {
    return `${OPERATE_ROUTE_PREFIX}${trustopsBase}`;
}
