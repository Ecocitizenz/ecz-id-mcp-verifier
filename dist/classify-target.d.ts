export declare const TARGET_TYPES: readonly ["mcp_server", "agent_manifest", "api_url", "github_repo", "npm_package", "pypi_package", "container_image", "ecz_id", "unsupported_target"];
export type TargetType = (typeof TARGET_TYPES)[number];
/**
 * Classify a target string into a canonical TargetType.
 *
 * Pure function. No network. No filesystem. No LLM.
 * If `hint` is provided and valid, the hint wins over inference.
 */
export declare function classifyTarget(target: string, hint?: string): TargetType;
