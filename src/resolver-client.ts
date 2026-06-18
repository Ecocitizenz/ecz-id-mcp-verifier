// Resolver client. GET-only. HTTPS-only. Read-only.
// Sends no body, no secrets, no source, no private headers.
// Honours --offline / --no-network and a deterministic timeout.
// Never writes to the Resolver. Never calls Backend/Core. Never calls
// TrustOps as a verifier backend.
//
// Canonical route contract (verified read-only, Phase 1):
//   - The Resolver performs INTENTIONAL resolution of an ECZ-ID only.
//   - Human proof page:   {RESOLVER_BASE}/p/{ecz_id}
//   - Machine proof JSON:  {RESOLVER_API_BASE}/api/p/{ecz_id}.json
//   - It is NOT a directory: arbitrary URLs, repositories, packages, container
//     images and MCP server URLs are NOT resolvable. The client therefore never
//     fabricates a Resolver path from a non-ECZ-ID target.
//   - "Not found" is only reported when a real canonical machine lookup ran.

import { RESOLVER_BASE, RESOLVER_API_BASE, DEFAULT_TIMEOUT_MS } from "./constants.js";
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

// Accepted ECZ-ID identifier formats (verified read-only, Phase 1):
//   parent: ECZ-XX-XXXXXX            e.g. ECZ-GB-ABC123
//   child:  ECZ-XX-XXXXXX::TYPE-XXXX e.g. ECZ-GB-ABC123::AGENT_CREDENTIAL-7F2A
const PARENT_ECZ_ID = /^ECZ-[A-Z]{2}-[A-Za-z0-9]+$/;
const CHILD_ECZ_ID = /^ECZ-[A-Z]{2}-[A-Za-z0-9]+::[A-Z][A-Z0-9_]*-[A-Za-z0-9]+$/;

/** True if `value` is a syntactically valid parent or child ECZ-ID. */
export function isAcceptedEczId(value: string): boolean {
  return PARENT_ECZ_ID.test(value) || CHILD_ECZ_ID.test(value);
}

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
export function deriveResolverUrls(
  target: string,
  targetType: TargetType,
  resolverBase: string = RESOLVER_BASE,
  apiBase: string = RESOLVER_API_BASE
): ResolverUrls | undefined {
  if (targetType !== "ecz_id") return undefined;
  if (!isAcceptedEczId(target)) return undefined;
  const human = `${resolverBase.replace(/\/+$/, "")}/p/${encodeURIComponent(target)}`;
  const machine = `${apiBase.replace(/\/+$/, "")}/api/p/${encodeURIComponent(target)}.json`;
  return { human, machine };
}

/**
 * Back-compat helper retained for callers that only need the human proof URL.
 * Returns undefined for any non-ECZ-ID target (no fabricated path).
 */
export function deriveResolverUrl(
  target: string,
  targetType: TargetType,
  resolverBase: string = RESOLVER_BASE
): string | undefined {
  return deriveResolverUrls(target, targetType, resolverBase)?.human;
}

/**
 * Public Resolver lookup. GET-only. HTTPS-only.
 * Performs a real canonical machine lookup ONLY for accepted ECZ-IDs. For any
 * other target it returns applicable=false WITHOUT attempting a request and
 * WITHOUT fabricating a Resolver URL. Treats any non-2xx as missing proof
 * (does not invent proof). Never sends a body or credentials.
 */
export async function lookup(
  target: string,
  targetType: TargetType,
  options: ResolverLookupOptions = {}
): Promise<ResolverLookupResult> {
  const resolver_base = options.resolverBase ?? RESOLVER_BASE;
  const urls = deriveResolverUrls(
    target,
    targetType,
    resolver_base,
    options.apiBase ?? RESOLVER_API_BASE
  );

  // Non-ECZ-ID target: not directly resolvable. No request, no fabricated path.
  if (!urls) {
    return { found: false, applicable: false, resolver_base, network_attempted: false };
  }

  if (options.noNetwork) {
    return {
      found: false,
      applicable: true,
      resolver_base,
      resolver_url: urls.human,
      network_attempted: false
    };
  }

  if (!/^https:\/\//i.test(urls.machine)) {
    return {
      found: false,
      applicable: true,
      resolver_base,
      resolver_url: urls.human,
      network_attempted: false,
      network_error: "non_https_blocked"
    };
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(urls.machine, {
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
      } catch {
        /* tolerated: a 2xx with non-JSON body still counts as a public response */
      }
      return {
        found: true,
        applicable: true,
        resolver_base,
        resolver_url: urls.human,
        machine_json_url: urls.machine,
        http_status: res.status,
        network_attempted: true
      };
    }
    return {
      found: false,
      applicable: true,
      resolver_base,
      resolver_url: urls.human,
      http_status: res.status,
      network_attempted: true
    };
  } catch (e) {
    return {
      found: false,
      applicable: true,
      resolver_base,
      resolver_url: urls.human,
      network_attempted: true,
      network_error: e instanceof Error ? e.name : "unknown_error"
    };
  } finally {
    clearTimeout(timer);
  }
}
