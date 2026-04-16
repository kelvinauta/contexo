import path from "path";
import fs from "fs-extra";
import { FileInfo, ScanResult } from "./types";
import ignore, { Ignore } from "ignore";

interface IgnoreContext {
  basePath: string;
  matcher: Ignore;
  sourceLabel: string;
}

interface ScanState {
  files: FileInfo[];
  ignoredPaths: string[];
  ignoredPathSet: Set<string>;
  regexIgnoredPaths: Map<string, string[]>;
  dirCount: number;
  dirChildrenCount: Record<string, number>;
  hasGitignore: boolean;
  limitReached: boolean;
}

interface IgnoreRegexRule {
  pattern: string;
  regex: RegExp;
}

export class Scanner {
  private explicitIgnore: Ignore;
  private cliIgnorePaths: string[];
  private ignoreRegex: IgnoreRegexRule[];
  private patternMatcher: Ignore | null;
  private disableIgnorefile: boolean;
  private rootPath = "";
  private rootDevice = 0;
  private visitedDirectories = new Set<string>();

  constructor(
    private ignoreRules: string[], 
    private ignoreRegexStrings: string[],
    private options: {
      cliIgnorePaths?: string[];
      patterns?: string[];
      limitNested: number;
      limitFiles: number;
      followLink: boolean;
      followMount: boolean;
      disableIgnorefile?: boolean;
    }
  ) {
    this.explicitIgnore = ignore();
    this.cliIgnorePaths = this.normalizeCliIgnorePaths(options.cliIgnorePaths || []);
    const normalizedIgnoreRules = this.normalizeIgnoreRules(ignoreRules);
    if (normalizedIgnoreRules.length > 0) {
      this.explicitIgnore.add(normalizedIgnoreRules);
    }
    this.ignoreRegex = ignoreRegexStrings.map((pattern) => ({
      pattern,
      regex: this.compileIgnoreRegex(pattern),
    }));
    const normalizedPatterns = (options.patterns || []).map((pattern) => this.normalizePattern(pattern));
    this.patternMatcher = normalizedPatterns.length > 0 ? ignore().add(normalizedPatterns) : null;
    this.disableIgnorefile = options.disableIgnorefile ?? false;
  }

  async scan(rootPath: string): Promise<ScanResult> {
    const absoluteRoot = path.isAbsolute(rootPath)
      ? rootPath
      : path.resolve(process.cwd(), rootPath);

    this.rootPath = absoluteRoot;
    this.rootDevice = 0;
    this.visitedDirectories.clear();

    const rootStats = await fs.stat(absoluteRoot);
    this.rootDevice = rootStats.dev;

    const state: ScanState = {
      files: [],
      ignoredPaths: [],
      ignoredPathSet: new Set<string>(),
      regexIgnoredPaths: new Map<string, string[]>(),
      dirCount: 0,
      dirChildrenCount: {},
      hasGitignore: false,
      limitReached: false,
    };

    const rootRelativeToRoot = rootStats.isFile() ? path.basename(absoluteRoot) : "";
    const rootIgnoreDecision = this.getRuleIgnoreDecision(
      absoluteRoot,
      path.basename(absoluteRoot),
      rootRelativeToRoot,
      rootStats.isDirectory()
    );
    if (rootIgnoreDecision.ignored) {
      this.recordRuleIgnore(absoluteRoot, rootIgnoreDecision, state);
      return this.buildResult(state);
    }

    if (rootStats.isFile()) {
      this.addFile(absoluteRoot, path.basename(absoluteRoot), rootStats.size, state);
      return this.buildResult(state);
    }

    const rootContexts = await this.loadIgnoreContexts(absoluteRoot, state, []);
    await this.walkDirectory(absoluteRoot, 0, rootContexts, state);

    return this.buildResult(state);
  }

