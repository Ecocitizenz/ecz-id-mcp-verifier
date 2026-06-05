import type { TargetType } from "./classify-target.js";
export interface ResolverLookupOptions {
    resolverBase?: string;
    noNetwork?: boolean;
    timeoutMs?: number;
}
export interface ResolverLookupResult {
    found: boolean;
    resolver_base: string;
    resolver_url?: string;
    machine_json_url?: string;
    http_status?: number;
    network_attempted: boolean;
    network_error?: string;
}
/**
 * Derive the public Resolver URL to GET for a given target.
 * Returns undefined when the target shape gives no defensible public URL,
 * in which case the verifier reports missing proof rather than inventing one.
 */
export declare function deriveResolverUrl(target: string, targetType: TargetType, resolverBase: string): string | undefined;
/**
 * Public Resolver lookup. GET-only. HTTPS-only.
 * Reads only the public proof projection. Never sends a body. Never sends
 * credentials. Treats any non-2xx as missing proof (does not invent proof).
 */
export declare function lookup(target: string, targetType: TargetType, options?: ResolverLookupOptions): Promise<ResolverLookupResult>;
