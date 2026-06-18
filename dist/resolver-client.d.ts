import type { TargetType } from "./classify-target.js";
export interface ResolverLookupOptions {
    resolverBase?: string;
    apiBase?: string;
    noNetwork?: boolean;
    timeoutMs?: number;
}
export interface ResolverLookupResult {
    found: boolean;
    /** True only when the target maps to an accepted ECZ-ID resolver key. */
    applicable: boolean;
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
}
/**
 * Derive the canonical Resolver URLs for a target.
 *
 * Returns the human proof URL and machine JSON URL ONLY when the target maps
 * deterministically to an accepted ECZ-ID. For any other target shape — URL,
 * repository, package, container image, MCP server URL, free text — it returns
 * `undefined`. The client never invents a Resolver path from a non-ECZ-ID.
 */
export declare function deriveResolverUrls(target: string, targetType: TargetType, resolverBase?: string, apiBase?: string): ResolverUrls | undefined;
/**
 * Back-compat helper retained for callers that only need the human proof URL.
 * Returns undefined for any non-ECZ-ID target (no fabricated path).
 */
export declare function deriveResolverUrl(target: string, targetType: TargetType, resolverBase?: string): string | undefined;
/**
 * Public Resolver lookup. GET-only. HTTPS-only.
 * Performs a real canonical machine lookup ONLY for accepted ECZ-IDs. For any
 * other target it returns applicable=false WITHOUT attempting a request and
 * WITHOUT fabricating a Resolver URL. Treats any non-2xx as missing proof
 * (does not invent proof). Never sends a body or credentials.
 */
export declare function lookup(target: string, targetType: TargetType, options?: ResolverLookupOptions): Promise<ResolverLookupResult>;
