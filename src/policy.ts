// Local policy modes. The verifier reports; the caller's local policy decides.

export const POLICY_MODES = ["OPEN", "PREFER", "REQUIRE"] as const;

export type PolicyMode = (typeof POLICY_MODES)[number];

export const DEFAULT_POLICY: PolicyMode = "PREFER";
