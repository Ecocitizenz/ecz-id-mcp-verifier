# Copy Safety Checklist

This package and its listing copy must avoid the following forbidden
words / phrases used as positive or public claims about a target:

- safe
- certified
- approved
- guaranteed
- regulator-approved
- platform-approved
- insured
- fully compliant
- demand proof
- must buy
- blocked because no ECZ-ID
- unsafe server
- untrusted agent
- activate_proof

Boundary statements that explicitly disclaim such properties ARE
allowed, e.g.:

- "does not certify safety"
- "does not approve agents"
- "does not guarantee compliance"
- "no public resolver proof found yet"
- "this does not mean unsafe"
- "re-check before reliance"
- "local policy decides"

## Approved soft copy

- "local verifier"
- "resolver posture check"
- "machine-readable output"
- "re-check before reliance"
- "local policy decides"
- "no public resolver proof found yet"
- "this does not mean unsafe"
- "start setup in TrustOps if you operate the target"
- "share guidance with the operator if you do not"
- "Backend remains final authority"

## Audit surface

The Phase 9A proof script
(`scripts/prove_phase_9a_distribution_readiness.ps1`) scans:

- `README.md`
- `docs/**/*.md` (excluding `_reference/`)
- `examples/**/*.md`, `examples/**/*.json`, `examples/**/*.yml`
- `src/**/*.ts`

for forbidden overclaim copy used as a positive claim.

If a flagged term appears, it must either be removed or reframed as a
boundary statement (e.g. "does not certify safety").
