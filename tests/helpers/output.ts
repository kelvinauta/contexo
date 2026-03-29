export const ANSI_PATTERN = /[\u001b\u009b]\[[0-?]*[ -/]*[@-~]/;

export function stripAnsi(text: string): string {
  return text.replace(new RegExp(ANSI_PATTERN.source, "g"), "");
}

export function parseSummaryMetric(stdout: string, label: "total_lines" | "total_chars"): number {
  const normalized = stripAnsi(stdout);
  const patterns: Record<"total_lines" | "total_chars", RegExp> = {
    total_lines: /(?:total_lines=|^\s*lines\s+)([0-9_]+)/m,
    total_chars: /(?:total_chars=|^\s*chars\s+)([0-9_]+)/m,
  };
  const match = normalized.match(patterns[label]);

  if (!match) {
    throw new Error(`Could not find summary metric: ${label}`);
  }

  return Number(match[1].replace(/_/g, ""));
}

export function parseTokenEstimate(stdout: string): number {
  const match = stripAnsi(stdout).match(/(?:tokens=~|^\s*tokens\s+~)([0-9_]+)/m);

  if (!match) {
    throw new Error("Could not find token estimate");
  }

  return Number(match[1].replace(/_/g, ""));
}
