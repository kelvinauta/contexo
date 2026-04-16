export type TruncationMode = "start" | "middle" | "end";

export interface LimitConfig {
  max?: number;
  cut?: TruncationMode;
  mark?: string;
}

export interface ContexoConfig {
  path: string;
  ignore: string[];
  cliIgnore: string[];
  ignoreRegex: string[];
  pattern: string[];
  enc: string;
  compareModel?: string;
  summaryMode?: boolean;
  numberLine: boolean;
  showArgs: boolean;
  invocationArgs: string[];
  listEncodings?: boolean;
  listModels?: string;
  showReadme?: boolean;
  disableIgnorefile?: boolean;
  lineMaxChars?: LimitConfig;
  fileMaxLines?: LimitConfig;
  fileMaxChars?: LimitConfig;
  stdoutMaxLines?: LimitConfig;
  stdoutMaxChars?: LimitConfig;
  defaultMark: string;
  pageLines?: number;
  pageChar?: number;
  clean?: string[];
  hide?: string[];
  extensionFallbacks?: Record<string, string>;
  limitNested: number;
  limitFiles: number;
  followLink: boolean;
  followMount: boolean;
}

export interface FileInfo {
  filePath: string;
  relativePath: string;
  size: number;
  extension: string;
  filename: string;
  isBinary?: boolean;
  content?: string;
  lineCount?: number;
  charCount?: number;
}

export interface ScanResult {
  files: FileInfo[];
  ignoredPaths: string[];
  dirCount: number;
  dirChildrenCount: Record<string, number>;
  hasGitignore: boolean;
}

export interface TokenResult {
  compareModel?: string;
  encoding: string;
  tokens: number;
  contextWindow: number | "unknown";
  usagePercentage: number | "n/a";
  pricing: number | "unknown";
  message: string;
}

export interface FullStatistics extends TokenResult {
  totalFiles: number;
  totalDirs: number;
  totalLines: number;
  totalChars: number;
  avgLines: number;
  avgChars: number;
  avgLineLength: number;
  topFilesByLines: { path: string; count: number }[];
  topFilesByChars: { path: string; count: number }[];
  topDirs: { path: string; count: number }[];
  topLongLines: { path: string; line: number; length: number }[];
}
