"""Turns an `EczPosture` (see ecz_id_gate.py) into a real, governed,
audited decision about whether an agent may connect to an MCP server --
using tulip-agents' `admit()` (https://tulipagents.ai), a real dependency
of this example only.

Two capability classes, on purpose:

- `mcp.discover` -- just resolving who a server claims to be. Low
  blast radius; auto-allowed even with no ECZ-ID declared, since a
  discovery-only read isn't itself the dangerous part.
- `mcp.connect_and_grant_tools` -- actually wiring the server's tools
  into an agent's toolset. This is where `high_risk_action` (the
  target's own declared policy) gets enforced: without live binding +
  evidence, this escalates rather than auto-allowing.

Every decision -- allowed, escalated, or denied -- lands on a real,
hash-chained `AuditTrail`.
"""

from __future__ import annotations

from tulip.control import Action, AuditTrail, ControlPolicy, admit

from ecz_id_gate import PolicyMode, resolve_posture

# Two policies, picked by whether posture resolution raised a real flag --
# same split this pattern already uses elsewhere (a permissive policy for
# the clean path, a strict one once a tag is present). `require_human_for`
# and `deny_for` match against an Action's own `tags`; `require_verification_score`
# is unrelated to this gate (no GSAR verdict is ever supplied here) and is
# set to 0.0 on both so it never silently forces escalation on its own --
# every escalation below is driven by an explicit ECZ-ID posture tag, not
# by an unrelated confidence-score default.
_CLEAN_POLICY = ControlPolicy(
    require_verification_score=0.0,
    require_human_for=frozenset(),
    max_blast_radius=10,
)

# `deny_for` only contains the one case that is the *target's own*
# declared policy, not a local guess (see EczPosture.is_fail_closed_state)
# -- everything else here escalates to a human rather than being silently
# denied, since an unreachable resolver or a missing ECZ-ID is ambiguous,
# not proven dangerous.
_FLAGGED_POLICY = ControlPolicy(
    require_verification_score=0.0,
    require_human_for=frozenset(
        {
            "ecz-resolver-unreachable",
            "ecz-no-id-under-require",
            "ecz-high-risk-unmet",
        }
    ),
    deny_for=frozenset({"ecz-fail-closed-state"}),
    max_blast_radius=1,
)


def _policy_for(tags: frozenset[str]) -> ControlPolicy:
    return _CLEAN_POLICY if not tags else _FLAGGED_POLICY


_state: dict[str, AuditTrail] = {}


def audit_trail() -> AuditTrail:
    if "trail" not in _state:
        _state["trail"] = AuditTrail()
    return _state["trail"]


def _discover_action(ecz_id: str | None, tags: frozenset[str]) -> Action:
    return Action(
        name="mcp.discover",
        asset=ecz_id or "unidentified-mcp-server",
        blast_radius=1,
        environment="production",
        kind="mcp-discover",
        tags=tags,
    )


def _connect_action(ecz_id: str | None, tags: frozenset[str]) -> Action:
    return Action(
        name="mcp.connect_and_grant_tools",
        asset=ecz_id or "unidentified-mcp-server",
        blast_radius=5,
        environment="production",
        kind="mcp-connect-and-grant-tools",
        tags=tags,
    )


async def admit_mcp_discovery(ecz_id: str | None, *, policy_mode: PolicyMode, perform):
    """Gate a discovery-only read of an MCP server's declared identity."""
    tags: set[str] = set()
    if ecz_id is None and policy_mode is PolicyMode.REQUIRE:
        tags.add("ecz-no-id-under-require")
    elif ecz_id is not None:
        posture = resolve_posture(ecz_id)
        if not posture.reachable:
            tags.add("ecz-resolver-unreachable")
        elif posture.is_fail_closed_state:
            tags.add("ecz-fail-closed-state")

    frozen_tags = frozenset(tags)
    return await admit(
        _discover_action(ecz_id, frozen_tags),
        perform,
        policy=_policy_for(frozen_tags),
        trail=audit_trail(),
    )


async def admit_mcp_connect_and_grant_tools(
    ecz_id: str | None, *, policy_mode: PolicyMode, perform
):
    """Gate actually wiring an MCP server's tools into an agent's toolset --
    the higher-stakes action. Enforces the target's own declared
    `high_risk_action` (`FAIL_CLOSED_UNLESS_LIVE_BINDING_AND_EVIDENCE_AVAILABLE`)
    rather than a locally invented risk rule.
    """
    tags: set[str] = set()
    if ecz_id is None:
        if policy_mode is not PolicyMode.OPEN:
            tags.add("ecz-no-id-under-require")
    else:
        posture = resolve_posture(ecz_id)
        if not posture.reachable:
            tags.add("ecz-resolver-unreachable")
        elif posture.is_fail_closed_state:
            tags.add("ecz-fail-closed-state")
        elif (
            posture.high_risk_action
            == "FAIL_CLOSED_UNLESS_LIVE_BINDING_AND_EVIDENCE_AVAILABLE"
            and not posture.has_live_binding_and_evidence
        ):
            tags.add("ecz-high-risk-unmet")

    frozen_tags = frozenset(tags)
    return await admit(
        _connect_action(ecz_id, frozen_tags),
        perform,
        policy=_policy_for(frozen_tags),
        trail=audit_trail(),
    )
