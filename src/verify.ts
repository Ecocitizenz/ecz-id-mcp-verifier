// verify(): read-only Resolver orchestration + neutral acquisition guidance.
// Never writes truth, activates proof, marks BOUND, infers ownership, or turns
// absence into a safety/compliance/certification/approval verdict.

import { classifyTarget, type TargetType } from "./classify-target.js";
import { lookup, type ResolverProofState } from "./resolver-client.js";
import type { ResultState } from "./result-states.js";
import type { ReasonCode } from "./reason-codes.js";
import type { PolicyMode } from "./policy.js";
import type { OperatorMode } from "./setup-handoff.js";
import {
  resolvePassportFamily,
  type PassportFamily,
  type PassportFamilySource,
} from "./passport-family.js";
import {
  RESOLVER_BASE,
  TRUSTOPS_START,
  DEVELOPER_GATEWAY,
} from "./constants.js";

export interface VerifyOptions {
  target: string;
  targetType?: string;
  passportFamily?: string;
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
  passport_family: PassportFamily | null;
  passport_family_source: PassportFamilySource;
  passport_type_code: string | null;
  passport_contract_token: string | null;
  passport_guidance_url: string;
  passport_acquisition_url: string;
  passport_subject_note: string | null;
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
  const timeoutMs = opts.timeoutMs;
  const target_type = classifyTarget(opts.target, opts.targetType);
  const family = resolvePassportFamily({
    target: opts.target,
    target_type,
    explicit: opts.passportFamily,
    developer_base: developerBase,
    trustops_base: trustopsUrl,
  });

  const base = {
    target: opts.target,
    target_type,
    passport_family: family.family,
    passport_family_source: family.source,
    passport_type_code: family.type_code,
    passport_contract_token: family.contract_token,
    passport_guidance_url: family.guidance_url,
    passport_acquisition_url: family.acquisition_url,
    passport_subject_note: family.subject_note,
    policy_mode,
    operator,
    trustops_action_url: trustopsUrl,
    developer_guidance_url: family.guidance_url,
    trustops_base_url: trustopsUrl,
    developer_base_url: developerBase,
    resolver_url: null as string | null,
    machine_json_url: null as string | null,
  };

  if (target_type === "unsupported_target") {
    return {
      ...base,
      result_state: "UNSUPPORTED_TARGET",
      reason_codes: ["LOCAL_POLICY_DECIDES"],
      network_attempted: false,
    };
  }

  const r = await lookup(opts.target, target_type, {
    resolverBase,
    noNetwork: opts.noNetwork,
    timeoutMs,
  });
  const mapped = mapProofState(r.proof_state);

  return {
    ...base,
    result_state: mapped.result_state,
    reason_codes: mapped.reason_codes,
    resolver_url: r.resolver_url ?? null,
    machine_json_url: r.machine_json_url ?? null,
    network_attempted: r.network_attempted,
    network_error: r.network_error,
  };
}

const MISSING_PROOF_REASONS: ReasonCode[] = [
  "NO_PUBLIC_RESOLVER_PROOF_FOUND",
  "RESOLVER_READ_ONLY",
  "LOCAL_POLICY_DECIDES",
];
const UNVERIFIABLE_REASONS: ReasonCode[] = [
  "RESOLVER_RESPONSE_UNVERIFIABLE",
  "RESOLVER_READ_ONLY",
  "LOCAL_POLICY_DECIDES",
];
interface MappedState {
  result_state: ResultState;
  reason_codes: ReasonCode[];
}

export function mapProofState(
  state: ResolverProofState | undefined,
): MappedState {
  switch (state) {
    case "active":
      return { result_state: "RESOLVER_VERIFIABLE", reason_codes: [] };
    case "revoked":
      return {
        result_state: "REVOKED",
        reason_codes: ["REVOKED_PARENT", "LOCAL_POLICY_DECIDES"],
      };
    case "suspended":
      return {
        result_state: "SUSPENDED",
        reason_codes: ["LOCAL_POLICY_DECIDES"],
      };
    case "expired":
      return {
        result_state: "EXPIRED",
        reason_codes: ["LOCAL_POLICY_DECIDES"],
      };
    case "stale":
      return {
        result_state: "DEGRADED",
        reason_codes: ["PULSEGUARD_STALE", "LOCAL_POLICY_DECIDES"],
      };
    case "degraded":
      return {
        result_state: "DEGRADED",
        reason_codes: ["LOCAL_POLICY_DECIDES"],
      };
    case "abuse":
      return {
        result_state: "MISMATCH",
        reason_codes: ["AGENT_CREDENTIAL_REUSED", "LOCAL_POLICY_DECIDES"],
      };
    case "proof_invalid":
      return {
        result_state: "MISMATCH",
        reason_codes: ["KEYSET_HASH_MISMATCH", "LOCAL_POLICY_DECIDES"],
      };
    case "target_mismatch":
      return {
        result_state: "MISMATCH",
        reason_codes: [
          "RESOLVER_RESPONSE_UNVERIFIABLE",
          "LOCAL_POLICY_DECIDES",
        ],
      };
    case "malformed":
    case "schema_mismatch":
    case "unknown":
      return {
        result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
        reason_codes: UNVERIFIABLE_REASONS,
      };
    case "not_found":
    case "unavailable":
    default:
      return {
        result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
        reason_codes: MISSING_PROOF_REASONS,
      };
  }
}
