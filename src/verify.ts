// verify(): the orchestrator. Pure routing and reporting.
// - Classifies the target.
// - Optionally GETs the public Resolver projection.
// - Returns a canonical VerifyResult with ResultState + ReasonCodes.
// - Never writes truth. Never activates proof. Never marks BOUND.
// - Never calls Backend/Core. Never calls TrustOps as a backend.

import { classifyTarget, type TargetType } from "./classify-target.js";
import { lookup } from "./resolver-client.js";
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

  if (r.found) {
    return {
      ...base,
      result_state: "RESOLVER_VERIFIABLE",
      reason_codes: [],
      resolver_url: r.resolver_url ?? null,
      machine_json_url: r.machine_json_url ?? null,
      network_attempted: r.network_attempted
    };
  }

  const reason_codes: ReasonCode[] = [
    "NO_PUBLIC_RESOLVER_PROOF_FOUND",
    "RESOLVER_READ_ONLY",
    "LOCAL_POLICY_DECIDES"
  ];

  return {
    ...base,
    result_state: "NO_PUBLIC_RESOLVER_PROOF_FOUND",
    reason_codes,
    resolver_url: r.resolver_url ?? null,
    machine_json_url: null,
    network_attempted: r.network_attempted,
    network_error: r.network_error
  };
}
