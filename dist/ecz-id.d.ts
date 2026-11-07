export declare const BASE36_ALPHABET: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export declare const CURRENT_PASSPORT_FAMILY_DEFINITIONS: readonly [{
    readonly family: "agent";
    readonly typeCode: "AGENT_PASSPORT";
    readonly contractToken: "agent";
    readonly displayName: "Agent";
}, {
    readonly family: "mcp";
    readonly typeCode: "MCP_PASSPORT";
    readonly contractToken: "mcp";
    readonly displayName: "MCP";
}, {
    readonly family: "plugin";
    readonly typeCode: "PLUGIN_PASSPORT";
    readonly contractToken: "plugin";
    readonly displayName: "Plugin";
}, {
    readonly family: "api";
    readonly typeCode: "API_PASSPORT";
    readonly contractToken: "api";
    readonly displayName: "API";
}, {
    readonly family: "iot";
    readonly typeCode: "IOT_DEVICE";
    readonly contractToken: "iot";
    readonly displayName: "IoT";
}, {
    readonly family: "sdk";
    readonly typeCode: "SDK_PASSPORT";
    readonly contractToken: "sdk";
    readonly displayName: "SDK";
}, {
    readonly family: "service_workload";
    readonly typeCode: "SERVICE_WORKLOAD_PASSPORT";
    readonly contractToken: "svc";
    readonly displayName: "Service & Workload";
}];
export type CurrentPassportFamily = (typeof CURRENT_PASSPORT_FAMILY_DEFINITIONS)[number]["family"];
export type PublicPassportCode = (typeof CURRENT_PASSPORT_FAMILY_DEFINITIONS)[number]["typeCode"];
export type BackendSemanticKey = PublicPassportCode;
export declare const CURRENT_PASSPORT_TYPE_CODES: readonly PublicPassportCode[];
export declare const PUBLIC_PASSPORT_CODES: readonly ("AGENT_PASSPORT" | "MCP_PASSPORT" | "PLUGIN_PASSPORT" | "API_PASSPORT" | "IOT_DEVICE" | "SDK_PASSPORT" | "SERVICE_WORKLOAD_PASSPORT")[];
export declare const PUBLIC_PASSPORT_DISPLAY_NAME: Record<PublicPassportCode, string>;
export declare const PUBLIC_TO_BACKEND_SEMANTIC_KEY: Record<PublicPassportCode, BackendSemanticKey>;
export declare const BACKEND_SEMANTIC_KEYS: readonly ("AGENT_PASSPORT" | "MCP_PASSPORT" | "PLUGIN_PASSPORT" | "API_PASSPORT" | "IOT_DEVICE" | "SDK_PASSPORT" | "SERVICE_WORKLOAD_PASSPORT")[];
export declare const LEGACY_CATALOGUE_PASSPORT_CODES: readonly ["AGENT", "CYBER", "API", "AI", "DATASET", "IOT", "SSCM", "PRODUCT", "CUSTODY", "RISKPOL", "ROBOT-IND", "ROBOT-PUB", "ROBOT-DOM", "ROBOTAXI", "AUTO-CAR", "AUTO-TRUCK", "XHAUL", "HV-CARGO", "D1-DRONE", "D2-DRONE", "D3-DRONE", "D4-DRONE", "INTERMODAL", "IND-SITE", "CRITICAL-INFRA", "FUNDS-FLOW", "MARINE-VESSEL", "CARGO-CONTAINER", "AIRCRAFT", "AVIATION-COMP", "SAFE-HARBOUR", "ID-CONTINUITY", "LIC-INFRA"];
export declare const OBSOLETE_PASSPORT_CODES: readonly ["AGENT", "CYBER", "API", "AI", "DATASET", "IOT", "SSCM", "PRODUCT", "CUSTODY", "RISKPOL", "ROBOT-IND", "ROBOT-PUB", "ROBOT-DOM", "ROBOTAXI", "AUTO-CAR", "AUTO-TRUCK", "XHAUL", "HV-CARGO", "D1-DRONE", "D2-DRONE", "D3-DRONE", "D4-DRONE", "INTERMODAL", "IND-SITE", "CRITICAL-INFRA", "FUNDS-FLOW", "MARINE-VESSEL", "CARGO-CONTAINER", "AIRCRAFT", "AVIATION-COMP", "SAFE-HARBOUR", "ID-CONTINUITY", "LIC-INFRA"];
export type EczIdKind = "parent" | "child" | "invalid";
export interface ParsedEczId {
    raw: string;
    valid: boolean;
    kind: EczIdKind;
    parent: string | null;
    countryCode: string | null;
    identitySuffix: string | null;
    passportCode: PublicPassportCode | null;
    instanceSuffix: string | null;
    family: CurrentPassportFamily | null;
    contractToken: string | null;
    reason: string | null;
}
export declare function isPublicPassportCode(value: unknown): value is PublicPassportCode;
/** Back-compatible alias. Current recognition is the exact seven-family set. */
export declare function isRecognisedPassportCode(value: unknown): value is PublicPassportCode;
export declare function backendSemanticKeyFor(code: unknown): BackendSemanticKey | undefined;
export declare function familyDefinitionForCode(code: unknown): {
    readonly family: "agent";
    readonly typeCode: "AGENT_PASSPORT";
    readonly contractToken: "agent";
    readonly displayName: "Agent";
} | {
    readonly family: "mcp";
    readonly typeCode: "MCP_PASSPORT";
    readonly contractToken: "mcp";
    readonly displayName: "MCP";
} | {
    readonly family: "plugin";
    readonly typeCode: "PLUGIN_PASSPORT";
    readonly contractToken: "plugin";
    readonly displayName: "Plugin";
} | {
    readonly family: "api";
    readonly typeCode: "API_PASSPORT";
    readonly contractToken: "api";
    readonly displayName: "API";
} | {
    readonly family: "iot";
    readonly typeCode: "IOT_DEVICE";
    readonly contractToken: "iot";
    readonly displayName: "IoT";
} | {
    readonly family: "sdk";
    readonly typeCode: "SDK_PASSPORT";
    readonly contractToken: "sdk";
    readonly displayName: "SDK";
} | {
    readonly family: "service_workload";
    readonly typeCode: "SERVICE_WORKLOAD_PASSPORT";
    readonly contractToken: "svc";
    readonly displayName: "Service & Workload";
} | undefined;
export declare function parseEczId(value: unknown): ParsedEczId;
export declare function isValidEczId(value: unknown): boolean;
export declare function isValidParentEczId(value: unknown): boolean;
export declare function isValidChildEczId(value: unknown): boolean;
