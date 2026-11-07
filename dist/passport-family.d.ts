import type { TargetType } from "./classify-target.js";
import { type CurrentPassportFamily } from "./ecz-id.js";
export type PassportFamily = CurrentPassportFamily;
export type PassportFamilySource = "explicit" | "child_ecz_id" | "target_shape" | "none";
export declare const PASSPORT_FAMILY_INPUTS: readonly ["auto", "agent", "mcp", "plugin", "api", "iot", "sdk", "service_workload"];
export type PassportFamilyInput = (typeof PASSPORT_FAMILY_INPUTS)[number];
export interface PassportFamilyResolution {
    family: PassportFamily | null;
    source: PassportFamilySource;
    type_code: string | null;
    contract_token: string | null;
    display_name: string | null;
    guidance_url: string;
    acquisition_url: string;
    subject_note: string | null;
}
export declare const FREE_PASSPORT_PATH: "/get-started/free-passport/";
export declare const RESOLVE_ECZ_ID_PATH: "/get-started/resolve-an-ecz-id/";
export declare function normalizePassportFamilyInput(value: unknown): PassportFamilyInput | undefined;
export declare function passportFamilyDefinition(family: PassportFamily): {
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
};
export declare function passportQuickstartUrl(family: PassportFamily, developerBase?: string): string;
export declare function freePassportUrl(developerBase?: string): string;
export declare function resolveEczIdGuideUrl(developerBase?: string): string;
export declare function resolvePassportFamily(input: {
    target: string;
    target_type: TargetType;
    explicit?: string;
    developer_base?: string;
    trustops_base?: string;
}): PassportFamilyResolution;
