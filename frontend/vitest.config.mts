import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// 画面を描かない計算だけをテストするため、ブラウザの代わり(jsdom)は使わない
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
