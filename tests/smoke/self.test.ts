import { describe, expect, test } from "bun:test";
import { runContexo } from "../utils/runner";

describe("Self Contextualization Smoke", () => {
  test("generates a valid context of the project itself", () => {
    const result = runContexo("./src", ["--clean", "all", "--ignore", "tests", "--ignore", "node_modules", "--ignore", "languages.json"]);

    expect(result.success).toBe(true);
    expect(result.stdout).toContain("Scanner");
    expect(result.stdout).toContain("TextProcessor");
    expect(result.stdout).toContain("CommentStripper");
    expect(result.stdout).toContain("absolute path:");
    expect(result.stdout).not.toMatch(/\/\*[\s\S]*?\*\//);
  });
});
