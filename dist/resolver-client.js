// Resolver client. GET-only. HTTPS-only. Read-only.
// Sends no body, no secrets, no source, no private headers.
// Honours --offline / --no-network and a deterministic timeout.
// Never writes to the Resolver. Never calls Backend/Core. Never calls
// TrustOps as a verifier backend.
import { RESOLVER_BASE, DEFAULT_TIMEOUT_MS } from "./constants.js";
/**
 * Derive the public Resolver URL to GET for a given target.
 * Returns undefined when the target shape gives no defensible public URL,
 * in which case the verifier reports missing proof rather than inventing one.
 */
export function deriveResolverUrl(target, targetType, resolverBase) {
    const base = resolverBase.replace(/\/+$/, "");
    if (targetType === "ecz_id") {
        return `${base}/eczid/${encodeURIComponent(target)}`;
    }
    if (targetType === "mcp_server" || targetType === "agent_manifest") {
        // For well-known manifest URLs, the target itself is the public read.
        // Return the URL as-is so the lookup() HTTPS guard can reject http://.
        if (/^https?:\/\//i.test(target))
            return target;
        return undefined;
    }
    return undefined;
}
/**
 * Public Resolver lookup. GET-only. HTTPS-only.
 * Reads only the public proof projection. Never sends a body. Never sends
 * credentials. Treats any non-2xx as missing proof (does not invent proof).
 */
export async function lookup(target, targetType, options = {}) {
    const resolver_base = options.resolverBase ?? RESOLVER_BASE;
    if (options.noNetwork) {
        return { found: false, resolver_base, network_attempted: false };
    }
    const url = deriveResolverUrl(target, targetType, resolver_base);
    if (!url) {
        return { found: false, resolver_base, network_attempted: false };
    }
    if (!/^https:\/\//i.test(url)) {
        return {
            found: false,
            resolver_base,
            network_attempted: false,
            network_error: "non_https_blocked"
        };
    }
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            method: "GET",
            signal: ac.signal,
            headers: { Accept: "application/json" },
            redirect: "follow"
        });
        if (res.status >= 200 && res.status < 300) {
            // Best-effort parse to confirm machine-readable JSON. The body is not
            // surfaced; only the existence of public proof is reported.
            try {
                await res.json();
            }
            catch {
                /* tolerated: a 2xx with non-JSON body still counts as a public response */
            }
            return {
                found: true,
                resolver_base,
                resolver_url: url,
                machine_json_url: url,
                http_status: res.status,
                network_attempted: true
            };
        }
        return {
            found: false,
            resolver_base,
            resolver_url: url,
            http_status: res.status,
            network_attempted: true
        };
    }
    catch (e) {
        return {
            found: false,
            resolver_base,
            resolver_url: url,
            network_attempted: true,
            network_error: e instanceof Error ? e.name : "unknown_error"
        };
    }
    finally {
        clearTimeout(timer);
    }
}
