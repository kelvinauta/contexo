import { FileInfo, LimitConfig, TruncationMode } from "./types";
import { CommentStripper, CommentStripperType } from "./cleaners/comment-stripper";
import { countChars, countLines, measureText } from "./measure";
import { truncateContent } from "./truncate";

export interface ProcessorOptions {
  lineMaxChars?: LimitConfig;
  fileMaxLines?: LimitConfig;
  fileMaxChars?: LimitConfig;
  defaultMark: string;
  clean?: string[];
  extensionFallbacks?: Record<string, string>;
}

function resolveMark(scopeConfig: LimitConfig | undefined, globalMark: string): string {
  if (scopeConfig?.mark !== undefined) {
    return scopeConfig.mark;
  }
  return globalMark;
}

function resolveCut(scopeConfig: LimitConfig | undefined, defaultCut: TruncationMode): TruncationMode {
  return scopeConfig?.cut ?? defaultCut;
}

export class TextProcessor {
  constructor(private options: ProcessorOptions) {}

  process(files: FileInfo[]): FileInfo[] {
    return files.map((file) => {
      if (file.isBinary || !file.content) {
        return {
            ...file,
            lineCount: 0,
            charCount: 0
        };
      }

      let content = file.content;

      if (this.options.clean && this.options.clean.length > 0) {
        
        let commentType: CommentStripperType = "none";
        if (this.options.clean.includes("comments") || this.options.clean.includes("all")) {
          commentType = "all";
        } else if (this.options.clean.includes("comments:line")) {
          commentType = "line";
        } else if (this.options.clean.includes("comments:block")) {
          commentType = "block";
        }

        if (commentType !== "none") {
          content = CommentStripper.strip(content, file.extension, commentType, this.options.extensionFallbacks);
        }

        let lines = content.split("\n");

        if (this.options.clean.includes("blankline") || this.options.clean.includes("all")) {
          lines = lines.filter(line => !/^\s*$/.test(line));
        }

        if (this.options.clean.includes("spaceunless") || this.options.clean.includes("all")) {
          lines = lines.map(line => {
            const indentMatch = line.match(/^(\s*)/);
            const indent = indentMatch ? indentMatch[1] : "";
            const rest = line.slice(indent.length);
            return indent + rest.replace(/\s{2,}/g, " ");
          });
        }
        content = lines.join("\n");
      }

      if (this.options.lineMaxChars !== undefined) {
        const max = this.options.lineMaxChars.max!;
        const cut = resolveCut(this.options.lineMaxChars, "end");
        const mark = resolveMark(this.options.lineMaxChars, this.options.defaultMark);
        const lines = content.split("\n");
        content = lines
          .map((line) => {
            if (countChars(line) > max) {
              return truncateContent(line, {
                unit: "chars",
                max,
                mode: cut,
                mark,
              });
            }
            return line;
          })
          .join("\n");
      }

      if (this.options.fileMaxLines !== undefined) {
        const max = this.options.fileMaxLines.max!;
        const cut = resolveCut(this.options.fileMaxLines, "end");
        const mark = resolveMark(this.options.fileMaxLines, this.options.defaultMark);
        if (countLines(content) > max) {
          content = truncateContent(content, {
            unit: "lines",
            max,
            mode: cut,
            mark,
          });
        }
      }

      if (this.options.fileMaxChars !== undefined) {
        const max = this.options.fileMaxChars.max!;
        const cut = resolveCut(this.options.fileMaxChars, "end");
        const mark = resolveMark(this.options.fileMaxChars, this.options.defaultMark);
        if (countChars(content) > max) {
          content = truncateContent(content, {
            unit: "chars",
            max,
            mode: cut,
            mark,
          });
        }
      }

      const metrics = measureText(content);

      return {
        ...file,
        content,
        lineCount: metrics.lines,
        charCount: metrics.chars,
      };
    });
  }
}
