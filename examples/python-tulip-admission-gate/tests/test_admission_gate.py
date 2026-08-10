"""Deterministic, offline tests for the admission logic -- no network call,
matching this repo's own emphasis on offline-capable checks. `resolve_posture`
is monkeypatched with fixture postures built from the *real* response shape
this example fetched live from `https://api.ecocitizenz.com/api/p/ECZ-GB-RBS1NW.json`
(EcoCitizenz's own record) during development -- not an invented schema.

One case (`test_connect_allows_with_live_binding_and_evidence`) is
synthetic on purpose, called out in its own docstring: no real ECZ-ID
this example could find today (including EcoCitizenz's own) currently
satisfies the high-risk bar, so there's no real target to demonstrate the
positive `connect_and_grant_tools` auto-allow path against. Rather than
skip testing that branch, the fixture states it explicitly instead of
silently leaving it unverified.
"""

from __future__ import annotations

import pytest
from tulip.control import AdmissionError

import admission
from ecz_id_gate import EczPosture, PolicyMode

_FAIL_CLOSED_STATES = (
    "REVOKED",
    "SUSPENDED",
    "DEGRADED",
    "MISMATCH",
    "PROOF_UNAVAILABLE",
    "PUBLIC_PROJECTION_UNAVAILABLE",
    "ACTIVE_ABUSE_FLAGGED",
    "UNKNOWN",
)

# Trimmed to the fields this example reads, but the values and shape match
# the real https://api.ecocitizenz.com/api/p/ECZ-GB-RBS1NW.json response
# fetched live during development, not an invented schema.
_ECOCITIZENZ_OWN_POSTURE = EczPosture(
    ecz_id="ECZ-GB-RBS1NW",
    reachable=True,
    lifecycle_state="ACTIVE",
    fail_closed_states=_FAIL_CLOSED_STATES,
    binding_state="NO_PUBLIC_PROOF",
    evidence_state="PUBLIC_RECEIPT_AVAILABLE",
    agent_trust_status="AGENT_CREDENTIAL_MISSING",
    high_risk_action="FAIL_CLOSED_UNLESS_LIVE_BINDING_AND_EVIDENCE_AVAILABLE",
)


@pytest.fixture(autouse=True)
def _fresh_audit_trail():
    admission._state.clear()
    yield
    admission._state.clear()


async def _noop():
    return "ok"


@pytest.mark.anyio
async def test_discover_allows_a_clean_posture(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        admission, "resolve_posture", lambda ecz_id, **_: _ECOCITIZENZ_OWN_POSTURE
    )
    result = await admission.admit_mcp_discovery(
        "ECZ-GB-RBS1NW", policy_mode=PolicyMode.OPEN, perform=_noop
    )
    assert result == "ok"


@pytest.mark.anyio
async def test_discover_escalates_when_resolver_unreachable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    unreachable = EczPosture(
        ecz_id="ECZ-GB-000000", reachable=False, error="connection refused"
    )
    monkeypatch.setattr(admission, "resolve_posture", lambda ecz_id, **_: unreachable)
    with pytest.raises(AdmissionError) as excinfo:
        await admission.admit_mcp_discovery(
            "ECZ-GB-000000", policy_mode=PolicyMode.OPEN, perform=_noop
        )
    assert excinfo.value.decision.outcome == "require_human"


@pytest.mark.anyio
async def test_discover_escalates_when_no_id_under_require() -> None:
    with pytest.raises(AdmissionError):
        await admission.admit_mcp_discovery(
            None, policy_mode=PolicyMode.REQUIRE, perform=_noop
        )


@pytest.mark.anyio
async def test_discover_allows_no_id_under_open() -> None:
    """No ECZ-ID declared isn't itself dangerous under OPEN -- most MCP
    servers today have no ECZ-ID at all."""
    result = await admission.admit_mcp_discovery(
        None, policy_mode=PolicyMode.OPEN, perform=_noop
    )
    assert result == "ok"


