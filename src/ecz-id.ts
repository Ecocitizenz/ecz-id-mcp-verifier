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
// PUBLIC passport-number codes — the COMPLETE locked 33-code public child set.
//
// Source: the explicit CEO public-numbering addendum (source precedence #1),
// the Final Canonical Registry of 33 ECZ-ID child passports (precedence #2), and
// the Passport Number's SSOT for the unchanged first 22 (precedence #3). The
// first 22 are corroborated by backend ground-truth issuance (e.g.
// `ECZ-GB-5IK4FK::SSCM-FX63TW`); several of the final 11 (e.g. `CRITICAL-INFRA`,
// `LIC-INFRA`) are observed in backend evidence too.
//
// These are PUBLIC NUMBER CODES — NOT Shopify SKUs, product codes, backend
// semantic keys, package names or pricing keys. Backend keys (`AGENT_CREDENTIAL`,
// `SOFTWARE_SUPPLY_CHAIN`, `IROBOT`, `D1`, …) are NEVER valid public codes; they
// are reachable only through the deterministic mapping below, which never alters
// public identifier validity.
// ---------------------------------------------------------------------------
export const PUBLIC_PASSPORT_CODES = [
  // Core Digital & Operational (1-7)
  "AGENT", "CYBER", "API", "AI", "DATASET", "IOT", "SSCM",
  // Product, Risk & Transfer (8-10)
  "PRODUCT", "CUSTODY", "RISKPOL",
  // Robotics (11-13)
  "ROBOT-IND", "ROBOT-PUB", "ROBOT-DOM",
  // Road & Freight Mobility (14-18)
  "ROBOTAXI", "AUTO-CAR", "AUTO-TRUCK", "XHAUL", "HV-CARGO",
  // Aerial Mobility — Drones (19-22)
  "D1-DRONE", "D2-DRONE", "D3-DRONE", "D4-DRONE",
  // Infrastructure-Grade Additions (23-30)
  "INTERMODAL", "IND-SITE", "CRITICAL-INFRA", "FUNDS-FLOW", "MARINE-VESSEL",
  "CARGO-CONTAINER", "AIRCRAFT", "AVIATION-COMP",
  // Control & Trust Overlays (31-33)
  "SAFE-HARBOUR", "ID-CONTINUITY", "LIC-INFRA"
] as const;

export const PUBLIC_PASSPORT_CODE_SET: ReadonlySet<string> = new Set<string>(
  PUBLIC_PASSPORT_CODES
);

// Canonical passport display names, keyed by public code (no SKUs/prices).
export const PUBLIC_PASSPORT_DISPLAY_NAME: Readonly<Record<string, string>> = {
  AGENT: "Agent Credential",
  CYBER: "Cyber Resilience Passport",
  API: "API Passport",
  AI: "AI Model Passport",
  DATASET: "Dataset Passport",
  IOT: "IoT Device Passport",
  SSCM: "Software Supply Chain Passport",
  PRODUCT: "Product Passport",
  CUSTODY: "Custody Transfer Passport",
  RISKPOL: "Risk Policy Passport",
  "ROBOT-IND": "Industrial Robot Passport",
  "ROBOT-PUB": "Public-Space Robot Passport",
  "ROBOT-DOM": "Domestic Robot Passport",
  ROBOTAXI: "Robotaxi Passport",
  "AUTO-CAR": "Autonomous Car Passport",
  "AUTO-TRUCK": "Autonomous Haulage Truck Passport",
  XHAUL: "Cross-Border Haulage Truck Passport",
  "HV-CARGO": "High-Value Cargo Truck Passport",
  "D1-DRONE": "D1 Drone Passport",
  "D2-DRONE": "D2 Drone Passport",
  "D3-DRONE": "D3 Drone Passport",
  "D4-DRONE": "D4 Drone Passport",
  INTERMODAL: "Intermodal Transfer Passport",
  "IND-SITE": "Industrial Site Passport",
  "CRITICAL-INFRA": "Critical Infrastructure Passport",
  "FUNDS-FLOW": "Financial Authority & Funds Flow Passport",
  "MARINE-VESSEL": "Marine Vessel Passport",
  "CARGO-CONTAINER": "Cargo Container Passport",
  AIRCRAFT: "Aircraft Passport",
  "AVIATION-COMP": "Aviation Component Passport",
  "SAFE-HARBOUR": "Platform Safe-Harbour Passport",
  "ID-CONTINUITY": "Identity Continuity Passport",
  "LIC-INFRA": "Licensed Infrastructure Operator Passport"
};

