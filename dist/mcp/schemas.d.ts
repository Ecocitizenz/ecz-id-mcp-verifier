import { z } from "zod";
export declare const TARGET_TYPE_HINTS: readonly ["auto", "mcp_server", "agent_manifest", "api_url", "github_repo", "npm_package", "pypi_package", "container_image", "ecz_id"];
export declare const checkTargetShape: {
    target: z.ZodString;
    target_type: z.ZodOptional<z.ZodEnum<{
        mcp_server: "mcp_server";
        agent_manifest: "agent_manifest";
        api_url: "api_url";
        github_repo: "github_repo";
        npm_package: "npm_package";
        pypi_package: "pypi_package";
        container_image: "container_image";
        ecz_id: "ecz_id";
        auto: "auto";
    }>>;
    policy: z.ZodOptional<z.ZodEnum<{
        OPEN: "OPEN";
        PREFER: "PREFER";
        REQUIRE: "REQUIRE";
    }>>;
    offline: z.ZodOptional<z.ZodBoolean>;
};
export declare const recheckResolverShape: {
    target: z.ZodString;
    offline: z.ZodOptional<z.ZodBoolean>;
};
export declare const explainResultShape: {
    reason_codes: z.ZodDefault<z.ZodArray<z.ZodString>>;
    result_state: z.ZodOptional<z.ZodString>;
};
export declare const checkTargetOutputSchema: z.ZodObject<{
    local_policy_decides: z.ZodLiteral<true>;
    recheck_before_reliance: z.ZodLiteral<true>;
    no_safety_or_approval_inference: z.ZodLiteral<true>;
    no_source_uploaded: z.ZodLiteral<true>;
    no_secrets_uploaded: z.ZodLiteral<true>;
    no_telemetry: z.ZodLiteral<true>;
    timestamp: z.ZodString;
    exit_code: z.ZodNumber;
    verifier_writes_truth: z.ZodLiteral<false>;
    verifier_activates_proof: z.ZodLiteral<false>;
    verifier_marks_bound: z.ZodLiteral<false>;
    schema_version: z.ZodNumber;
    verifier: z.ZodString;
    verifier_version: z.ZodString;
    target: z.ZodString;
    target_type: z.ZodString;
    policy_mode: z.ZodString;
    operator: z.ZodString;
    result_state: z.ZodString;
    reason_codes: z.ZodArray<z.ZodString>;
    resolver_url: z.ZodNullable<z.ZodString>;
    machine_json_url: z.ZodNullable<z.ZodString>;
    trustops_action_url: z.ZodString;
    developer_guidance_url: z.ZodString;
    setup_handoff: z.ZodObject<{}, z.core.$loose>;
    primary_action: z.ZodString;
    secondary_actions: z.ZodArray<z.ZodString>;
    mcp_action_envelope: z.ZodNullable<z.ZodObject<{}, z.core.$loose>>;
    agent_action_envelope: z.ZodNullable<z.ZodObject<{}, z.core.$loose>>;
    request_to_resolve: z.ZodNullable<z.ZodObject<{}, z.core.$loose>>;
    reciprocal_reliance_envelope: z.ZodNullable<z.ZodObject<{}, z.core.$loose>>;
    action_envelope: z.ZodNullable<z.ZodObject<{}, z.core.$loose>>;
    backend_remains_final_authority: z.ZodLiteral<true>;
}, z.core.$loose>;
export declare const recheckResolverOutputSchema: z.ZodObject<{
    local_policy_decides: z.ZodLiteral<true>;
    recheck_before_reliance: z.ZodLiteral<true>;
    no_safety_or_approval_inference: z.ZodLiteral<true>;
    no_source_uploaded: z.ZodLiteral<true>;
    no_secrets_uploaded: z.ZodLiteral<true>;
    no_telemetry: z.ZodLiteral<true>;
    verifier_writes_truth: z.ZodLiteral<false>;
    verifier_activates_proof: z.ZodLiteral<false>;
    verifier_marks_bound: z.ZodLiteral<false>;
    type: z.ZodLiteral<"ecz.resolver_recheck">;
    target: z.ZodString;
    target_type: z.ZodString;
    result_state: z.ZodString;
    reason_codes: z.ZodArray<z.ZodString>;
    resolver_url: z.ZodNullable<z.ZodString>;
    machine_json_url: z.ZodNullable<z.ZodString>;
    network_attempted: z.ZodBoolean;
}, z.core.$loose>;
export declare const explainResultOutputSchema: z.ZodObject<{
    no_safety_or_approval_inference: z.ZodLiteral<true>;
    local_policy_decides: z.ZodLiteral<true>;
    recheck_before_reliance: z.ZodLiteral<true>;
    type: z.ZodLiteral<"ecz.result_explanation">;
    result_state: z.ZodNullable<z.ZodObject<{
        state: z.ZodString;
        recognized: z.ZodBoolean;
        explanation: z.ZodString;
    }, z.core.$loose>>;
    reason_codes: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        recognized: z.ZodBoolean;
        explanation: z.ZodString;
    }, z.core.$loose>>;
    no_global_decision: z.ZodLiteral<true>;
}, z.core.$loose>;
