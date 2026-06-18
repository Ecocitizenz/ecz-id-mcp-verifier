// Canonical ReasonCodes. All values MUST be uppercase snake-case.

export const REASON_CODES = [
  "NO_PUBLIC_RESOLVER_PROOF_FOUND",
  "OPERATOR_PROOF_NOT_FOUND",
  "ORIGIN_PROOF_NOT_FOUND",
  "MANIFEST_NOT_FOUND",
  "MANIFEST_HASH_MISMATCH",
  "AGENT_CREDENTIAL_NOT_FOUND",
  "AGENT_CREDENTIAL_REUSED",
  "API_PASSPORT_NOT_FOUND",
  "API_PASSPORT_MISMATCH",
  "IDENTITY_CONTINUITY_NOT_FOUND",
  "SOFTWARE_SUPPLY_CHAIN_PROOF_NOT_FOUND",
  "PACKAGE_OWNERSHIP_CHANGED",
  "REPO_TRANSFER_DETECTED",
  "CONTAINER_DIGEST_CHANGED",
  "KEYSET_HASH_MISMATCH",
  "PULSEGUARD_STALE",
  "REVOKED_PARENT",
  "REVOKED_AGENT_CREDENTIAL",
  "SUSPENDED_API_PASSPORT",
  "DECLARED_PARENT_CANNOT_ACTIVATE",
  "PARENT_UPGRADE_REQUIRED",
  "LEGACY_ALIAS_NOT_ACTIVE_SKU",
  "REJECTED_PRODUCT_NOT_SELLABLE",
  "DEFERRED_PRODUCT_NOT_SELLABLE",
  "SHOPIFY_CANNOT_ACTIVATE_PROOF",
  "TRUSTOPS_CANNOT_MARK_BOUND",
  "RESOLVER_READ_ONLY",
  // A 2xx Resolver response whose body could not be safely interpreted as
  // valid proof (malformed JSON, unrecognised schema, subject mismatch, or an
  // unknown lifecycle state). Deterministically treated as missing proof —
  // never as positive proof. Added in Phase 1 corrective closure because no
  // existing reason code distinguished an uninterpretable 2xx body.
  "RESOLVER_RESPONSE_UNVERIFIABLE",
  "MARKETPLACE_CHECKOUT_NOT_ALLOWED",
  "LOCAL_POLICY_DECIDES",
  "UNKNOWN_PHASE1_SKU"
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];
