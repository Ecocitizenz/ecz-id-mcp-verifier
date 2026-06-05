// verify(): the orchestrator. Pure routing and reporting.
// - Classifies the target.
// - Optionally GETs the public Resolver projection.
// - Returns a canonical VerifyResult with ResultState + ReasonCodes.
// - Never writes truth. Never activates proof. Never marks BOUND.
// - Never calls Backend/Core. Never calls TrustOps as a backend.
import { classifyTarget } from "./classify-target.js";
import { lookup } from "./resolver-client.js";
import { RESOLVER_BASE, TRUSTOPS_START, DEVELOPER_GATEWAY, DEFAULT_TIMEOUT_MS } from "./constants.js";
export async function verify(opts) {
    const policy_mode = opts.policy ?? "OPEN";
    const operator = opts.operator ?? "unknown";
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
        resolver_url: null,
        machine_json_url: null
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
    const reason_codes = [
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
