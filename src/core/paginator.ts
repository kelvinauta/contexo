import { countChars, splitTextAtChar } from "./measure";

interface TextSegment {
  type: "text";
  content: string;
}

interface FenceSegment {
  type: "fence";
  opener: string;
  closer: string;
  body: string;
}

type MarkdownSegment = TextSegment | FenceSegment;

type MutableMarkdownSegment = TextSegment | FenceSegment;

export class Paginator {
  constructor(private options: {
    stdoutMaxLines?: number;
    stdoutMaxChars?: number;
    limitTotalLines?: number;
    limitTotalChars?: number;
    pageLines?: number;
    pageChar?: number;
    truncMark?: string;
  }) {}

  paginate(text: string) {
    const stdoutMaxChars = this.options.stdoutMaxChars ?? this.options.limitTotalChars;
    const stdoutMaxLines = this.options.stdoutMaxLines ?? this.options.limitTotalLines;

    if (stdoutMaxChars !== undefined) {
      return this.paginateByChars(text, stdoutMaxChars, this.options.pageChar || 1);
    }

    if (stdoutMaxLines !== undefined) {
      return this.paginateByLines(text, stdoutMaxLines, this.options.pageLines || 1);
    }

    return {
      content: text,
      currentPage: 1,
      totalPages: 1,
      warning: undefined,
      type: "none" as const,
    };
  }

  private paginateByChars(text: string, limit: number, requestedPage: number) {
    const pages = this.buildCharPagesWithMarkers(text, limit);
    const totalPages = pages.length || 1;
    let warning: string | undefined;
    let page = requestedPage;

    if (page > totalPages) {
      warning = `Warning: Requested page ${page} (chars), but only ${totalPages} pages exist. Showing last page.`;
      page = totalPages;
    }
    if (page < 1) page = 1;

    const content = pages[page - 1] || "";

    return {
      content,
      currentPage: page,
      totalPages,
      ...(warning === undefined ? {} : { warning }),
      type: "chars" as const,
    };
  }

  private buildCharPagesWithMarkers(text: string, limit: number): string[] {
    if (text === "") {
      return [""];
    }

    let totalGuess = Math.max(1, this.buildCharPages(text, limit).length);
    let pages = this.buildCharPagesForTotalLimit(text, limit, totalGuess);

    for (let iteration = 0; iteration < 5; iteration++) {
      const nextTotal = pages.length || 1;

      if (nextTotal === totalGuess) {
        return pages;
      }

      totalGuess = nextTotal;
      pages = this.buildCharPagesForTotalLimit(text, limit, totalGuess);
    }

    return pages;
  }

  private buildCharPagesForTotalLimit(text: string, limit: number, totalPages: number): string[] {
    const segments = this.parseMarkdownSegments(text).map((segment) => ({ ...segment }));
    const pages: string[] = [];
    let currentPage = 1;

    while (segments.length > 0) {
      if (this.countRenderedChars(segments) <= limit) {
        pages.push(this.renderSegments(segments));
        break;
      }

      const marker = this.buildFittedCharMarker(currentPage, totalPages, limit);
      const payloadLimit = Math.max(1, limit - countChars(marker));
      const content = this.consumeCharPage(segments, payloadLimit);

      if (content === "") {
        pages.push(this.consumeCharPage(segments, limit));
        currentPage++;
        continue;
      }

      pages.push(`${content}${marker}`);
      currentPage++;
    }

    return pages.length > 0 ? pages : [""];
  }

