import { describe, expect, test } from "bun:test";
import { countChars, measureText } from "../../src/core/measure";
import { Paginator } from "../../src/core/paginator";
import { TextProcessor } from "../../src/core/processor";

describe("Measurement Contract", () => {
  test("counts chars by Unicode code points", () => {
    expect(countChars("abc")).toBe(3);
    expect(countChars("a😀b")).toBe(3);
    expect(countChars("a\u0301")).toBe(2);
  });

  test("measures chars and logical lines from shared utilities", () => {
    const metrics = measureText("a😀\nb");

    expect(metrics.chars).toBe(4);
    expect(metrics.lines).toBe(2);
    expect(metrics.longestLineChars).toBe(2);
  });

  test("applies line-char truncation using code point limits", () => {
    const processor = new TextProcessor({
      lineMaxChars: { max: 5, cut: "end", mark: "..." },
      defaultMark: "...",
    });

    const [file] = processor.process([
      {
        filePath: "/tmp/unicode.txt",
        relativePath: "unicode.txt",
        size: 0,
        extension: "txt",
        filename: "unicode.txt",
        content: "A😀BCDE",
      },
    ]);

    expect(file.content).toBe("A😀...");
    expect(file.charCount).toBe(5);
  });

  test("paginates char budgets by code points", () => {
    const page1 = new Paginator({ stdoutMaxChars: 3, pageChar: 1 }).paginate("A😀BC");
    const page2 = new Paginator({ stdoutMaxChars: 3, pageChar: 2 }).paginate("A😀BC");

    expect(page1.content).toBe("A😀B");
    expect(page2.content).toBe("C");
  });

  test("appends bychars markers within the total char budget", () => {
    const text = "A".repeat(50);
    const page1 = new Paginator({ stdoutMaxChars: 40, pageChar: 1, truncMark: "..." }).paginate(text);
    const page2 = new Paginator({ stdoutMaxChars: 40, pageChar: 2, truncMark: "..." }).paginate(text);

    expect(page1.content).toBe(`${"A".repeat(19)}...bychars:[page 1/2]`);
    expect(countChars(page1.content)).toBeLessThanOrEqual(40);
    expect(page2.content).toBe("A".repeat(31));
  });
});
