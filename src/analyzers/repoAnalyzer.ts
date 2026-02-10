import fs from "node:fs";
import path from "node:path";
import type { BackendType } from "@/backends/BackendAdapter";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export async function analyzeRepo(
  repoPath: string,
): Promise<{ backendType: BackendType }> {
  const packageJsonPath = path.join(repoPath, "package.json");
  const packageJsonRaw = fs.readFileSync(packageJsonPath, "utf8");
  const pkg = JSON.parse(packageJsonRaw) as PackageJson;
  const allDependencies = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };

  if (allDependencies.firebase) {
    return { backendType: "firebase" };
  }

  if (allDependencies["@aws-sdk/client-dynamodb"]) {
    return { backendType: "aws" };
  }

  return { backendType: "neon" };
}
