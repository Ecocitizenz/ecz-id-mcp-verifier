// ActionEnvelope: a local routing object emitted by the verifier.
// It is guidance/action metadata only. It is NOT a proof authority.
// It never writes truth, never activates proof, never marks BOUND.

import type { ResultState } from "./result-states.js";
import type { ReasonCode } from "./reason-codes.js";
import type { PolicyMode } from "./policy.js";
import type { TargetType } from "./classify-target.js";
import type { VerifyResult } from "./verify.js";
import { OUTPUT_PRIVACY_FIELDS } from "./privacy.js";
import { SCHEMA_VERSION, DEVELOPER_GATEWAY } from "./constants.js";
import {
  buildAcquisitionFlow,
  developerGuidanceUrlFor,
  type AcquisitionFlow,
  type NextAction,
  type OperatorMode
} from "./acquisition-flow.js";

export type EnvelopeType = "MCP" | "AGENT" | "RESOLVER" | "RECIPROCAL_RELIANCE";

export interface ActionEnvelope {
  schema_version: number;
  envelope_type: EnvelopeType;
  target_type: TargetType;
  target_value: string;
  result_state: ResultState;
  reason_codes: ReasonCode[];
  resolver_url: string | null;
  machine_json_url: string | null;
  recommended_next_steps: string[];
  trustops_action_url: string;
  developer_guidance_url: string;
  policy_mode: PolicyMode;
  operator: OperatorMode;
  acquisition_flow: AcquisitionFlow;
  primary_action: NextAction;
  secondary_actions: NextAction[];
  local_policy_decides: true;
  recheck_before_reliance: true;
  no_safety_or_approval_inference: true;
  backend_remains_final_authority: true;
  verifier_writes_truth: false;
  verifier_activates_proof: false;
  verifier_marks_bound: false;
}

function chooseEnvelopeType(t: TargetType): EnvelopeType {
  if (t === "mcp_server") return "MCP";
  if (t === "agent_manifest") return "AGENT";
  if (t === "ecz_id") return "RESOLVER";
  return "RECIPROCAL_RELIANCE";
}

function buildSteps(result: VerifyResult, flow: AcquisitionFlow): string[] {
  const steps: string[] = [];
  switch (result.result_state) {
    case "RESOLVER_VERIFIABLE":
      steps.push(
        "Public Resolver proof was found.",
        "Re-check before reliance.",
        "Backend remains final authority."
      );
      break;
    case "NO_PUBLIC_RESOLVER_PROOF_FOUND":
    case "PARTIAL_PUBLIC_PROOF_FOUND":
    case "SETUP_REQUIRED":
    case "CHALLENGE_ISSUED":
    case "OBSERVED":
      steps.push("No public resolver proof found yet.");
      if (result.operator === "self") {
        steps.push("If you operate this target, start setup in TrustOps.");
      } else if (result.operator === "third_party") {
        steps.push(
          "If you do not operate this target, share developer guidance with the operator."
        );
      } else {
        steps.push(
          "If you operate this target, start setup in TrustOps.",
          "If you do not, share developer guidance with the operator."
        );
      }
      steps.push("Local policy decides.");
      break;
    case "UNSUPPORTED_TARGET":
    case "LEGACY_ALIAS_NOT_ACTIVE_SKU":
    case "REJECTED_PRODUCT_NOT_SELLABLE":
    case "DEFERRED_PRODUCT_NOT_SELLABLE":
    case "PARENT_UPGRADE_REQUIRED":
    case "UNKNOWN_PHASE1_SKU":
      steps.push(
        "This target shape or state is not routable as an active product.",
        "See Developer Gateway for guidance."
      );
      break;
    case "MISMATCH":
    case "DEGRADED":
      steps.push(
        "A deterministic mismatch was reported.",
        "Re-check before reliance.",
        "Local policy decides."
      );
      break;
    case "REVOKED":
    case "SUSPENDED":
    case "EXPIRED":
      steps.push(
        `Lifecycle state: ${result.result_state}.`,
        "Local policy decides."
      );
      break;
    default:
      steps.push("Local policy decides.", "Re-check before reliance.");
  }
  steps.push(`Primary next action: ${flow.primary_action}.`);
  return steps;
}

export function buildEnvelope(result: VerifyResult): ActionEnvelope {
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

  return {
    schema_version: SCHEMA_VERSION,
    envelope_type: chooseEnvelopeType(result.target_type),
    target_type: result.target_type,
    target_value: result.target,
    result_state: result.result_state,
    reason_codes: result.reason_codes,
    resolver_url: result.resolver_url,
    machine_json_url: result.machine_json_url,
    recommended_next_steps: buildSteps(result, flow),
    trustops_action_url: flow.trustops_action_url,
    developer_guidance_url: flow.developer_guidance_url,
    policy_mode: result.policy_mode,
    operator: result.operator,
    acquisition_flow: flow,
    primary_action: flow.primary_action,
    secondary_actions: flow.secondary_actions,
    local_policy_decides: OUTPUT_PRIVACY_FIELDS.local_policy_decides,
    recheck_before_reliance: OUTPUT_PRIVACY_FIELDS.recheck_before_reliance,
    no_safety_or_approval_inference:
      OUTPUT_PRIVACY_FIELDS.no_safety_or_approval_inference,
    backend_remains_final_authority: true,
    verifier_writes_truth: false,
    verifier_activates_proof: false,
    verifier_marks_bound: false
  };
}

export function emptyEnvelope(): ActionEnvelope {
  const baseFlow = buildAcquisitionFlow({
    target: "",
    target_type: "unsupported_target",
    result_state: "NOT_APPLICABLE",
    reason_codes: [],
    policy_mode: "OPEN",
    operator: "unknown",
    resolver_url: null,
    machine_json_url: null
  });
  return {
    schema_version: SCHEMA_VERSION,
    envelope_type: "RECIPROCAL_RELIANCE",
    target_type: "unsupported_target",
    target_value: "",
    result_state: "NOT_APPLICABLE",
    reason_codes: [],
    resolver_url: null,
    machine_json_url: null,
    recommended_next_steps: [],
    trustops_action_url: baseFlow.trustops_action_url,
    developer_guidance_url: developerGuidanceUrlFor(
      "unsupported_target",
      DEVELOPER_GATEWAY
    ),
    policy_mode: "OPEN",
    operator: "unknown",
    acquisition_flow: baseFlow,
    primary_action: baseFlow.primary_action,
    secondary_actions: baseFlow.secondary_actions,
    local_policy_decides: true,
    recheck_before_reliance: true,
    no_safety_or_approval_inference: true,
    backend_remains_final_authority: true,
    verifier_writes_truth: false,
    verifier_activates_proof: false,
    verifier_marks_bound: false
  };
}
