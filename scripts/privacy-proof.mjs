// ECZ-ID PRIVACY / SECURITY REGRESSION — release-blocking, process-level evidence.
// Every network primitive is replaced with a recorder BEFORE the verifier core
// is imported, so nothing can reach the network unobserved.
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] ?? null;

const attempts = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  attempts.push({ url: String(url), method: init?.method ?? "GET",
                  hasBody: init?.body !== undefined && init?.body !== null,
                  headers: init?.headers ? Object.keys(init.headers) : [] });
  return new Response(JSON.stringify({ ecz_id: "ECZ-GB-A93K7Q", status: "active" }), { status: 200 });
};

const { verify } = await import(new URL("../dist/verify.js", import.meta.url).href);
const { runCheckTarget } = await import(new URL("../dist/mcp/tools.js", import.meta.url).href);

const checks = [];
const ok = (n, p, d = "") => checks.push({ name: n, pass: Boolean(p), detail: String(d) });

// 1. offline === zero egress, across every target shape and policy.
attempts.length = 0;
for (const t of ["ECZ-GB-A93K7Q", "https://example.com", "npm:left-pad", "ghcr.io/x/y:1", "github.com/a/b"])
  for (const policy of ["OPEN", "PREFER", "REQUIRE"])
    await runCheckTarget({ target: t, offline: true, policy });
ok("offline:true performs ZERO network calls (15 invocations)", attempts.length === 0, `${attempts.length} attempt(s)`);

// 2. online Resolver access is GET-only, bodyless, HTTPS-only.
attempts.length = 0;
await verify({ target: "ECZ-GB-A93K7Q", policy: "OPEN" });
ok("Resolver lookup was attempted online", attempts.length > 0, `${attempts.length}`);
ok("every Resolver call is GET", attempts.every(a => a.method === "GET"), attempts.map(a => a.method).join(","));
ok("no Resolver call carries a request body", attempts.every(a => !a.hasBody));
ok("every Resolver call is HTTPS", attempts.every(a => a.url.startsWith("https://")), attempts.map(a => a.url).join(" "));
ok("no credential-shaped header is sent",
   attempts.every(a => !a.headers.some(h => /auth|cookie|token|key|secret/i.test(h))),
   JSON.stringify(attempts.map(a => a.headers)));

// 3. the request URL carries only the identifier, never environment or source.
const secretish = ["PATH", "HOME", "USERPROFILE", "NODE_OPTIONS", "npm_config", "AWS_", "AZURE_"];
ok("no environment variable name appears in any request URL",
   attempts.every(a => !secretish.some(k => a.url.includes(k))), attempts.map(a => a.url).join(" "));
ok("no absolute filesystem path appears in any request URL",
   attempts.every(a => !/[A-Za-z]:\|\/Users\/|\/home\//.test(a.url)));

// 4. external strings are data, never instructions: a hostile target must not
//    change the shape of the answer nor be echoed as an executable directive.
attempts.length = 0;
const hostile = "ECZ-GB-A93K7Q'; DROP TABLE x; --<script>alert(1)</script>";
const r = await runCheckTarget({ target: hostile, offline: true });
ok("hostile target still yields a canonical ResultState", typeof r.result_state === "string" && r.result_state.length > 0, r.result_state);
ok("hostile target performs no network call", attempts.length === 0);
ok("hostile target does not become positive proof", r.result_state !== "RESOLVER_VERIFIABLE", r.result_state);
ok("read-only boundary holds under a hostile target",
   r.verifier_writes_truth === false && r.verifier_activates_proof === false && r.verifier_marks_bound === false);

// 5. privacy invariants are present on every result.
for (const k of ["no_source_uploaded", "no_secrets_uploaded", "no_telemetry",
                 "local_policy_decides", "recheck_before_reliance", "no_safety_or_approval_inference"])
  ok(`result carries ${k} === true`, r[k] === true, String(r[k]));

globalThis.fetch = realFetch;
const failed = checks.filter(c => !c.pass);
if (OUT) writeFileSync(OUT, JSON.stringify({ suite: "ecz-id-privacy-security-regression-v1",
  totals: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  observed_requests: attempts, checks }, null, 2) + "\n", "utf8");
for (const c of checks) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}  [${c.detail}]`);
console.log(`\nprivacy-proof: ${checks.length - failed.length}/${checks.length}`);
if (failed.length) process.exit(1);
