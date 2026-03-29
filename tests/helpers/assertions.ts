import { expect } from "bun:test";
import { countChars } from "../../src/core/measure";

export function expectBalancedFences(text: string): void {
  const fenceLines = text.split("\n").filter((line) => /^```/.test(line));
  expect(fenceLines.length % 2).toBe(0);
}

export function expectInOrder(text: string, snippets: string[]): void {
  let cursor = -1;

  for (const snippet of snippets) {
    const next = text.indexOf(snippet, cursor + 1);
    expect(next).toBeGreaterThan(cursor);
    cursor = next;
  }
}

export function expectWithinCharBudget(text: string, limit: number): void {
  expect(countChars(text)).toBeLessThanOrEqual(limit);
}
