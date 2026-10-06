// 国のコース・言語のコースの「ステージの道」の計算(docs/design/2026-10-07-main-game-levels-design.md 4-6)。画面を描かない部分だけをここに置く

export type MapPoint = { x: number; y: number };

const MARGIN = 56;

/**
 * 下から上へ、S字に曲がる道の上のステージの位置。最後(ボス)がいちばん上。
 * x は左右に揺れ(中央・右・中央・左のくり返し)、幅から32pxは空ける
 */
export function stageMapLayout(count: number, width: number, rowHeight = 96): { points: MapPoint[]; height: number } {
  if (count <= 0) return { points: [], height: 0 };
  const height = MARGIN * 2 + (count - 1) * rowHeight;
  const swing = Math.max(0, Math.min(88, width / 2 - 32));
  const points = Array.from({ length: count }, (_, i) => ({
    x: Math.round(width / 2 + Math.sin(i * (Math.PI / 2)) * swing),
    y: height - MARGIN - i * rowHeight,
  }));
  return { points, height };
}

/** スプルが立つステージの番号(0から)。次に遊ぶ(まだクリアしていない最初の)ステージ。全部クリアなら最後。なければ null */
export function walkerTarget(stages: { cleared: boolean; locked: boolean }[]): number | null {
  if (stages.length === 0) return null;
  const next = stages.findIndex((stage) => !stage.cleared);
  return next === -1 ? stages.length - 1 : next;
}

/** 点をなめらかにつなぐ、SVGの線(道の絵を貼る線)。点が2つ未満なら空 */
export function roadPath(points: MapPoint[]): string {
  if (points.length < 2) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const middleY = (from.y + to.y) / 2;
    path += ` C ${from.x} ${middleY} ${to.x} ${middleY} ${to.x} ${to.y}`;
  }
  return path;
}
