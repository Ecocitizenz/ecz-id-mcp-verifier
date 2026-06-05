# CLI — policy modes and operator modes

> Examples only. The verifier never enforces a global gate. Local
> policy decides. Re-check before reliance. The verifier does not
> certify safety, approval, or compliance.

## Policy modes

| Mode      | Missing public proof                                | Mismatch / Revoked / Suspended / Expired |
| --------- | --------------------------------------------------- | ---------------------------------------- |
| `OPEN`    | informational, exit 0                               | deterministic non-zero                   |
| `PREFER`  | warning on stderr, exit 0                           | deterministic non-zero                   |
| `REQUIRE` | fail-closed (exit 1, or exit 5 on network failure)  | deterministic non-zero                   |

### OPEN

```sh
ecz-mcp-verify --target "ECZ-GB-EXAMPLE" --policy OPEN
```

A missing public resolver proof is reported as informational and exits 0.

### PREFER

```sh
ecz-mcp-verify --target "ECZ-GB-EXAMPLE" --policy PREFER
```

A missing public resolver proof emits a warning on stderr and exits 0.
The message says "no public resolver proof found yet. Local policy
decides." It does not say the target is unsafe.

### REQUIRE

```sh
ecz-mcp-verify --target "ECZ-GB-EXAMPLE" --policy REQUIRE
```

Under REQUIRE the verifier fails closed when proof is missing or
unresolved. This is a local CI gate. It is not a global trust verdict.

## Operator modes

`--operator` is never auto-inferred. The caller declares it.

```sh
# You operate the target.
ecz-mcp-verify --target "https://api.example.com/.well-known/ecz-mcp.json" \
  --operator self --actions

# You are a third party reader.
ecz-mcp-verify --target "https://api.example.com/.well-known/ecz-mcp.json" \
  --operator third_party --actions

# Default. Routes generically.
ecz-mcp-verify --target "https://api.example.com/.well-known/ecz-mcp.json" \
  --operator unknown --actions
```

- `self` routes the user to TrustOps to start setup.
- `third_party` routes the user to Developer Gateway guidance.
- `unknown` routes generically.

The verifier never performs setup itself. The verifier never reads
private data from the target. The verifier never performs checkout.
