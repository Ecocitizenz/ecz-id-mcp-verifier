# Privacy

ECZ-ID MCP Verifier(TM) is privacy-first by construction.

Invariants (locked by `src/privacy.ts` and asserted by scaffold tests):

- `no_source_upload = true` -- the verifier never uploads source code.
- `no_secrets_upload = true` -- the verifier never uploads secrets or env vars.
- `no_telemetry = true` -- the verifier emits no analytics or telemetry.
- `local_policy_decides = true` -- the caller's local policy is authoritative.
- `recheck_before_reliance = true` -- callers must recheck before relying on a prior result.
- `no_safety_or_approval_inference = true` -- the verifier never infers that a target is "safe" or "approved".

If any future change would weaken one of these invariants, the scaffold
tests in `tests/scaffold.test.ts` will fail.
