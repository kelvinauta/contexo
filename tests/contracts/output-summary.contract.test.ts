import { beforeAll, describe, expect, test } from "bun:test";
import path from "node:path";
import { setupFixtures } from "../setup";
import { runContexo } from "../utils/runner";
import { expectInOrder } from "../helpers/assertions";
import { ANSI_PATTERN, parseSummaryMetric, parseTokenEstimate, stripAnsi } from "../helpers/output";
import { measureText } from "../../src/core/measure";
import { Tokenizer } from "../../src/core/tokenizer";

const README_PATH = path.resolve(process.cwd(), "README_es.md");
const COMPARE_MODEL = "openai/gpt-4o";

describe("Output And Summary Contract", () => {
  beforeAll(async () => {
    await setupFixtures();
  });

  test("reports total lines and chars that match emitted stdout", () => {
    const res = runContexo(README_PATH, ["--file-maxchars", "max:40,cut:middle", "--compare-model", COMPARE_MODEL]);
    const metrics = measureText(res.stdout);

    expect(res.success).toBe(true);
    expect(parseSummaryMetric(res.stdout, "total_lines")).toBe(metrics.lines);
    expect(parseSummaryMetric(res.stdout, "total_chars")).toBe(metrics.chars);
  });

  test("lets --summary project the corresponding canonical stdout", () => {
    const flags = ["--file-maxchars", "max:40,cut:middle", "--compare-model", COMPARE_MODEL];
    const fullRes = runContexo(README_PATH, flags);
    const summaryRes = runContexo(README_PATH, [...flags, "--summary"]);
    const fullMetrics = measureText(fullRes.stdout);

    expect(fullRes.success).toBe(true);
    expect(summaryRes.success).toBe(true);
    expect(parseSummaryMetric(summaryRes.stdout, "total_lines")).toBe(fullMetrics.lines);
    expect(parseSummaryMetric(summaryRes.stdout, "total_chars")).toBe(fullMetrics.chars);
    expect(parseTokenEstimate(summaryRes.stdout)).toBe(parseTokenEstimate(fullRes.stdout));
  });

  test("keeps full-document summary sections in a stable visible order", () => {
    const res = runContexo(README_PATH, ["--compare-model", COMPARE_MODEL, "--show-args"]);
    const plain = stripAnsi(res.stdout).toLowerCase();

    expect(res.success).toBe(true);
    expectInOrder(plain, ["stdout stats", "encoding stats", "project stats", "args", "filename: readme_es.md"]);
  });

  test("renders --summary as an ANSI summary-only view", () => {
    const res = runContexo(README_PATH, ["--summary", "--show-args", "--compare-model", COMPARE_MODEL]);
    const plain = stripAnsi(res.stdout);

    expect(res.success).toBe(true);
    expect(plain).toContain("SUMMARY");
    expect(plain).toContain("STDOUT");
    expect(plain).toContain("compare      openai/gpt-4o");
    expect(plain).toContain("ARGS");
    expect(plain).not.toContain("filename: README_es.md");
    expect(res.stdout).toMatch(ANSI_PATTERN);
  });

  test("omits ENCODING unless compare-model is requested", () => {
    const res = runContexo(README_PATH, ["--summary"]);

    expect(res.success).toBe(true);
    expect(stripAnsi(res.stdout)).not.toContain("ENCODING");
  });

  test("includes summary sections in the token estimate", async () => {
    const withSummary = runContexo(README_PATH, ["--compare-model", COMPARE_MODEL]);
    const withoutSummary = runContexo(README_PATH, ["--hide", "summary", "--compare-model", COMPARE_MODEL]);
    const tokenizer = new Tokenizer();
    const withoutSummaryTokens = await tokenizer.estimateTokensForText(withoutSummary.stdout, "o200k_base", COMPARE_MODEL);

    expect(withSummary.success).toBe(true);
    expect(withoutSummary.success).toBe(true);
    expect(parseTokenEstimate(withSummary.stdout)).toBeGreaterThan(withoutSummaryTokens.tokens);
  });

  test("lets --nosummary behave like --hide summary", () => {
    const hiddenRes = runContexo(README_PATH, ["--hide", "summary", "--compare-model", COMPARE_MODEL]);
    const noSummaryRes = runContexo(README_PATH, ["--nosummary", "--compare-model", COMPARE_MODEL]);

    expect(hiddenRes.success).toBe(true);
    expect(noSummaryRes.success).toBe(true);
    expect(noSummaryRes.stdout).toBe(hiddenRes.stdout);
  });

  test("requires --compare-model or --model when --enc is explicit", () => {
    const res = runContexo(README_PATH, ["--summary", "--enc", "cl100k_base"]);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain("--enc requires --compare-model or --model");
  });

  test("lets --enc choose the encoder when compare-model is present", () => {
    const res = runContexo(README_PATH, ["--summary", "--compare-model", COMPARE_MODEL, "--enc", "cl100k_base"]);

    expect(res.success).toBe(true);
    expect(stripAnsi(res.stdout)).toMatch(/encoder\s+cl100k_base/);
  });

  test("rejects conflicting compare-model and model flags", () => {
    const res = runContexo(README_PATH, [
      "--compare-model",
      COMPARE_MODEL,
      "--model",
      "anthropic/claude-3-5-sonnet",
    ]);

    expect(res.success).toBe(false);
    expect(res.stderr).toContain("must not disagree");
  });

  test("shows original args only when requested", () => {
    const hiddenRes = runContexo(README_PATH, ["--summary"]);
    const shownRes = runContexo(README_PATH, ["--summary", "--show-args", "--compare-model", COMPARE_MODEL]);
    const hiddenPlain = stripAnsi(hiddenRes.stdout);
    const shownPlain = stripAnsi(shownRes.stdout);

    expect(hiddenRes.success).toBe(true);
    expect(hiddenPlain).not.toContain("ARGS");
    expect(shownRes.success).toBe(true);
    expect(shownPlain).toContain("ARGS");
    expect(shownPlain).toContain("--show-args");
    expect(shownPlain).toContain("--compare-model");
  });
});
