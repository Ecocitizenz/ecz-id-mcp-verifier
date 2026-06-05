// Human-readable soft report. Uses only approved soft copy.
// Never asserts safety, certification, approval, or guarantee.
import { buildAcquisitionFlow } from "./acquisition-flow.js";
import { UNRESOLVED_PROOF_COPY, operateRouteLine } from "./copy.js";
import { REQUEST_TO_RESOLVE_MESSAGE, isResolved } from "./flywheel.js";
export function toHumanReport(result) {
    const flow = buildAcquisitionFlow({
        target: result.target,
        target_type: result.target_type,
        result_state: result.result_state,
        reason_codes: result.reason_codes,
        policy_mode: result.policy_mode,
        operator: result.operator,
        resolver_url: result.resolver_url,
        machine_json_url: result.machine_json_url,
        trustops_base_url: result.trustops_base_url,
        developer_base_url: result.developer_base_url
    });
    const lines = [];
    lines.push("ECZ-ID MCP Verifier (local report)");
    lines.push("----------------------------------");
    lines.push(`Target:        ${result.target}`);
    lines.push(`Target type:   ${result.target_type}`);
    lines.push(`Policy mode:   ${result.policy_mode}`);
    lines.push(`Operator:      ${result.operator}`);
    lines.push(`Result state:  ${result.result_state}`);
    if (result.reason_codes.length > 0) {
        lines.push(`Reason codes:  ${result.reason_codes.join(", ")}`);
    }
    if (result.resolver_url) {
        lines.push(`Resolver URL:  ${result.resolver_url}`);
    }
    lines.push("");
    switch (result.result_state) {
        case "RESOLVER_VERIFIABLE":
            lines.push("Public Resolver proof was found for this target.");
            lines.push("Re-check before reliance. Backend remains final authority.");
            break;
        case "NO_PUBLIC_RESOLVER_PROOF_FOUND":
            lines.push(UNRESOLVED_PROOF_COPY);
            lines.push("");
            lines.push(operateRouteLine(result.trustops_base_url));
            lines.push(`If you do not operate it: share resolver guidance -> ${flow.developer_guidance_url}`);
            lines.push("Re-check before reliance. Local policy decides.");
            break;
        case "PARTIAL_PUBLIC_PROOF_FOUND":
        case "SETUP_REQUIRED":
        case "CHALLENGE_ISSUED":
        case "OBSERVED":
            lines.push("No public resolver proof found yet.");
            lines.push("This does not mean unsafe.");
            lines.push("Re-check before reliance. Local policy decides.");
            lines.push("Operator path:");
            lines.push(`  If you operate this target: start setup in TrustOps -> ${flow.trustops_action_url}`);
            lines.push(`  If you do not: share developer guidance with the operator -> ${flow.developer_guidance_url}`);
            break;
        case "UNSUPPORTED_TARGET":
        case "LEGACY_ALIAS_NOT_ACTIVE_SKU":
        case "REJECTED_PRODUCT_NOT_SELLABLE":
        case "DEFERRED_PRODUCT_NOT_SELLABLE":
        case "PARENT_UPGRADE_REQUIRED":
        case "UNKNOWN_PHASE1_SKU":
            lines.push("This target shape or state is not routable as an active product.");
            lines.push(`See developer guidance: ${flow.developer_guidance_url}`);
            break;
        case "MISMATCH":
        case "DEGRADED":
            lines.push("A deterministic mismatch was reported.");
            lines.push("Re-check before reliance. Local policy decides.");
            lines.push("Operator path:");
            lines.push(`  If you operate this target: start repair in TrustOps -> ${flow.trustops_action_url}`);
            lines.push(`  If you do not: re-check before reliance and share repair guidance -> ${flow.developer_guidance_url}`);
            break;
        case "REVOKED":
        case "SUSPENDED":
        case "EXPIRED":
            lines.push(`Lifecycle state: ${result.result_state}.`);
            lines.push("Local policy decides. Backend remains final authority.");
            lines.push("Operator path:");
            lines.push(`  If you operate this target: start repair in TrustOps -> ${flow.trustops_action_url}`);
            lines.push(`  If you do not: share repair guidance -> ${flow.developer_guidance_url}`);
            break;
        default:
            lines.push("Local policy decides. Re-check before reliance.");
    }
    lines.push("");
    lines.push(`Primary next action: ${flow.primary_action}`);
    if (flow.secondary_actions.length > 0) {
        lines.push(`Secondary actions:   ${flow.secondary_actions.join(", ")}`);
    }
    if (!isResolved(result.result_state) &&
        result.target_type !== "unsupported_target") {
        lines.push("");
        lines.push("Flywheel next step:");
        lines.push(REQUEST_TO_RESOLVE_MESSAGE);
        lines.push(`Share resolver guidance: ${result.developer_base_url}`);
        lines.push(`Open TrustOps setup if you operate this target: ${result.trustops_base_url}`);
        lines.push("Re-check before reliance.");
    }
    lines.push("");
    lines.push("This report is local. No source uploaded. No secrets uploaded.");
    lines.push("Backend remains final authority. Local policy decides.");
    return lines.join("\n");
}
