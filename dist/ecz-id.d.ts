export declare const BASE36_ALPHABET: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export declare const PUBLIC_PASSPORT_CODES: readonly ["AGENT", "CYBER", "API", "AI", "DATASET", "IOT", "SSCM", "PRODUCT", "CUSTODY", "RISKPOL", "ROBOT-IND", "ROBOT-PUB", "ROBOT-DOM", "ROBOTAXI", "AUTO-CAR", "AUTO-TRUCK", "XHAUL", "HV-CARGO", "D1-DRONE", "D2-DRONE", "D3-DRONE", "D4-DRONE", "INTERMODAL", "IND-SITE", "CRITICAL-INFRA", "FUNDS-FLOW", "MARINE-VESSEL", "CARGO-CONTAINER", "AIRCRAFT", "AVIATION-COMP", "SAFE-HARBOUR", "ID-CONTINUITY", "LIC-INFRA"];
export declare const PUBLIC_PASSPORT_CODE_SET: ReadonlySet<string>;
export declare const PUBLIC_PASSPORT_DISPLAY_NAME: Readonly<Record<string, string>>;
export declare const PUBLIC_TO_BACKEND_SEMANTIC_KEY: Readonly<Record<string, string>>;
export declare const BACKEND_SEMANTIC_KEYS: readonly ["AGENT_CREDENTIAL", "AIMODEL", "SOFTWARE_SUPPLY_CHAIN", "RISK_POLICY", "IROBOT", "PROBOT", "DROBOT", "AUTOCAR", "AUTOHAUL", "XBRDHAUL", "HVCARGO", "D1", "D2", "D3", "D4", "INDUSTRIAL_SITE", "CRITICAL_INFRA", "FUNDS_FLOW", "CONTAINER", "AVIATION_COMP", "SAFE_HARBOUR", "ID_CONTINUITY", "LICENSED_OPERATOR", "CYBER_RESILIENCE", "API_PASSPORT", "AI_MODEL", "IOT_DEVICE", "PRODUCT_PASSPORT", "CUSTODY_TRANSFER", "INDUSTRIAL_ROBOT", "PUBLIC_SPACE_ROBOT", "DOMESTIC_ROBOT", "AUTONOMOUS_CAR", "AUTONOMOUS_HAULAGE_TRUCK", "CROSS_BORDER_HAULAGE_TRUCK", "HIGH_VALUE_CARGO_TRUCK", "DRONE_D1", "DRONE_D2", "DRONE_D3", "DRONE_D4", "INTERMODAL_TRANSFER", "CRITICAL_INFRASTRUCTURE", "FINANCIAL_AUTHORITY_FUNDS_FLOW", "CARGO_CONTAINER", "AVIATION_COMPONENT", "PLATFORM_SAFE_HARBOUR", "IDENTITY_CONTINUITY", "LICENSED_INFRASTRUCTURE_OPERATOR"];
export declare const OBSOLETE_PASSPORT_CODES: readonly ["DATA-EXCHANGE", "NETWORK-EDGE", "CLOUD-PLATFORM", "AI-INFRA", "CRITICAL-SYS", "ENERGY-INFRA", "WATER-INFRA", "AUDIT-CTRL", "ACCESS-AUTH", "POLICY-ENFORCE"];
/** True iff `code` is a LOCKED current public passport-number code. */
export declare function isPublicPassportCode(code: string): boolean;
/** Back-compat name; public-code membership is the single acceptance rule. */
export declare function isRecognisedPassportCode(code: string): boolean;
/** Map a public passport-number code to its backend semantic key (internal use only). */
export declare function backendSemanticKeyFor(code: string): string | undefined;
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
