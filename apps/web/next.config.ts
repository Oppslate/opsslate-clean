import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  transpilePackages: ["@opsslate/suite-config", "@opsslate/suite-ui"],
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
