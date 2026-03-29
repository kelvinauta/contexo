export function countChars(text: string): number {
    let chars = 0;

    for (const _char of text) {
        chars++;
    }

    return chars;
}

export function countLines(text: string): number {
    return measureText(text).lines;
}

export function measureText(text: string) {
    if (text === "") {
        return {
            chars: 0,
            lines: 0,
            longestLineChars: 0,
        };
    }

    let chars = 0;
    let lines = 1;
    let currentLineChars = 0;
    let longestLineChars = 0;

    for (const char of text) {
        chars++;

        if (char === "\n") {
            if (currentLineChars > longestLineChars) {
                longestLineChars = currentLineChars;
            }
            currentLineChars = 0;
            lines++;
            continue;
        }

        currentLineChars++;
    }

    if (currentLineChars > longestLineChars) {
        longestLineChars = currentLineChars;
    }

    return {
        chars,
        lines,
        longestLineChars,
    };
}

export type TextMetrics = ReturnType<typeof measureText>;

export function splitTextAtChar(text: string, charCount: number): [string, string] {
    if (charCount <= 0) {
        return ["", text];
    }

    let codeUnitIndex = 0;
    let seen = 0;

    for (const char of text) {
        if (seen >= charCount) {
            break;
        }

        codeUnitIndex += char.length;
        seen++;
    }

    return [text.slice(0, codeUnitIndex), text.slice(codeUnitIndex)];
}
