import { beforeAll, describe, expect, test } from "bun:test";
import path from "node:path";
import { resetProject } from "../helpers/projects";
import { runContexo } from "../utils/runner";

const TEMP_ROOT = "/tmp/contexo-truncation-contract";
const TEMP_LINE_FILE = path.join(TEMP_ROOT, "truncate-line.txt");
const TEMP_FILE_FILE = path.join(TEMP_ROOT, "truncate-file.txt");
const TEMP_LINES_FILE = path.join(TEMP_ROOT, "truncate-lines.txt");
const LONG_TEXT = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

describe("Truncation Contract", () => {
  beforeAll(async () => {
    await resetProject(TEMP_ROOT, {
      "truncate-line.txt": LONG_TEXT,
      "truncate-file.txt": LONG_TEXT,
      "truncate-lines.txt": "one\ntwo\nthree\nfour",
    });
  });

  test.each([
    ["start", "...UVWXYZabcdefghijklmnopqrstuvwxyz"],
    ["middle", "ABCDEFGHIJKLMNOP...klmnopqrstuvwxyz"],
    ["end", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef..."],
  ])("truncates long lines from the %s", (mode, expected) => {
    const res = runContexo(TEMP_LINE_FILE, [
      "--line-maxchars",
      `max:35,cut:${mode}`,
      "--hide",
      "summary,skippedlist",
    ]);

    expect(res.success).toBe(true);
    expect(res.stdout).toContain(expected);
  });

  test.each([
    ["start", "...UVWXYZabcdefghijklmnopqrstuvwxyz"],
    ["middle", "ABCDEFGHIJKLMNOP...klmnopqrstuvwxyz"],
    ["end", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef..."],
  ])("truncates whole file content from the %s", (mode, expected) => {
    const res = runContexo(TEMP_FILE_FILE, [
      "--file-maxchars",
      `max:35,cut:${mode}`,
      "--hide",
      "summary,skippedlist",
    ]);

    expect(res.success).toBe(true);
    expect(res.stdout).toContain(expected);
  });

  test("keeps a visible truncation marker even with very small limits", () => {
    const res = runContexo(TEMP_LINE_FILE, [
      "--line-maxchars",
      "max:3,cut:middle",
      "--hide",
      "summary,skippedlist",
    ]);

    expect(res.success).toBe(true);
    expect(res.stdout).toContain("...");
  });

  test("applies the same global mark to line, file, and file-line truncation", () => {
    const lineRes = runContexo(TEMP_LINE_FILE, [
      "--line-maxchars",
      "max:8,cut:middle",
      "--mark",
      "<>",
      "--hide",
      "summary,skippedlist",
    ]);
    const fileRes = runContexo(TEMP_FILE_FILE, [
      "--file-maxchars",
      "max:8,cut:middle",
      "--mark",
      "<>",
      "--hide",
      "summary,skippedlist",
    ]);
    const linesRes = runContexo(TEMP_LINES_FILE, [
      "--file-maxlines",
      "3",
      "--mark",
      "<>",
      "--hide",
      "summary,skippedlist",
    ]);

    expect(lineRes.success).toBe(true);
    expect(lineRes.stdout).toContain("ABC<>xyz");
    expect(fileRes.success).toBe(true);
    expect(fileRes.stdout).toContain("ABC<>xyz");
    expect(linesRes.success).toBe(true);
    expect(linesRes.stdout).toContain("one\ntwo\n<>");
    expect(linesRes.stdout).not.toContain("three\nfour");
  });

  test("uses the default truncation mark for line-count truncation", () => {
    const res = runContexo(TEMP_LINES_FILE, [
      "--file-maxlines",
      "3",
      "--hide",
      "summary,skippedlist",
    ]);

    expect(res.success).toBe(true);
    expect(res.stdout).toContain("one\ntwo\n...");
  });
});
