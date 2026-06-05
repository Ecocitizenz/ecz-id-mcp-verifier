// Deterministic exit codes for ECZ-ID MCP Verifier CLI.
// Local policy decides; this module only maps state + policy to a code.

import type { ResultState } from "./result-states.js";
import type { PolicyMode } from "./policy.js";

export const EXIT_OK = 0;
export const EXIT_POLICY_REQUIRED_PROOF_MISSING = 1;
export const EXIT_MISMATCH = 2;
export const EXIT_REVOKED_SUSPENDED_EXPIRED = 3;
export const EXIT_UNSUPPORTED_OR_INVALID = 4;
export const EXIT_NETWORK_FAIL_CLOSED = 5;
export const EXIT_INTERNAL = 6;

export interface ExitCodeOptions {
  network_attempted_and_failed?: boolean;
}

export function computeExitCode(
  state: ResultState,
  policy: PolicyMode,
  opts: ExitCodeOptions = {}
): number {
  if (state === "MISMATCH") return EXIT_MISMATCH;
  if (state === "REVOKED" || state === "SUSPENDED" || state === "EXPIRED") {
    return EXIT_REVOKED_SUSPENDED_EXPIRED;
  }
  if (state === "UNSUPPORTED_TARGET") return EXIT_UNSUPPORTED_OR_INVALID;
  if (state === "RESOLVER_VERIFIABLE") return EXIT_OK;
  if (
    state === "NO_PUBLIC_RESOLVER_PROOF_FOUND" ||
    state === "PARTIAL_PUBLIC_PROOF_FOUND"
  ) {
    if (policy === "REQUIRE") {
      return opts.network_attempted_and_failed
        ? EXIT_NETWORK_FAIL_CLOSED
        : EXIT_POLICY_REQUIRED_PROOF_MISSING;
    }
    return EXIT_OK;
  }
  // All other informational states exit OK; local policy decides.
  return EXIT_OK;
}
