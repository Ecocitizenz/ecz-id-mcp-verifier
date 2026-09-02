// CLI for ECZ-ID MCP Verifier.
// Local-first. Privacy-first. Reports only.
// - Does not write truth.
// - Does not activate proof.
// - Does not mark anything BOUND.
// - Does not upload source, secrets, prompts, tool payloads, or private logs.
// - Network is opt-out via --offline / --no-network.

import { writeFileSync, appendFileSync } from "node:fs";
import { verify, type VerifyOptions } from "./verify.js";
import { buildJsonOutput, buildSarif, toJson } from "./output.js";
import {
  buildPassportOpportunity,
  type PassportOpportunity
} from "./passport-opportunity.js";
import { buildEnvelope, type ActionEnvelope } from "./action-envelope.js";
import { buildMcpActionEnvelope, buildRequestToResolve } from "./result-actions.js";
import { toHumanReport } from "./human-report.js";
import {
  buildCapabilities,
  buildMcpConfig,
  runDoctor,
  toDoctorHuman
} from "./capabilities.js";
import {
  computeExitCode,
  EXIT_INTERNAL,
  EXIT_UNSUPPORTED_OR_INVALID
} from "./exit-codes.js";
import { POLICY_MODES, type PolicyMode } from "./policy.js";
import {
  OPERATOR_MODES,
  type OperatorMode
} from "./setup-handoff.js";
import {
  RESOLVER_BASE,
  TRUSTOPS_START,
  DEVELOPER_GATEWAY,
  VERIFIER_NAME,
  VERIFIER_VERSION,
  PACKAGE_NAME
} from "./constants.js";

export interface CliResult {
  exit_code: number;
  stdout: string;
  stderr: string;
  gh_outputs?: string;
  action_envelope?: ActionEnvelope;
  /** Routing only. Null unless a Passport is genuinely the missing thing. */
  passport_opportunity?: PassportOpportunity | null;
}

export const HELP_TEXT = `${VERIFIER_NAME} v${VERIFIER_VERSION}
Local-first, privacy-first verifier. Reports only. Does not write truth.

Usage:
  ecz-mcp-verify --target <value> [options]

Options:
  --target <value>           Target to verify (URL, package, repo, image, ECZ-ID)
  --target-type <type>       Optional type hint: mcp_server | agent_manifest |
                             api_url | github_repo | npm_package | pypi_package |
                             container_image | ecz_id | auto (default: auto)
  --policy <mode>            Local policy: OPEN | PREFER | REQUIRE (default: OPEN)
  --operator <who>           Operator role: self | third_party | unknown
                             (default: unknown). Not auto-inferred.
  --json                     Emit JSON output (default)
  --report                   Emit human-readable soft report instead of JSON
  --actions                  Include the local action envelope in JSON output
  --resolver-base <url>      Override resolver base (default: ${RESOLVER_BASE})
  --trustops-url <url>       Override TrustOps URL (default: ${TRUSTOPS_START})
  --developer-base <url>     Override Developer Gateway (default: ${DEVELOPER_GATEWAY})
  --offline                  Offline mode (no network calls)
  --no-network               Same as --offline
  --timeout-ms <ms>          Network timeout in milliseconds (default: 5000)
  --output <path>            Write primary output to file instead of stdout
  --sarif <path>             Also write a minimal SARIF 2.1.0 file
  --capabilities             Print the machine-readable capability profile (JSON) and exit
  --print-mcp-config         Print a ready-to-paste MCP host config (JSON) and exit
  --doctor                   Run a local self-test (no network, no secret) and exit
  --version                  Print version and exit
  --help                     Print this help and exit

Release channels:
  Stable:     npx ${PACKAGE_NAME} check --target <value>
  Candidate:  npx ${PACKAGE_NAME}@next check --target <value>
  Exact:      npx ${PACKAGE_NAME}@${VERIFIER_VERSION} check --target <value>

Exit codes:
  0  OK / informational / resolver-verifiable / OPEN missing proof
  1  Policy-required proof missing or unresolved under REQUIRE
  2  Deterministic mismatch
  3  Revoked / suspended / expired
  4  Unsupported target or invalid input
  5  Network / timeout error where policy requires fail-closed
  6  Internal verifier error

Privacy posture:
  - No source upload. No secrets upload. No background reporting.
  - Network is opt-out via --offline / --no-network.
  - Local policy decides. Re-check before reliance.
  - Backend remains final authority.

Role split:
  Backend/Core writes truth. Resolver projects public proof.
  TrustOps handles setup, acquisition, and lifecycle.
  Developer Gateway explains and routes.
  This verifier only checks, reports, and routes.
`;

interface ParsedArgs {
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a || !a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    let key: string;
    let val: string | boolean = true;
    if (eq >= 0) {
      key = a.slice(2, eq);
      val = a.slice(eq + 1);
    } else {
      key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        val = next;
        i++;
      }
    }
    flags[key] = val;
  }
  return { flags };
}

function strFlag(flags: Record<string, string | boolean>, k: string): string | undefined {
  const v = flags[k];
  return typeof v === "string" ? v : undefined;
}

