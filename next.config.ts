import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",   // ← THIS is the important line

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
