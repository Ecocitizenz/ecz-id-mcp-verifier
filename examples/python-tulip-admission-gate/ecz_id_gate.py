"""ECZ-ID Resolver posture as one input into a real admission decision.

This example is deliberately *not* another verifier CLI wrapper -- it's a
worked answer to "what does a caller actually do with the posture once it
has it?" Verifier output tells a caller what a target's public Resolver
posture is. It never decides what to do about that -- "local policy
decides" is this project's own stated design. This example is one real
local policy: a governed-agent gate (tulip-agents, https://tulipagents.ai,
a real dependency of this example only, declared in requirements.txt
alongside this repo) that consults a target's ECZ-ID posture before
letting an agent connect to it, and produces a tamper-evident audit trail
of every decision.

Two things worth calling out about how this reads posture:

1. It calls the real, public, no-auth `machine_json_url`
   (`https://api.ecocitizenz.com/api/p/{ecz_id}.json`, the same one this
   repo's own `examples/json-output-resolver-verifiable.json` documents)
   directly over HTTPS -- GET-only, no source/secrets/telemetry, matching
   this repo's own privacy posture exactly. It does not shell out to the
   npm CLI; the point was to show the *pattern* (feed Resolver truth into
   a governance decision) working from a second language and a second
   project, not to wrap this repo's own binary.

2. It reads `resolver_v2.machine_policy.fail_closed_states` and
   `.high_risk_action` **from the response itself** rather than
   hardcoding a local guess at which lifecycle states are dangerous.
   The target's own record already declares that; duplicating it as a
   second, driftable source of truth in a downstream policy would be the
   wrong call.

Borrows this repo's own OPEN / PREFER / REQUIRE vocabulary
(`examples/cli-policy-modes.md`) for the same three-tier meaning, rather
than inventing new terms for the same idea.
"""

from __future__ import annotations

import dataclasses
from enum import Enum
from typing import Any

import httpx

MACHINE_JSON_URL_TEMPLATE = "https://api.ecocitizenz.com/api/p/{ecz_id}.json"

# Resolver state considered sufficient for `high_risk_action ==
# FAIL_CLOSED_UNLESS_LIVE_BINDING_AND_EVIDENCE_AVAILABLE` to be satisfied
# automatically. Everything else under that policy escalates.
_LIVE_EVIDENCE_STATE = "PUBLIC_RECEIPT_AVAILABLE"
_NO_BINDING_STATES = frozenset({None, "NO_PUBLIC_PROOF"})


class PolicyMode(str, Enum):
    """Same three tiers and the same meaning as this repo's own CLI
    (`examples/cli-policy-modes.md`) -- reused rather than reinvented."""

    OPEN = "OPEN"
    PREFER = "PREFER"
    REQUIRE = "REQUIRE"


@dataclasses.dataclass(frozen=True, slots=True)
class EczPosture:
    """What this example actually looked up, real fields from a real
    response -- or `reachable=False` with `error` set, never silently
    treated as "fine."."""

    ecz_id: str
    reachable: bool
    lifecycle_state: str | None = None
    fail_closed_states: tuple[str, ...] = ()
    binding_state: str | None = None
    evidence_state: str | None = None
    agent_trust_status: str | None = None
    high_risk_action: str | None = None
    error: str | None = None

    @property
    def is_fail_closed_state(self) -> bool:
        """True if the target's OWN declared policy says this lifecycle
        state should fail closed -- not a locally hardcoded guess."""
        return self.lifecycle_state in self.fail_closed_states

    @property
    def has_live_binding_and_evidence(self) -> bool:
        return (
            self.binding_state not in _NO_BINDING_STATES
            and self.evidence_state == _LIVE_EVIDENCE_STATE
        )


def resolve_posture(ecz_id: str, *, timeout: float = 10.0) -> EczPosture:
    """A real, live GET against the public machine-JSON Resolver endpoint.

    No auth, no write, no telemetry -- the same privacy posture this
    repo's own verifier documents for itself. Never raises: an
    unreachable or malformed response comes back as
    `EczPosture(reachable=False, error=...)`, not an exception, so a
    caller can't accidentally let a network hiccup fall through as "no
    problem found."

    Default timeout is 10s, not the more typical 5s -- observed live
    response time against the real endpoint during development was
    consistently ~5s on its own, and a tighter default flaked in testing
    for no reason other than being too close to that baseline.
    """
    url = MACHINE_JSON_URL_TEMPLATE.format(ecz_id=ecz_id)
    try:
        response = httpx.get(url, timeout=timeout)
        response.raise_for_status()
        data: dict[str, Any] = response.json()
    except Exception as exc:  # noqa: BLE001 -- any failure here is "unreachable", not a crash
        return EczPosture(ecz_id=ecz_id, reachable=False, error=str(exc))

    v2 = data.get("resolver_v2") or {}
    state = v2.get("state") or {}
    binding = v2.get("binding") or {}
    evidence = v2.get("evidence") or {}
    agent_trust = v2.get("agent_trust") or {}
    machine_policy = v2.get("machine_policy") or {}

    return EczPosture(
        ecz_id=ecz_id,
        reachable=True,
        lifecycle_state=state.get("lifecycle_state"),
        fail_closed_states=tuple(machine_policy.get("fail_closed_states") or ()),
        binding_state=binding.get("state"),
        evidence_state=evidence.get("public_receipt_state"),
        agent_trust_status=agent_trust.get("status"),
        high_risk_action=machine_policy.get("high_risk_action"),
    )
