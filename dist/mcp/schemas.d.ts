import { z } from "zod";
export declare const TARGET_TYPE_HINTS: readonly ["auto", "mcp_server", "agent_manifest", "api_url", "github_repo", "npm_package", "pypi_package", "container_image", "ecz_id"];
export declare const checkTargetShape: {
    target: z.ZodString;
    target_type: z.ZodOptional<z.ZodEnum<["auto", "mcp_server", "agent_manifest", "api_url", "github_repo", "npm_package", "pypi_package", "container_image", "ecz_id"]>>;
    policy: z.ZodOptional<z.ZodEnum<["OPEN", "PREFER", "REQUIRE"]>>;
    offline: z.ZodOptional<z.ZodBoolean>;
};
export declare const recheckResolverShape: {
    target: z.ZodString;
    offline: z.ZodOptional<z.ZodBoolean>;
};
export declare const explainResultShape: {
    reason_codes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    result_state: z.ZodOptional<z.ZodString>;
};
