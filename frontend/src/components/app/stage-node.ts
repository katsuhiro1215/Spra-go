/** ステージの丸の色(背景・下の厚み・番号の文字)。選んでいる > ロック中 > クリア済み > ボス > ふつう の順で決める */
export function stageNodeClasses(
  stage: { locked: boolean; cleared: boolean; is_boss: boolean },
  selected: boolean,
): string {
  if (selected) return "border-[#1d4f76] bg-[#2b6fa3] text-white ring-4 ring-[#9fd8ff]";
  if (stage.locked) return "border-[#dccfb4] bg-[#efe5cf] text-[#8a7a5a]";
  if (stage.cleared) return "border-[#3b7f26] bg-[#5bb33e] text-[#3b3226]";
  if (stage.is_boss) return "border-[#8f2f1f] bg-[#c2402c] text-white";
  return "border-[#c98f12] bg-[#f2b632] text-[#3b3226]";
}
