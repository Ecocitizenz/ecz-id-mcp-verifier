import { type ActionEnvelope } from "./action-envelope.js";
export interface CliResult {
    exit_code: number;
    stdout: string;
    stderr: string;
    gh_outputs?: string;
    action_envelope?: ActionEnvelope;
}
export declare const HELP_TEXT: string;
interface ParsedArgs {
    flags: Record<string, string | boolean>;
}
export declare function parseArgs(argv: string[]): ParsedArgs;
export declare function runCli(argv: string[]): Promise<CliResult>;
export declare function main(argv?: string[]): Promise<number>;
export {};