  private buildResult(state: ScanState): ScanResult {
    return {
      files: state.files,
      ignoredPaths: [
        ...state.ignoredPaths,
        ...this.buildRegexIgnoredEntries(state),
        ...this.buildPatternIgnoredEntries(),
      ],
      dirCount: state.dirCount,
      dirChildrenCount: state.dirChildrenCount,
      hasGitignore: state.hasGitignore,
    };
  }

  private async walkDirectory(
    directoryPath: string,
    currentDepth: number,
    contexts: IgnoreContext[],
    state: ScanState
  ): Promise<void> {
    if (state.limitReached) {
      return;
    }

    const canonicalPath = await this.safeRealPath(directoryPath);
    if (canonicalPath) {
      if (this.visitedDirectories.has(canonicalPath)) {
        return;
      }
      this.visitedDirectories.add(canonicalPath);
    }

    let entries: fs.Dirent[];
    try {
      entries = await fs.readdir(directoryPath, { withFileTypes: true });
    } catch (error: any) {
      this.recordError(directoryPath, error, state);
      return;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (state.limitReached) {
        return;
      }

      const entryPath = path.join(directoryPath, entry.name);
      const inspected = await this.inspectEntry(entryPath);
      if (!inspected) {
        continue;
      }

      if ("error" in inspected) {
        this.recordError(entryPath, inspected.error, state);
        continue;
      }

      if (this.options.followMount === false && inspected.stats.dev !== this.rootDevice) {
        continue;
      }

      const relativeToRoot = this.getRelativeToRoot(entryPath);
      const ignoreDecision = this.getRuleIgnoreDecision(entryPath, entry.name, relativeToRoot, inspected.isDirectory);
      if (ignoreDecision.ignored) {
        this.recordRuleIgnore(entryPath, ignoreDecision, state);
        continue;
      }

      const ignoreFileDecision = this.shouldIgnoreByIgnoreFiles(entryPath, inspected.isDirectory, contexts);
      if (ignoreFileDecision.ignored) {
        this.recordImplicitIgnore(entryPath, ignoreFileDecision.sourceLabel, state);
        continue;
      }

      if (inspected.isDirectory) {
        this.addIncludedEntry(relativeToRoot, state);
        state.dirCount++;

        const childDepth = currentDepth + 1;
        if (this.options.limitNested > 0 && childDepth >= this.options.limitNested) {
          continue;
        }

        const childContexts = await this.loadIgnoreContexts(entryPath, state, contexts);
        await this.walkDirectory(entryPath, childDepth, childContexts, state);
        continue;
      }

      if (!inspected.isFile) {
        continue;
      }

      this.addFile(entryPath, relativeToRoot, inspected.stats.size, state);
      if (this.options.limitFiles > 0 && state.files.length >= this.options.limitFiles) {
        state.limitReached = true;
        return;
      }
    }
  }

  private async inspectEntry(entryPath: string): Promise<{ stats: fs.Stats; isDirectory: boolean; isFile: boolean } | { error: Error } | null> {
    try {
      const lstat = await fs.lstat(entryPath);

      if (lstat.isSymbolicLink()) {
        if (!this.options.followLink) {
          return null;
        }

        const stats = await fs.stat(entryPath);
        return {
          stats,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
        };
      }

      return {
        stats: lstat,
        isDirectory: lstat.isDirectory(),
        isFile: lstat.isFile(),
      };
    } catch (error: any) {
      return { error };
    }
  }

  private getRuleIgnoreDecision(
    fullPath: string,
    name: string,
    relativeToRoot: string,
    isDirectory: boolean
  ):
    | { ignored: false }
    | { ignored: true; source: "--ignore" }
    | { ignored: true; source: "--ignore-regex"; pattern: string } {
    if (this.matchesCliIgnorePath(fullPath)) {
      return { ignored: true, source: "--ignore" };
    }

    if (relativeToRoot !== "") {
      const explicitPath = this.toIgnorePath(relativeToRoot);
      const candidate = isDirectory ? this.ensureTrailingSlash(explicitPath) : explicitPath;

      if (candidate && this.explicitIgnore.ignores(candidate)) {
        return { ignored: true, source: "--ignore" };
      }
    }

    for (const rule of this.ignoreRegex) {
      if (rule.regex.test(fullPath) || rule.regex.test(name) || rule.regex.test(relativeToRoot)) {
        return {
          ignored: true,
          source: "--ignore-regex",
          pattern: rule.pattern,
        };
      }
    }

    return { ignored: false };
  }

