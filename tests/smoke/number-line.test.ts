import { beforeAll, describe, expect, test } from "bun:test";
import fs from "fs-extra";
import path from "node:path";
import { runContexo } from "../utils/runner";

const TEMP_NUMBER_LINE_PROJECT = "/tmp/contexo-number-line-project";
const SIMPLE_FILE = path.join(TEMP_NUMBER_LINE_PROJECT, "simple.ts");
const BLANK_LINE_FILE = path.join(TEMP_NUMBER_LINE_PROJECT, "blank.txt");
const PAGINATION_FILE = path.join(TEMP_NUMBER_LINE_PROJECT, "pagination.txt");
const CONTEXT_ONLY_HIDE = "summary,skippedlist,filename,absolutepath,relativepath";

describe("Number Line Smoke", () => {
  beforeAll(async () => {
    await fs.emptyDir(TEMP_NUMBER_LINE_PROJECT);
    await fs.writeFile(SIMPLE_FILE, "const one = 1;\nconst two = 2;");
    await fs.writeFile(BLANK_LINE_FILE, "alpha\n\nomega\n");
    await fs.writeFile(PAGINATION_FILE, Array.from({ length: 8 }, (_, index) => `value-${index + 1}`).join("\n"));
  });

  test("numbers file lines with --number-line", () => {
    const result = runContexo(SIMPLE_FILE, ["--number-line", "--hide", CONTEXT_ONLY_HIDE]);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("```ts\n1 const one = 1;\n2 const two = 2;\n```\n");
  });

  test("supports the -n alias and preserves blank lines", () => {
    const result = runContexo(BLANK_LINE_FILE, ["-n", "--hide", CONTEXT_ONLY_HIDE]);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("```txt\n1 alpha\n2 \n3 omega\n4 \n```\n");
  });

  test("keeps pagination working on numbered output", () => {
    const page1 = runContexo(PAGINATION_FILE, [
      "--number-line",
      "--hide",
      CONTEXT_ONLY_HIDE,
      "--stdout-maxlines",
      "4",
      "--page-lines",
      "1",
    ]);
    const page2 = runContexo(PAGINATION_FILE, [
      "--number-line",
      "--hide",
      CONTEXT_ONLY_HIDE,
      "--stdout-maxlines",
      "4",
      "--page-lines",
      "2",
    ]);

    expect(page1.success).toBe(true);
    expect(page2.success).toBe(true);
    expect(page1.stdout).toContain("1 value-1");
    expect(page2.stdout).toContain("4 value-4");
    expect(page1.stdout).not.toBe(page2.stdout);
  });
});
