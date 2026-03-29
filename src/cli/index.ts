import { cli } from "cleye";
import { DEFAULT_CONFIG } from "../config/defaults";
import { ContexoConfig, TruncationMode, LimitConfig } from "../core/types";
import { VERSION } from "../version";
import path from "node:path";
import pc from "picocolors";
import { parseTruncOpts } from "./truncOpts";

const VALID_HIDE_OPTIONS = ["summary", "filename", "absolutepath", "relativepath", "skippedlist", "context", "all"];
const VALID_CLEAN_OPTIONS = ["blankline", "spaceunless", "comments", "comments:line", "comments:block", "all"];

const FLAG_SPELLING_ALIASES: Record<string, string> = {
  "--limit-file": "--limit-files",
  "--compare-models": "--compare-model",
  "--page-line": "--page-lines",
  "--page-chars": "--page-char",
  "--follow-links": "--follow-link",
  "--follow-mounts": "--follow-mount",
  "--show-arg": "--show-args",
  "--disable-ignorefiles": "--disable-ignorefile",
  "--out-maxlines": "--stdout-maxlines",
  "--out-maxline": "--stdout-maxlines",
  "--out-maxchars": "--stdout-maxchars",
  "--out-maxchar": "--stdout-maxchars",
  "--out-max-lines": "--stdout-maxlines",
  "--out-max-chars": "--stdout-maxchars",
  "--line-maxchar": "--line-maxchars",
  "--file-maxline": "--file-maxlines",
  "--file-maxchar": "--file-maxchars",
  "--stdout-maxline": "--stdout-maxlines",
  "--stdout-maxchar": "--stdout-maxchars",
  "--line-max-chars": "--line-maxchars",
  "--file-max-lines": "--file-maxlines",
  "--file-max-chars": "--file-maxchars",
  "--stdout-max-lines": "--stdout-maxlines",
  "--stdout-max-chars": "--stdout-maxchars",
};

const REMOVED_FLAGS: Record<string, string> = {
  "--limit-line-chars": "--line-maxchars",
  "--limit-line-char": "--line-maxchars",
  "--limit-file-chars": "--file-maxchars",
  "--limit-file-char": "--file-maxchars",
  "--limit-file-lines": "--file-maxlines",
  "--limit-file-line": "--file-maxlines",
  "--limit-total-chars": "--stdout-maxchars",
  "--limit-total-char": "--stdout-maxchars",
  "--limit-total-lines": "--stdout-maxlines",
  "--limit-total-line": "--stdout-maxlines",
  "--trunc-line": "use --line-maxchars \"max:N,cut:mode\" instead",
  "--trunc-lines": "use --line-maxchars \"max:N,cut:mode\" instead",
  "--trunc-file": "use --file-maxchars \"max:N,cut:mode\" instead",
  "--trunc-files": "use --file-maxchars \"max:N,cut:mode\" instead",
  "--trunc-mark": "--mark",
  "--trunc-marks": "--mark",
};

const NUMERIC_FLAGS = new Set([
  "--limit-nested",
  "--limit-files",
  "--page-lines",
  "--page-char",
  "--line-maxchars",
  "--file-maxlines",
  "--file-maxchars",
  "--stdout-maxlines",
  "--stdout-maxchars",
]);

function failCli(message: string): never {
  process.stderr.write(`${pc.red(pc.bold("ERROR:"))} ${message}\n`);
  process.exit(1);
}

function parseCsvFlag(values: string[] | undefined): string[] {
  return (values || []).flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean);
}

function getSearchableArgs(rawArgs: string[], endOfFlagsArgs: string[]): string[] {
  const separatorIndex = rawArgs.indexOf("--");
  if (separatorIndex !== -1) {
    return rawArgs.slice(0, separatorIndex);
  }
  if (endOfFlagsArgs.length === 0) {
    return rawArgs;
  }
  return rawArgs.slice(0, Math.max(0, rawArgs.length - endOfFlagsArgs.length));
}

function wasFlagProvided(searchableArgs: string[], flagName: string, aliases: string[] = []): boolean {
  const spellings = [
    `--${flagName}`,
    ...aliases.map((alias) => alias.length === 1 ? `-${alias}` : `--${alias}`),
  ];
  return searchableArgs.some((arg) => {
    return spellings.some((spelling) => {
      return arg === spelling || arg.startsWith(`${spelling}=`) || arg.startsWith(`${spelling}:`) || arg.startsWith(`${spelling}.`);
    });
  });
}

