// Canonical ECZ-ID parser/validator — the SINGLE deterministic source of truth
// for identifier format across this package (target classification, Resolver
// eligibility, human/machine URL construction, CLI validation, examples, tests,
// and GitHub Action input handling).
//
// Pure. No network. No filesystem. No LLM.
//
// Locked format (verified read-only against the canonical SSOT):
//   - Parent:  ECZ-CC-XXXXXX
//       CC     = exactly two uppercase ASCII letters (operator country/class).
//       XXXXXX = exactly six uppercase Base36 characters [0-9A-Z].
//     Source: canonical_v1.schema.json  ->  ^ECZ-[A-Z]{2}-[0-9A-Z]{6}$
//             ID_NAMESPACE_BRIDGE_DECISION.md (LOCKED V1).
//   - Child:   ECZ-CC-XXXXXX::PASSPORT_CODE-YYYYYY
//       parent part must itself be valid;
//       PASSPORT_CODE must be a registry-controlled passport code;
//       passport codes MAY themselves contain hyphens (e.g. D1-DRONE);
//       YYYYYY = exactly six uppercase Base36 characters.
//     The instance suffix is split off the FINAL hyphen so a hyphenated
//     passport code parses correctly; a simplistic first-hyphen split is
//     PROHIBITED.
//
// The country segment is the two-letter shape [A-Z]{2}; ISO-3166 membership is
// intentionally NOT enforced offline — the canonical SSOT regex does not
// enforce it either, and a verifier must not invent an authoritative country
// table.

// Base36 alphabet (documentation/reference). Validation uses the regexes below.
export const BASE36_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ" as const;

const PARENT_RE = /^ECZ-[A-Z]{2}-[0-9A-Z]{6}$/;
const COUNTRY_RE = /^[A-Z]{2}$/;
const SUFFIX6_RE = /^[0-9A-Z]{6}$/; // exactly six uppercase Base36 characters
// Passport-code shape: uppercase alphanumeric segments joined by '_' or '-'.
// Matches both UPPERCASE_SNAKE registry codes (AGENT_CREDENTIAL) and hyphenated
// public short forms (D1-DRONE).
const PASSPORT_CODE_SHAPE = /^[A-Z0-9]+(?:[_-][A-Z0-9]+)*$/;

// ---------------------------------------------------------------------------
// Registry-controlled passport codes.
//
// CANONICAL: the EXACTLY-33 child passport codes from the backend SSOT
// (services/functions/shared/child_passport_registry.py, CHILD_PASSPORT_REGISTRY).
// These are bare identifier tokens — no names, SKUs, prices, or categories — and
// they already appear publicly in Resolver `/api/p/{id}.json` child entries, so
// listing them here is not a new disclosure.
// ---------------------------------------------------------------------------
export const CANONICAL_PASSPORT_CODES = [
  // Core Digital & Operational (7)
  "AGENT_CREDENTIAL",
  "CYBER_RESILIENCE",
  "API_PASSPORT",
  "AI_MODEL",
  "DATASET",
  "IOT_DEVICE",
  "SOFTWARE_SUPPLY_CHAIN",
  // Product, Risk & Transfer (3)
  "PRODUCT_PASSPORT",
  "CUSTODY_TRANSFER",
  "RISK_POLICY",
  // Robotics (3)
  "INDUSTRIAL_ROBOT",
  "PUBLIC_SPACE_ROBOT",
  "DOMESTIC_ROBOT",
  // Road & Freight Mobility (5)
  "ROBOTAXI",
  "AUTONOMOUS_CAR",
  "AUTONOMOUS_HAULAGE_TRUCK",
  "CROSS_BORDER_HAULAGE_TRUCK",
  "HIGH_VALUE_CARGO_TRUCK",
  // Aerial Mobility — Drones (4)
  "DRONE_D1",
  "DRONE_D2",
  "DRONE_D3",
  "DRONE_D4",
  // Infrastructure-Grade Additions (8)
  "INTERMODAL_TRANSFER",
  "INDUSTRIAL_SITE",
  "CRITICAL_INFRASTRUCTURE",
  "FINANCIAL_AUTHORITY_FUNDS_FLOW",
  "MARINE_VESSEL",
  "CARGO_CONTAINER",
  "AIRCRAFT",
  "AVIATION_COMPONENT",
  // Control & Trust Overlays (3)
  "PLATFORM_SAFE_HARBOUR",
  "IDENTITY_CONTINUITY",
  "LICENSED_INFRASTRUCTURE_OPERATOR"
] as const;

