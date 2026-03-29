export type OutputScope = "body" | "extra";
export type OutputSectionId = "stdoutStats" | "encodingStats" | "projectStats" | "args" | "body" | "skipped";

export type OutputSection = {
  id: OutputSectionId;
  scope: OutputScope;
  content: string;
};

export function createOutputDocument(sections: Array<OutputSection | null>) {
  return {
    sections: sections.filter((section): section is OutputSection => section !== null && section.content !== ""),
  };
}

export type OutputDocument = ReturnType<typeof createOutputDocument>;

export function renderOutputDocument(document: OutputDocument): string {
  return document.sections.map((section) => section.content).join("");
}
