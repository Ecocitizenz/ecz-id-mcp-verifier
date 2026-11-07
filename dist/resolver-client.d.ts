import type { TargetType } from "./classify-target.js";
export interface ResolverLookupOptions {
    resolverBase?: string;
    apiBase?: string;
    noNetwork?: boolean;
    /** Per-ATTEMPT timeout. Back-compatible: `--timeout-ms` still sets this. */
    timeoutMs?: number;
    /** Hard ceiling across every attempt and backoff. */
    totalBudgetMs?: number;
    /** Maximum attempts, including the first. 1 disables retrying. */
    maxAttempts?: number;
}
/**
 * Deterministic interpretation of a Resolver machine response. `active` is the
 * ONLY state that represents usable public proof. Everything else is a
 * non-positive state that local policy must weigh.
 */
export type ResolverProofState = "active" | "not_found" | "unavailable" | "malformed" | "schema_mismatch" | "target_mismatch" | "revoked" | "suspended" | "expired" | "stale" | "degraded" | "abuse" | "proof_invalid" | "unknown";
/** True only for a state that represents usable public proof. */
export declare function isPositiveProofState(s: ResolverProofState): boolean;
export interface ResolverLookupResult {
    found: boolean;
    /** True only when the target maps to an accepted ECZ-ID resolver key. */
    applicable: boolean;
    /** Strict interpretation of the response; undefined when no lookup ran. */
    proof_state?: ResolverProofState;
    resolver_base: string;
    /** Human proof URL ({base}/p/{ecz_id}); only set when applicable. */
    resolver_url?: string;
    /** Machine proof JSON URL; only set when applicable. */
    machine_json_url?: string;
    http_status?: number;
    network_attempted: boolean;
    network_error?: string;
}
/** True if `value` is a syntactically valid parent or child ECZ-ID. */
export declare function isAcceptedEczId(value: string): boolean;
export interface ResolverUrls {
    human: string;
    machine: string;
    kind: "parent" | "child";
}
/**
 * Derive the canonical Resolver URLs for a valid parent or current seven-family
 * child ECZ-ID. One route serves the parent and every family.
 */
export declare function deriveResolverUrls(target: string, targetType: TargetType, resolverBase?: string, apiBase?: string): ResolverUrls | undefined;
/**
 * Back-compat helper retained for callers that only need the human proof URL.
 * Returns undefined for any non-ECZ-ID / invalid target (no fabricated path).
 */
export declare function deriveResolverUrl(target: string, targetType: TargetType, resolverBase?: string): string | undefined;
/**
 * Interpret a Resolver machine response into a ResolverProofState.
 * `bodyText` is the raw response body; `httpStatus` the HTTP status; `requested`
 * the ECZ-ID that was looked up (for subject-match verification).
 */
export declare function interpretResolverResponse(httpStatus: number, bodyText: string, requested: string): ResolverProofState;
/**
 * Public Resolver lookup. GET-only. HTTPS-only.
 * Performs a real canonical machine lookup ONLY for accepted ECZ-IDs. For any
 * other / invalid target it returns applicable=false WITHOUT attempting a
 * request and WITHOUT fabricating a Resolver URL. The response body is parsed
 * with strict, bounded rules: only an `active` projection yields found=true.
 * Never sends a body or credentials. Never caches.
 */
export declare function lookup(target: string, targetType: TargetType, options?: ResolverLookupOptions): Promise<ResolverLookupResult>;
