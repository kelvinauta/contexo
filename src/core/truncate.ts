import { countChars, splitTextAtChar } from "./measure";
import type { TruncationMode } from "./types";

export function smartTruncate(
  input: string,
  max: number,
  {
    mark = "...",
    position = Number.POSITIVE_INFINITY,
    trim = true,
  }: {
    mark?: string;
    position?: number;
    trim?: boolean;
  } = {}
) {
  if (typeof input !== "string") throw new Error("smartTruncate arg[0] must be string");
  if (typeof max !== "number") throw new Error("smartTruncate arg[1] must be number");
  if (typeof mark !== "string") throw new Error("smartTruncate arg[2][mark] must be string");
  if (typeof position !== "number") throw new Error("smartTruncate arg[2][position] must be number");
  if (typeof trim !== "boolean") throw new Error("smartTruncate arg[2][trim] must be boolean");

  max = Math.floor(max);
  if (!(max > 0)) return "";

  const workable = trim ? input.trim() : input;
  const workableChars = countChars(workable);
  if (workableChars <= max) return workable;

  mark = fitMarker(mark, max);

  const markChars = countChars(mark);
  const available = max - markChars;
  let pos = Math.floor(position) || 0;
  pos = pos < 0 ? available + pos : pos;

  const leftCount = Math.max(0, Math.min(available, pos));
  const rightCount = available - leftCount;

  const [left] = splitTextAtChar(workable, leftCount);
  const [, right] = splitTextAtChar(workable, workableChars - rightCount);

  return left + mark + right;
}

export type SmartTruncateOptions = NonNullable<Parameters<typeof smartTruncate>[2]>;

export function truncateWithMode(
  input: string,
  max: number,
  mode: TruncationMode,
  marker: string
): string {
  const fittedMarker = fitMarker(marker, max);
  const position = getTruncationPosition(mode, max, countChars(fittedMarker));
  return smartTruncate(input, max, { mark: fittedMarker, position, trim: false });
}

export function truncateContent(input: string, options: {
  unit: "chars" | "lines";
  max: number;
  mark: string;
  mode?: TruncationMode;
  trim?: boolean;
}) {
  if (options.unit === "lines") {
    return truncateByLines(input, options.max, options.mark, options.mode);
  }

  return truncateWithMode(input, options.max, options.mode || "end", options.mark);
}

export type TruncateContentOptions = Parameters<typeof truncateContent>[1];

function getTruncationPosition(mode: TruncationMode, max: number, markerLength: number): number {
  const available = Math.max(0, Math.floor(max) - markerLength);

  if (mode === "start") {
    return 0;
  }

  if (mode === "middle") {
    return Math.ceil(available / 2);
  }

  return available;
}

function fitMarker(marker: string, max: number): string {
  if (countChars(marker) <= max) {
    return marker;
  }

  if (!(max > 0)) {
    return "";
  }

  return ".".repeat(Math.min(3, Math.floor(max)));
}

function truncateByLines(input: string, max: number, marker: string, mode: TruncationMode = "end"): string {
  if (typeof input !== "string") throw new Error("truncateByLines arg[0] must be string");
  if (typeof max !== "number") throw new Error("truncateByLines arg[1] must be number");
  if (typeof marker !== "string") throw new Error("truncateByLines arg[2] must be string");

  max = Math.floor(max);
  if (!(max > 0)) return "";
  if (input === "") return input;

  // Remove trailing newline for consistent line counting
  const normalizedInput = input.endsWith("\n") ? input.slice(0, -1) : input;
  const lines = normalizedInput.split("\n");
  if (lines.length <= max) {
    return input;
  }

  const markerLineCount = marker === "" ? 0 : marker.split("\n").length;
  const availableLines = max - markerLineCount;

  if (availableLines <= 0) {
    return marker;
  }

  const injectMarker = (parts: string[]): string => {
    return marker === "" ? parts.join("\n") : [...parts, marker].join("\n");
  };

  if (mode === "start") {
    const visibleLines = lines.slice(-availableLines);
    return marker === "" ? visibleLines.join("\n") : [marker, ...visibleLines].join("\n");
  }

  if (mode === "middle") {
    const halfAvailable = Math.floor(availableLines / 2);
    const topLines = lines.slice(0, halfAvailable);
    const bottomLines = lines.slice(-(availableLines - halfAvailable));
    return marker === ""
      ? [...topLines, ...bottomLines].join("\n")
      : [...topLines, marker, ...bottomLines].join("\n");
  }

  return injectMarker(lines.slice(0, availableLines));
}
