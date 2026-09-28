import type { MetadataRoute } from "next";

/** ホーム画面に追加したときの名前とアイコン(docs/design/2026-09-29-spru-icons-design.md 5章)。アイコンは tools/spru-assets/brand.py が作る */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spra Go",
    short_name: "Spra Go",
    description: "言葉を学ぶと町が育ち、世界を旅できるようになる、家族で遊べる学習ゲーム。",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf0",
    theme_color: "#5bb33e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