function validateIntegerFlag(flagName: string, value: number | undefined, min: number): void {
  if (value === undefined) {
    return;
  }
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    failCli(`Flag --${flagName} must be an integer.`);
  }
  if (value < min) {
    const requirement = min === 0 ? "greater than or equal to 0" : "greater than 0";
    failCli(`Flag --${flagName} must be ${requirement}.`);
  }
}

function normalizeFlagSpellings(rawArgs: string[]): string[] {
  const normalized: string[] = [];
  for (let index = 0; index < rawArgs.length; index++) {
    const arg = rawArgs[index];
    if (arg === "--") {
      normalized.push(...rawArgs.slice(index));
      break;
    }
    normalized.push(rewriteFlagSpelling(arg));
  }
  return normalized;
}

function rewriteFlagSpelling(arg: string): string {
  for (const [alias, canonical] of Object.entries(FLAG_SPELLING_ALIASES)) {
    if (arg === alias) {
      return canonical;
    }
    if (
      arg.startsWith(`${alias}=`)
      || arg.startsWith(`${alias}:`)
      || arg.startsWith(`${alias}.`)
    ) {
      return `${canonical}${arg.slice(alias.length)}`;
    }
  }
  return arg;
}

function validateListOptions(flagName: string, values: string[], allowed: string[]): void {
  const invalidValues = values.filter((value) => !allowed.includes(value));
  if (invalidValues.length > 0) {
    failCli(`Invalid value for --${flagName}: ${invalidValues.join(", ")}. Use one of: ${allowed.join(", ")}`);
  }
}

function validateMark(value: string | undefined): string | undefined {
  if (value === undefined) {
    return value;
  }
  if (/\r|\n/.test(value)) {
    failCli("Flag --mark must be a single line.");
  }
  return value;
}

function normalizeNegativeNumberArgs(rawArgs: string[]): string[] {
  const normalized: string[] = [];
  for (let index = 0; index < rawArgs.length; index++) {
    const arg = rawArgs[index];
    if (arg === "--") {
      normalized.push(...rawArgs.slice(index));
      break;
    }
    const nextArg = rawArgs[index + 1];
    if (NUMERIC_FLAGS.has(arg) && nextArg && /^-\d+(?:\.\d+)?$/.test(nextArg)) {
      normalized.push(`${arg}=${nextArg}`);
      index++;
      continue;
    }
    normalized.push(arg);
  }
  return normalized;
}

function parseLimitFlag(
  flagName: string,
  value: string | number | undefined
): LimitConfig | undefined {
  if (value === undefined) {
    return undefined;
  }
  return parseTruncOpts(flagName, value);
}