@pytest.mark.anyio
async def test_connect_escalates_when_high_risk_action_unmet(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The real finding from demo.py: EcoCitizenz's own real record has
    binding_state=NO_PUBLIC_PROOF, so their own declared high_risk_action
    isn't met -- even for their own company."""
    monkeypatch.setattr(
        admission, "resolve_posture", lambda ecz_id, **_: _ECOCITIZENZ_OWN_POSTURE
    )
    with pytest.raises(AdmissionError) as excinfo:
        await admission.admit_mcp_connect_and_grant_tools(
            "ECZ-GB-RBS1NW", policy_mode=PolicyMode.OPEN, perform=_noop
        )
    assert "ecz-high-risk-unmet" in excinfo.value.decision.reason


@pytest.mark.anyio
async def test_connect_allows_with_live_binding_and_evidence(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Synthetic on purpose -- see this file's module docstring. No real
    ECZ-ID found during development actually clears this bar yet, so this
    fixture states the positive case explicitly rather than leaving the
    branch untested."""
    live_bound = EczPosture(
        ecz_id="ECZ-GB-HYPOTHETICAL",
        reachable=True,
        lifecycle_state="ACTIVE",
        fail_closed_states=_FAIL_CLOSED_STATES,
        binding_state="LIVE_BOUND",
        evidence_state="PUBLIC_RECEIPT_AVAILABLE",
        agent_trust_status="AGENT_CREDENTIAL_ISSUED",
        high_risk_action="FAIL_CLOSED_UNLESS_LIVE_BINDING_AND_EVIDENCE_AVAILABLE",
    )
    monkeypatch.setattr(admission, "resolve_posture", lambda ecz_id, **_: live_bound)
    result = await admission.admit_mcp_connect_and_grant_tools(
        "ECZ-GB-HYPOTHETICAL", policy_mode=PolicyMode.OPEN, perform=_noop
    )
    assert result == "ok"


@pytest.mark.anyio
async def test_connect_denies_a_fail_closed_state(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Trusts the target's OWN declared fail_closed_states -- this fixture
    only changes lifecycle_state to one already present in that same
    target's own machine_policy.fail_closed_states list, not a value this
    example invented."""
    revoked = EczPosture(
        ecz_id="ECZ-GB-RBS1NW",
        reachable=True,
        lifecycle_state="REVOKED",
        fail_closed_states=_FAIL_CLOSED_STATES,
        binding_state="NO_PUBLIC_PROOF",
        evidence_state="PUBLIC_RECEIPT_AVAILABLE",
        agent_trust_status="AGENT_CREDENTIAL_MISSING",
        high_risk_action="FAIL_CLOSED_UNLESS_LIVE_BINDING_AND_EVIDENCE_AVAILABLE",
    )
    monkeypatch.setattr(admission, "resolve_posture", lambda ecz_id, **_: revoked)
    with pytest.raises(AdmissionError) as excinfo:
        await admission.admit_mcp_connect_and_grant_tools(
            "ECZ-GB-RBS1NW", policy_mode=PolicyMode.OPEN, perform=_noop
        )
    assert excinfo.value.decision.outcome == "deny"


def test_audit_trail_chain_is_intact_after_mixed_decisions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import asyncio

    monkeypatch.setattr(
        admission, "resolve_posture", lambda ecz_id, **_: _ECOCITIZENZ_OWN_POSTURE
    )

    async def _drive() -> None:
        await admission.admit_mcp_discovery(
            "ECZ-GB-RBS1NW", policy_mode=PolicyMode.OPEN, perform=_noop
        )
        try:
            await admission.admit_mcp_connect_and_grant_tools(
                "ECZ-GB-RBS1NW", policy_mode=PolicyMode.OPEN, perform=_noop
            )
        except AdmissionError:
            pass

    asyncio.run(_drive())
    trail = admission.audit_trail()
    assert len(trail.records()) == 2
    assert trail.verify() is True


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"
