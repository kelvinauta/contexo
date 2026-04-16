import { parseCli } from "./cli";
import { Scanner } from "./core/scanner";
import { Reader } from "./core/reader";
import { TextProcessor } from "./core/processor";
import { Formatter } from "./core/formatter";
import { Tokenizer } from "./core/tokenizer";
import { Paginator } from "./core/paginator";
import { createOutputDocument, renderOutputDocument } from "./core/document";
import { measureText } from "./core/measure";
import {
    renderExtraSections,
    renderPrettySummary,
    renderSkippedSection,
    type RenderedExtraSections,
} from "./core/section-templates";
import type { FullStatistics } from "./core/types";
import yoctoSpinner from "yocto-spinner";
import pc from "picocolors";

import readmeContent from "../README_ES.md" with { type: "text" };

const EMPTY_EXTRA_SECTIONS = {
    stdoutStats: "",
    encodingStats: "",
    projectStats: "",
    args: "",
} satisfies RenderedExtraSections;

interface RenderedExtraBundle {
    sections: RenderedExtraSections;
    stats: FullStatistics;
}

async function main() {
    let spinner: ReturnType<typeof yoctoSpinner> | null = null;
    try {
        const config = parseCli();

        const isTTY = process.stderr.isTTY;
        spinner = isTTY ? yoctoSpinner().start() : null;

        const tokenizer = new Tokenizer();

        if (config.showReadme) {
            spinner?.stop();
            console.log(readmeContent);
            return;
        }

        if (config.listEncodings) {
            spinner?.stop();
            console.log(`\n${pc.bold("Available Encodings (Algorithms):")}`);
            tokenizer.getEncodings().forEach((encoding) => console.log(`- ${pc.cyan(encoding)}`));
            return;
        }

        if (config.listModels !== undefined) {
            if (spinner) spinner.text = pc.cyan("Fetching models...");
            const provider = config.listModels === "" ? undefined : config.listModels;
            const models = await tokenizer.listModels(provider);

            spinner?.stop();
            if (models.length === 0) {
                console.log(pc.yellow("No models found. Ensure the cache is initialized."));
            } else {
                console.log(`\n${pc.bold(`Available Models (${models.length}):`)}`);
                models.forEach((model) => console.log(`- ${pc.green(model)}`));
            }
            return;
        }

        if (spinner) spinner.text = pc.cyan("Scanning directory...");
        const scanner = new Scanner(config.ignore, config.ignoreRegex, {
            cliIgnorePaths: config.cliIgnore,
            patterns: config.pattern,
            limitNested: config.limitNested,
            limitFiles: config.limitFiles,
            followLink: config.followLink,
            followMount: config.followMount,
            disableIgnorefile: config.disableIgnorefile,
        });
        const scanResult = await scanner.scan(config.path);

        if (spinner) spinner.text = pc.cyan(`Reading ${scanResult.files.length} files...`);
        const reader = new Reader();
        let processedFiles = await reader.readFiles(scanResult.files);

        if (spinner) spinner.text = pc.cyan("Processing context...");
        const processor = new TextProcessor({
            lineMaxChars: config.lineMaxChars,
            fileMaxLines: config.fileMaxLines,
            fileMaxChars: config.fileMaxChars,
            defaultMark: config.defaultMark,
            clean: config.clean,
            extensionFallbacks: config.extensionFallbacks,
        });
        processedFiles = processor.process(processedFiles);

        const emittedHide = config.hide || [];
        const summaryTargetHide = config.summaryMode
            ? emittedHide.filter((value) => value !== "context" && value !== "skippedlist")
            : emittedHide;

        const emittedFormatter = new Formatter(emittedHide, config.numberLine);
        const summaryTargetFormatter = new Formatter(summaryTargetHide, config.numberLine);
        const rawFormatter = new Formatter([], config.numberLine);

        const emittedBodyContent = emittedFormatter.format(processedFiles);
        const summaryTargetBodyContent = summaryTargetFormatter.format(processedFiles);
        const rawOutput = rawFormatter.format(processedFiles);

        const includeSummaryTargetExtras = !summaryTargetHide.includes("summary");
        const summaryTargetBodySection = buildBodySection(summaryTargetHide.includes("context"), summaryTargetBodyContent);
        const summaryTargetSkippedSection = buildSkippedSection(
            summaryTargetHide.includes("skippedlist"),
            scanResult.ignoredPaths,
            summaryTargetBodySection !== ""
        );

        if (spinner) spinner.text = pc.cyan("Calculating statistics...");
        const provisionalStats = await tokenizer.getFullStatistics(
            scanResult,
            processedFiles,
            config.enc,
            config.compareModel,
            rawOutput,
            ""
        );

        const draftExtraBundle = includeSummaryTargetExtras
            ? renderStableExtraSections(
                provisionalStats,
                {
                    showArgs: config.showArgs,
                    invocationArgs: config.invocationArgs,
                    tokenMode: "draft",
                },
                summaryTargetBodySection,
                summaryTargetSkippedSection
            )
            : { sections: EMPTY_EXTRA_SECTIONS, stats: provisionalStats };

        const tokenDraftOutput = renderOutputDocument(
            createOutputDocument([
                ...toExtraDocumentSections(draftExtraBundle.sections, !includeSummaryTargetExtras),
                summaryTargetBodySection === "" ? null : { id: "body", scope: "body", content: summaryTargetBodySection },
                summaryTargetSkippedSection === "" ? null : { id: "skipped", scope: "extra", content: summaryTargetSkippedSection },
            ])
        );

        const baseStats = await tokenizer.getFullStatistics(
            scanResult,
            processedFiles,
            config.enc,
            config.compareModel,
            rawOutput,
            tokenDraftOutput
        );
        spinner?.stop();

        const finalExtraBundle = includeSummaryTargetExtras
            ? renderStableExtraSections(
                baseStats,
                {
                    showArgs: config.showArgs,
                    invocationArgs: config.invocationArgs,
                    tokenMode: "final",
                },
                summaryTargetBodySection,
                summaryTargetSkippedSection
            )
            : { sections: EMPTY_EXTRA_SECTIONS, stats: baseStats };

        const emittedBodySection = buildBodySection(emittedHide.includes("context"), emittedBodyContent);
        const emittedSkippedSection = buildSkippedSection(
            emittedHide.includes("skippedlist"),
            scanResult.ignoredPaths,
            emittedBodySection !== ""
        );

        const canonicalDocument = createOutputDocument([
            ...(config.summaryMode
                ? [createSummarySection(
                    renderPrettySummary({
                        stats: finalExtraBundle.stats,
                        showArgs: config.showArgs,
                        invocationArgs: config.invocationArgs,
                    }),
                    emittedHide.includes("summary")
                )]
                : toExtraDocumentSections(finalExtraBundle.sections, emittedHide.includes("summary"))),
            emittedBodySection === "" ? null : { id: "body", scope: "body", content: emittedBodySection },
            emittedSkippedSection === "" ? null : { id: "skipped", scope: "extra", content: emittedSkippedSection },
        ]);
        const canonicalOutput = renderOutputDocument(canonicalDocument);

        const stdoutLimitConfig = config.stdoutMaxChars ?? config.stdoutMaxLines;
        const paginator = new Paginator({
            stdoutMaxLines: config.stdoutMaxLines?.max,
            stdoutMaxChars: config.stdoutMaxChars?.max,
            pageLines: config.pageLines,
            pageChar: config.pageChar,
            truncMark: stdoutLimitConfig?.mark ?? config.defaultMark,
        });
        const paginated = paginator.paginate(canonicalOutput);

        if (paginated.warning) {
            process.stderr.write(`\n${pc.yellow(pc.bold("⚠ WARNING:"))} ${paginated.warning}\n\n`);
        }

        process.stdout.write(paginated.content);

        if (paginated.totalPages > 1) {
            const flag = paginated.type === "lines" ? "--page-lines" : "--page-char";
            process.stderr.write(`\n${pc.bgBlue(pc.black(" PAGINATION "))} ${pc.bold(`Page ${paginated.currentPage} of ${paginated.totalPages}`)}. Use ${pc.cyan(`${flag} [n]`)} to see more.\n`);
        }
    } catch (error: any) {
        spinner?.error(pc.red("Critical Error"));
        process.stderr.write(`${pc.red(pc.bold("CRITICAL ERROR:"))} ${error.message}\n`);
        process.exit(1);
    }
}

