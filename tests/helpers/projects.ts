import fs from "fs-extra";
import path from "node:path";

export async function resetProject(root: string, files: Record<string, string>): Promise<void> {
  await fs.emptyDir(root);

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(root, relativePath);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
  }
}
