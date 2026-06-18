export declare const BASE36_ALPHABET: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export declare const CANONICAL_PASSPORT_CODES: readonly ["AGENT_CREDENTIAL", "CYBER_RESILIENCE", "API_PASSPORT", "AI_MODEL", "DATASET", "IOT_DEVICE", "SOFTWARE_SUPPLY_CHAIN", "PRODUCT_PASSPORT", "CUSTODY_TRANSFER", "RISK_POLICY", "INDUSTRIAL_ROBOT", "PUBLIC_SPACE_ROBOT", "DOMESTIC_ROBOT", "ROBOTAXI", "AUTONOMOUS_CAR", "AUTONOMOUS_HAULAGE_TRUCK", "CROSS_BORDER_HAULAGE_TRUCK", "HIGH_VALUE_CARGO_TRUCK", "DRONE_D1", "DRONE_D2", "DRONE_D3", "DRONE_D4", "INTERMODAL_TRANSFER", "INDUSTRIAL_SITE", "CRITICAL_INFRASTRUCTURE", "FINANCIAL_AUTHORITY_FUNDS_FLOW", "MARINE_VESSEL", "CARGO_CONTAINER", "AIRCRAFT", "AVIATION_COMPONENT", "PLATFORM_SAFE_HARBOUR", "IDENTITY_CONTINUITY", "LICENSED_INFRASTRUCTURE_OPERATOR"];
export declare const SHORT_FORM_PASSPORT_CODES: readonly ["AGENT", "SSCM", "D1-DRONE"];
/** All passport codes this verifier recognises as registry-controlled. */
export declare const RECOGNISED_PASSPORT_CODES: ReadonlySet<string>;
/** True if `code` is a registry-controlled passport code. */
export declare function isRecognisedPassportCode(code: string): boolean;
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
/**
 * Parse and validate an ECZ-ID. Accepts the canonical parent and child internal
 * forms only. Case-sensitive: lowercase country or suffix is rejected. No
 * trimming — leading/trailing whitespace is rejected.
 */
export declare function parseEczId(value: unknown): ParsedEczId;
/** True if `value` is a valid parent or child ECZ-ID. */
export declare function isValidEczId(value: unknown): boolean;
/** True if `value` is a valid parent ECZ-ID (no child instance). */
export declare function isValidParentEczId(value: unknown): boolean;
/** True if `value` is a valid child passport-instance ECZ-ID. */
export declare function isValidChildEczId(value: unknown): boolean;
export declare function isCountrySegment(value: string): boolean;