export function parseCli() {
  const rawArgs = process.argv.slice(2);
  const searchableRawArgs = getSearchableArgs(rawArgs, []);

  if (wasFlagProvided(searchableRawArgs, "prettysummary")) {
    failCli("Flag --prettysummary was removed. Use --summary instead.");
  }

  if (wasFlagProvided(searchableRawArgs, "limit-lines")) {
    failCli("Flag --limit-lines was removed. Use --file-maxlines or --stdout-maxlines.");
  }

  if (wasFlagProvided(searchableRawArgs, "noenc")) {
    failCli("Flag --noenc was removed. Token/model stats are off by default; use --compare-model or --model to enable them.");
  }

  for (const [removedFlag, replacement] of Object.entries(REMOVED_FLAGS)) {
    if (wasFlagProvided(searchableRawArgs, removedFlag.slice(2))) {
      if (replacement.startsWith("use ")) {
        failCli(`Flag ${removedFlag} was removed. ${replacement}.`);
      } else {
        failCli(`Flag ${removedFlag} was removed. Use ${replacement} instead.`);
      }
    }
  }

  const normalizedFlagArgs = normalizeFlagSpellings(rawArgs);
  const normalizedArgs = normalizeNegativeNumberArgs(normalizedFlagArgs);

  const argv = cli({
    name: "contexo",
    version: VERSION,
    strictFlags: true,
    parameters: [
      "[path]",
    ],
    flags: {
      pattern: {
        type: [String],
        description: "Root-relative file glob filter (for example '*.ts' or 'src/file-??.ts'). Can be used multiple times.",
      },
      ignore: {
        type: [String],
        description: "Folders or files to ignore. Can be used multiple times.",
      },
      clean: {
        type: [String],
        description: "Cleanup filters: blankline, spaceunless, comments, comments:line, comments:block, all.",
      },
      lineMaxchars: {
        type: [String],
        description: "Maximum characters per line. Accepts number or TRUNCOPTS (max:N[,cut:mode][,mark:text]).",
      },
      fileMaxlines: {
        type: [String],
        description: "Maximum lines per file. Accepts number or TRUNCOPTS (max:N[,cut:mode][,mark:text]).",
      },
      fileMaxchars: {
        type: [String],
        description: "Maximum characters per file. Accepts number or TRUNCOPTS (max:N[,cut:mode][,mark:text]).",
      },
      stdoutMaxlines: {
        type: [String],
        description: "Maximum lines for stdout output. Accepts number or TRUNCOPTS (max:N only, cut is fixed to end).",
      },
      stdoutMaxchars: {
        type: [String],
        description: "Maximum characters for stdout output. Accepts number or TRUNCOPTS (max:N only, cut is fixed to end).",
      },
      mark: {
        type: String,
        description: "Default truncation mark when not specified in scope flags. Default: ...",
      },
      limitFiles: {
        type: Number,
        description: "Stop scanning after processing N files.",
        default: DEFAULT_CONFIG.limitFiles,
      },
      limitNested: {
        type: Number,
        description: "Maximum directory depth (0 for unlimited).",
        default: DEFAULT_CONFIG.limitNested,
      },
      summary: {
        type: Boolean,
        alias: "s",
        description: "Show only the visual summary-only view and hide context/skippedlist.",
        default: false,
      },
      numberLine: {
        type: Boolean,
        alias: "n",
        description: "Prefix each emitted file line with its line number.",
        default: DEFAULT_CONFIG.numberLine,
      },
      nosummary: {
        type: Boolean,
        description: "Hide summary sections entirely without using the generic --hide flag.",
        default: false,
      },
      compareModel: {
        type: String,
        description: "Model profile to compare token, usage, and cost estimates against.",
      },
      enc: {
        type: String,
        description: "Encoding algorithm to use for token calculation. Requires --compare-model or --model.",
      },
      hide: {
        type: [String],
        description: "Hide output sections: summary, filename, absolutepath, relativepath, skippedlist, context, all.",
      },
      pageLines: {
        type: Number,
        description: "Request a specific page for line-based pagination.",
        default: DEFAULT_CONFIG.pageLines,
      },
      pageChar: {
        type: Number,
        description: "Request a specific page for character-based pagination.",
        default: DEFAULT_CONFIG.pageChar,
      },
      followLink: {
        type: Boolean,
        description: "Follow symbolic links to directories and files.",
        default: DEFAULT_CONFIG.followLink,
      },
      followMount: {
        type: Boolean,
        description: "Follow different filesystems encountered during scan.",
        default: DEFAULT_CONFIG.followMount,
      },
      showArgs: {
        type: Boolean,
        description: "Show the original CLI arguments in the summary header.",
        default: false,
      },
      ignoreRegex: {
        type: [String],
        description: "Regex patterns to exclude files or directories.",
      },
      disableIgnorefile: {
        type: Boolean,
        description: "Disable reading .gitignore / .ignore files.",
        default: false,
      },
      encodings: {
        type: Boolean,
        description: "List supported tokenization algorithms (encodings).",
        default: false,
      },
      models: {
        type: String,
        description: "List available models from models.dev. Optional provider filter.",
      },
      model: {
        type: String,
        description: "Same behavior as --compare-model.",
      },
      readme: {
        type: Boolean,
        description: "Print the bundled technical documentation.",
        default: false,
      }
    },
    help: {
      description: "ConteXo is a technical CLI utility designed to aggregate project files into a structured text format specifically for Large Language Models (LLMs). It optimizes context windows by stripping noise (comments, redundant whitespace) and enforcing strict text limits.\n\n" +
                    "Text-budget scopes: line (per line), file (per file), stdout (total output). Each scope accepts a number or TRUNCOPTS string (max:N[,cut:mode][,mark:text]). Cut mode can be start, middle, or end (default: end). The line scope only supports chars. Stdout only supports cut:end for pagination consistency.\n\n" +
                    "Usage Examples:\n" +
                    "  contexo .                                                   # Aggregate current directory\n" +
                    "  contexo ./src --clean comments,blankline                    # Clean comments and empty lines\n" +
                    "  contexo . --line-maxchars 120 --mark '<...>'                # Truncate lines at 120 chars\n" +
                    "  contexo . --file-maxlines 'max:100,mark:...'                # Limit files to 100 lines\n" +
                    "  contexo . --file-maxchars 'max:500,cut:middle'              # Limit files to 500 chars, middle cut\n" +
                    "  contexo . --stdout-maxlines 2000                            # Limit total output to 2000 lines\n" +
                    "  contexo . --summary --show-args                             # Show summary with CLI args\n" +
                    "  contexo . --stdout-maxlines 500 --page-lines 2              # Paginate output (page 2)\n\n" +
                    "Model metadata is cached in /tmp/contexo-models-cache and updated every 24h.",
    },
  }, undefined, normalizedArgs);

  const endOfFlagsArgs = Array.isArray(argv._["--"]) ? argv._["--"] : [];
  const searchableArgs = getSearchableArgs(normalizedFlagArgs, endOfFlagsArgs);
  
  const explicitFlags = {
    enc: wasFlagProvided(searchableArgs, "enc"),
    lineMaxchars: wasFlagProvided(searchableArgs, "line-maxchars"),
    fileMaxlines: wasFlagProvided(searchableArgs, "file-maxlines"),
    fileMaxchars: wasFlagProvided(searchableArgs, "file-maxchars"),
    stdoutMaxlines: wasFlagProvided(searchableArgs, "stdout-maxlines"),
    stdoutMaxchars: wasFlagProvided(searchableArgs, "stdout-maxchars"),
    pageLines: wasFlagProvided(searchableArgs, "page-lines"),
    pageChar: wasFlagProvided(searchableArgs, "page-char"),
    summary: wasFlagProvided(searchableArgs, "summary", ["s"]),
    nosummary: wasFlagProvided(searchableArgs, "nosummary"),
  };

  validateIntegerFlag("limit-nested", argv.flags.limitNested, 0);
  validateIntegerFlag("limit-files", argv.flags.limitFiles, 0);
  validateIntegerFlag("page-lines", argv.flags.pageLines, 1);
  validateIntegerFlag("page-char", argv.flags.pageChar, 1);

  const positionalArgs = Array.from(argv._).filter((value): value is string => typeof value === "string");
  const extraArgs = positionalArgs.slice(1);
  if (extraArgs.length > 0) {
    failCli(`Unexpected positional arguments: ${extraArgs.join(", ")}.`);
  }

  if (argv.flags.compareModel && argv.flags.model && argv.flags.compareModel !== argv.flags.model) {
    failCli("Flags --compare-model and --model must not disagree.");
  }

  if (explicitFlags.summary && explicitFlags.nosummary) {
    failCli("Flags --summary and --nosummary are mutually exclusive.");
  }

  const resolvedCompareModel = argv.flags.compareModel || argv.flags.model;
  const isMetaCommand = argv.flags.encodings || argv.flags.models !== undefined || argv.flags.readme;
  if (explicitFlags.enc && !resolvedCompareModel && !isMetaCommand) {
    failCli("Flag --enc requires --compare-model or --model.");
  }

  const inputPath = argv._.path || ".";
  const absolutePath = path.resolve(process.cwd(), inputPath);
  const defaultMark = validateMark(argv.flags.mark) ?? DEFAULT_CONFIG.defaultMark;

  const lineMaxchars = argv.flags.lineMaxchars.length > 0
    ? parseLimitFlag("line-maxchars", argv.flags.lineMaxchars[argv.flags.lineMaxchars.length - 1])
    : undefined;

  const fileMaxlines = argv.flags.fileMaxlines.length > 0
    ? parseLimitFlag("file-maxlines", argv.flags.fileMaxlines[argv.flags.fileMaxlines.length - 1])
    : undefined;

  const fileMaxchars = argv.flags.fileMaxchars.length > 0
    ? parseLimitFlag("file-maxchars", argv.flags.fileMaxchars[argv.flags.fileMaxchars.length - 1])
    : undefined;

  const stdoutMaxlines = argv.flags.stdoutMaxlines.length > 0
    ? parseLimitFlag("stdout-maxlines", argv.flags.stdoutMaxlines[argv.flags.stdoutMaxlines.length - 1])
    : undefined;

  const stdoutMaxchars = argv.flags.stdoutMaxchars.length > 0
    ? parseLimitFlag("stdout-maxchars", argv.flags.stdoutMaxchars[argv.flags.stdoutMaxchars.length - 1])
    : undefined;

  if (stdoutMaxlines?.cut && stdoutMaxlines.cut !== "end") {
    failCli("Flag --stdout-maxlines only supports cut:end for pagination compatibility.");
  }
  if (stdoutMaxchars?.cut && stdoutMaxchars.cut !== "end") {
    failCli("Flag --stdout-maxchars only supports cut:end for pagination compatibility.");
  }

  const config: ContexoConfig = {
    path: absolutePath,
    enc: argv.flags.enc || DEFAULT_CONFIG.enc,
    compareModel: resolvedCompareModel,
    summaryMode: argv.flags.summary,
    numberLine: argv.flags.numberLine,
    showArgs: argv.flags.showArgs,
    invocationArgs: rawArgs,
    listEncodings: argv.flags.encodings,
    listModels: argv.flags.models,
    showReadme: argv.flags.readme,
    ignore: [...DEFAULT_CONFIG.ignore],
    ignoreRegex: [...DEFAULT_CONFIG.ignoreRegex],
    pattern: [],
    disableIgnorefile: argv.flags.disableIgnorefile,
    lineMaxChars: lineMaxchars,
    fileMaxLines: fileMaxlines,
    fileMaxChars: fileMaxchars,
    stdoutMaxLines: stdoutMaxlines,
    stdoutMaxChars: stdoutMaxchars,
    defaultMark,
    limitNested: argv.flags.limitNested,
    limitFiles: argv.flags.limitFiles,
    followLink: argv.flags.followLink,
    followMount: argv.flags.followMount,
    pageLines: argv.flags.pageLines,
    pageChar: argv.flags.pageChar,
    clean: [],
    hide: [],
    extensionFallbacks: DEFAULT_CONFIG.extensionFallbacks
  };

  let hideOptions: string[] = [];
  if (argv.flags.hide && argv.flags.hide.length > 0) {
    hideOptions = parseCsvFlag(argv.flags.hide);
    if (hideOptions.length === 0) {
      failCli("Flag --hide requires at least one non-empty option.");
    }
    validateListOptions("hide", hideOptions, VALID_HIDE_OPTIONS);
  }

  if (argv.flags.summary) {
    hideOptions.push("context", "skippedlist");
  }

  if (argv.flags.nosummary) {
    hideOptions.push("summary");
  }

  if (hideOptions.length > 0) {
    if (hideOptions.includes("all")) {
      config.hide = ["summary", "filename", "absolutepath", "relativepath", "skippedlist", "context"];
    } else {
      config.hide = hideOptions.filter(h => VALID_HIDE_OPTIONS.includes(h) && h !== "all");
    }
  }

  config.hide = Array.from(new Set(config.hide));

  if (argv.flags.clean && argv.flags.clean.length > 0) {
    let cleanOptions = parseCsvFlag(argv.flags.clean);
    if (cleanOptions.length === 0) {
      failCli("Flag --clean requires at least one non-empty option.");
    }
    validateListOptions("clean", cleanOptions, VALID_CLEAN_OPTIONS);
    if (cleanOptions.includes("all") || (cleanOptions.length === 1 && cleanOptions[0] === "")) {
      config.clean = ["blankline", "spaceunless", "comments"];
    } else {
      config.clean = cleanOptions.filter(c => VALID_CLEAN_OPTIONS.includes(c) && c !== "all");
    }
  } else if (rawArgs.includes("--clean")) {
    config.clean = ["blankline", "spaceunless", "comments"];
  }

  if (argv.flags.ignore.length) {
    config.ignore.push(...argv.flags.ignore);
  }
  if (argv.flags.ignoreRegex.length) {
    config.ignoreRegex.push(...argv.flags.ignoreRegex);
  }
  if (argv.flags.pattern.length) {
    config.pattern = Array.from(new Set(parseCsvFlag(argv.flags.pattern)));
    if (config.pattern.length === 0) {
      failCli("Flag --pattern requires at least one non-empty glob.");
    }
  }

  if (explicitFlags.stdoutMaxlines && explicitFlags.stdoutMaxchars) {
    failCli("Use either --stdout-maxlines or --stdout-maxchars, not both.");
  }

  if (explicitFlags.pageLines && !explicitFlags.stdoutMaxlines) {
    failCli("Flag --page-lines requires --stdout-maxlines.");
  }

  if (explicitFlags.pageChar && !explicitFlags.stdoutMaxchars) {
    failCli("Flag --page-char requires --stdout-maxchars.");
  }

  if (config.hide.includes("context") && (explicitFlags.stdoutMaxlines || explicitFlags.stdoutMaxchars || explicitFlags.pageLines || explicitFlags.pageChar)) {
    failCli("Pagination flags require visible context. Remove --summary/--hide context or remove the pagination flags.");
  }

  return config;
}
