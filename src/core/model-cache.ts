import { spawnSync } from "bun";
import fs from "fs-extra";
import yoctoSpinner from "yocto-spinner";
import pc from "picocolors";

export class ModelCache {
  private static readonly CACHE_DIR = "/tmp/contexo-models-cache";
  private static readonly REPO_URL = "https://github.com/anomalyco/models.dev";
  private static hasCheckedUpdates = false;

  static async ensureCache(): Promise<string> {
    if (this.hasCheckedUpdates) return this.CACHE_DIR;

    const exists = await fs.pathExists(this.CACHE_DIR);
    const isTTY = process.stderr.isTTY;

    if (!exists) {
      const spinner = isTTY 
        ? yoctoSpinner({ text: pc.cyan("Initializing models database (cloning models.dev)...") }).start()
        : null;
      
      if (!isTTY) console.error(pc.cyan("Initializing models database (cloning models.dev)..."));

      const clone = spawnSync(["git", "clone", "--depth", "1", "-b", "dev", this.REPO_URL, this.CACHE_DIR]);
      
      if (!clone.success) {
        spinner?.error(pc.red("Failed to clone models database."));
        throw new Error("Failed to clone models database. Please check your internet connection.");
      }
      spinner?.success(pc.green("Models database initialized."));
    } else {
      const stats = await fs.stat(this.CACHE_DIR);
      const now = new Date().getTime();
      const age = now - stats.mtime.getTime();
      const oneDay = 24 * 60 * 60 * 1000;

      if (age > oneDay) {
        const spinner = isTTY 
            ? yoctoSpinner({ text: pc.dim("Checking for model updates...") }).start()
            : null;

        const pull = spawnSync(["git", "-C", this.CACHE_DIR, "pull"]);
        if (pull.success) {
            spinner?.success(pc.dim("Models database updated."));
            await fs.utimes(this.CACHE_DIR, new Date(), new Date());
        } else {
            spinner?.error(pc.dim("Failed to update models database (offline?)"));
        }
      }
      this.hasCheckedUpdates = true;
    }

    return this.CACHE_DIR;
  }

  static getCachePath(): string {
    return this.CACHE_DIR;
  }
}
