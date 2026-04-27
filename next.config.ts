import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler"],
};

export default nextConfig;
