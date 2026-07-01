# Security Policy

## Supported version

| Version | Supported |
|---|---|
| 0.8.2 | ✅ |

The current supported release is `0.8.2` (npm `latest`).

## Reporting a vulnerability

Please report suspected vulnerabilities **privately**. Do **not** open a public issue for a
security concern.

- Use the repository's **GitHub Security tab → Report a vulnerability** (private advisory):
  <https://github.com/Ecocitizenz/ecz-id-mcp-verifier/security>

When reporting, include the affected version and clear reproduction steps.

## Please do not include, in any report or public channel

- secrets, credentials, API keys or tokens;
- customer or personal data;
- prompts or tool payloads;
- private logs or internal file paths.

If a reproduction requires sensitive material, describe it instead of pasting it, and we will
arrange a private channel.

## Scope and expectations

This project is a local-first, read-only Resolver-posture verifier. It performs no artifact,
manifest or runtime-protocol inspection, writes no truth, and requires no secret for normal
checks. Responsible disclosure is appreciated; we aim to acknowledge valid private reports
and coordinate a fix and disclosure timeline.

The Resolver is the public proof surface. A package, GitHub or Registry listing is a
discovery surface and is not a security assurance about any third party.
