import { getEncoding, encodingForModel, TiktokenModel, Tiktoken } from "js-tiktoken";
import { TokenResult, FullStatistics, FileInfo, ScanResult } from "./types";
import { ModelCache } from "./model-cache";
import { DEFAULT_CONFIG } from "../config/defaults";
import { countChars, measureText } from "./measure";
import fs from "fs-extra";
import path from "node:path";

export class Tokenizer {
  async estimateTokensForText(text: string, encName: string, compareModel?: string): Promise<TokenResult> {
    if (!compareModel) {
      return {
        compareModel,
        encoding: encName,
        tokens: 0,
        contextWindow: "unknown",
        usagePercentage: "n/a",
        pricing: "unknown",
        message: "Tokens: disabled"
      };
    }

    await ModelCache.ensureCache();

    let finalEncoding = encName;

    let enc: Tiktoken;
    try {
        enc = getEncoding(finalEncoding as any);
    } catch (e) {
        try {
            const encObj = encodingForModel(finalEncoding as TiktokenModel);
            finalEncoding = (encObj as any).encodingName || finalEncoding;
            enc = encObj;
        } catch (e2) {
            finalEncoding = DEFAULT_CONFIG.enc;
            enc = getEncoding(finalEncoding as any);
        }
    }

    const tokenCount = enc.encode(text).length;

    const statsData = await this.findModelInfo(compareModel);

    let contextWindow: number | "unknown" = "unknown";
    let pricing: number | "unknown" = "unknown";
    let usagePercentage: number | "n/a" = "n/a";

    if (statsData) {
        if (typeof statsData.context_window === "number") {
            contextWindow = statsData.context_window;
            usagePercentage = (tokenCount / (contextWindow as number)) * 100;
        }
        if (typeof statsData.input_price_1m === "number") {
            pricing = (tokenCount / 1_000_000) * (statsData.input_price_1m as number);
        }
    }

    return {
      compareModel,
      encoding: finalEncoding,
      tokens: tokenCount,
      contextWindow,
      usagePercentage,
      pricing,
      message: `Tokens: ${tokenCount}`
    };
  }

  async getFullStatistics(
    scanResult: ScanResult,
    files: FileInfo[],
    encName: string,
    compareModel: string | undefined,
    rawOutput: string,
    tokenOutput: string = rawOutput
  ): Promise<FullStatistics> {
    const tokenResult = await this.estimateTokensForText(tokenOutput, encName, compareModel);
    
    const totalFiles = files.length;
    const totalDirs = scanResult.dirCount;
    const outputMetrics = measureText(rawOutput);
    const totalLines = outputMetrics.lines;
    const totalChars = outputMetrics.chars;
    
    const topLongLines: { path: string; line: number; length: number }[] = [];

    files.forEach(f => {
        if (f.content) {
            const lines = f.content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const len = countChars(lines[i]);
                if (topLongLines.length < 5 || len > topLongLines[4].length) {
                    topLongLines.push({ path: f.relativePath, line: i + 1, length: len });
                    topLongLines.sort((a, b) => b.length - a.length);
                    if (topLongLines.length > 5) topLongLines.pop();
                }
            }
        }
    });

    let filesLines = 0;
    let filesChars = 0;
    files.forEach(f => {
        filesLines += f.lineCount || 0;
        filesChars += f.charCount || 0;
    });

    const avgLines = totalFiles > 0 ? filesLines / totalFiles : 0;
    const avgChars = totalFiles > 0 ? filesChars / totalFiles : 0;
    const avgLineLength = filesLines > 0 ? filesChars / filesLines : 0;

    const topFilesByLines = [...files]
        .sort((a, b) => (b.lineCount || 0) - (a.lineCount || 0))
        .slice(0, 5)
        .map(f => ({ path: f.relativePath || f.filename, count: f.lineCount || 0 }));

    const topFilesByChars = [...files]
        .sort((a, b) => (b.charCount || 0) - (a.charCount || 0))
        .slice(0, 5)
        .map(f => ({ path: f.relativePath || f.filename, count: f.charCount || 0 }));

    const topDirs = Object.entries(scanResult.dirChildrenCount)
        .map(([dir, count]) => ({ path: dir, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
        ...tokenResult,
        totalFiles,
        totalDirs,
        totalLines,
        totalChars,
        avgLines,
        avgChars,
        avgLineLength,
        topFilesByLines,
        topFilesByChars,
        topDirs,
        topLongLines
    };
  }

  private heuristicEncoding(modelId: string): string {
    const lower = modelId.toLowerCase();
    if (lower.includes("o1") || lower.includes("o3") || lower.includes("gpt-4o") || lower.includes("gpt-5")) {
        return "o200k_base";
    }
    return "cl100k_base";
  }

  private async findModelInfo(id: string): Promise<any | null> {
    const cachePath = ModelCache.getCachePath();
    const providersDir = path.join(cachePath, "providers");
    
    if (!id.includes("/")) {
        const common = ["openai", "google", "anthropic", "xai", "mistral"];
        const results = await Promise.all(
            common.map(p => this.loadToml(path.join(providersDir, p, "models", `${id}.toml`)))
        );
        return results.find(r => r !== null) || null;
    }

    const [provider, model] = id.split("/");
    return await this.loadToml(path.join(providersDir, provider, "models", `${model}.toml`));
  }

  private async loadToml(filePath: string): Promise<any | null> {
    if (!await fs.pathExists(filePath)) return null;
    try {
        const content = await fs.readFile(filePath, "utf8");
        const data: any = (globalThis as any).Bun.TOML.parse(content);
        return {
            name: data.name || path.basename(filePath, ".toml"),
            context_window: data.limit?.context,
            input_price_1m: data.cost?.input,
            tokenizer: data.tokenizer
        };
    } catch (e) {
        return null;
    }
  }

  async listModels(providerFilter?: string): Promise<string[]> {
    await ModelCache.ensureCache();
    const cachePath = ModelCache.getCachePath();
    const providersDir = path.join(cachePath, "providers");
    
    if (!await fs.pathExists(providersDir)) return [];

    const providers = providerFilter ? [providerFilter] : await fs.readdir(providersDir);
    
    const modelLists = await Promise.all(
        providers.map(async (p) => {
            const modelsDir = path.join(providersDir, p, "models");
            if (await fs.pathExists(modelsDir)) {
                const files = await fs.readdir(modelsDir);
                return files.filter(f => f.endsWith(".toml")).map(f => `${p}/${f.replace(".toml", "")}`);
            }
            return [];
        })
    );
    
    return modelLists.flat();
  }

  getEncodings(): string[] {
    return ["o200k_base", "cl100k_base", "p50k_base", "r50k_base", "gpt2"];
  }
}
