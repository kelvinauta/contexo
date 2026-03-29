export {};

const args = process.argv.slice(2);
let compileTarget: Bun.Build.CompileTarget | undefined;

for (let index = 0; index < args.length; index++) {
  const arg = args[index];

  if (arg === "--target") {
    const value = args[index + 1];
    if (!value) {
      throw new Error("Missing value for --target");
    }
    compileTarget = value as Bun.Build.CompileTarget;
    index++;
    continue;
  }

  if (arg.startsWith("--target=")) {
    compileTarget = arg.slice("--target=".length) as Bun.Build.CompileTarget;
    if (!compileTarget) {
      throw new Error("Missing value for --target");
    }
    continue;
  }

  throw new Error(`Unknown argument: ${arg}`);
}

const compile: Bun.CompileBuildOptions = { outfile: "contexo" };

if (compileTarget) {
  compile.target = compileTarget;
}

await Bun.build({
  entrypoints: ["./src/index.ts"],
  target: "bun",
  compile,
});
