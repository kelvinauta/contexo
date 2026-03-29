import languagesData from "../../config/languages.json";

interface LanguageDef {
  line_comment: string[];
  multi_line: [string, string][];
  quotes: { start: string; end: string; ignoreEscape?: boolean }[];
  extensions: string[];
}

export type CommentStripperType = "all" | "line" | "block" | "none";

export class CommentStripper {
  private static languages: Record<string, LanguageDef> | null = null;
  private static extMap: Record<string, LanguageDef> = {};

  private static loadLanguages(fallbacks: Record<string, string>) {
    if (this.languages) return;
    
    this.languages = languagesData as unknown as Record<string, LanguageDef>;
    
    for (const lang of Object.values(this.languages!)) {
      if (lang.extensions) {
        for (const ext of lang.extensions) {
          this.extMap[ext] = lang;
        }
      }
    }
    
    for (const [ext, target] of Object.entries(fallbacks)) {
      if (this.extMap[target]) {
        this.extMap[ext] = this.extMap[target];
      }
    }
  }

  static strip(
    content: string,
    extension: string,
    type: CommentStripperType,
    fallbacks: Record<string, string> = {}
  ): string {
    if (type === "none") return content;
    this.loadLanguages(fallbacks);

    const lang = this.extMap[extension];
    if (!lang) return content;

    const removeLine = type === "all" || type === "line";
    const removeBlock = type === "all" || type === "block";

    let output = "";
    let i = 0;
    let state: "NORMAL" | "STRING" | "LINE_COMMENT" | "BLOCK_COMMENT" = "NORMAL";
    let activeQuote: any = null;
    let activeBlockEnd = "";

    while (i < content.length) {
      const char = content[i];

      if (state === "NORMAL") {
        
        const blockStart = lang.multi_line.find((pair) => content.startsWith(pair[0], i));
        if (blockStart && removeBlock) {
          state = "BLOCK_COMMENT";
          activeBlockEnd = blockStart[1];
          i += blockStart[0].length;
          continue;
        }

        
        const lineStart = lang.line_comment.find((s) => content.startsWith(s, i));
        if (lineStart && removeLine) {
          state = "LINE_COMMENT";
          i += lineStart.length;
          continue;
        }

        
        const quote = lang.quotes.find((q) => content.startsWith(q.start, i));
        if (quote) {
          state = "STRING";
          activeQuote = quote;
          output += quote.start;
          i += quote.start.length;
          continue;
        }

        output += char;
        i++;
      } else if (state === "STRING") {
        
        if (!activeQuote.ignoreEscape && char === "\\") {
          output += char + (content[i + 1] || "");
          i += 2;
          continue;
        }
        if (content.startsWith(activeQuote.end, i)) {
          output += activeQuote.end;
          i += activeQuote.end.length;
          state = "NORMAL";
          activeQuote = null;
          continue;
        }
        output += char;
        i++;
      } else if (state === "LINE_COMMENT") {
        if (char === "\n") {
          state = "NORMAL";
          output += "\n"; 
        }
        i++;
      } else if (state === "BLOCK_COMMENT") {
        if (content.startsWith(activeBlockEnd, i)) {
          i += activeBlockEnd.length;
          state = "NORMAL";
          continue;
        }
        i++;
      }
    }

    return output;
  }
}
