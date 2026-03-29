import { beforeAll, describe, expect, test } from "bun:test";
import path from "node:path";
import { setupFixtures } from "../setup";
import { expectBalancedFences, expectWithinCharBudget } from "../helpers/assertions";
import { FIXTURES_DIR } from "../config";
import { runContexo } from "../utils/runner";
import { Paginator } from "../../src/core/paginator";

const README_PATH = path.resolve(process.cwd(), "README_es.md");

describe("Pagination Contract", () => {
  beforeAll(async () => {
    await setupFixtures();
  });

  test("paginates canonical stdout instead of body-only content", () => {
    const res = runContexo(README_PATH, ["--stdout-maxlines", "5", "--page-lines", "1"]);

    expect(res.success).toBe(true);
    expect(res.stdout).toContain("stdout stats");
    expect(res.stdout).not.toContain("encoding stats");
    expect(res.stdout).not.toContain("filename: README_es.md");
    expect(res.stderr).toContain("Page 1 of");
  });

  test("returns different content for different line pages", () => {
    const res1 = runContexo(FIXTURES_DIR, ["--stdout-maxlines", "10", "--page-lines", "1"]);
    const res2 = runContexo(FIXTURES_DIR, ["--stdout-maxlines", "10", "--page-lines", "2"]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(res1.stdout).not.toBe(res2.stdout);
    expect(res1.stderr).toContain("Page 1");
    expect(res2.stderr).toContain("Page 2");
  });

  test("keeps fences balanced when paginating by chars", () => {
    const text = [
      "filename: demo.ts",
      "relative path: demo.ts",
      "absolute path: /tmp/demo.ts",
      "```ts",
      "const alpha = 1;",
      "const beta = 2;",
      "const gamma = 3;",
      "const delta = 4;",
      "```",
    ].join("\n");
    const limit = 45;
    const firstPage = new Paginator({ limitTotalChars: limit, pageChar: 1 }).paginate(text);

    expect(firstPage.totalPages).toBeGreaterThan(1);

    for (let page = 1; page <= firstPage.totalPages; page++) {
      const result = new Paginator({ limitTotalChars: limit, pageChar: page }).paginate(text);
      expectWithinCharBudget(result.content, limit);
      expectBalancedFences(result.content);
    }
  });

  test("appends bylines markers only on non-final total-line pages", () => {
    const page1 = new Paginator({ limitTotalLines: 2, pageLines: 1, truncMark: "..." }).paginate("one\ntwo\nthree");
    const page2 = new Paginator({ limitTotalLines: 2, pageLines: 2, truncMark: "..." }).paginate("one\ntwo\nthree");

    expect(page1.content).toBe("one\ntwo...bylines:[page 1/2]");
    expect(page2.content).toBe("three");
  });

  test("preserves text exactly when char pagination stays on one page", () => {
    const text = [
      "filename: demo.ts",
      "relative path: demo.ts",
      "absolute path: /tmp/demo.ts",
      "```ts",
      "const onlyPage = true;",
      "```",
    ].join("\n");
    const result = new Paginator({ limitTotalChars: 500, pageChar: 1 }).paginate(text);

    expect(result.totalPages).toBe(1);
    expect(result.content).toBe(text);
  });

  test("warns and clamps when requesting a page beyond the end", () => {
    const res = runContexo(FIXTURES_DIR, ["--stdout-maxlines", "5", "--page-lines", "999999"]);

    expect(res.success).toBe(true);
    expect(res.stderr).toContain("Warning");
    expect(res.stderr).toContain("Page");
  });
});
