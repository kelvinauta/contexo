import fs from "fs-extra";
import { isBinaryFile } from "isbinaryfile";
import { FileInfo } from "./types";

export class Reader {
  async readFiles(files: FileInfo[]): Promise<FileInfo[]> {
    return await Promise.all(
      files.map(async (file) => {
        try {
          const contentBuffer = await fs.readFile(file.filePath);
          const isBinary = await isBinaryFile(contentBuffer, file.size);

          let content = "";
          if (!isBinary) {
            content = contentBuffer.toString("utf8");
          }

          return {
            ...file,
            isBinary,
            content,
          };
        } catch (error: any) {
          return {
            ...file,
            content: `ERROR READING FILE: ${error.message}`,
            isBinary: false,
          };
        }
      })
    );
  }
}
