import { spawnSync } from "bun";
import fs from "fs-extra";
import { FIXTURES_DIR } from "./config";

export async function setupFixtures() {
  if (await fs.pathExists(FIXTURES_DIR) && (await fs.readdir(FIXTURES_DIR)).length > 0) {
    return;
  }

  console.log("Setting up test fixtures (scc data)...");
  const tempDir = "/tmp/scc-repo-" + Date.now();
  
  const clone = spawnSync(["git", "clone", "--depth", "1", "https://github.com/boyter/scc", tempDir]);
  if (!clone.success) {
    throw new Error("Git clone failed: " + clone.stderr.toString());
  }
  
  const source = `${tempDir}/examples/language`;
  console.log(`Copying from ${source} to ${FIXTURES_DIR}`);
  
  await fs.ensureDir(FIXTURES_DIR);
  await fs.copy(source, FIXTURES_DIR);
  await fs.remove(tempDir);
  
  const files = await fs.readdir(FIXTURES_DIR);
  console.log(`Fixtures ready. Found ${files.length} files.`);
}
