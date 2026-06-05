#!/usr/bin/env node
/**
 * Read a single GitHub Action input from the environment.
 *
 * GitHub exposes an input named `foo-bar` as `INPUT_FOO-BAR` (name uppercased,
 * spaces replaced with underscores, hyphens preserved). Different toolchains
 * normalise hyphens vs underscores differently, so we accept both forms.
 * Only INPUT_-prefixed keys are ever read: this adapter never touches secrets
 * or arbitrary environment variables.
 */
export declare function readActionInput(name: string, env?: NodeJS.ProcessEnv): string | undefined;
/**
 * Build a CLI argv array from GitHub Action inputs. Pure and exported so the
 * mapping can be unit-tested without spawning a process.
 */
export declare function actionArgv(env?: NodeJS.ProcessEnv): string[];
