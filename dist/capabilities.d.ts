import { OUTPUT_PRIVACY_FIELDS } from "./privacy.js";
export interface CapabilityProfile {
    name: string;
    package: string;
    version: string;
    capability_profile: string;
    schema_version: number;
    binaries: {
        cli: readonly string[];
        mcp_server: string;
    };
    mcp: {
        server_name: string;
        registry_name: string;
        transport: "stdio";
        tools: readonly string[];
    };
    supported_target_types: readonly string[];
    result_states: readonly string[];
    reason_codes_count: number;
    policy_modes: readonly string[];
    operator_modes: readonly string[];
    outputs: readonly string[];
    exit_codes: Record<string, string>;
    does: readonly string[];
    does_not: readonly string[];
    artifact_binding_performed: false;
    manifest_inspection_performed: false;
    runtime_protocol_inspection_performed: false;
    local_policy_decides: true;
    privacy: typeof OUTPUT_PRIVACY_FIELDS & {
        offline_capable: true;
    };
    routes: {
        resolver: string;
        resolver_api: string;
        trustops: string;
        developer_gateway: string;
        repository: string;
        machine_discovery: string;
    };
}
export declare function buildCapabilities(): CapabilityProfile;
export interface McpHostConfig {
    mcpServers: {
        "ecz-id": {
            command: "npx";
            args: string[];
        };
    };
}
export declare function buildMcpConfig(): McpHostConfig;
export interface DoctorCheck {
    name: string;
    ok: boolean;
    detail: string;
}
export interface DoctorReport {
    type: "ecz.doctor";
    ok: boolean;
    name: string;
    version: string;
    package: string;
    checks: DoctorCheck[];
    no_secret_required: true;
    no_network_required: true;
    local_policy_decides: true;
}
export declare function runDoctor(): Promise<DoctorReport>;
export declare function toDoctorHuman(report: DoctorReport): string;
