import type { SpaceMapResult, SpaceMapState, SpaceStop } from "./space-map-api";

/** 宇宙ぼうけんマップの見た目の計算(docs/design/2026-10-10-space-adventure-map-design.md 3-2)。画面を描かない部分だけ */

/** 星の評価の表示。★が取れた数、☆が残り(最大3) */
export function starsLine(stars: number): string {
  const count = Math.max(0, Math.min(3, stars));
  return "★".repeat(count) + "☆".repeat(3 - count);
}

export type StopLook = "locked" | "current" | "open" | "cleared";

/** 星の見た目: 閉じている / いま向かう星 / 開いている / クリアした */
export function stopLook(stop: SpaceStop, current: string): StopLook {
  if (!stop.open) return "locked";
  if (stop.key === current && !stop.cleared) return "current";
  return stop.cleared ? "cleared" : "open";
}

/** 地図の星を、下(月)から上(冥王星)へ並べる。画面は上から描くので、逆にして渡す */
export function stopsForDisplay(map: SpaceMapState): SpaceStop[] {
  return [...map.stops].reverse();
}

/** 地図から始めた回の、終わりの一言(クリアしたか・次の星・ボーナスなど)。行ごとの文 */
export function mapResultLines(map: SpaceMapResult, stops: SpaceStop[]): string[] {
  const nameOf = (key: string | null) => stops.find((stop) => stop.key === key)?.name ?? "";
  const lines: string[] = [];

  if (!map.cleared) {
    lines.push(`${nameOf(map.stop)}は、あと少し！ 6わり以上 せいかいで クリアだよ`);
    return lines;
  }
  lines.push(`${nameOf(map.stop)} クリア！ ${starsLine(map.stars)}`);
  if (map.unlocked) lines.push(`${nameOf(map.unlocked)}への 道が ひらいたよ！`);
  if (map.bonus) lines.push(`はじめてのクリアボーナス 経験値 +${map.bonus.xp}　学習ポイント +${map.bonus.point}`);

  return lines;
}
