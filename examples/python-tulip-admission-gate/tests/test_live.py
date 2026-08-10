"""Real end-to-end checks against the real, live public Resolver API --
the same two safe calls `demo.py` makes. Opt-in via `ECZ_LIVE_TESTS=1`,
not run by default: this hits a real third-party production endpoint
(EcoCitizenz's own), and running that unconditionally from every fork's
CI on every push isn't a courteous default for their infrastructure.
Everything here is a plain, unauthenticated GET -- no state is written,
matching this repo's own privacy posture.
"""

from __future__ import annotations

import os

import pytest

from ecz_id_gate import resolve_posture

pytestmark = pytest.mark.skipif(
    os.environ.get("ECZ_LIVE_TESTS") != "1",
    reason="live network test against a real third-party API -- opt in with ECZ_LIVE_TESTS=1",  # noqa: E501
)

# EcoCitizenz's own real, published ECZ-ID (linked from this repo's own
# ai-transparency-evidence README as a live Resolver record).
ECOCITIZENZ_OWN_ID = "ECZ-GB-RBS1NW"


def test_resolves_a_real_known_ecz_id() -> None:
    posture = resolve_posture(ECOCITIZENZ_OWN_ID)
    assert posture.reachable is True
    assert posture.lifecycle_state == "ACTIVE"
    # The one live, disclosed finding this example is built around: even
    # EcoCitizenz's own real record doesn't clear its own declared
    # high-risk bar today.
    assert posture.has_live_binding_and_evidence is False


def test_a_nonexistent_ecz_id_comes_back_unreachable_not_a_crash() -> None:
    posture = resolve_posture("ECZ-GB-000000")
    assert posture.reachable is False
    assert posture.error is not None
