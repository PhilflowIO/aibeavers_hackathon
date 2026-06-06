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
  // The agent lives in repo-root `src/` as ESM TypeScript using `.js` import
  // specifiers (NodeNext convention). webpack can't resolve `.js`->`.ts` across
  // externalDir on its own, so the whole src/ graph (route -> tools -> config)
  // fails to build. Mapping the extensions fixes it without editing every file.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
