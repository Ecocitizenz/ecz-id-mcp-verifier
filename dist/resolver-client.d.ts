import type { TargetType } from "./classify-target.js";
export interface ResolverLookupOptions {
    resolverBase?: string;
    apiBase?: string;
    noNetwork?: boolean;
    timeoutMs?: number;
}
/**
 * Deterministic interpretation of a Resolver machine response. `active` is the
 * ONLY state that represents usable public proof. Everything else is a
 * non-positive state that local policy must weigh.
 */
export type ResolverProofState = "active" | "child_machine_unproven" | "not_found" | "unavailable" | "malformed" | "schema_mismatch" | "target_mismatch" | "revoked" | "suspended" | "expired" | "stale" | "degraded" | "abuse" | "proof_invalid" | "unknown";
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
    /**
     * Machine proof JSON URL. Present ONLY for a parent ECZ-ID (the proven
     * `/api/p/{parent}.json` endpoint). Omitted for a child, because no child
     * machine projection endpoint is documented/proven.
     */
    machine?: string;
    kind: "parent" | "child";
}
/**
 * Derive the canonical Resolver URLs for a target.
 *
 * Returns URLs ONLY when the target maps deterministically to a VALID ECZ-ID
 * (parent or child). For any other shape — URL, repository, package, container
 * image, MCP server URL, free text, or a malformed ECZ-ID — returns `undefined`.
 * The client never invents a Resolver path.
 *
 * Routes (locked):
 *   - Parent human:   {base}/p/{parent}
 *   - Parent machine: {api}/api/p/{parent}.json  (proven)
 *   - Child human:    {base}/p/{parent}/{passport_code}/{instance_suffix}
 *     (decomposed external form — NEVER a percent-encoded internal child ID)
 *   - Child machine:  none (no documented/proven child machine endpoint)
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
