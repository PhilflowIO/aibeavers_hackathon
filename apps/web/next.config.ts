import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@aibeavers/shared"],
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: monorepoRoot,
  serverExternalPackages: [
    "tsdav",
    "imapflow",
    "mailparser",
    "nodemailer",
    "@langchain/core",
    "@langchain/openai",
  ],
};

export default nextConfig;