  private shouldIgnoreByIgnoreFiles(fullPath: string, isDirectory: boolean, contexts: IgnoreContext[]): { ignored: boolean; sourceLabel: string | null } {
    let ignored = false;
    let sourceLabel: string | null = null;

    for (const context of contexts) {
      const relativeToBase = this.toIgnorePath(path.relative(context.basePath, fullPath));
      if (relativeToBase === "" || relativeToBase.startsWith("../")) {
        continue;
      }

      const candidate = isDirectory ? this.ensureTrailingSlash(relativeToBase) : relativeToBase;
      const result = context.matcher.test(candidate);

      if (result.ignored) {
        ignored = true;
        sourceLabel = context.sourceLabel;
      } else if (result.unignored) {
        ignored = false;
        sourceLabel = null;
      }
    }

    return { ignored, sourceLabel };
  }

  private async loadIgnoreContexts(directoryPath: string, state: ScanState, parentContexts: IgnoreContext[]): Promise<IgnoreContext[]> {
    if (this.disableIgnorefile) {
      return parentContexts;
    }

    const matcher = ignore();
    const sourceNames: string[] = [];

    const gitignorePath = path.join(directoryPath, ".gitignore");
    if (await fs.pathExists(gitignorePath)) {
      state.hasGitignore = true;
      const content = await fs.readFile(gitignorePath, "utf8");
      if (content.trim() !== "") {
        matcher.add(content);
      }
      sourceNames.push(".gitignore");
    }

    const ignorePath = path.join(directoryPath, ".ignore");
    if (await fs.pathExists(ignorePath)) {
      const content = await fs.readFile(ignorePath, "utf8");
      if (content.trim() !== "") {
        matcher.add(content);
      }
      sourceNames.push(".ignore");
    }

    if (sourceNames.length === 0) {
      return parentContexts;
    }

    return [
      ...parentContexts,
      {
        basePath: directoryPath,
        matcher,
        sourceLabel: sourceNames.join("/"),
      },
    ];
  }

  private addFile(filePath: string, relativePath: string, size: number, state: ScanState): void {
    const filename = path.basename(filePath);
    const patternTarget = this.toIgnorePath(relativePath);

    if (!this.matchesPattern(patternTarget)) {
      return;
    }

    state.files.push({
      filePath,
      relativePath,
      size,
      extension: path.extname(filePath).slice(1),
      filename,
    });
    this.addIncludedEntry(relativePath, state);
  }

  private addIncludedEntry(relativePath: string, state: ScanState): void {
    if (!relativePath) {
      return;
    }

    const parent = path.dirname(relativePath);
    const parentKey = parent === "." ? "/" : parent;
    state.dirChildrenCount[parentKey] = (state.dirChildrenCount[parentKey] || 0) + 1;
  }

  private recordImplicitIgnore(fullPath: string, sourceLabel: string | null, state: ScanState): void {
    const reason = sourceLabel ? `ignored by ${sourceLabel}` : "ignored";
    const entry = `${fullPath} (${reason})`;

    this.recordSkippedEntry(entry, state);
  }

