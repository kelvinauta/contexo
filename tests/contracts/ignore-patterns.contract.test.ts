import { beforeAll, describe, expect, test } from "bun:test";
import path from "node:path";
import { setupFixtures } from "../setup";
import { stripAnsi } from "../helpers/output";
import { resetProject } from "../helpers/projects";
import { FIXTURES_DIR } from "../config";
import { runContexo } from "../utils/runner";

const TEMP_PATTERN_PROJECT = "/tmp/contexo-pattern-contract";
const TEMP_ROOT_IGNORE_PROJECT = "/tmp/contexo-root-ignore-contract";
const TEMP_NESTED_IGNORE_PROJECT = "/tmp/contexo-nested-ignore-contract";
const TEMP_EXPLICIT_IGNORE_PROJECT = "/tmp/contexo-explicit-ignore-contract";
const TEMP_REGEX_IGNORE_PROJECT = "/tmp/contexo-regex-ignore-contract";
const TEMP_REGEX_IGNORE_LONG_PROJECT = "/tmp/contexo-regex-ignore-contract-long";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("Ignore And Pattern Contract", () => {
  beforeAll(async () => {
    await setupFixtures();

    await resetProject(TEMP_PATTERN_PROJECT, {
      "src/root.ts": "export const root = true;\n",
      "src/root.py": "print('root')\n",
      "src/nested/deep.ts": "export const deep = true;\n",
      "scripts/util.ts": "export const util = true;\n",
    });

    await resetProject(TEMP_ROOT_IGNORE_PROJECT, {
      ".gitignore": "vendor/\n",
      "app.ts": "export const app = true;\n",
      "notes.py": "print('notes')\n",
      "vendor/nested/hidden.ts": "export const hidden = true;\n",
    });

    await resetProject(TEMP_NESTED_IGNORE_PROJECT, {
      "typescriptprojects/.gitignore": "vendor-cache/\n",
      "typescriptprojects/src/app.ts": "export const app = true;\n",
      "typescriptprojects/vendor-cache/pkg/index.ts": "export const hidden = true;\n",
      "pythonprojects/.gitignore": "compiled-cache/\n",
      "pythonprojects/main.py": "print('main')\n",
      "pythonprojects/compiled-cache/module.py": "print('hidden')\n",
    });

    await resetProject(TEMP_EXPLICIT_IGNORE_PROJECT, {
      "keep.ts": "export const keep = true;\n",
      "ignore-me.py": "print('skip me by pattern')\n",
      "skipme/deep/hidden.ts": "export const hidden = true;\n",
    });

    await resetProject(TEMP_REGEX_IGNORE_PROJECT, {
      "src/app.ts": "export const app = true;\n",
      "assets/app.min.js": "console.log('min');\n",
    });

    await resetProject(TEMP_REGEX_IGNORE_LONG_PROJECT, {
      "src/app.ts": "export const app = true;\n",
      "assets/very-long-bundle-name-number-one.min.js": "console.log('min');\n",
      "assets/very-long-bundle-name-number-two.min.js": "console.log('min');\n",
      "assets/very-long-bundle-name-number-three.min.js": "console.log('min');\n",
    });
  });

  test("matches *.ts at any depth inside the chosen root", () => {
    const result = runContexo(path.join(TEMP_PATTERN_PROJECT, "src"), ["--pattern", "*.ts", "--hide", "summary,skippedlist"]);

    expect(result.success).toBe(true);
    expect(result.stdout).toContain("relative path: root.ts");
    expect(result.stdout).toContain("relative path: nested/deep.ts");
    expect(result.stdout).not.toContain("root.py");
    expect(result.stdout.match(/^filename:/gm)?.length).toBe(2);
  });

  test.each([
    ["src/*.ts", ["relative path: src/root.ts"], ["src/nested/deep.ts", "scripts/util.ts"]],
    ["src/**/*.ts", ["relative path: src/root.ts", "relative path: src/nested/deep.ts"], ["scripts/util.ts"]],
  ])("supports path-aware pattern %s", (pattern, expectedHits, unexpectedHits) => {
    const result = runContexo(TEMP_PATTERN_PROJECT, ["--pattern", pattern, "--hide", "summary,skippedlist"]);

    expect(result.success).toBe(true);
    for (const expectedHit of expectedHits) {
      expect(result.stdout).toContain(expectedHit);
    }
    for (const unexpectedHit of unexpectedHits) {
      expect(result.stdout).not.toContain(unexpectedHit);
    }
  });

  test("combines repeated and comma-separated patterns", () => {
    const result = runContexo(TEMP_PATTERN_PROJECT, [
      "--pattern",
      "src/**/*.ts",
      "--pattern",
      "src/*.py,scripts/*.ts",
      "--hide",
      "summary,skippedlist",
    ]);

    expect(result.success).toBe(true);
    expect(result.stdout).toContain("relative path: src/root.ts");
    expect(result.stdout).toContain("relative path: src/nested/deep.ts");
    expect(result.stdout).toContain("relative path: src/root.py");
    expect(result.stdout).toContain("relative path: scripts/util.ts");
    expect(result.stdout.match(/^filename:/gm)?.length).toBe(4);
  });

  test("prunes gitignored directories once without listing their children", () => {
    const ignoredDir = path.join(TEMP_ROOT_IGNORE_PROJECT, "vendor");
    const res = runContexo(TEMP_ROOT_IGNORE_PROJECT, ["--pattern", "*.ts"]);

    expect(res.success).toBe(true);
    expect(res.stdout).toContain("filename: app.ts");
    expect(res.stdout).not.toContain("filename: hidden.ts");
    expect(res.stdout).toContain(`${ignoredDir} (ignored by .gitignore)`);
    expect(res.stdout).not.toContain(path.join(ignoredDir, "nested", "hidden.ts"));
    expect(res.stdout.match(new RegExp(escapeRegExp(ignoredDir), "g"))?.length).toBe(1);
  });

  test("applies gitignore files recursively per subtree", () => {
    const vendorCacheDir = path.join(TEMP_NESTED_IGNORE_PROJECT, "typescriptprojects", "vendor-cache");
    const compiledCacheDir = path.join(TEMP_NESTED_IGNORE_PROJECT, "pythonprojects", "compiled-cache");
    const res = runContexo(TEMP_NESTED_IGNORE_PROJECT, ["--hide", "summary"]);

    expect(res.success).toBe(true);
    expect(res.stdout).toContain("relative path: typescriptprojects/src/app.ts");
    expect(res.stdout).toContain("relative path: pythonprojects/main.py");
    expect(res.stdout).not.toContain("relative path: typescriptprojects/vendor-cache/pkg/index.ts");
    expect(res.stdout).not.toContain("relative path: pythonprojects/compiled-cache/module.py");
    expect(res.stdout).toContain(`${vendorCacheDir} (ignored by .gitignore)`);
    expect(res.stdout).toContain(`${compiledCacheDir} (ignored by .gitignore)`);
  });

  test("summarizes explicit ignores and pattern filtering without listing every pattern miss", () => {
    const res = runContexo(TEMP_EXPLICIT_IGNORE_PROJECT, ["--ignore", "skipme", "--ignore", "does-not-exist", "--pattern", "*.ts"]);

    expect(res.success).toBe(true);
    expect(res.stdout).toContain("filename: keep.ts");
    expect(res.stdout).not.toContain("filename: hidden.ts");
    expect(res.stdout).not.toContain("ignore-me.py");
    expect(res.stdout).toContain(`${TEMP_EXPLICIT_IGNORE_PROJECT}/skipme (ignored by --ignore)`);
    expect(res.stdout).toContain("--pattern: non-matching paths ignored");
    expect(res.stdout).not.toContain("does-not-exist");
  });

  test("summarizes regex ignores with matching paths when the line stays short", () => {
    const res = runContexo(TEMP_REGEX_IGNORE_PROJECT, ["--ignore-regex", "\\.min\\.js$"]);

    expect(res.success).toBe(true);
    expect(res.stdout).toContain("filename: app.ts");
    expect(res.stdout).toContain(`--ignore-regex \\.min\\.js$ -> ${TEMP_REGEX_IGNORE_PROJECT}/assets/app.min.js`);
  });

  test("falls back to the regex pattern only when the regex skipped overview gets too long", () => {
    const res = runContexo(TEMP_REGEX_IGNORE_LONG_PROJECT, ["--ignore-regex", "\\.min\\.js$"]);

    expect(res.success).toBe(true);
    expect(res.stdout).toContain("filename: app.ts");
    expect(res.stdout).toContain("--ignore-regex \\.min\\.js$");
    expect(res.stdout).not.toContain(`${TEMP_REGEX_IGNORE_LONG_PROJECT}/assets/very-long-bundle-name-number-one.min.js`);
  });

  test("keeps stdout totals useful even when no files match the pattern", () => {
    const res = runContexo(FIXTURES_DIR, ["--pattern", "does-not-exist-*.zzz", "--summary"]);
    const plain = stripAnsi(res.stdout);

    expect(res.success).toBe(true);
    expect(plain).toMatch(/files\s+0/);
    expect(plain).toMatch(/dirs\s+0/);
    expect(plain).not.toMatch(/^\s*lines\s+0$/m);
    expect(plain).not.toMatch(/^\s*chars\s+0$/m);
  });
});
