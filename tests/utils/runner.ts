import { spawnSync } from "bun";
import { COMMAND, GET_CONETXO_ARGS } from "../config";

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export function runContexo(targetPath?: string, flags: string[] = [], options: { cwd?: string } = {}): RunResult {
  const args = GET_CONETXO_ARGS(targetPath, flags);
  const result = spawnSync([COMMAND, ...args], { cwd: options.cwd });

  return {
    stdout: result.stdout?.toString() || "",
    stderr: result.stderr?.toString() || "",
    exitCode: result.exitCode,
    success: result.success
  };
}