// Deterministic PUBLIC passport-number code -> backend semantic registry key.
// CEO public-numbering addendum mapping (source precedence #1). For internal
// Backend integration ONLY: this mapping NEVER alters public identifier validity
// (a backend key is never a valid public code). Where verified backend schemes
// differ (the verbose child_passport_registry keys; the capability-registry
// prefixes), the divergence is recorded in report 24; reconciliation of the
// exact backend key is Backend-owned and out of scope for this verifier.
export const PUBLIC_TO_BACKEND_SEMANTIC_KEY: Readonly<Record<string, string>> = {
  AGENT: "AGENT_CREDENTIAL",
  CYBER: "CYBER",
  API: "API",
  AI: "AIMODEL",
  DATASET: "DATASET",
  IOT: "IOT",
  SSCM: "SOFTWARE_SUPPLY_CHAIN",
  PRODUCT: "PRODUCT",
  CUSTODY: "CUSTODY",
  RISKPOL: "RISK_POLICY",
  "ROBOT-IND": "IROBOT",
  "ROBOT-PUB": "PROBOT",
  "ROBOT-DOM": "DROBOT",
  ROBOTAXI: "ROBOTAXI",
  "AUTO-CAR": "AUTOCAR",
  "AUTO-TRUCK": "AUTOHAUL",
  XHAUL: "XBRDHAUL",
  "HV-CARGO": "HVCARGO",
  "D1-DRONE": "D1",
  "D2-DRONE": "D2",
  "D3-DRONE": "D3",
  "D4-DRONE": "D4",
  INTERMODAL: "INTERMODAL",
  "IND-SITE": "INDUSTRIAL_SITE",
  "CRITICAL-INFRA": "CRITICAL_INFRA",
  "FUNDS-FLOW": "FUNDS_FLOW",
  "MARINE-VESSEL": "MARINE_VESSEL",
  "CARGO-CONTAINER": "CONTAINER",
  AIRCRAFT: "AIRCRAFT",
  "AVIATION-COMP": "AVIATION_COMP",
  "SAFE-HARBOUR": "SAFE_HARBOUR",
  "ID-CONTINUITY": "ID_CONTINUITY",
  "LIC-INFRA": "LICENSED_OPERATOR"
};

// Backend semantic registry keys (CEO mapping values + the verified verbose
// child_passport_registry forms). Listed ONLY so they can be explicitly REJECTED
// as public codes. A backend key is never a valid public passport-number code.
// (Codes that coincide with a public code — CYBER, API, DATASET, IOT, PRODUCT,
// CUSTODY, ROBOTAXI, AIRCRAFT, INTERMODAL, MARINE_VESSEL — are intentionally
// excluded here: those exact strings ARE valid public codes.)
export const BACKEND_SEMANTIC_KEYS = [
  // CEO-mapping backend keys distinct from their public code:
  "AGENT_CREDENTIAL", "AIMODEL", "SOFTWARE_SUPPLY_CHAIN", "RISK_POLICY",
  "IROBOT", "PROBOT", "DROBOT", "AUTOCAR", "AUTOHAUL", "XBRDHAUL", "HVCARGO",
  "D1", "D2", "D3", "D4", "INDUSTRIAL_SITE", "CRITICAL_INFRA", "FUNDS_FLOW",
  "CONTAINER", "AVIATION_COMP", "SAFE_HARBOUR", "ID_CONTINUITY",
  "LICENSED_OPERATOR",
  // Verbose child_passport_registry forms (also rejected as public codes):
  "CYBER_RESILIENCE", "API_PASSPORT", "AI_MODEL", "IOT_DEVICE",
  "PRODUCT_PASSPORT", "CUSTODY_TRANSFER", "INDUSTRIAL_ROBOT",
  "PUBLIC_SPACE_ROBOT", "DOMESTIC_ROBOT", "AUTONOMOUS_CAR",
  "AUTONOMOUS_HAULAGE_TRUCK", "CROSS_BORDER_HAULAGE_TRUCK",
  "HIGH_VALUE_CARGO_TRUCK", "DRONE_D1", "DRONE_D2", "DRONE_D3", "DRONE_D4",
  "INTERMODAL_TRANSFER", "CRITICAL_INFRASTRUCTURE",
  "FINANCIAL_AUTHORITY_FUNDS_FLOW", "CARGO_CONTAINER", "AVIATION_COMPONENT",
  "PLATFORM_SAFE_HARBOUR", "IDENTITY_CONTINUITY",
  "LICENSED_INFRASTRUCTURE_OPERATOR"
] as const;

// Obsolete earlier-taxonomy final-11 codes. Superseded by the current Final
// Canonical Registry; NEVER valid current public codes (rejected for new IDs).
export const OBSOLETE_PASSPORT_CODES = [
  "DATA-EXCHANGE", "NETWORK-EDGE", "CLOUD-PLATFORM", "AI-INFRA", "CRITICAL-SYS",
  "ENERGY-INFRA", "WATER-INFRA", "AUDIT-CTRL", "ACCESS-AUTH", "POLICY-ENFORCE"
] as const;

/** True iff `code` is a LOCKED current public passport-number code. */
export function isPublicPassportCode(code: string): boolean {
  return PUBLIC_PASSPORT_CODE_SET.has(code);
}

/** Back-compat name; public-code membership is the single acceptance rule. */
export function isRecognisedPassportCode(code: string): boolean {
  return isPublicPassportCode(code);
}

/** Map a public passport-number code to its backend semantic key (internal use only). */
export function backendSemanticKeyFor(code: string): string | undefined {
  return PUBLIC_TO_BACKEND_SEMANTIC_KEY[code];
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
