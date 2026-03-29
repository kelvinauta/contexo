import workspacePackage from "../package.json" with { type: "json" };

export const VERSION = workspacePackage.version;
