#!/usr/bin/env node
// GitHub Action entrypoint for ECZ-ID MCP Verifier.
//
// A node20 action delivers its `with:` inputs as INPUT_* environment
// variables, not as argv. The CLI (dist/cli.js) parses argv only, so it must
// not be the action `main` directly. This adapter reads the INPUT_* inputs,
// maps them onto the existing CLI argument shape, and reuses cli.main() so
// that exit codes and $GITHUB_OUTPUT behaviour stay identical to the CLI.
//
// Boundaries (unchanged from the verifier doctrine):
//   - Does not request or read secrets.
//   - Does not upload source, prompts, or tool payloads.
//   - Does not write truth, activate proof, or mark BOUND.
//   - Does not mutate Resolver / Backend / TrustOps.

import { main } from "./cli.js";

/**
 * Read a single GitHub Action input from the environment.
 *
 * GitHub exposes an input named `foo-bar` as `INPUT_FOO-BAR` (name uppercased,
 * spaces replaced with underscores, hyphens preserved). Different toolchains
 * normalise hyphens vs underscores differently, so we accept both forms.
 * Only INPUT_-prefixed keys are ever read: this adapter never touches secrets
 * or arbitrary environment variables.
 */
export function readActionInput(
  name: string,
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  const upper = name.toUpperCase().replace(/ /g, "_");
  const candidates = [
    `INPUT_${upper}`,
    `INPUT_${upper.replace(/-/g, "_")}`,
    `INPUT_${upper.replace(/_/g, "-")}`
  ];
  for (const key of candidates) {
    const v = env[key];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return undefined;
}

function isTruthy(v: string | undefined): boolean {
  if (!v) return false;
  const s = v.toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

/**
 * Build a CLI argv array from GitHub Action inputs. Pure and exported so the
 * mapping can be unit-tested without spawning a process.
 */
export function actionArgv(env: NodeJS.ProcessEnv = process.env): string[] {
  const argv: string[] = [];

  const target = readActionInput("target", env);
  if (target !== undefined) argv.push("--target", target);

  const targetType = readActionInput("target-type", env);
  if (targetType !== undefined) argv.push("--target-type", targetType);

  const policy = readActionInput("policy", env);
  if (policy !== undefined) argv.push("--policy", policy);

  const operator = readActionInput("operator", env);
  if (operator !== undefined) argv.push("--operator", operator);

  // Accept the canonical `resolver-base` input and a `resolver-url` alias.
  const resolverBase =
    readActionInput("resolver-base", env) ?? readActionInput("resolver-url", env);
  if (resolverBase !== undefined) argv.push("--resolver-base", resolverBase);

  const timeoutMs = readActionInput("timeout-ms", env);
  if (timeoutMs !== undefined) argv.push("--timeout-ms", timeoutMs);

  // Network opt-out: either `offline` or `no-network`, truthy -> offline.
  if (
    isTruthy(readActionInput("offline", env)) ||
    isTruthy(readActionInput("no-network", env))
  ) {
    argv.push("--offline");
  }

  // Output shape. JSON is the CLI default; `report` switches to the soft
  // human report; `actions` adds the local action envelope to JSON.
  if (isTruthy(readActionInput("report", env))) argv.push("--report");
  if (isTruthy(readActionInput("json", env))) argv.push("--json");
  if (isTruthy(readActionInput("actions", env))) argv.push("--actions");

  return argv;
}

// Run only when invoked as a script (node dist/action.js), not when imported
// by tests. Mirrors the guard used in cli.ts.
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
  main(actionArgv()).then((code) => {
    process.exit(code);
  });
}
