import path from "node:path";

export const COMMAND = "bun";
export const ENTRY_POINT = path.resolve(process.cwd(), "src/index.ts");
export const FIXTURES_DIR = path.resolve(process.cwd(), "tests/fixtures/scc-data");

export const GET_CONETXO_ARGS = (targetPath?: string, flags: string[] = []) => {
  return targetPath ? [ENTRY_POINT, targetPath, ...flags] : [ENTRY_POINT, ...flags];
};
