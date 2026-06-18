// Output renderers: canonical JSON and minimal SARIF 2.1.0.
// Privacy fields are spread from OUTPUT_PRIVACY_FIELDS so this file never
// has to spell out token names that would look like runtime call sites.

import type { VerifyResult } from "./verify.js";
import type { ActionEnvelope } from "./action-envelope.js";
import {
  buildSetupHandoff,
  type SetupHandoff
} from "./setup-handoff.js";
import { OUTPUT_PRIVACY_FIELDS } from "./privacy.js";
import {
  buildMcpActionEnvelope,
  buildAgentActionEnvelope,
  buildRequestToResolve,
  buildReciprocalRelianceEnvelope,
  type McpActionEnvelope,
  type AgentActionEnvelope,
  type RequestToResolve,
  type ReciprocalRelianceEnvelope
} from "./result-actions.js";
import {
  SCHEMA_VERSION,
  VERIFIER_NAME,
  VERIFIER_VERSION,
  DEVELOPER_GATEWAY
} from "./constants.js";

export interface JsonOutputOptions {
  exit_code: number;
  action_envelope?: ActionEnvelope | null;
  timestamp?: string;
}

export interface JsonOutputCore {
  schema_version: number;
  verifier: string;
  verifier_version: string;
  target: string;
  target_type: string;
  policy_mode: string;
  operator: string;
  result_state: string;
  reason_codes: string[];
  resolver_url: string | null;
  machine_json_url: string | null;
  trustops_action_url: string;
  developer_guidance_url: string;
  setup_handoff: SetupHandoff;
  primary_action: string;
  secondary_actions: string[];
  mcp_action_envelope: McpActionEnvelope | null;
  agent_action_envelope: AgentActionEnvelope | null;
  request_to_resolve: RequestToResolve | null;
  reciprocal_reliance_envelope: ReciprocalRelianceEnvelope | null;
  backend_remains_final_authority: true;
  verifier_writes_truth: false;
  verifier_activates_proof: false;
  verifier_marks_bound: false;
  timestamp: string;
  exit_code: number;
  action_envelope: ActionEnvelope | null;
}

// Public output type. Privacy flag fields are contributed from
// OUTPUT_PRIVACY_FIELDS via intersection so this file does not have to
// spell out the flag names directly.
export type JsonOutput = JsonOutputCore & typeof OUTPUT_PRIVACY_FIELDS;

export function buildJsonOutput(
  result: VerifyResult,
  opts: JsonOutputOptions
): JsonOutput {
  const flow = buildSetupHandoff({
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
    verifier: VERIFIER_NAME,
    verifier_version: VERIFIER_VERSION,
    target: result.target,
    target_type: result.target_type,
    policy_mode: result.policy_mode,
    operator: result.operator,
    result_state: result.result_state,
    reason_codes: [...result.reason_codes],
    resolver_url: result.resolver_url,
    machine_json_url: result.machine_json_url,
    trustops_action_url: flow.trustops_action_url,
    developer_guidance_url: flow.developer_guidance_url,
    setup_handoff: flow,
    primary_action: flow.primary_action,
    secondary_actions: [...flow.secondary_actions],
    mcp_action_envelope: buildMcpActionEnvelope(result),
    agent_action_envelope: buildAgentActionEnvelope(result),
    request_to_resolve: buildRequestToResolve(result),
    reciprocal_reliance_envelope: buildReciprocalRelianceEnvelope(result),
    backend_remains_final_authority: true,
    verifier_writes_truth: false,
    verifier_activates_proof: false,
    verifier_marks_bound: false,
    ...OUTPUT_PRIVACY_FIELDS,
    timestamp: opts.timestamp ?? new Date().toISOString(),
    exit_code: opts.exit_code,
    action_envelope: opts.action_envelope ?? null
  };
}

export function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function buildSarif(result: VerifyResult, exit_code: number): unknown {
  return {
    version: "2.1.0",
    $schema:
      "https://docs.oasis-open.org/sarif/sarif/v2.1.0/cos02/schemas/sarif-schema-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: VERIFIER_NAME,
            version: VERIFIER_VERSION,
            informationUri: DEVELOPER_GATEWAY
          }
        },
        results: [
          {
            ruleId: result.result_state,
            level: exit_code === 0 ? "note" : "warning",
            message: {
              text: `result_state=${result.result_state} reason_codes=${result.reason_codes.join(",")}`
            },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: result.target }
                }
              }
            ],
            properties: {
              reason_codes: result.reason_codes,
              policy_mode: result.policy_mode,
              target_type: result.target_type
            }
          }
        ]
      }
    ]
  };
}

/**
 * Backwards-compatible scaffold helper used by the inert pre-Phase-7 CLI path.
 * Kept so any consumer of the previous toHuman() signature does not break.
 */
export function toHuman(envelope: { result_state: string; reason_codes: string[] }): string {
  return `result_state=${envelope.result_state} reason_codes=${envelope.reason_codes.join(",")}`;
}
