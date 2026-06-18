// Resolver client. GET-only. HTTPS-only. Read-only.
// Sends no body, no secrets, no source, no private headers.
// Honours --offline / --no-network and a deterministic timeout.
// Never writes to the Resolver. Never calls Backend/Core. Never calls
// TrustOps as a verifier backend.
//
// Canonical route contract (verified read-only against the live Resolver and
// the backend public-projection source `ecz_id_passport_blob_endpoints.py`):
//   - The Resolver performs INTENTIONAL resolution of an ECZ-ID only.
//   - Parent + child human proof page:  {RESOLVER_BASE}/p/{ecz_id}
//   - Parent + child machine proof JSON: {RESOLVER_API_BASE}/api/p/{ecz_id}.json
//     The public child representation decomposes (parent ECZ-ID, passport code,
//     instance suffix) inside the JSON body; there is no separate documented
//     child endpoint, so the verifier never fabricates one.
//   - It is NOT a directory: arbitrary URLs, repositories, packages, container
//     images and MCP server URLs are NOT resolvable. The client therefore never
//     fabricates a Resolver path from a non-ECZ-ID target.
//   - "Not found" is only reported when a real canonical machine lookup ran.
//
// Lifecycle semantics (ISSUE 3): an HTTP 200 ALONE never means valid proof. The
// machine body is parsed with strict, bounded rules; malformed, unknown-schema,
// target-mismatched, revoked, suspended, expired, stale, degraded or abuse
// states are mapped deterministically and are NEVER treated as positive proof.
import { RESOLVER_BASE, RESOLVER_API_BASE, DEFAULT_TIMEOUT_MS } from "./constants.js";
import { isValidEczId, parseEczId } from "./ecz-id.js";
/** True only for a state that represents usable public proof. */
export function isPositiveProofState(s) {
    return s === "active";
}
/** True if `value` is a syntactically valid parent or child ECZ-ID. */
export function isAcceptedEczId(value) {
    return isValidEczId(value);
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
export function deriveResolverUrls(target, targetType, resolverBase = RESOLVER_BASE, apiBase = RESOLVER_API_BASE) {
    if (targetType !== "ecz_id")
        return undefined;
    const parsed = parseEczId(target);
    if (!parsed.valid || !parsed.parent)
        return undefined;
    const base = resolverBase.replace(/\/+$/, "");
    const api = apiBase.replace(/\/+$/, "");
    if (parsed.kind === "child") {
        // Decomposed external URL. The parser restricts each segment to [A-Z0-9-],
        // so no percent-encoding is applied (and the internal `::` form is never
        // used as a path).
        const human = `${base}/p/${parsed.parent}/${parsed.passportCode}/${parsed.instanceSuffix}`;
        return { human, kind: "child" }; // child machine endpoint is unproven -> omitted
    }
    const human = `${base}/p/${parsed.parent}`;
    const machine = `${api}/api/p/${parsed.parent}.json`;
    return { human, machine, kind: "parent" };
}
/**
 * Back-compat helper retained for callers that only need the human proof URL.
 * Returns undefined for any non-ECZ-ID / invalid target (no fabricated path).
 */
export function deriveResolverUrl(target, targetType, resolverBase = RESOLVER_BASE) {
    return deriveResolverUrls(target, targetType, resolverBase)?.human;
}
// ---------------------------------------------------------------------------
// Strict, bounded machine-body interpretation.
//
// Authoritative public fields (read-only, sourced from the backend
// `GET /api/p/{ecz_id}.json` projection):
//   ecz_id, status, lifecycle_state, verification_state, abuse_state,
//   trust_assertion.revoked, pulseguard.overall_validity.
// Private fields are never surfaced. Only the derived ResolverProofState leaves
// this module.
// ---------------------------------------------------------------------------
function asString(v) {
    return typeof v === "string" ? v : "";
}
/**
 * Interpret a Resolver machine response into a ResolverProofState.
 * `bodyText` is the raw response body; `httpStatus` the HTTP status; `requested`
 * the ECZ-ID that was looked up (for subject-match verification).
 */
export function interpretResolverResponse(httpStatus, bodyText, requested) {
    // Non-2xx mapping. 404/410 -> no proof; everything else -> unavailable.
    if (httpStatus === 404 || httpStatus === 410)
        return "not_found";
    if (httpStatus < 200 || httpStatus >= 300)
        return "unavailable";
    // 2xx: the body must be parseable JSON. A 200 alone is never proof.
    let body;
    try {
        body = JSON.parse(bodyText);
    }
    catch {
        return "malformed";
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return "schema_mismatch";
    }
    const obj = body;
    // A recognised public projection always carries a top-level `ecz_id`. An
    // error envelope (e.g. {"error": "..."}) without it is not proof.
    const subject = asString(obj.ecz_id);
    if (!subject)
        return "schema_mismatch";
    // Subject must match the requested ECZ-ID (case-insensitive: the backend
    // upper-cases). A projection for a different subject is a mismatch.
    if (subject.toUpperCase() !== requested.toUpperCase())
        return "target_mismatch";
    const status = asString(obj.status).toLowerCase();
    const lifecycle = asString(obj.lifecycle_state).toUpperCase();
    const verification = asString(obj.verification_state).toUpperCase();
    const abuse = asString(obj.abuse_state).toUpperCase();
    const ta = obj.trust_assertion;
    const taRevoked = typeof ta === "object" && ta !== null && ta.revoked === true;
    const pulse = typeof obj.pulseguard === "object" && obj.pulseguard !== null
        ? asString(obj.pulseguard.overall_validity).toUpperCase()
        : "";
    // Negative / lifecycle signals dominate over any "active" claim, in a fixed
    // precedence so the mapping is deterministic. None of these is positive proof.
    if (taRevoked || status === "revoked" || lifecycle === "REVOKED" || verification === "REVOKED") {
        return "revoked";
    }
    if (status === "suspended" || lifecycle === "SUSPENDED" || verification === "SUSPENDED") {
        return "suspended";
    }
    if (status === "expired" || lifecycle === "EXPIRED" || verification === "EXPIRED") {
        return "expired";
    }
    if (status === "abuse_flagged" ||
        lifecycle === "ACTIVE_ABUSE_FLAGGED" ||
        verification === "SUSPECTED_REUSE" ||
        (abuse !== "" && abuse !== "NONE")) {
        return "abuse";
    }
    if (verification === "PROOF_INVALID" || verification === "SIGNATURE_INVALID") {
        return "proof_invalid";
    }
    if (status === "stale" || lifecycle === "STALE" || pulse === "STALE") {
        return "stale";
    }
    if (status === "degraded" || lifecycle === "DEGRADED" || verification === "DEGRADED") {
        return "degraded";
    }
    // Positive proof requires an EXPLICIT active/current signal — never HTTP 200
    // alone, and never merely the presence of a trust_assertion block (which the
    // backend always includes).
    const activeSignal = status === "active" || lifecycle === "ACTIVE" || verification === "VERIFIED";
    if (activeSignal)
        return "active";
    // Recognised projection, but no understood lifecycle signal -> not proof.
    return "unknown";
}
/**
 * Public Resolver lookup. GET-only. HTTPS-only.
 * Performs a real canonical machine lookup ONLY for accepted ECZ-IDs. For any
 * other / invalid target it returns applicable=false WITHOUT attempting a
 * request and WITHOUT fabricating a Resolver URL. The response body is parsed
 * with strict, bounded rules: only an `active` projection yields found=true.
 * Never sends a body or credentials. Never caches.
 */
export async function lookup(target, targetType, options = {}) {
    const resolver_base = options.resolverBase ?? RESOLVER_BASE;
    const urls = deriveResolverUrls(target, targetType, resolver_base, options.apiBase ?? RESOLVER_API_BASE);
    // Non-ECZ-ID / invalid target: not directly resolvable. No request, no path.
    if (!urls) {
        return { found: false, applicable: false, resolver_base, network_attempted: false };
    }
    // Child identifier: the decomposed human URL is retained, but there is no
    // documented/proven child machine projection endpoint. Do NOT fetch and do
    // NOT reuse the parent machine endpoint. machine_json_url stays null and no
    // proof is claimed (child machine projection unavailable/unproven).
    if (urls.kind === "child" || !urls.machine) {
        return {
            found: false,
            applicable: true,
            proof_state: "child_machine_unproven",
            resolver_base,
            resolver_url: urls.human,
            network_attempted: false
        };
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
            // Honour no-store freshness: never serve a cached projection as proof.
            headers: { Accept: "application/json", "Cache-Control": "no-store" },
            cache: "no-store",
            redirect: "follow"
        });
        let bodyText = "";
        try {
            bodyText = await res.text();
        }
        catch {
            /* tolerated: interpretation handles an empty/unreadable body */
        }
        const proof_state = interpretResolverResponse(res.status, bodyText, target);
        return {
            found: isPositiveProofState(proof_state),
            applicable: true,
            proof_state,
            resolver_base,
            resolver_url: urls.human,
            // Only advertise the machine URL as proof when the projection is active.
            machine_json_url: proof_state === "active" ? urls.machine : undefined,
            http_status: res.status,
            network_attempted: true
        };
    }
    catch (e) {
        return {
            found: false,
            applicable: true,
            proof_state: "unavailable",
            resolver_base,
            resolver_url: urls.human,
            network_attempted: true,
            network_error: e instanceof Error ? e.name : "unknown_error"
        };
    }
    finally {
        clearTimeout(timer);
    }
}
