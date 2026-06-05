#!/usr/bin/env node
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
import { buildEnvelope, type ActionEnvelope } from "./action-envelope.js";
import { buildMcpActionEnvelope, buildRequestToResolve } from "./flywheel.js";
import { toHumanReport } from "./human-report.js";
import {
  computeExitCode,
  EXIT_INTERNAL,
  EXIT_UNSUPPORTED_OR_INVALID
} from "./exit-codes.js";
import { POLICY_MODES, type PolicyMode } from "./policy.js";
import {
  OPERATOR_MODES,
  type OperatorMode
} from "./acquisition-flow.js";
import {
  RESOLVER_BASE,
  TRUSTOPS_START,
  DEVELOPER_GATEWAY,
  VERIFIER_NAME,
  VERIFIER_VERSION
} from "./constants.js";

export interface CliResult {
  exit_code: number;
  stdout: string;
  stderr: string;
  gh_outputs?: string;
  action_envelope?: ActionEnvelope;
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
  --version                  Print version and exit
  --help                     Print this help and exit

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

    const gh_outputs =
      `result-state=${result.result_state}\n` +
      `reason-codes=${result.reason_codes.join(",")}\n` +
      `action-envelope-json=${JSON.stringify(envelope)}\n` +
      `acquisition-flow-json=${JSON.stringify(envelope.acquisition_flow)}\n` +
      `mcp-action-envelope-json=${JSON.stringify(mcpActionEnvelope)}\n` +
      `request-to-resolve-json=${JSON.stringify(requestToResolve)}\n` +
      `primary-action=${envelope.primary_action}\n` +
      `trustops-action-url=${envelope.trustops_action_url}\n` +
      `developer-guidance-url=${envelope.developer_guidance_url}\n`;

    return {
      exit_code,
      stdout: stdoutParts.join("\n"),
      stderr: stderrParts.join("\n"),
      gh_outputs,
      action_envelope: envelope
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
  return result.exit_code;
}

// Run only when invoked as a script, not when imported by tests.
import { fileURLToPath } from "node:url";
const invokedPath = (process.argv[1] ?? "").replace(/\\/g, "/");
let runAsScript = false;
try {
  const here = fileURLToPath(import.meta.url).replace(/\\/g, "/");
  runAsScript = here === invokedPath;
} catch {
  runAsScript = false;
}
if (runAsScript) {
  main().then((code) => {
    process.exit(code);
  });
}