  private buildCharPages(text: string, limit: number): string[] {
    if (text === "") {
      return [""];
    }

    const segments = this.parseMarkdownSegments(text);
    const pages: string[] = [];
    let currentPage = "";
    let currentPageChars = 0;

    const flushPage = () => {
      pages.push(currentPage);
      currentPage = "";
      currentPageChars = 0;
    };

    const appendText = (chunk: string) => {
      let remaining = chunk;
      let remainingChars = countChars(remaining);

      while (remainingChars > 0) {
        const available = limit - currentPageChars;

        if (available <= 0) {
          flushPage();
          continue;
        }

        if (remainingChars <= available) {
          currentPage += remaining;
          currentPageChars += remainingChars;
          return;
        }

        const [head, tail] = splitTextAtChar(remaining, available);
        currentPage += head;
        currentPageChars += available;
        remaining = tail;
        remainingChars -= available;
        flushPage();
      }
    };

    const appendWholeChunk = (chunk: string) => {
      if (chunk === "") {
        return;
      }

      const chunkChars = countChars(chunk);

      if (currentPage !== "" && currentPageChars + chunkChars > limit) {
        flushPage();
      }

      if (chunkChars > limit) {
        appendText(chunk);
        return;
      }

      currentPage += chunk;
      currentPageChars += chunkChars;
    };

    for (const segment of segments) {
      if (segment.type === "text") {
        appendText(segment.content);
        continue;
      }

      const fullFence = this.renderFence(segment.opener, segment.body, segment.closer);
      if (countChars(fullFence) <= limit) {
        appendWholeChunk(fullFence);
        continue;
      }

      const wrapperLength = countChars(segment.opener) + countChars(segment.closer) + 2;
      const bodyCapacity = limit - wrapperLength;

      if (bodyCapacity <= 0) {
        appendText(fullFence);
        continue;
      }

      if (currentPage !== "") {
        flushPage();
      }

      let remainingBody = segment.body;
      let remainingBodyChars = countChars(remainingBody);

      while (remainingBodyChars > 0) {
        const [bodyPart, rest] = splitTextAtChar(remainingBody, bodyCapacity);
        remainingBody = rest;
        remainingBodyChars -= countChars(bodyPart);
        appendWholeChunk(this.renderFence(segment.opener, bodyPart, segment.closer));
      }
    }

    if (currentPage !== "" || pages.length === 0) {
      pages.push(currentPage);
    }

    return pages;
  }

