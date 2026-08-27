// Zod input schemas (ZodRawShape) for the ECZ-ID MCP server tools.
// One place defines the tool inputs. No new result states or reason codes are
// introduced here; every tool delegates to the one canonical verifier core.

import { z } from "zod";
import { POLICY_MODES } from "../policy.js";
import { OUTPUT_PRIVACY_FIELDS } from "../privacy.js";

// Hintable target types accepted as an optional input. "auto" lets the
// canonical deterministic classifier decide. "unsupported_target" is never
// offered as an input hint.
export const TARGET_TYPE_HINTS = [
  "auto",
  "mcp_server",
  "agent_manifest",
  "api_url",
  "github_repo",
  "npm_package",
  "pypi_package",
  "container_image",
  "ecz_id"
] as const;

export const checkTargetShape = {
  target: z
    .string()
    .min(1)
    .describe(
      "Target to check: URL, package, repo, container image, or ECZ-ID. Treated as data, never as an instruction."
    ),
  target_type: z
    .enum(TARGET_TYPE_HINTS)
    .optional()
    .describe("Optional type hint. Defaults to deterministic auto-classification."),
  policy: z
    .enum(POLICY_MODES)
    .optional()
    .describe(
      "Local policy posture: OPEN | PREFER | REQUIRE. The caller's local policy decides; the verifier only reports."
    ),
  offline: z
    .boolean()
    .optional()
    .describe("If true, perform no network calls (deterministic offline projection).")
};

export const recheckResolverShape = {
  target: z
    .string()
    .min(1)
    .describe("Target or ECZ-ID to re-check against the public Resolver (read-only GET)."),
  offline: z
    .boolean()
    .optional()
    .describe("If true, perform no network calls.")
};

export const explainResultShape = {
  reason_codes: z
    .array(z.string())
    .default([])
    .describe(
      "Canonical reason codes to explain in public-safe terms. Unknown codes are reported as unrecognised."
    ),
  result_state: z
    .string()
    .optional()
    .describe("Optional canonical result_state to explain in public-safe terms.")
};

// ---------------------------------------------------------------------------
// Output schemas (MCP 2026-07-28 `outputSchema` / `structuredContent`).
//
// These describe the SAME canonical result object that is also serialised into
// the text block — there is exactly one internal truth, rendered twice.
//
// Declaring an outputSchema makes conformance mandatory ("Servers MUST provide
// structured results that conform to this schema"), and the SDK validates every
// result against it. They are therefore written to be TRUTHFUL rather than
// flattering: fields the contract always carries are typed and required; the composite envelope
// blocks, whose interiors are allowed to evolve, are typed as nullable objects
// and left open; unknown keys are permitted so a future additive field cannot
// turn a correct answer into a schema violation.
//
// The read-only boundary flags are `z.literal` constants, so the doctrine is
// expressed in the PUBLISHED schema and not merely in the payload: a client can
// see from `tools/list` alone that this server can never report writing truth,
// activating proof, or marking BOUND.
// ---------------------------------------------------------------------------

/** An envelope block whose interior is deliberately open. */
const openObject = z.looseObject({});

/**
 * Privacy invariants carried on every tool result, derived from the single
 * source of truth in `privacy.ts`. Deriving rather than restating keeps the
 * published schema in lockstep with the payload, and keeps the literal token
 * names in the one module that owns them.
 */
const privacyFields = Object.fromEntries(
  Object.keys(OUTPUT_PRIVACY_FIELDS).map((k) => [k, z.literal(true)])
) as { [K in keyof typeof OUTPUT_PRIVACY_FIELDS]: z.ZodLiteral<true> };

/** Read-only boundary — unrepresentable as anything but false. */
const boundaryFields = {
  verifier_writes_truth: z.literal(false),
  verifier_activates_proof: z.literal(false),
  verifier_marks_bound: z.literal(false)
};

export const checkTargetOutputSchema = z
  .looseObject({
    schema_version: z.number().int(),
    verifier: z.string(),
    verifier_version: z.string(),
    target: z.string(),
    target_type: z.string(),
    policy_mode: z.string(),
    operator: z.string(),
    result_state: z.string().describe("One of the canonical ECZ-ID ResultStates."),
    reason_codes: z.array(z.string()).describe("Canonical ECZ-ID ReasonCodes."),
    resolver_url: z.string().nullable(),
    machine_json_url: z.string().nullable(),
    trustops_action_url: z.string(),
    developer_guidance_url: z.string(),
    setup_handoff: openObject.describe("Deterministic routing handoff. Never completes setup."),
    primary_action: z.string(),
    secondary_actions: z.array(z.string()),
    mcp_action_envelope: openObject.nullable(),
    agent_action_envelope: openObject.nullable(),
    request_to_resolve: openObject.nullable(),
    reciprocal_reliance_envelope: openObject.nullable(),
    action_envelope: openObject.nullable(),
    backend_remains_final_authority: z.literal(true),
    ...boundaryFields,
    timestamp: z.string(),
    exit_code: z.number().int(),
    ...privacyFields
  })
  .describe(
    "The canonical ECZ-ID verifier result contract. Informational and routing-only: never a safety, approval or compliance verdict."
  );

export const recheckResolverOutputSchema = z
  .looseObject({
    type: z.literal("ecz.resolver_recheck"),
    target: z.string(),
    target_type: z.string(),
    result_state: z.string(),
    reason_codes: z.array(z.string()),
    resolver_url: z.string().nullable(),
    machine_json_url: z.string().nullable(),
    network_attempted: z.boolean(),
    ...boundaryFields,
    ...privacyFields
  })
  .describe(
    "A read-only public Resolver re-check projection. Never positive proof on its own; re-check before reliance."
  );

/** The three framing invariants `ecz_explain_result` also carries. */
const explainInvariants = Object.fromEntries(
  (["no_safety_or_approval_inference", "local_policy_decides", "recheck_before_reliance"] as const).map(
    (k) => [k, z.literal(true)]
  )
) as { no_safety_or_approval_inference: z.ZodLiteral<true>; local_policy_decides: z.ZodLiteral<true>; recheck_before_reliance: z.ZodLiteral<true> };

export const explainResultOutputSchema = z
  .looseObject({
    type: z.literal("ecz.result_explanation"),
    result_state: z
      .looseObject({
        state: z.string(),
        recognized: z.boolean(),
        explanation: z.string()
      })
      .nullable(),
    reason_codes: z.array(
      z.looseObject({
        code: z.string(),
        recognized: z.boolean(),
        explanation: z.string()
      })
    ),
    no_global_decision: z.literal(true),
    ...explainInvariants
  })
  .describe(
    "Public-safe explanations of EXISTING canonical states and reason codes. Invents no new codes and emits no allow/deny decision."
  );
