"""Runs four real scenarios against the real, live public Resolver API and
a real tulip-agents admission gate -- no mocks, no fixtures standing in
for the network.

    python demo.py
"""

from __future__ import annotations

import asyncio

from tulip.control import AdmissionError

from admission import (
    admit_mcp_connect_and_grant_tools,
    admit_mcp_discovery,
    audit_trail,
)
from ecz_id_gate import PolicyMode

# EcoCitizenz's own real, published ECZ-ID -- linked from this repo's own
# ai-transparency-evidence README as a live Resolver record.
ECOCITIZENZ_OWN_ID = "ECZ-GB-RBS1NW"
# Deliberately not a real ID -- exercises the unreachable/error path
# against the real API (a real 4xx/backend error, not a mock).
NONEXISTENT_ID = "ECZ-GB-000000"


async def _run(label: str, coro) -> None:
    print(f"\n[{label}]")
    try:
        result = await coro
        print(f"  ALLOWED -> {result}")
    except AdmissionError as e:
        print(f"  {e.decision.outcome.upper()} -> {e.decision.reason}")


async def main() -> None:
    async def noop_discover():
        return "discovery read executed"

    async def noop_connect():
        return "tools wired into agent toolset"

    await _run(
        "discover EcoCitizenz's own real ECZ-ID (OPEN)",
        admit_mcp_discovery(
            ECOCITIZENZ_OWN_ID, policy_mode=PolicyMode.OPEN, perform=noop_discover
        ),
    )
    await _run(
        "connect+grant-tools on EcoCitizenz's own real ECZ-ID (OPEN) -- "
        "expect escalation: their own record's binding.state is "
        "NO_PUBLIC_PROOF today, so their own declared high_risk_action "
        "isn't met yet, even for their own company",
        admit_mcp_connect_and_grant_tools(
            ECOCITIZENZ_OWN_ID, policy_mode=PolicyMode.OPEN, perform=noop_connect
        ),
    )
    await _run(
        "discover a server with no ECZ-ID declared, REQUIRE mode",
        admit_mcp_discovery(
            None, policy_mode=PolicyMode.REQUIRE, perform=noop_discover
        ),
    )
    await _run(
        "connect+grant-tools on a nonexistent ECZ-ID (real network call, real failure)",
        admit_mcp_connect_and_grant_tools(
            NONEXISTENT_ID, policy_mode=PolicyMode.OPEN, perform=noop_connect
        ),
    )

    trail = audit_trail()
    n = len(trail.records())
    print(f"\naudit trail: {n} decisions, chain intact: {trail.verify()}")


if __name__ == "__main__":
    asyncio.run(main())
