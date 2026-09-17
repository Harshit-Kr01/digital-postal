import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep type validation on the compiler API path for the current CI runtime.
  // Next 16's CLI worker can return an empty showConfig stream under Node 24.
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
