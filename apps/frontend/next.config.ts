import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF.js loads native canvas bindings and its worker through Node resolution.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  experimental: {
    // Every page needs a round trip Vercel → tunnel → backend. Keep a visited page in the
    // browser for 30 s so going back and forth (list ↔ review) is instant. Every form that
    // changes data calls router.refresh(), which empties this cache.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