// Public short-form passport codes blessed as canonical-valid by the Phase 1
// corrective directive. They also exercise the hyphen-safe instance-suffix
// split (D1-DRONE contains an internal hyphen). The SSOT spellings differ
// (AGENT_CREDENTIAL / SOFTWARE_SUPPLY_CHAIN / DRONE_D1); that discrepancy is
// recorded for CEO reconciliation rather than silently dropped.
export const SHORT_FORM_PASSPORT_CODES = ["AGENT", "SSCM", "D1-DRONE"] as const;

/** All passport codes this verifier recognises as registry-controlled. */
export const RECOGNISED_PASSPORT_CODES: ReadonlySet<string> = new Set<string>([
  ...CANONICAL_PASSPORT_CODES,
  ...SHORT_FORM_PASSPORT_CODES
]);

/** True if `code` is a registry-controlled passport code. */
export function isRecognisedPassportCode(code: string): boolean {
  return RECOGNISED_PASSPORT_CODES.has(code);
}

export type EczIdKind = "parent" | "child";

export interface ParsedEczId {
  /** Whether the whole identifier is a valid parent or child ECZ-ID. */
  valid: boolean;
  /** "parent" | "child" when valid; null otherwise. */
  kind: EczIdKind | null;
  /** Canonical parent ECZ-ID (ECZ-CC-XXXXXX) when valid; null otherwise. */
  parent: string | null;
  /** Two-letter country/class segment when valid; null otherwise. */
  country: string | null;
  /** Six-char parent identity suffix (XXXXXX) when valid; null otherwise. */
  parentSuffix: string | null;
  /** Registry passport code (child only). */
  passportCode: string | null;
  /** Six-char instance suffix (YYYYYY) for a child; null otherwise. */
  instanceSuffix: string | null;
  /** Machine-stable reason when invalid; null when valid. */
  reason: string | null;
}

function invalid(reason: string): ParsedEczId {
  return {
    valid: false,
    kind: null,
    parent: null,
    country: null,
    parentSuffix: null,
    passportCode: null,
    instanceSuffix: null,
    reason
  };
}

/**
 * Parse and validate an ECZ-ID. Accepts the canonical parent and child internal
 * forms only. Case-sensitive: lowercase country or suffix is rejected. No
 * trimming — leading/trailing whitespace is rejected.
 */
export function parseEczId(value: unknown): ParsedEczId {
  if (typeof value !== "string" || value.length === 0) {
    return invalid("not_a_string");
  }
  if (value !== value.trim()) {
    return invalid("surrounding_whitespace");
  }

  const sep = value.indexOf("::");
  if (sep === -1) {
    // Parent form.
    if (!PARENT_RE.test(value)) return invalid("parent_format");
    const [, country, parentSuffix] = value.split("-");
    return {
      valid: true,
      kind: "parent",
      parent: value,
      country,
      parentSuffix,
      passportCode: null,
      instanceSuffix: null,
      reason: null
    };
  }

  // Child form. There must be exactly one "::".
  if (value.indexOf("::", sep + 1) !== -1) return invalid("multiple_separators");
  const parentPart = value.slice(0, sep);
  const childPart = value.slice(sep + 2);

  if (!PARENT_RE.test(parentPart)) return invalid("parent_format");
  if (childPart.length === 0) return invalid("empty_child_part");

  // Split the instance suffix off the FINAL hyphen so hyphenated passport
  // codes parse correctly (a first-hyphen split is prohibited).
  const lastHyphen = childPart.lastIndexOf("-");
  if (lastHyphen <= 0 || lastHyphen === childPart.length - 1) {
    return invalid("child_shape");
  }
  const passportCode = childPart.slice(0, lastHyphen);
  const instanceSuffix = childPart.slice(lastHyphen + 1);

  if (!SUFFIX6_RE.test(instanceSuffix)) return invalid("instance_suffix");
  if (!PASSPORT_CODE_SHAPE.test(passportCode)) return invalid("passport_code_shape");
  if (!isRecognisedPassportCode(passportCode)) return invalid("passport_code_unknown");

  const [, country, parentSuffix] = parentPart.split("-");
  return {
    valid: true,
    kind: "child",
    parent: parentPart,
    country,
    parentSuffix,
    passportCode,
    instanceSuffix,
    reason: null
  };
}

/** True if `value` is a valid parent or child ECZ-ID. */
export function isValidEczId(value: unknown): boolean {
  return parseEczId(value).valid;
}

/** True if `value` is a valid parent ECZ-ID (no child instance). */
export function isValidParentEczId(value: unknown): boolean {
  return parseEczId(value).kind === "parent";
}

/** True if `value` is a valid child passport-instance ECZ-ID. */
export function isValidChildEczId(value: unknown): boolean {
  return parseEczId(value).kind === "child";
}

// Reference: the country segment shape, exported for callers that need it.
export function isCountrySegment(value: string): boolean {
  return COUNTRY_RE.test(value);
}
