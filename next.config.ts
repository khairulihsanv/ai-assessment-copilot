import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF.js loads native canvas bindings and its worker through Node resolution.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