function renderStableExtraSections(
    baseStats: FullStatistics,
    options: {
        showArgs: boolean;
        invocationArgs: string[];
        tokenMode: "draft" | "final";
    },
    bodySection: string,
    skippedSection: string
): RenderedExtraBundle {
    let currentStats = baseStats;
    let renderedSections = renderExtraSections({
        stats: currentStats,
        showArgs: options.showArgs,
        invocationArgs: options.invocationArgs,
        tokenMode: options.tokenMode,
    });

    for (let iteration = 0; iteration < 5; iteration++) {
        const measuredOutput = renderOutputDocument(
            createOutputDocument([
                ...toExtraDocumentSections(renderedSections, false),
                bodySection === "" ? null : { id: "body", scope: "body", content: bodySection },
                skippedSection === "" ? null : { id: "skipped", scope: "extra", content: skippedSection },
            ])
        );
        const measuredStats = applyMeasuredTotals(baseStats, measuredOutput);
        const nextSections = renderExtraSections({
            stats: measuredStats,
            showArgs: options.showArgs,
            invocationArgs: options.invocationArgs,
            tokenMode: options.tokenMode,
        });

        if (serializeExtraSections(nextSections) === serializeExtraSections(renderedSections)) {
            return {
                sections: nextSections,
                stats: measuredStats,
            };
        }

        currentStats = measuredStats;
        renderedSections = nextSections;
    }

    return {
        sections: renderedSections,
        stats: currentStats,
    };
}

