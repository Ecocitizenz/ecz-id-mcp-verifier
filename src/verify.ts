// verify(): the orchestrator. Pure routing and reporting.
// - Classifies the target.
// - Optionally GETs the public Resolver projection.
// - Returns a canonical VerifyResult with ResultState + ReasonCodes.
// - Never writes truth. Never activates proof. Never marks BOUND.
// - Never calls Backend/Core. Never calls TrustOps as a backend.

import { classifyTarget, type TargetType } from "./classify-target.js";
import { lookup, type ResolverProofState } from "./resolver-client.js";
import type { ResultState } from "./result-states.js";
import type { ReasonCode } from "./reason-codes.js";
import type { PolicyMode } from "./policy.js";
import type { OperatorMode } from "./setup-handoff.js";
import {
  RESOLVER_BASE,
  TRUSTOPS_START,
  DEVELOPER_GATEWAY,
  DEFAULT_TIMEOUT_MS
} from "./constants.js";

export interface VerifyOptions {
  target: string;
  targetType?: string;
  policy?: PolicyMode;
  operator?: OperatorMode;
  resolverBase?: string;
  trustopsUrl?: string;
  developerBase?: string;
  noNetwork?: boolean;
  timeoutMs?: number;
}

export interface VerifyResult {
  target: string;
  target_type: TargetType;
  policy_mode: PolicyMode;
  operator: OperatorMode;
  result_state: ResultState;
  reason_codes: ReasonCode[];
  resolver_url: string | null;
  machine_json_url: string | null;
  trustops_action_url: string;
  developer_guidance_url: string;
  trustops_base_url: string;
  developer_base_url: string;
  network_attempted: boolean;
  network_error?: string;
}

export async function verify(opts: VerifyOptions): Promise<VerifyResult> {
  const policy_mode: PolicyMode = opts.policy ?? "OPEN";
  const operator: OperatorMode = opts.operator ?? "unknown";
  const resolverBase = opts.resolverBase ?? RESOLVER_BASE;
  const trustopsUrl = opts.trustopsUrl ?? TRUSTOPS_START;
  const developerBase = opts.developerBase ?? DEVELOPER_GATEWAY;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const target_type = classifyTarget(opts.target, opts.targetType);

  const base = {
    target: opts.target,
    target_type,
    policy_mode,
    operator,
    trustops_action_url: trustopsUrl,
    developer_guidance_url: developerBase,
    trustops_base_url: trustopsUrl,
    developer_base_url: developerBase,
    resolver_url: null as string | null,
    machine_json_url: null as string | null
  };

  if (target_type === "unsupported_target") {
    return {
      ...base,
      result_state: "UNSUPPORTED_TARGET",
      reason_codes: ["LOCAL_POLICY_DECIDES"],
      network_attempted: false
    };
  }

  const r = await lookup(opts.target, target_type, {
    resolverBase,
    noNetwork: opts.noNetwork,
    timeoutMs
  });

  // Offline / no-lookup-ran: undefined proof_state means we could not confirm
  // public proof. Treat as missing proof (never invents proof).
  const mapped = mapProofState(r.proof_state);

  return {
    ...base,
    result_state: mapped.result_state,
    reason_codes: mapped.reason_codes,
    resolver_url: r.resolver_url ?? null,
    // The machine URL is only advertised as proof when the projection is active.
    machine_json_url: r.machine_json_url ?? null,
    network_attempted: r.network_attempted,
    network_error: r.network_error
  };
}

const MISSING_PROOF_REASONS: ReasonCode[] = [
  "NO_PUBLIC_RESOLVER_PROOF_FOUND",
  "RESOLVER_READ_ONLY",
  "LOCAL_POLICY_DECIDES"
];

const UNVERIFIABLE_REASONS: ReasonCode[] = [
  "RESOLVER_RESPONSE_UNVERIFIABLE",
  "RESOLVER_READ_ONLY",
  "LOCAL_POLICY_DECIDES"
];

interface MappedState {
  result_state: ResultState;
  reason_codes: ReasonCode[];
}

/**
 * Map the strict Resolver proof interpretation onto the canonical 18-state
 * model + reason codes. HTTP 200 alone is NEVER proof; revoked/suspended/
 * expired/stale/mismatch/malformed bodies map to the safest applicable
 * existing ResultState and ReasonCode and are never cached as positive proof.
 */
export function mapProofState(state: ResolverProofState | undefined): MappedState {
  switch (state) {
    case "active":
      return { result_state: "RESOLVER_VERIFIABLE", reason_codes: [] };
    case "revoked":
      return { result_state: "REVOKED", reason_codes: ["REVOKED_PARENT", "LOCAL_POLICY_DECIDES"] };
    case "suspended":
      return { result_state: "SUSPENDED", reason_codes: ["LOCAL_POLICY_DECIDES"] };
    case "expired":
      return { result_state: "EXPIRED", reason_codes: ["LOCAL_POLICY_DECIDES"] };
    case "stale":
      return { result_state: "DEGRADED", reason_codes: ["PULSEGUARD_STALE", "LOCAL_POLICY_DECIDES"] };
    case "degraded":
      return { result_state: "DEGRADED", reason_codes: ["LOCAL_POLICY_DECIDES"] };
    case "abuse":
      return {
        result_state: "MISMATCH",
        reason_codes: ["AGENT_CREDENTIAL_REUSED", "LOCAL_POLICY_DECIDES"]
      };
    case "proof_invalid":
      return {
        result_state: "MISMATCH",
        reason_codes: ["KEYSET_HASH_MISMATCH", "LOCAL_POLICY_DECIDES"]
      };
    case "target_mismatch":
      return {
        result_state: "MISMATCH",
        reason_codes: ["RESOLVER_RESPONSE_UNVERIFIABLE", "LOCAL_POLICY_DECIDES"]
      };
    case "malformed":
    case "schema_mismatch":
    case "unknown":
      // A 2xx body that cannot be safely interpreted: missing proof, tagged
      // distinctly. Never positive proof.
      return { result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND", reason_codes: UNVERIFIABLE_REASONS };
    case "child_machine_unproven":
      // Child ID: human URL retained, but no proven machine projection endpoint
      // exists, so no public machine proof can be confirmed. Never positive proof.
      return { result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND", reason_codes: MISSING_PROOF_REASONS };
    case "not_found":
    case "unavailable":
    default:
      // 404/410, transport failure/timeout, or no lookup ran (offline).
      return { result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND", reason_codes: MISSING_PROOF_REASONS };
  }
}
