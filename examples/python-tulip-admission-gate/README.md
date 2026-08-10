# Python + tulip-agents: ECZ-ID posture as an admission-policy signal

A worked answer to a question this repo's own README raises but
deliberately doesn't answer: verifier output tells a caller a target's
public Resolver posture. It never decides what to do about that --
"local policy decides" is this project's own stated design, correctly.
This is one real local policy.

[tulip-agents](https://tulipagents.ai) is a governed-agent SDK: every
side-effecting action goes through `admit()` against a policy, with a
tamper-evident audit trail of every decision. This example uses ECZ-ID
Resolver posture as one input into a real `admit()` decision about
whether an agent may connect to, and be granted tools from, an MCP
server -- before the connection happens, not after.

## What it does

Two capability classes:

- **`mcp.discover`** -- reading who a server claims to be. Low blast
  radius, auto-allowed even with no ECZ-ID declared (most MCP servers
  today have none -- that's not itself dangerous).
- **`mcp.connect_and_grant_tools`** -- actually wiring the server's
  tools into an agent's toolset. Here the target's own declared
  `resolver_v2.machine_policy.high_risk_action` is enforced: without
  live binding + evidence, this escalates to a human rather than
  auto-allowing.

Deliberately reads `machine_policy.fail_closed_states` and
`.high_risk_action` **from the live response itself**, not a locally
hardcoded guess at which lifecycle states are dangerous -- the target's
own record already declares that.

Calls the real, public, no-auth `machine_json_url`
(`https://api.ecocitizenz.com/api/p/{ecz_id}.json`, the same one
`examples/json-output-resolver-verifiable.json` in this repo documents)
directly over HTTPS. GET-only, no source/secrets/telemetry -- the same
privacy posture this repo's own verifier documents for itself. It does
not shell out to this repo's own CLI; the point was to show the pattern
working from a second language and a second project.

## Try it

```bash
pip install -r requirements.txt
python demo.py
```

## Verified, live, no mocks

```
[discover EcoCitizenz's own real ECZ-ID (OPEN)]
  ALLOWED -> discovery read executed

[connect+grant-tools on EcoCitizenz's own real ECZ-ID (OPEN)]
  REQUIRE_HUMAN -> blast radius 5 exceeds the maximum 1;
  labels ['ecz-high-risk-unmet'] require human approval

[discover a server with no ECZ-ID declared, REQUIRE mode]
  REQUIRE_HUMAN -> labels ['ecz-no-id-under-require'] require human approval

[connect+grant-tools on a nonexistent ECZ-ID (real network call, real failure)]
  REQUIRE_HUMAN -> labels ['ecz-resolver-unreachable'] require human approval

audit trail: 4 decisions, chain intact: True
```

One real, disclosed finding along the way: **EcoCitizenz's own real
Resolver record doesn't clear its own declared high-risk bar today** --
`binding.state` is `NO_PUBLIC_PROOF`, so `connect_and_grant_tools`
escalates even for EcoCitizenz's own company. Not a bug in this example;
it's what their own live data says right now, and it's exactly the kind
of gap this layered check exists to surface rather than paper over.

`pytest tests/` runs 8 fully offline, deterministic tests (including the
one case -- `test_connect_allows_with_live_binding_and_evidence` -- that
had no real target to test against as of this writing, built from a
disclosed synthetic fixture instead of silently going untested) plus 2
live tests against the real API, opt-in via `ECZ_LIVE_TESTS=1` so this
doesn't hit a third party's production endpoint on every fork's CI by
default.

## What this is not

Not a replacement for this repo's own verifier, and not a claim that
ECZ-ID posture alone should gate every MCP connection -- it's one
signal, fed into one real policy, as a worked example of the pattern.
Doesn't certify safety, doesn't infer approval, doesn't write truth --
same non-claims this repo's own README makes for itself. Re-check
before reliance. Local policy decides.
