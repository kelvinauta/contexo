import Mustache from "mustache";
import type { FullStatistics } from "./types";

import stdoutStatsTemplate from "../templates/stdout-stats.txt" with { type: "text" };
import encodingStatsTemplate from "../templates/encoding-stats.txt" with { type: "text" };
import projectStatsTemplate from "../templates/project-stats.txt" with { type: "text" };
import argsTemplate from "../templates/args.txt" with { type: "text" };
import skippedTemplate from "../templates/skipped.txt" with { type: "text" };
import prettySummaryTemplate from "../templates/pretty-summary.txt" with { type: "text" };

export function renderExtraSections(options: {
  stats: FullStatistics;
  showArgs: boolean;
  invocationArgs: string[];
  tokenMode?: "draft" | "final";
}) {
  const { stats, showArgs, invocationArgs, tokenMode = "final" } = options;
  const tokenView = buildTokenView(stats, tokenMode);
  const showEncoding = Boolean(stats.compareModel);

  return {
    stdoutStats: renderTemplate(stdoutStatsTemplate, {
      totalLines: formatMetricNumber(stats.totalLines),
      totalChars: formatMetricNumber(stats.totalChars),
    }),
    encodingStats: showEncoding
      ? renderTemplate(encodingStatsTemplate, {
          encoding: stats.encoding,
          compareModel: stats.compareModel,
          tokenEstimate: tokenView.tokenEstimate,
          contextWindow: typeof stats.contextWindow === "number" ? formatMetricNumber(stats.contextWindow) : "unknown",
          usageEstimate: tokenView.usageEstimate,
          costEstimate: tokenView.costEstimate,
        })
      : "",
    projectStats: renderTemplate(projectStatsTemplate, {
      totalFiles: formatMetricNumber(stats.totalFiles),
      totalDirs: formatMetricNumber(stats.totalDirs),
      avgLines: stats.avgLines.toFixed(2),
      avgChars: stats.avgChars.toFixed(2),
      avgLineLength: stats.avgLineLength.toFixed(2),
      topByLines: joinValues(stats.topFilesByLines.map((item) => `${item.path}(${formatMetricNumber(item.count)})`)),
      topByChars: joinValues(stats.topFilesByChars.map((item) => `${item.path}(${formatMetricNumber(item.count)})`)),
      topDirs: joinValues(stats.topDirs.map((item) => `${item.path}(${formatMetricNumber(item.count)})`)),
      topLongLines: joinValues(stats.topLongLines.map((item) => `${item.path}:${item.line}(${formatMetricNumber(item.length)})`)),
    }),
    args: showArgs
      ? renderTemplate(argsTemplate, {
          invocationArgs: invocationArgs.length > 0 ? invocationArgs.map(formatArg).join(" ") : "(none)",
        })
      : "",
  };
}

export type SectionRenderOptions = Parameters<typeof renderExtraSections>[0];
export type RenderedExtraSections = ReturnType<typeof renderExtraSections>;

function buildTokenView(stats: FullStatistics, tokenMode: "draft" | "final"): {
  tokenEstimate: string;
  usageEstimate: string;
  costEstimate: string;
} {
  if (tokenMode === "draft") {
    return {
      tokenEstimate: "~000_000",
      usageEstimate: "~00.00%",
      costEstimate: "~0.000000",
    };
  }

  return {
    tokenEstimate: `~${formatMetricNumber(stats.tokens)}`,
    usageEstimate: typeof stats.usagePercentage === "number" ? `~${stats.usagePercentage.toFixed(2)}%` : "n/a",
    costEstimate: typeof stats.pricing === "number" ? `~${stats.pricing.toFixed(6)}` : "unknown",
  };
}

export function renderSkippedSection(entries: string[]): string {
  if (entries.length === 0) {
    return "";
  }

  return renderTemplate(skippedTemplate, {
    entries: entries.map((entry) => `- ${entry}`).join("\n"),
  });
}

export function renderPrettySummary(options: {
  stats: FullStatistics;
  showArgs: boolean;
  invocationArgs: string[];
}): string {
  const { stats, showArgs, invocationArgs } = options;
  const tokenView = buildTokenView(stats, "final");
  const showEncoding = Boolean(stats.compareModel);

  return renderTemplate(prettySummaryTemplate, {
    banner: colorize("30;46;1", " SUMMARY "),
    stdoutLabel: colorize("36;1", "STDOUT"),
    encodingLabel: colorize("32;1", "ENCODING"),
    projectLabel: colorize("35;1", "PROJECT"),
    topLinesLabel: colorize("33;1", "TOP BY LINES"),
    topCharsLabel: colorize("33;1", "TOP BY CHARS"),
    topDirsLabel: colorize("33;1", "TOP DIRS"),
    topLongLinesLabel: colorize("33;1", "LONGEST LINES"),
    argsLabel: colorize("34;1", "ARGS"),
    totalLines: formatMetricNumber(stats.totalLines),
    totalChars: formatMetricNumber(stats.totalChars),
    showEncoding,
    encoding: stats.encoding,
    compareModel: stats.compareModel,
    tokenEstimate: tokenView.tokenEstimate,
    contextWindow: typeof stats.contextWindow === "number" ? formatMetricNumber(stats.contextWindow) : "unknown",
    usageEstimate: tokenView.usageEstimate,
    costEstimate: tokenView.costEstimate,
    totalFiles: formatMetricNumber(stats.totalFiles),
    totalDirs: formatMetricNumber(stats.totalDirs),
    avgLines: stats.avgLines.toFixed(2),
    avgChars: stats.avgChars.toFixed(2),
    avgLineLength: stats.avgLineLength.toFixed(2),
    topByLines: joinPrettyValues(stats.topFilesByLines.map((item) => `${item.path} (${formatMetricNumber(item.count)})`)),
    topByChars: joinPrettyValues(stats.topFilesByChars.map((item) => `${item.path} (${formatMetricNumber(item.count)})`)),
    topDirs: joinPrettyValues(stats.topDirs.map((item) => `${item.path} (${formatMetricNumber(item.count)})`)),
    topLongLines: joinPrettyValues(stats.topLongLines.map((item) => `${item.path}:${item.line} (${formatMetricNumber(item.length)})`)),
    showArgs: showArgs && invocationArgs.length > 0,
    invocationArgs: invocationArgs.length > 0 ? invocationArgs.map(formatArg).join(" ") : "(none)",
  });
}

export type PrettySummaryOptions = Parameters<typeof renderPrettySummary>[0];

function renderTemplate(template: string, view: Record<string, unknown>): string {
  return `${Mustache.render(template, view).trimEnd()}\n`;
}

function joinValues(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "none";
}

function joinPrettyValues(values: string[]): string {
  return values.length > 0 ? values.map((value) => `    - ${value}`).join("\n") : "    - none";
}

function formatMetricNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value).replace(/,/g, "_");
}

function formatArg(arg: string): string {
  return /[\s"'`$\\]/.test(arg) ? JSON.stringify(arg) : arg;
}

function colorize(style: string, text: string): string {
  return `\u001b[${style}m${text}\u001b[0m`;
}
