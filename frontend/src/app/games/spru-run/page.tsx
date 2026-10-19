import { RunPageView } from "@/components/games/run/run-page";

/** ミニゲーム「スプルラン」(docs/design/2026-10-22-spru-run-design.md)。出し分けは config/games.php の spru_run.catalog(公開するまで 2099 年) */
export default function SpruRunPage() {
  return <RunPageView />;
}