  private recordRuleIgnore(
    fullPath: string,
    ignoreDecision: { ignored: true; source: "--ignore" } | { ignored: true; source: "--ignore-regex"; pattern: string },
    state: ScanState
  ): void {
    if (ignoreDecision.source === "--ignore") {
      this.recordSkippedEntry(`${fullPath} (ignored by --ignore)`, state);
      return;
    }

    const matches = state.regexIgnoredPaths.get(ignoreDecision.pattern) ?? [];
    if (!matches.includes(fullPath)) {
      matches.push(fullPath);
      state.regexIgnoredPaths.set(ignoreDecision.pattern, matches);
    }
  }

  private buildRegexIgnoredEntries(state: ScanState): string[] {
    const entries: string[] = [];

    // TODO: This regex skippedlist formatting is intentionally hardcoded for now.
    for (const rule of this.ignoreRegex) {
      const matches = state.regexIgnoredPaths.get(rule.pattern);
      if (!matches || matches.length === 0) {
        continue;
      }

      const overview = `--ignore-regex ${rule.pattern} -> ${matches.join(", ")}`;
      entries.push(overview.length > 100 ? `--ignore-regex ${rule.pattern}` : overview);
    }

    return entries;
  }

  private buildPatternIgnoredEntries(): string[] {
    if (!this.patternMatcher) {
      return [];
    }

    return ["--pattern: non-matching paths ignored"];
  }

  private recordSkippedEntry(entry: string, state: ScanState): void {

    if (state.ignoredPathSet.has(entry)) {
      return;
    }

    state.ignoredPathSet.add(entry);
    state.ignoredPaths.push(entry);
  }

  private recordError(fullPath: string, error: Error, state: ScanState): void {
    const entry = `${fullPath} (error: ${error.message})`;
    this.recordSkippedEntry(entry, state);
  }

  private async safeRealPath(targetPath: string): Promise<string | null> {
    try {
      return await fs.realpath(targetPath);
    } catch {
      return null;
    }
  }

  private getRelativeToRoot(targetPath: string): string {
    return path.relative(this.rootPath, targetPath);
  }

  private matchesPattern(relativePath: string): boolean {
    if (!this.patternMatcher) {
      return true;
    }

    return this.patternMatcher.ignores(relativePath);
  }

  private normalizePattern(pattern: string): string {
    return pattern
      .trim()
      .replace(/\\/g, "/")
      .replace(/^(?:\.\/)+/, "")
      .replace(/^\/+/, "")
      .replace(/\/+/g, "/");
  }

  private normalizeIgnoreRules(rules: string[]): string[] {
    const normalized = new Set<string>();

    for (const rule of rules) {
      if (!rule) {
        continue;
      }

      normalized.add(rule);
      if (rule.includes("/") && !rule.startsWith("/") && !rule.startsWith("**/")) {
        normalized.add(`**/${rule}`);
      }
    }

    return Array.from(normalized);
  }

  private normalizeCliIgnorePaths(ignorePaths: string[]): string[] {
    const normalized = new Set<string>();

    for (const ignorePath of ignorePaths) {
      if (!ignorePath) {
        continue;
      }

      normalized.add(path.normalize(ignorePath));
    }

    return Array.from(normalized);
  }

  private matchesCliIgnorePath(fullPath: string): boolean {
    const normalizedFullPath = path.normalize(fullPath);

    return this.cliIgnorePaths.some((ignorePath) => this.isPathEqualOrWithin(normalizedFullPath, ignorePath));
  }

  private isPathEqualOrWithin(targetPath: string, ignorePath: string): boolean {
    if (targetPath === ignorePath) {
      return true;
    }

    const relative = path.relative(ignorePath, targetPath);
    return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
  }

  private toIgnorePath(targetPath: string): string {
    return targetPath.split(path.sep).join("/");
  }

  private ensureTrailingSlash(targetPath: string): string {
    return targetPath.endsWith("/") ? targetPath : `${targetPath}/`;
  }

  private compileIgnoreRegex(pattern: string): RegExp {
    try {
      return new RegExp(pattern);
    } catch (error: any) {
      throw new Error(`Invalid value for --ignore-regex: ${pattern}. ${error.message}`);
    }
  }
}
