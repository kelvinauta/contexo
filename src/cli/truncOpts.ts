import type { LimitConfig, TruncationMode } from "../core/types";
import pc from "picocolors";

const TRUNC_OPTS_DEFINITION = `
examples: 
* --line-maxchars "max:100,cut:middle,mark:"
* --file-maxlines "mark:...,cut:end,max:300"
* --file-maxchars "mark:truncate,max:30"
* --stdout-maxchars 100
* --stdout-maxlines "max:3000"

definition:
--<SCOPE>-max<LIMIT_TYPE> ::= <natural_number> | TRUNCOPTS
<SCOPE> ::= line | file | (stdout|out)
<LIMIT_TYPE> ::= line[s] | char[s]

TRUNCOPTS := KEYS(,KEYS)*
KEYS ::= MAX | CUT | MARK
MAX  ::= <natural_number>
CUT  ::= start | middle | end
MARK ::= [<text>] # can be empty

* SCOPE:line just can be LIMIT_TYPE:chars
* if use TRUNCOPTS MAX is required
`;

const VALID_CUTS = ["start", "middle", "end"] satisfies readonly TruncationMode[];

function failCli(flagName: string, message: string): never {
  process.stderr.write(`${pc.red(pc.bold("ERROR:"))} ${message}\n`);
  process.stderr.write(`\n${pc.dim(TRUNC_OPTS_DEFINITION)}\n`);
  process.exit(1);
}

function isTruncationMode(value: string): value is TruncationMode {
  return VALID_CUTS.some((cut) => cut === value);
}

export function parseTruncOpts(
  flagName: string,
  rawValue: string | number
) {
  if (typeof rawValue === "number") {
    if (!Number.isFinite(rawValue) || !Number.isInteger(rawValue)) {
      failCli(flagName, `Flag --${flagName} must be an integer.`);
    }
    if (rawValue < 1) {
      failCli(flagName, `Flag --${flagName} must be greater than 0.`);
    }
    return { max: rawValue } satisfies LimitConfig;
  }

  const value = String(rawValue);
  const trimmedValue = value.trim();

  if (trimmedValue === "") {
    failCli(flagName, `Flag --${flagName} must not be empty.`);
  }

  if (/^-?\d+$/.test(trimmedValue)) {
    const num = Number(trimmedValue);
    if (num < 1) {
      failCli(flagName, `Flag --${flagName} must be greater than 0.`);
    }
    return { max: num } satisfies LimitConfig;
  }

  let max: number | undefined;
  let cut: TruncationMode | undefined;
  let mark: string | undefined;
  const seenKeys = new Set<"max" | "cut" | "mark">();
  const keyPattern = /(^|,)(max|cut|mark):/g;
  const positions: Array<{
    key: "max" | "cut" | "mark";
    start: number;
    valueStart: number;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = keyPattern.exec(value)) !== null) {
    const prefix = match[1];
    const key = match[2] as "max" | "cut" | "mark";
    positions.push({
      key,
      start: match.index + prefix.length,
      valueStart: match.index + match[0].length,
    });
  }

  if (positions.length === 0 || positions[0].start !== 0) {
    failCli(flagName, `Flag --${flagName} must be a positive integer or valid TRUNCOPTS.`);
  }

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const key = pos.key;
    const nextStart = positions[i + 1]?.start ?? value.length;
    const rawSlice = value.slice(pos.valueStart, positions[i + 1] ? nextStart - 1 : nextStart);
    const rawVal = key === "mark" ? rawSlice : rawSlice.trim();

    if (seenKeys.has(key)) {
      failCli(flagName, `Flag --${flagName} has duplicate key '${key}'.`);
    }
    seenKeys.add(key);

    if (key === "max") {
      if (rawVal === "") {
        failCli(flagName, `Flag --${flagName} has empty value for key 'max'.`);
      }
      if (!/^\d+$/.test(rawVal)) {
        failCli(flagName, `Flag --${flagName} key 'max' must be an integer.`);
      }
      const num = Number(rawVal);
      if (num < 1) {
        failCli(flagName, `Flag --${flagName} key 'max' must be greater than 0.`);
      }
      max = num;
      continue;
    }

    if (key === "cut") {
      if (rawVal === "") {
        failCli(flagName, `Flag --${flagName} has empty value for key 'cut'.`);
      }
      const normalized = rawVal.toLowerCase();
      if (!isTruncationMode(normalized)) {
        failCli(
          flagName,
          `Flag --${flagName} key 'cut' must be one of: ${VALID_CUTS.join(", ")}.`
        );
      }
      cut = normalized;
      continue;
    }

    if (key === "mark") {
      if (/\r|\n/.test(rawVal)) {
        failCli(flagName, `Flag --${flagName} key 'mark' must be a single line.`);
      }
      mark = rawVal;
    }
  }

  if (max === undefined) {
    failCli(flagName, `Flag --${flagName} requires 'max' key in TRUNCOPTS.`);
  }

  return {
    max,
    ...(cut === undefined ? {} : { cut }),
    ...(mark === undefined ? {} : { mark }),
  } satisfies LimitConfig;
}
