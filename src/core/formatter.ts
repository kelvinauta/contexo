import { FileInfo } from "./types";

function numberContentLines(content: string): string {
    return content.split("\n").map((line, index) => `${index + 1} ${line}`).join("\n");
}

export class Formatter {
    constructor(private hide: string[] = [], private numberLine = false) { }

    format(files: FileInfo[]): string {
        return files.map((file) => this.formatFile(file)).join("\n\n");
    }

    public formatFile(file: FileInfo): string {
        const lines: string[] = [];

        if (!this.hide.includes("filename")) {
            lines.push(`filename: ${file.filename}`);
        }

        if (!this.hide.includes("relativepath")) {
            lines.push(`relative path: ${file.relativePath || file.filename}`);
        }

        if (!this.hide.includes("absolutepath")) {
            lines.push(`absolute path: ${file.filePath}`);
        }

        if (!this.hide.includes("context")) {
            if (file.isBinary) {
                lines.push("this file is binary");
            }

            if (file.content) {
                const content = this.numberLine ? numberContentLines(file.content) : file.content;
                lines.push("```" + file.extension + "\n" + content + "\n" + "```");
            } else if (!file.isBinary) {
                lines.push("(empty file)");
            }
        }

        return lines.join("\n");
    }
}
