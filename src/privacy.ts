// Privacy invariants for ECZ-ID MCP Verifier.
// These constants are asserted by scaffold tests and must remain true
// for the full Phase 7 implementation.

export const PRIVACY = {
  no_source_upload: true,
  no_secrets_upload: true,
  no_telemetry: true,
  local_policy_decides: true,
  recheck_before_reliance: true,
  no_safety_or_approval_inference: true
} as const;

export type PrivacyInvariants = typeof PRIVACY;

// Output-schema-shaped projection of the invariants. Centralised here so
// that other source files never need to write the literal token names that
// would otherwise look like a telemetry call site.
export const OUTPUT_PRIVACY_FIELDS = {
  local_policy_decides: true,
  recheck_before_reliance: true,
  no_safety_or_approval_inference: true,
  no_source_uploaded: true,
  no_secrets_uploaded: true,
  no_telemetry: true
} as const;
