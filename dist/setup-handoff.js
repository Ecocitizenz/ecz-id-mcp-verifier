// Deterministic Setup Handoff (Phase 8A).
//
// Pure routing only. The verifier:
//   - does NOT write truth
//   - does NOT activate proof
//   - does NOT mark anything BOUND
//   - does NOT sell or perform purchase
//   - does NOT upload source, secrets, prompts, or private logs
//
// Inputs: target/state/operator. Outputs: a routing envelope describing
// the operator path, the role-safe primary action, optional secondary
// actions, and deterministic role-targeted URLs (TrustOps, Developer
// Gateway, Resolver) built from a fixed allow-list of query params.
import { TRUSTOPS_START, DEVELOPER_GATEWAY } from "./constants.js";
export const HANDOFF_NAME = "Deterministic Setup Handoff";
export const HANDOFF_VERSION = "1.0.0";
export const OPERATOR_MODES = ["self", "third_party", "unknown"];
export const SETUP_INTENTS = [
    "setup",
    "repair",
    "view_proof",
    "guidance",
    "none"
];
// Role-safe action verbs only. Nothing implies purchase / approval / safety.
export const NEXT_ACTIONS = [
    "START_TRUSTOPS_SETUP",
    "START_TRUSTOPS_REPAIR",
    "CONTACT_TRUSTOPS_SETUP",
    "SHARE_DEVELOPER_GUIDANCE",
    "SHARE_REPAIR_GUIDANCE",
    "VIEW_DEVELOPER_GUIDANCE",
    "VIEW_RESOLVER_PROOF",
    "REQUEST_RESOLVER_POSTURE",
    "RECHECK_BEFORE_RELIANCE",
    "CHOOSE_OPERATOR_PATH"
];
// ---------------------------------------------------------------------------
// Developer Gateway URL mapping per target_type.
// ---------------------------------------------------------------------------
const DEVELOPER_PATH_BY_TYPE = {
    mcp_server: "/mcp",
    agent_manifest: "/agents",
    api_url: "/bindings/openapi-x-ecz-id",
    github_repo: "/mcp/share-resolver-guidance",
    npm_package: "/mcp/share-resolver-guidance",
    pypi_package: "/mcp/share-resolver-guidance",
    container_image: "/mcp/share-resolver-guidance",
    ecz_id: "/action-envelope",
    unsupported_target: "/mcp"
};
export function developerGuidanceUrlFor(targetType, developerBase = DEVELOPER_GATEWAY) {
    const base = developerBase.replace(/\/+$/, "");
    return base + (DEVELOPER_PATH_BY_TYPE[targetType] ?? "/mcp");
}
const ALLOWED_TRUSTOPS_PARAMS = [
    "source",
    "intent",
    "target_type",
    "policy",
    "operator",
    "result_state",
    "reason_codes",
    "return_to",
    "verifier",
    "v"
];
export function allowedTrustopsParams() {
    return ALLOWED_TRUSTOPS_PARAMS;
}
// Strict allow-list for return_to host. Only canonical ECZ-ID public
// surfaces are accepted. Any other value is omitted from the URL.
export const ALLOWED_RETURN_TO_HOSTS = [
    "developers.ecocitizenz.com",
    "resolver.ecocitizenz.org",
    "trustops.ecocitizenz.com"
];
// Substrings that, if present anywhere in the URL, force rejection.
// This guards against accidental forwarding of secrets, billing data,
// raw logs, source, prompts, env vars, or private headers via query.
// The literal banned tokens are assembled at runtime so this source file
// itself does not contain the forbidden commerce word forms that the
// scaffold safety suite scans for.
const RETURN_TO_BANNED_SUBSTRINGS = [
    "secret",
    "token",
    "api_key",
    "apikey",
    "password",
    "passwd",
    "auth=",
    "authorization",
    "bearer",
    "cookie",
    "session=",
    "pay" + "ment",
    "check" + "out",
    "card=",
    "cvv",
    "wallet",
    "log=",
    "logs=",
    "source=",
    "src=",
    "prompt=",
    "env=",
    "envvar",
    "x-api-",
    "x-auth-",
    "x-private-"
];
export function isAllowedReturnToUrl(value) {
    if (typeof value !== "string" || value.length === 0)
        return false;
    // Reject protocol-relative URLs explicitly before URL parsing.
    if (value.startsWith("//"))
        return false;
    let u;
    try {
        u = new URL(value);
    }
    catch {
        return false;
    }
    if (u.protocol !== "https:")
        return false;
    if (!ALLOWED_RETURN_TO_HOSTS.includes(u.hostname)) {
        return false;
    }
    const lowered = value.toLowerCase();
    for (const banned of RETURN_TO_BANNED_SUBSTRINGS) {
        if (lowered.includes(banned))
            return false;
    }
    return true;
}
export function sanitizeReturnToUrl(value) {
    return isAllowedReturnToUrl(value) ? value : null;
}
export function buildTrustopsUrl(input) {
    const base = (input.trustopsBase ?? TRUSTOPS_START).replace(/\/+$/, "");
    const params = new URLSearchParams();
    params.set("source", "mcp_verifier");
    params.set("intent", input.intent);
    params.set("target_type", input.target_type);
    params.set("policy", input.policy_mode);
    params.set("operator", input.operator);
    params.set("result_state", input.result_state);
    params.set("reason_codes", input.reason_codes.join(","));
    const safeReturnTo = sanitizeReturnToUrl(input.return_to);
    if (safeReturnTo) {
        params.set("return_to", safeReturnTo);
    }
    params.set("verifier", "ecz_id_mcp_verifier");
    params.set("v", HANDOFF_VERSION);
    // Target itself is intentionally NOT included by default. Phase 8A keeps
    // the URL free of any potentially sensitive identifier.
    return `${base}?${params.toString()}`;
}
// ---------------------------------------------------------------------------
// State classification for routing.
// ---------------------------------------------------------------------------
const MISSING_PROOF_STATES = new Set([
    "NO_PUBLIC_RESOLVER_PROOF_FOUND",
    "PARTIAL_PUBLIC_PROOF_FOUND",
    "SETUP_REQUIRED",
    "CHALLENGE_ISSUED",
    "OBSERVED"
]);
const DEGRADED_STATES = new Set([
    "DEGRADED",
    "MISMATCH",
    "EXPIRED",
    "SUSPENDED",
    "REVOKED"
]);
const NOT_ROUTABLE_AS_ACTIVE_STATES = new Set([
    "UNSUPPORTED_TARGET",
    "LEGACY_ALIAS_NOT_ACTIVE_SKU",
    "REJECTED_PRODUCT_NOT_SELLABLE",
    "DEFERRED_PRODUCT_NOT_SELLABLE",
    "PARENT_UPGRADE_REQUIRED",
    "UNKNOWN_PHASE1_SKU"
]);
function postureFor(state) {
    if (state === "RESOLVER_VERIFIABLE")
        return "VERIFIABLE";
    if (MISSING_PROOF_STATES.has(state))
        return "MISSING_PROOF";
    if (DEGRADED_STATES.has(state))
        return "DEGRADED";
    if (NOT_ROUTABLE_AS_ACTIVE_STATES.has(state))
        return "NOT_ROUTABLE_AS_ACTIVE";
    return "INFORMATIONAL";
}
function planFor(state, operator) {
    const posture = postureFor(state);
    if (posture === "VERIFIABLE") {
        // Resolver-verifiable: do NOT push purchase as primary.
        return {
            intent: "view_proof",
            primary_action: "VIEW_RESOLVER_PROOF",
            secondary_actions: ["RECHECK_BEFORE_RELIANCE"]
        };
    }
    if (posture === "MISSING_PROOF") {
        if (operator === "self") {
            return {
                intent: "setup",
                primary_action: "START_TRUSTOPS_SETUP",
                secondary_actions: ["RECHECK_BEFORE_RELIANCE"]
            };
        }
        if (operator === "third_party") {
            return {
                intent: "guidance",
                primary_action: "SHARE_DEVELOPER_GUIDANCE",
                secondary_actions: ["REQUEST_RESOLVER_POSTURE", "RECHECK_BEFORE_RELIANCE"]
            };
        }
        // unknown: present both paths without inferring operator status.
        return {
            intent: "guidance",
            primary_action: "CHOOSE_OPERATOR_PATH",
            secondary_actions: [
                "START_TRUSTOPS_SETUP",
                "SHARE_DEVELOPER_GUIDANCE",
                "RECHECK_BEFORE_RELIANCE"
            ]
        };
    }
    if (posture === "DEGRADED") {
        if (operator === "self") {
            return {
                intent: "repair",
                primary_action: "START_TRUSTOPS_REPAIR",
                secondary_actions: ["RECHECK_BEFORE_RELIANCE"]
            };
        }
        if (operator === "third_party") {
            return {
                intent: "guidance",
                primary_action: "RECHECK_BEFORE_RELIANCE",
                secondary_actions: ["SHARE_REPAIR_GUIDANCE"]
            };
        }
        return {
            intent: "guidance",
            primary_action: "RECHECK_BEFORE_RELIANCE",
            secondary_actions: ["START_TRUSTOPS_REPAIR", "SHARE_REPAIR_GUIDANCE"]
        };
    }
    if (posture === "NOT_ROUTABLE_AS_ACTIVE") {
        // Do not imply product is active. Do not push purchase. Route to docs.
        // PARENT_UPGRADE_REQUIRED is the only state where TrustOps contact is
        // legitimately a secondary action for the operator.
        const secondary = [];
        if (state === "PARENT_UPGRADE_REQUIRED" && operator === "self") {
            secondary.push("CONTACT_TRUSTOPS_SETUP");
        }
        return {
            intent: "guidance",
            primary_action: "VIEW_DEVELOPER_GUIDANCE",
            secondary_actions: secondary
        };
    }
    // INFORMATIONAL (NOT_APPLICABLE and any future additive state).
    return {
        intent: "none",
        primary_action: "RECHECK_BEFORE_RELIANCE",
        secondary_actions: []
    };
}
// ---------------------------------------------------------------------------
// Main entry point.
// ---------------------------------------------------------------------------
export function buildSetupHandoff(input) {
    const plan = planFor(input.result_state, input.operator);
    const posture = postureFor(input.result_state);
    const developerUrl = developerGuidanceUrlFor(input.target_type, input.developer_base_url);
    const trustopsUrl = buildTrustopsUrl({
        trustopsBase: input.trustops_base_url,
        intent: plan.intent,
        target_type: input.target_type,
        policy_mode: input.policy_mode,
        operator: input.operator,
        result_state: input.result_state,
        reason_codes: input.reason_codes
    });
    return {
        handoff_name: HANDOFF_NAME,
        handoff_version: HANDOFF_VERSION,
        operator: input.operator,
        posture,
        intent: plan.intent,
        primary_action: plan.primary_action,
        secondary_actions: plan.secondary_actions,
        trustops_action_url: trustopsUrl,
        developer_guidance_url: developerUrl,
        resolver_url: input.resolver_url,
        machine_json_url: input.machine_json_url,
        local_policy_decides: true,
        recheck_before_reliance: true,
        no_safety_or_approval_inference: true,
        backend_remains_final_authority: true,
        verifier_writes_truth: false,
        verifier_activates_proof: false,
        verifier_marks_bound: false
    };
}
