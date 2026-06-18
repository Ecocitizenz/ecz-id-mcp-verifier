// Deterministic, regex-based target classifier. No LLM. No network. No I/O.
import { isValidEczId } from "./ecz-id.js";
export const TARGET_TYPES = [
    "mcp_server",
    "agent_manifest",
    "api_url",
    "github_repo",
    "npm_package",
    "pypi_package",
    "container_image",
    "ecz_id",
    "unsupported_target"
];
const MCP_WELLKNOWN_RE = /\/\.well-known\/ecz-mcp\.json(\?|#|$)/i;
const AGENT_WELLKNOWN_RE = /\/\.well-known\/ecz-agent\.json(\?|#|$)/i;
const GITHUB_RE = /^https?:\/\/github\.com\/[^/\s]+\/[^/\s?#]+/i;
const NPM_URL_RE = /^https?:\/\/(www\.)?npmjs\.com\/package\//i;
const PYPI_URL_RE = /^https?:\/\/pypi\.org\/project\//i;
const NPM_NAME_RE = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const CONTAINER_DIGEST_RE = /@sha256:[a-f0-9]{64}$/i;
const CONTAINER_HOST_RE = /^(ghcr\.io|docker\.io|quay\.io|gcr\.io|registry\.k8s\.io|mcr\.microsoft\.com|public\.ecr\.aws|[a-z0-9.-]+\.[a-z]{2,})\/[a-z0-9._\-\/]+(:[\w.-]+)?$/i;
const URL_RE = /^https?:\/\//i;
function isValidTargetTypeHint(hint) {
    return TARGET_TYPES.includes(hint);
}
/**
 * Classify a target string into a canonical TargetType.
 *
 * Pure function. No network. No filesystem. No LLM.
 * If `hint` is provided and valid, the hint wins over inference.
 */
export function classifyTarget(target, hint) {
    if (hint && hint !== "auto" && hint !== "" && isValidTargetTypeHint(hint)) {
        return hint;
    }
    if (typeof target !== "string")
        return "unsupported_target";
    const t = target.trim();
    if (!t || /\s/.test(t))
        return "unsupported_target";
    // Only a strictly valid parent or child ECZ-ID classifies as ecz_id. A
    // malformed ECZ-shaped string falls through to unsupported_target so that an
    // invalid identifier never produces a Resolver route or a network fetch.
    if (isValidEczId(t))
        return "ecz_id";
    if (MCP_WELLKNOWN_RE.test(t))
        return "mcp_server";
    if (AGENT_WELLKNOWN_RE.test(t))
        return "agent_manifest";
    if (GITHUB_RE.test(t))
        return "github_repo";
    if (NPM_URL_RE.test(t))
        return "npm_package";
    if (PYPI_URL_RE.test(t))
        return "pypi_package";
    if (/^npm:/i.test(t))
        return "npm_package";
    if (/^pypi:/i.test(t))
        return "pypi_package";
    if (CONTAINER_DIGEST_RE.test(t))
        return "container_image";
    if (CONTAINER_HOST_RE.test(t))
        return "container_image";
    if (URL_RE.test(t))
        return "api_url";
    if (NPM_NAME_RE.test(t))
        return "npm_package";
    return "unsupported_target";
}
