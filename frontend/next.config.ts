import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 本番は、必要なファイルだけを集めた小さなサーバー(.next/standalone)をDockerで動かす
  // (docs/design/2026-10-10-production-env-design.md 4章)
  output: "standalone",
};

export default nextConfig;
