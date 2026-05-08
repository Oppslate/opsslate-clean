import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@opsslate/suite-config", "@opsslate/suite-ui"],
};

export default nextConfig;
