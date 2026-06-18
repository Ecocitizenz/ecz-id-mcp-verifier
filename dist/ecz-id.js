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
export const BASE36_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PARENT_RE = /^ECZ-[A-Z]{2}-[0-9A-Z]{6}$/;
const COUNTRY_RE = /^[A-Z]{2}$/;
const SUFFIX6_RE = /^[0-9A-Z]{6}$/; // exactly six uppercase Base36 characters
// Passport-code shape: uppercase alphanumeric segments joined by '_' or '-'.
// Matches both UPPERCASE_SNAKE registry codes (AGENT_CREDENTIAL) and hyphenated
// public short forms (D1-DRONE).
const PASSPORT_CODE_SHAPE = /^[A-Z0-9]+(?:[_-][A-Z0-9]+)*$/;
// ---------------------------------------------------------------------------
// PUBLIC passport-number codes — the LOCKED public child ID code set.
//
// Source: the Passport Number's SSOT, as restated by the explicit CEO decision
// (source precedence #1) and corroborated by backend ground-truth issuance
// (e.g. `ECZ-GB-5IK4FK::SSCM-FX63TW`, `::CYBER-…` observed in backend wiring
// evidence). These short PUBLIC NUMBER CODES are the ONLY codes accepted inside
// a public child ECZ-ID.
//
// These are NOT backend semantic registry keys. Backend keys
// (`AGENT_CREDENTIAL`, `SOFTWARE_SUPPLY_CHAIN`, `DRONE_D1`, …) are NOT public
// codes and MUST NOT be accepted as public child identifiers — they may only be
// reached through the deterministic mapping below, which never affects public
// identifier validity.
//
// SCOPE NOTE: the SSOT enumerates more categories than are locked here. Only the
// codes explicitly published in the numbering SSOT / CEO decision are locked.
// The remaining categories (Infrastructure-Grade Additions and Control & Trust
// Overlays) are NOT added to the public namespace until their exact public
// number codes are supplied by the SSOT — they are deliberately NOT guessed, so
// the accepted public namespace is never silently expanded.
// ---------------------------------------------------------------------------
export const PUBLIC_PASSPORT_CODES = [
    // Core Digital & Operational
    "AGENT", "CYBER", "API", "AI", "DATASET", "IOT", "SSCM",
    // Product, Risk & Transfer
    "PRODUCT", "CUSTODY", "RISKPOL",
    // Robotics
    "ROBOT-IND", "ROBOT-PUB", "ROBOT-DOM",
    // Road & Freight Mobility
    "ROBOTAXI", "AUTO-CAR", "AUTO-TRUCK", "XHAUL", "HV-CARGO",
    // Aerial Mobility — Drones
    "D1-DRONE", "D2-DRONE", "D3-DRONE", "D4-DRONE"
];
export const PUBLIC_PASSPORT_CODE_SET = new Set(PUBLIC_PASSPORT_CODES);
// Deterministic PUBLIC passport-number code -> backend semantic registry key.
// For internal Backend integration ONLY. This mapping NEVER alters public
// identifier validity: a backend key is never a valid public code.
export const PUBLIC_TO_BACKEND_SEMANTIC_KEY = {
    AGENT: "AGENT_CREDENTIAL",
    CYBER: "CYBER_RESILIENCE",
    API: "API_PASSPORT",
    AI: "AI_MODEL",
    DATASET: "DATASET",
    IOT: "IOT_DEVICE",
    SSCM: "SOFTWARE_SUPPLY_CHAIN",
    PRODUCT: "PRODUCT_PASSPORT",
    CUSTODY: "CUSTODY_TRANSFER",
    RISKPOL: "RISK_POLICY",
    "ROBOT-IND": "INDUSTRIAL_ROBOT",
    "ROBOT-PUB": "PUBLIC_SPACE_ROBOT",
    "ROBOT-DOM": "DOMESTIC_ROBOT",
    ROBOTAXI: "ROBOTAXI",
    "AUTO-CAR": "AUTONOMOUS_CAR",
    "AUTO-TRUCK": "AUTONOMOUS_HAULAGE_TRUCK",
    XHAUL: "CROSS_BORDER_HAULAGE_TRUCK",
    "HV-CARGO": "HIGH_VALUE_CARGO_TRUCK",
    "D1-DRONE": "DRONE_D1",
    "D2-DRONE": "DRONE_D2",
    "D3-DRONE": "DRONE_D3",
    "D4-DRONE": "DRONE_D4"
};
// Known backend semantic registry keys, listed ONLY so they can be explicitly
// rejected (and for the public->backend mapping). NEVER valid public codes.
export const BACKEND_SEMANTIC_KEYS = [
    "AGENT_CREDENTIAL", "CYBER_RESILIENCE", "API_PASSPORT", "AI_MODEL",
    "IOT_DEVICE", "SOFTWARE_SUPPLY_CHAIN", "PRODUCT_PASSPORT", "CUSTODY_TRANSFER",
    "RISK_POLICY", "INDUSTRIAL_ROBOT", "PUBLIC_SPACE_ROBOT", "DOMESTIC_ROBOT",
    "AUTONOMOUS_CAR", "AUTONOMOUS_HAULAGE_TRUCK", "CROSS_BORDER_HAULAGE_TRUCK",
    "HIGH_VALUE_CARGO_TRUCK", "DRONE_D1", "DRONE_D2", "DRONE_D3", "DRONE_D4"
];
/** True iff `code` is a LOCKED public passport-number code. */
export function isPublicPassportCode(code) {
    return PUBLIC_PASSPORT_CODE_SET.has(code);
}
/** Back-compat name; public-code membership is the single acceptance rule. */
export function isRecognisedPassportCode(code) {
    return isPublicPassportCode(code);
}
/** Map a public passport-number code to its backend semantic key (internal use only). */
export function backendSemanticKeyFor(code) {
    return PUBLIC_TO_BACKEND_SEMANTIC_KEY[code];
}
function invalid(reason) {
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
export function parseEczId(value) {
    if (typeof value !== "string" || value.length === 0) {
        return invalid("not_a_string");
    }
    if (value !== value.trim()) {
        return invalid("surrounding_whitespace");
    }
    const sep = value.indexOf("::");
    if (sep === -1) {
        // Parent form.
        if (!PARENT_RE.test(value))
            return invalid("parent_format");
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
    if (value.indexOf("::", sep + 1) !== -1)
        return invalid("multiple_separators");
    const parentPart = value.slice(0, sep);
    const childPart = value.slice(sep + 2);
    if (!PARENT_RE.test(parentPart))
        return invalid("parent_format");
    if (childPart.length === 0)
        return invalid("empty_child_part");
    // Split the instance suffix off the FINAL hyphen so hyphenated passport
    // codes parse correctly (a first-hyphen split is prohibited).
    const lastHyphen = childPart.lastIndexOf("-");
    if (lastHyphen <= 0 || lastHyphen === childPart.length - 1) {
        return invalid("child_shape");
    }
    const passportCode = childPart.slice(0, lastHyphen);
    const instanceSuffix = childPart.slice(lastHyphen + 1);
    if (!SUFFIX6_RE.test(instanceSuffix))
        return invalid("instance_suffix");
    if (!PASSPORT_CODE_SHAPE.test(passportCode))
        return invalid("passport_code_shape");
    if (!isRecognisedPassportCode(passportCode))
        return invalid("passport_code_unknown");
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
export function isValidEczId(value) {
    return parseEczId(value).valid;
}
/** True if `value` is a valid parent ECZ-ID (no child instance). */
export function isValidParentEczId(value) {
    return parseEczId(value).kind === "parent";
}
/** True if `value` is a valid child passport-instance ECZ-ID. */
export function isValidChildEczId(value) {
    return parseEczId(value).kind === "child";
}
// Reference: the country segment shape, exported for callers that need it.
export function isCountrySegment(value) {
    return COUNTRY_RE.test(value);
}