function boolFlag(flags: Record<string, string | boolean>, k: string): boolean {
  const v = flags[k];
  if (v === true) return true;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    return s === "true" || s === "1" || s === "yes";
  }
  return false;
}

export async function runCli(argv: string[]): Promise<CliResult> {
  const { flags } = parseArgs(argv);

  if (flags.help === true || flags.h === true) {
    return { exit_code: 0, stdout: HELP_TEXT, stderr: "" };
  }
  if (flags.version === true || flags.v === true) {
    return {
      exit_code: 0,
      stdout: `${VERIFIER_NAME} v${VERIFIER_VERSION}\n`,
      stderr: ""
    };
  }

  // Convenience surfaces — deterministic, local, no network, no secret, no
  // truth-writing. Each prints and exits before any target is required.
  if (flags.capabilities === true) {
    return { exit_code: 0, stdout: toJson(buildCapabilities()) + "\n", stderr: "" };
  }
  if (flags["print-mcp-config"] === true) {
    return { exit_code: 0, stdout: toJson(buildMcpConfig()) + "\n", stderr: "" };
  }
  if (flags.doctor === true) {
    const report = await runDoctor();
    const wantJson = flags.json === true || flags.report !== true;
    const stdout = wantJson ? toJson(report) + "\n" : toDoctorHuman(report) + "\n";
    return { exit_code: report.ok ? 0 : EXIT_INTERNAL, stdout, stderr: "" };
  }

  const target = strFlag(flags, "target") ?? "";
  if (!target) {
    return {
      exit_code: EXIT_UNSUPPORTED_OR_INVALID,
      stdout: "",
      stderr: "Error: --target is required. Use --help."
    };
  }

  const policyRaw = (strFlag(flags, "policy") ?? "OPEN").toUpperCase();
  if (!(POLICY_MODES as readonly string[]).includes(policyRaw)) {
    return {
      exit_code: EXIT_UNSUPPORTED_OR_INVALID,
      stdout: "",
      stderr: `Error: invalid --policy. Use one of: ${POLICY_MODES.join(", ")}`
    };
  }
  const policy = policyRaw as PolicyMode;

  const operatorRaw = (strFlag(flags, "operator") ?? "unknown").toLowerCase();
  if (!(OPERATOR_MODES as readonly string[]).includes(operatorRaw)) {
    return {
      exit_code: EXIT_UNSUPPORTED_OR_INVALID,
      stdout: "",
      stderr: `Error: invalid --operator. Use one of: ${OPERATOR_MODES.join(", ")}`
    };
  }
  const operator = operatorRaw as OperatorMode;

  const noNetwork =
    boolFlag(flags, "offline") || boolFlag(flags, "no-network");

  const timeoutRaw = strFlag(flags, "timeout-ms");
  const timeoutMs = timeoutRaw ? Number(timeoutRaw) : undefined;
  if (timeoutRaw && !Number.isFinite(timeoutMs)) {
    return {
      exit_code: EXIT_UNSUPPORTED_OR_INVALID,
      stdout: "",
      stderr: "Error: --timeout-ms must be a number."
    };
  }

  const verifyOpts: VerifyOptions = {
    target,
    targetType: strFlag(flags, "target-type"),
    policy,
    operator,
    resolverBase: strFlag(flags, "resolver-base"),
    trustopsUrl: strFlag(flags, "trustops-url"),
    developerBase: strFlag(flags, "developer-base"),
    noNetwork,
    timeoutMs: timeoutMs as number | undefined
  };

  try {
    const result = await verify(verifyOpts);
    const networkAttemptedAndFailed =
      result.network_attempted && Boolean(result.network_error);
    const exit_code = computeExitCode(result.result_state, policy, {
      network_attempted_and_failed: networkAttemptedAndFailed
    });
    const envelope = buildEnvelope(result);

    const wantReport = flags.report === true;
    const wantActions = flags.actions === true;
    const wantJson = flags.json === true || !wantReport;

    let primaryOutput: string;
    if (wantReport && !wantJson) {
      primaryOutput = toHumanReport(result);
    } else if (wantReport && wantJson) {
      primaryOutput =
        toHumanReport(result) +
        "\n\n" +
        toJson(
          buildJsonOutput(result, {
            exit_code,
            action_envelope: wantActions ? envelope : null
          })
        );
    } else {
      primaryOutput = toJson(
        buildJsonOutput(result, {
          exit_code,
          action_envelope: wantActions ? envelope : null
        })
      );
    }

    const outPath = strFlag(flags, "output");
    const stdoutParts: string[] = [];
    if (outPath) {
      writeFileSync(outPath, primaryOutput, "utf8");
    } else {
      stdoutParts.push(primaryOutput);
    }

    const sarifPath = strFlag(flags, "sarif");
    if (sarifPath) {
      writeFileSync(sarifPath, toJson(buildSarif(result, exit_code)), "utf8");
    }

    const stderrParts: string[] = [];
    if (
      policy === "PREFER" &&
      result.result_state === "NO_PUBLIC_RESOLVER_PROOF_FOUND"
    ) {
      stderrParts.push(
        "Warning: no public resolver proof found yet. Local policy decides."
      );
    }

    const mcpActionEnvelope = buildMcpActionEnvelope(result);
    const requestToResolve = buildRequestToResolve(result);
    const passportOpportunity = buildPassportOpportunity({
      target_type: result.target_type,
      result_state: result.result_state,
      operator: result.operator,
      trustops_action_url: envelope.trustops_action_url
    });

    const gh_outputs =
      `result-state=${result.result_state}\n` +
      `reason-codes=${result.reason_codes.join(",")}\n` +
      `action-envelope-json=${JSON.stringify(envelope)}\n` +
      `setup-handoff-json=${JSON.stringify(envelope.setup_handoff)}\n` +
      `mcp-action-envelope-json=${JSON.stringify(mcpActionEnvelope)}\n` +
      `request-to-resolve-json=${JSON.stringify(requestToResolve)}\n` +
      `primary-action=${envelope.primary_action}\n` +
      `trustops-action-url=${envelope.trustops_action_url}\n` +
      `developer-guidance-url=${envelope.developer_guidance_url}\n` +
      // Additive. Null whenever a Passport is not the missing thing, which is most of the
      // time. A workflow that ignores it behaves exactly as before.
      `passport-opportunity-json=${JSON.stringify(passportOpportunity)}\n`;

    return {
      exit_code,
      stdout: stdoutParts.join("\n"),
      stderr: stderrParts.join("\n"),
      gh_outputs,
      action_envelope: envelope,
      passport_opportunity: passportOpportunity
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      exit_code: EXIT_INTERNAL,
      stdout: "",
      stderr: `Internal verifier error: ${msg}`
    };
  }
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const result = await runCli(argv);
  if (result.stdout) process.stdout.write(result.stdout + (result.stdout.endsWith("\n") ? "" : "\n"));
  if (result.stderr) process.stderr.write(result.stderr + (result.stderr.endsWith("\n") ? "" : "\n"));

  const ghOutPath = process.env.GITHUB_OUTPUT;
  if (ghOutPath && result.gh_outputs) {
    try {
      appendFileSync(ghOutPath, result.gh_outputs, "utf8");
    } catch {
      /* never crash on action output write */
    }
  }

  // GitHub Step Summary (only when running inside Actions; harmless for CLI).
  // Reporting-only, route-only summary. Never asserts safety/approval.
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath && result.action_envelope) {
    try {
      const env = result.action_envelope;
      const reasons = env.reason_codes.length ? "`" + env.reason_codes.join("`, `") + "`" : "_none_";
      const md =
        `### ECZ-ID MCP Verifier\n\n` +
        `| Field | Value |\n| --- | --- |\n` +
        `| Result state | \`${env.result_state}\` |\n` +
        `| Reason codes | ${reasons} |\n` +
        `| Primary action | \`${env.primary_action}\` |\n` +
        `| Policy mode | \`${env.policy_mode}\` |\n` +
        `| Exit code | \`${result.exit_code}\` |\n\n` +
        `Reports only. Does not write truth, activate proof, or mark BOUND. ` +
        `Local policy decides. Re-check before reliance.\n`;

      // Passport route, appended AFTER the doctrine sentence so it can never be read as
      // part of the finding. A missing Passport does NOT fail the build: absence is not a
      // defect, and a CI system that treats it as one would punish every project that has
      // simply never heard of ECZ-ID.
      const opportunity = result.passport_opportunity;
      let summaryMd = md;
      if (opportunity) {
        const claim = opportunity.next_actions.find((a) =>
          a.action.startsWith("ACQUIRE_")
        );
        const request = opportunity.next_actions.find((a) => a.action === "REQUEST_PASSPORT");
        summaryMd +=
          `\n#### Free ECZ-ID Passport\n\n` +
          `No public ECZ-ID Resolver proof was found. **This does not mean the target is ` +
          `unsafe or untrustworthy**, and it has not affected the result above.\n\n` +
          (claim
            ? `- If you operate this target: **${claim.label}** - free, DECLARED Parent, one sign-in.\n`
            : "") +
          (request
            ? `- If you do not operate it: **${request.label}**. A request is not proof, ownership or authority.\n`
            : "") +
          (!claim && !request
            ? `- Do you operate this target? A free ECZ-ID Passport is available if so.\n`
            : "") +
          `\nA free Passport gives a machine a persistent ECZ-ID identity. It does not mean ` +
          `verified, assured, compliant or approved.\n`;
      }
      appendFileSync(summaryPath, summaryMd, "utf8");
    } catch {
      /* never crash on step-summary write */
    }
  }
  return result.exit_code;
}

// NOTE: This module is import-only and has NO self-execution side effect.
// The executable entrypoint is `src/bin/cli.ts` (compiled to `dist/bin/cli.js`),
// the sole target of the `ecz-id-mcp-verifier` and `ecz-mcp-verify` bins. That
// wrapper invokes the exported entry function directly, so execution is
// independent of how the bin path was resolved (symlink, junction, relative
// path, npm bin shim). The previous fragile path-equality self-execution guard
// is intentionally removed — it caused a silent zero-exit under symlinked bins.
// Importing this module (e.g. via the package index) never runs the CLI.
