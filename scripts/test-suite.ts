import { spawnSync } from "node:child_process";

const profileEntries = {
  smoke: {
    description: "Quick product smoke tests",
    targets: ["tests/smoke"],
  },
  contracts: {
    description: "All product contract tests",
    targets: ["tests/contracts"],
  },
  compat: {
    description: "Focused legacy compatibility checks",
    targets: ["tests/compat"],
  },
  low: {
    description: "Fast core confidence pass",
    targets: [
      "tests/smoke",
      "tests/contracts/measurement.contract.test.ts",
      "tests/contracts/truncation.contract.test.ts",
      "tests/contracts/pagination.contract.test.ts",
    ],
  },
  medium: {
    description: "Broader contract pass without heavy summary/token checks",
    targets: [
      "tests/smoke",
      "tests/contracts/measurement.contract.test.ts",
      "tests/contracts/truncation.contract.test.ts",
      "tests/contracts/pagination.contract.test.ts",
      "tests/contracts/ignore-patterns.contract.test.ts",
      "tests/contracts/cli-parsing.contract.test.ts",
    ],
  },
  high: {
    description: "Full curated suite",
    targets: ["tests/smoke", "tests/contracts", "tests/compat"],
  },
  all: {
    description: "Alias for the full curated suite",
    targets: ["tests/smoke", "tests/contracts", "tests/compat"],
  },
} satisfies Record<string, { description: string; targets: string[] }>;

type ProfileName = keyof typeof profileEntries;

function printAvailableProfiles(): void {
  console.log("Available test profiles:");

  for (const [name, profile] of Object.entries(profileEntries)) {
    console.log(`- ${name}: ${profile.description}`);
  }
}

function resolveProfile(argv: string[]): ProfileName {
  const requestedProfile = argv[2];

  if (!requestedProfile) {
    return "high";
  }

  if (requestedProfile === "--list") {
    printAvailableProfiles();
    process.exit(0);
  }

  if (!(requestedProfile in profileEntries)) {
    console.error(`Unknown test profile: ${requestedProfile}`);
    printAvailableProfiles();
    process.exit(1);
  }

  return requestedProfile as ProfileName;
}

const profileName = resolveProfile(process.argv);
const profile = profileEntries[profileName];

console.log(`Running test profile '${profileName}'`);
console.log(profile.description);
console.log(`Targets: ${profile.targets.join(", ")}`);

const result = spawnSync("bun", ["test", ...profile.targets], {
  cwd: process.cwd(),
  stdio: "inherit",
});

process.exit(result.status ?? 1);