  private parseMarkdownSegments(text: string): MarkdownSegment[] {
    const segments: MarkdownSegment[] = [];
    const openerRegex = /^(`{3,}|~{3,}).*$/gm;
    let cursor = 0;

    while (cursor < text.length) {
      openerRegex.lastIndex = cursor;
      const openerMatch = openerRegex.exec(text);

      if (!openerMatch) {
        segments.push({ type: "text", content: text.slice(cursor) });
        break;
      }

      if (openerMatch.index > cursor) {
        segments.push({
          type: "text",
          content: text.slice(cursor, openerMatch.index),
        });
      }

      const marker = openerMatch[1];
      const opener = openerMatch[0];
      const openerEnd = openerMatch.index + opener.length;
      const bodyStart = text[openerEnd] === "\n" ? openerEnd + 1 : openerEnd;
      const closerRegex = new RegExp(`^${this.escapeRegExp(marker)}\\s*$`, "gm");
      closerRegex.lastIndex = bodyStart;
      const closerMatch = closerRegex.exec(text);

      if (!closerMatch) {
        segments.push({ type: "text", content: text.slice(openerMatch.index) });
        break;
      }

      let bodyEnd = closerMatch.index;
      if (bodyEnd > bodyStart && text[bodyEnd - 1] === "\n") {
        bodyEnd -= 1;
      }

      segments.push({
        type: "fence",
        opener,
        closer: closerMatch[0],
        body: text.slice(bodyStart, bodyEnd),
      });

      cursor = closerMatch.index + closerMatch[0].length;
    }

    return segments;
  }

  private renderFence(opener: string, body: string, closer: string): string {
    return `${opener}\n${body}\n${closer}`;
  }

  private renderSegments(segments: MutableMarkdownSegment[]): string {
    return segments.map((segment) => {
      return segment.type === "text"
        ? segment.content
        : this.renderFence(segment.opener, segment.body, segment.closer);
    }).join("");
  }

  private countRenderedChars(segments: MutableMarkdownSegment[]): number {
    return segments.reduce((total, segment) => {
      return total + (segment.type === "text"
        ? countChars(segment.content)
        : countChars(this.renderFence(segment.opener, segment.body, segment.closer)));
    }, 0);
  }

  private consumeCharPage(segments: MutableMarkdownSegment[], limit: number): string {
    if (limit <= 0 || segments.length === 0) {
      return "";
    }

    let page = "";
    let usedChars = 0;

    while (segments.length > 0 && usedChars < limit) {
      const segment = segments[0];
      const available = limit - usedChars;

      if (segment.type === "text") {
        const [head, tail] = splitTextAtChar(segment.content, available);

        if (head === "") {
          break;
        }

        page += head;
        usedChars += countChars(head);

        if (tail === "") {
          segments.shift();
        } else {
          segment.content = tail;
        }

        continue;
      }

      const fullFence = this.renderFence(segment.opener, segment.body, segment.closer);
      const fullFenceChars = countChars(fullFence);

      if (fullFenceChars <= available) {
        page += fullFence;
        usedChars += fullFenceChars;
        segments.shift();
        continue;
      }

      if (page !== "") {
        break;
      }

      const wrapperLength = countChars(segment.opener) + countChars(segment.closer) + 2;
      const bodyCapacity = available - wrapperLength;

      if (bodyCapacity <= 0) {
        segments[0] = { type: "text", content: fullFence };
        continue;
      }

      const [bodyPart, rest] = splitTextAtChar(segment.body, bodyCapacity);
      const fencedPart = this.renderFence(segment.opener, bodyPart, segment.closer);

      page += fencedPart;
      usedChars += countChars(fencedPart);

      if (rest === "") {
        segments.shift();
      } else {
        segment.body = rest;
      }
    }

    return page;
  }

  private buildTotalLimitMarker(type: "lines" | "chars", currentPage: number, totalPages: number): string {
    const truncMark = this.options.truncMark ?? "...";
    const modeLabel = type === "lines" ? "bylines" : "bychars";

    return `${truncMark}${modeLabel}:[page ${currentPage}/${totalPages}]`;
  }

  private buildFittedCharMarker(currentPage: number, totalPages: number, limit: number): string {
    const maxMarkerChars = Math.max(0, limit - 1);
    const preferredMarker = this.buildTotalLimitMarker("chars", currentPage, totalPages);

    if (countChars(preferredMarker) <= maxMarkerChars) {
      return preferredMarker;
    }

    const truncMark = this.options.truncMark ?? "...";
    const fallbackMarkers = [
      `${truncMark}bychars:[${currentPage}/${totalPages}]`,
      `${truncMark}[page ${currentPage}/${totalPages}]`,
      `${truncMark}[${currentPage}/${totalPages}]`,
      truncMark,
    ];

    return fallbackMarkers.find((marker) => countChars(marker) <= maxMarkerChars) || "";
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private paginateByLines(text: string, limit: number, requestedPage: number) {
    const lines = text.split("\n");
    const totalLines = lines.length;
    const totalPages = Math.ceil(totalLines / limit) || 1;
    let warning: string | undefined;
    let page = requestedPage;

    if (page > totalPages) {
      warning = `Warning: Requested page ${page} (lines), but only ${totalPages} pages exist. Showing last page.`;
      page = totalPages;
    }
    if (page < 1) page = 1;

    const start = (page - 1) * limit;
    const end = start + limit;
    let content = lines.slice(start, end).join("\n");

    if (page < totalPages && content !== "") {
      content += this.buildTotalLimitMarker("lines", page, totalPages);
    }

    return {
      content,
      currentPage: page,
      totalPages,
      ...(warning === undefined ? {} : { warning }),
      type: "lines" as const,
    };
  }
}

export type PaginationOptions = ConstructorParameters<typeof Paginator>[0];
export type PaginatedResult = ReturnType<Paginator["paginate"]>;
