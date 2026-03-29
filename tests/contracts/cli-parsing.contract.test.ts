import { beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { setupFixtures } from "../setup";
import { COMMAND, ENTRY_POINT, FIXTURES_DIR } from "../config";
import { resetProject } from "../helpers/projects";
import { runContexo } from "../utils/runner";

const README_PATH = path.resolve(process.cwd(), "README_es.md");
const TEMP_PARSE_PROJECT = "/tmp/contexo-cli-parsing-contract";
const TEMP_FLAG_NAMED_FILE = path.join(TEMP_PARSE_PROJECT, "--trunc-line");

describe("CLI Parsing Contract", () => {
  beforeAll(async () => {
    await setupFixtures();
    await resetProject(TEMP_PARSE_PROJECT, {
      "--trunc-line": "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    });
  });

  test("handles files with no extension", () => {
    const res = runContexo(path.join(FIXTURES_DIR, "makefile"), ["--clean", "all"]);

    expect(res.success).toBe(true);
    expect(res.stdout).toContain("filename: makefile");
  });

  test("rejects extra positional arguments", () => {
    const res = runContexo(FIXTURES_DIR, ["src"]);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain("Unexpected positional arguments");
  });

  test("rejects unknown flags", () => {
    const res = runContexo(FIXTURES_DIR, ["--wat"]);

    expect(res.success).toBe(false);
    expect(res.stderr).toMatch(/unknown/i);
  });

  test.each([
    [["--file-maxlines", "0"], "--file-maxlines"],
    [["--line-maxchars", "-1"], "--line-maxchars"],
    [["--file-maxchars", "0"], "--file-maxchars"],
    [["--stdout-maxlines", "0"], "--stdout-maxlines"],
    [["--stdout-maxchars", "0"], "--stdout-maxchars"],
    [["--page-lines", "0", "--stdout-maxlines", "5"], "--page-lines"],
    [["--page-char", "0", "--stdout-maxchars", "5"], "--page-char"],
    [["--limit-nested", "-1"], "--limit-nested"],
    [["--limit-files", "-1"], "--limit-files"],
  ])("rejects invalid numeric flags: %s", (flags, flagName) => {
    const res = runContexo(FIXTURES_DIR, flags);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain(flagName);
  });

  test("rejects page-lines without a matching stdout line budget", () => {
    const res = runContexo(FIXTURES_DIR, ["--page-lines", "2"]);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain("--page-lines requires --stdout-maxlines");
  });

  test("rejects page-char without a matching stdout char budget", () => {
    const res = runContexo(FIXTURES_DIR, ["--page-char", "2"]);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain("--page-char requires --stdout-maxchars");
  });

  test("rejects mixed stdout pagination modes", () => {
    const res = runContexo(FIXTURES_DIR, ["--stdout-maxlines", "5", "--stdout-maxchars", "10"]);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain("Use either --stdout-maxlines or --stdout-maxchars");
  });

  test("rejects mutually exclusive summary and nosummary flags", () => {
    const res = runContexo(FIXTURES_DIR, ["--summary", "--nosummary"]);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain("--summary and --nosummary are mutually exclusive");
  });

  test.each([
    { label: "summary", flags: ["--stdout-maxlines", "5", "--summary"] },
    { label: "explicit hide", flags: ["--stdout-maxchars", "20", "--hide", "context"] },
  ])("rejects pagination when context is hidden: $label", ({ flags }) => {
    const res = runContexo(FIXTURES_DIR, [...flags]);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain("Pagination flags require visible context");
  });

  test("rejects invalid hide values", () => {
    const res = runContexo(FIXTURES_DIR, ["--hide", "context,wat"]);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain("Invalid value for --hide");
  });

  test("rejects invalid clean values", () => {
    const res = runContexo(FIXTURES_DIR, ["--clean", "comments,wat"]);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain("Invalid value for --clean");
  });

  test("mentions the regex flag when ignore-regex is invalid", () => {
    const res = runContexo(FIXTURES_DIR, ["--ignore-regex", "("]);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain("--ignore-regex");
    expect(res.stderr).toContain("(");
  });

  test("rejects empty pattern lists", () => {
    const res = runContexo(FIXTURES_DIR, ["--pattern", ",,"]);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain("Flag --pattern requires at least one non-empty glob");
  });

  test("keeps relative path and avoids find warnings for single files", () => {
    const res = runContexo(README_PATH, []);

    expect(res.success).toBe(true);
    expect(res.stdout).toContain("relative path: README_es.md");
    expect(res.stdout).not.toContain("find: warning");
  });

  test("treats flag-shaped paths after end-of-flags as paths", () => {
    const script = [
      `process.argv = ["bun", "script", "--", "--trunc-line"];`,
      `const { parseCli } = await import(${JSON.stringify(ENTRY_POINT.replace(/src\/index\.ts$/, "src/cli/index.ts"))});`,
      `const config = parseCli();`,
      `console.log(config.path);`,
    ].join("\n");
    const res = spawnSync(COMMAND, ["-e", script], { cwd: TEMP_PARSE_PROJECT, encoding: "utf8" });
    const stdout = res.stdout || "";
    const stderr = res.stderr || "";

    expect(res.status).toBe(0);
    expect(stderr).not.toContain("--trunc-line");
    expect(stdout).toContain(TEMP_FLAG_NAMED_FILE);
  });
});
