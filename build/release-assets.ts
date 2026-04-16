import { chmod, mkdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

type ReleaseAsset = {
  target: Bun.Build.CompileTarget;
  asset: string;
};

const RELEASE_ASSETS: ReleaseAsset[] = [
  { target: "bun-linux-x64", asset: "contexo-linux-x64" },
  { target: "bun-linux-arm64", asset: "contexo-linux-arm64" },
  { target: "bun-darwin-x64", asset: "contexo-darwin-x64" },
  { target: "bun-darwin-arm64", asset: "contexo-darwin-arm64" },
  { target: "bun-windows-x64", asset: "contexo-windows-x64.exe" }
];

const args = process.argv.slice(2);
const requestedTargets: Bun.Build.CompileTarget[] = [];
let outputDir = path.resolve(process.cwd(), "dist", "releases");

for (let index = 0; index < args.length; index++) {
  const arg = args[index];

  if (arg === "--help") {
    printHelp();
    process.exit(0);
  }

  if (arg === "--output-dir") {
    const value = args[index + 1];
    if (!value) {
      throw new Error("Missing value for --output-dir");
    }
    outputDir = path.resolve(process.cwd(), value);
    index++;
    continue;
  }

  if (arg.startsWith("--output-dir=")) {
    const value = arg.slice("--output-dir=".length);
    if (!value) {
      throw new Error("Missing value for --output-dir");
    }
    outputDir = path.resolve(process.cwd(), value);
    continue;
  }

  if (arg === "--target") {
    const value = args[index + 1];
    if (!value) {
      throw new Error("Missing value for --target");
    }
    requestedTargets.push(value as Bun.Build.CompileTarget);
    index++;
    continue;
  }

  if (arg.startsWith("--target=")) {
    const value = arg.slice("--target=".length);
    if (!value) {
      throw new Error("Missing value for --target");
    }
    requestedTargets.push(value as Bun.Build.CompileTarget);
    continue;
  }

  throw new Error(`Unknown argument: ${arg}`);
}

const selectedAssets = resolveAssets(requestedTargets);

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const builtFiles: string[] = [];

for (const entry of selectedAssets) {
  const outfile = path.join(outputDir, entry.asset);
  console.log(`Building ${entry.asset} (${entry.target})...`);

  const result = await Bun.build({
    entrypoints: ["./src/index.ts"],
    target: "bun",
    compile: {
      outfile,
      target: entry.target,
    },
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log.message);
    }
    throw new Error(`Failed to build ${entry.asset}`);
  }

  if (!entry.asset.endsWith(".exe")) {
    await chmod(outfile, 0o755);
  }

  builtFiles.push(outfile);
}

const checksums = await Promise.all(
  [...builtFiles].sort().map(async (filePath) => {
    const file = Bun.file(filePath);
    const hash = createHash("sha256").update(new Uint8Array(await file.arrayBuffer())).digest("hex");
    return `${hash}  ${path.basename(filePath)}`;
  })
);

await Bun.write(path.join(outputDir, "sha256sums.txt"), `${checksums.join("\n")}\n`);

console.log(`Wrote ${builtFiles.length} release assets to ${outputDir}`);

function resolveAssets(targets: Bun.Build.CompileTarget[]): ReleaseAsset[] {
  if (targets.length === 0) {
    return RELEASE_ASSETS;
  }

  const uniqueTargets = [...new Set(targets)];
  const unknownTargets = uniqueTargets.filter(
    (target) => !RELEASE_ASSETS.some((entry) => entry.target === target)
  );

  if (unknownTargets.length > 0) {
    throw new Error(
      `Unsupported release target(s): ${unknownTargets.join(", ")}. Available targets: ${RELEASE_ASSETS.map((entry) => entry.target).join(", ")}`
    );
  }

  return uniqueTargets.map((target) => RELEASE_ASSETS.find((entry) => entry.target === target) as ReleaseAsset);
}

function printHelp() {
  console.log(`Usage: bun run build/release-assets.ts [options]\n\nOptions:\n  --output-dir <dir>  Output directory for release binaries\n  --target <target>   Build only the selected compile target (can be repeated)\n  --help              Show this help\n\nTargets:\n  ${RELEASE_ASSETS.map((entry) => entry.target).join("\n  ")}`);
}
