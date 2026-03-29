import { beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { setupFixtures } from "../setup";
import { COMMAND, ENTRY_POINT, FIXTURES_DIR } from "../config";
import { stripAnsi } from "../helpers/output";
import { runContexo } from "../utils/runner";

const README_PATH = path.resolve(process.cwd(), "README_es.md");
const COMPARE_MODEL = "openai/gpt-4o";

describe("Legacy CLI Compatibility", () => {
  beforeAll(async () => {
    await setupFixtures();
  });

  test("keeps --model as a compatibility alias for --compare-model", () => {
    const res = runContexo(README_PATH, ["--summary", "--model", COMPARE_MODEL]);

    expect(res.success).toBe(true);
    expect(stripAnsi(res.stdout)).toMatch(/compare\s+openai\/gpt-4o/);
  });

  test("normalizes supported alias spellings to their canonical flags", () => {
    const script = [
      `process.argv = ["bun", "script", ".", "--show-arg", "--follow-links", "--follow-mounts", "--disable-ignorefiles", "--compare-models", "openai/gpt-4o"];`,
      `const { parseCli } = await import(${JSON.stringify(ENTRY_POINT.replace(/src\/index\.ts$/, "src/cli/index.ts"))});`,
      `const config = parseCli();`,
      `console.log(JSON.stringify({ showArgs: config.showArgs, followLink: config.followLink, followMount: config.followMount, disableIgnorefile: config.disableIgnorefile, compareModel: config.compareModel }));`,
    ].join("\n");
    const res = spawnSync(COMMAND, ["-e", script], { cwd: FIXTURES_DIR, encoding: "utf8" });

    expect(res.status).toBe(0);
    expect(JSON.parse(res.stdout || "{}")).toEqual({
      showArgs: true,
      followLink: true,
      followMount: true,
      disableIgnorefile: true,
      compareModel: "openai/gpt-4o",
    });
  });

  test("keeps numeric spelling aliases working for pagination flags", () => {
    const res = runContexo(FIXTURES_DIR, ["--stdout-max-lines", "5", "--page-line", "1"]);

    expect(res.success).toBe(true);
    expect(res.stderr).toContain("Page 1");
  });

  test("explains that --prettysummary was removed", () => {
    const res = runContexo(README_PATH, ["--prettysummary"]);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain("Flag --prettysummary was removed. Use --summary instead.");
  });

  test("explains that --noenc was removed", () => {
    const res = runContexo(README_PATH, ["--noenc"]);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain("--noenc was removed");
    expect(res.stderr).toContain("--compare-model or --model");
  });

  test("explains that --limit-lines was removed", () => {
    const res = runContexo(README_PATH, ["--limit-lines", "3"]);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain("--limit-lines was removed");
    expect(res.stderr).toContain("--file-maxlines or --stdout-maxlines");
  });
});
