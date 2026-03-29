import { spawnSync } from "bun";
import fs from "node:fs";
import path from "node:path";

export interface ShellScanOptions {
  path: string;
  limitNested?: number;
  followLink?: boolean;
  followMount?: boolean;
  ignore?: string[];
  ignoreRegex?: string[];
}

export interface ShellEntry {
  path: string;
  type: 'f' | 'd' | 'l' | 'other';
  size: number;
  isPruned?: boolean;
}

export class ShellUtils {
  
  static scanDirectory(options: ShellScanOptions): { entries: ShellEntry[], errors: string[] } {
    const stat = fs.statSync(options.path);

    if (stat.isFile()) {
      return {
        entries: [{ path: path.resolve(options.path), type: 'f', size: stat.size }],
        errors: []
      };
    }

    const args: string[] = ["find"];
    
    if (options.followLink) {
      args.push("-L");
    }

    args.push(options.path);

    if (options.followMount === false) {
      args.push("-xdev");
    }

    if (options.limitNested && options.limitNested > 0) {
      args.push("-maxdepth", options.limitNested.toString());
    }

    if (options.ignoreRegex?.length) {
      args.push("-regextype", "posix-extended");
    }

    const ignoreConds: string[] = [];
    if (options.ignore?.length) {
      options.ignore.forEach(pattern => {
        if (ignoreConds.length > 0) ignoreConds.push("-o");
        if (pattern.includes("/")) {
          ignoreConds.push("-path", `*/${pattern}`);
        } else {
          ignoreConds.push("-name", pattern);
        }
      });
    }
    
    if (options.ignoreRegex?.length) {
      options.ignoreRegex.forEach(reg => {
        if (ignoreConds.length > 0) ignoreConds.push("-o");
        ignoreConds.push("-regex", reg);
      });
    }

    if (ignoreConds.length > 0) {
      args.push("(", ...ignoreConds, ")", "-printf", "%p\\0PRUNED\\00\\0", "-prune", "-o");
    }

    args.push("-printf", "%p\\0%y\\0%s\\0");

    const result = spawnSync(args);

    const stdout = result.stdout?.toString() || "";
    const stderr = result.stderr?.toString() || "";
    
    const parts = stdout.split("\0");
    const entries: ShellEntry[] = [];
    
    for (let j = 0; j < parts.length - 2; j += 3) {
      const path = parts[j];
      const typeStr = parts[j + 1];
      const sizeStr = parts[j + 2];
      
      if (!path) continue;

      if (typeStr === "PRUNED") {
        entries.push({
          path,
          type: 'other',
          size: 0,
          isPruned: true
        });
      } else {
        entries.push({
          path,
          type: (typeStr === 'f' || typeStr === 'd' || typeStr === 'l') ? typeStr : 'other',
          size: parseInt(sizeStr, 10) || 0
        });
      }
    }

    const errors = stderr
      .split("\n")
      .filter(line => line.trim().length > 0);

    return { entries, errors };
  }
}