function applyMeasuredTotals(
    baseStats: FullStatistics,
    measuredOutput: string
): FullStatistics {
    const metrics = measureText(measuredOutput);

    return {
        ...baseStats,
        totalLines: metrics.lines,
        totalChars: metrics.chars,
    };
}

function buildBodySection(isHidden: boolean, bodyContent: string): string {
    if (isHidden || bodyContent === "") {
        return "";
    }

    return `${bodyContent}\n`;
}

function buildSkippedSection(isHidden: boolean, ignoredPaths: string[], hasBodySection: boolean): string {
    if (isHidden || ignoredPaths.length === 0) {
        return "";
    }

    const skippedContent = renderSkippedSection(ignoredPaths);
    return `${hasBodySection ? "\n" : ""}${skippedContent}`;
}

function toExtraDocumentSections(
    renderedSections: RenderedExtraSections,
    isHidden: boolean
): Array<ReturnType<typeof createExtraSection>> {
    if (isHidden) {
        return [];
    }

    return [
        createExtraSection("stdoutStats", renderedSections.stdoutStats),
        createExtraSection("encodingStats", renderedSections.encodingStats),
        createExtraSection("projectStats", renderedSections.projectStats),
        createExtraSection("args", renderedSections.args),
    ];
}

function createExtraSection(
    id: "stdoutStats" | "encodingStats" | "projectStats" | "args",
    content: string
) {
    if (content === "") {
        return null;
    }

    return {
        id,
        scope: "extra" as const,
        content: `${content}\n`,
    };
}

function createSummarySection(content: string, isHidden: boolean) {
    if (isHidden || content === "") {
        return null;
    }

    return {
        id: "stdoutStats" as const,
        scope: "extra" as const,
        content,
    };
}

function serializeExtraSections(renderedSections: RenderedExtraSections): string {
    return [renderedSections.stdoutStats, renderedSections.encodingStats, renderedSections.projectStats, renderedSections.args]
        .filter((section) => section !== "")
        .join("\n\n");
}

main();
