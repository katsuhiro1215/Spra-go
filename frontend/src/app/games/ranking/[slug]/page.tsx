import { notFound } from "next/navigation";

import { RankingScreen } from "@/components/games/ranking/ranking-screen";
import { RANKING_GAMES } from "@/components/games/ranking/ranking-view";

/** ミニゲームのランキング(docs/design/2026-10-13-ranking-design.md 3章) */
export default async function RankingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!RANKING_GAMES[slug]) notFound();

  return <RankingScreen slug={slug} />;
}
