/** 画面ごとに鳴らすBGMを決める(音の方針: company/spra/spra-theme/docs/2026-10-05-spra-go-audio-list.md)。
 * - "home": ホームの曲(町・学ぶ・世界・ショップ・バッグなど、ゆっくり過ごす画面)
 * - "page": その画面が自分でBGMを決める(クイズ。クイズ中の曲を鳴らし、出るときに止める)
 * - "none": BGMなし(ミニゲーム・ログイン・登録・Owner/Adminなど。鳴っていたら止める)
 */
export type BgmRouteKind = "home" | "page" | "none";

const HOME_EXACT = new Set(["/", "/learn", "/world", "/shop", "/bag", "/profiles", "/passport", "/trip", "/zukan", "/words", "/family"]);
const HOME_PREFIXES = ["/travel/"];
const PAGE_PREFIXES = ["/play/", "/quiz/", "/review", "/world/"];

export function bgmForPath(pathname: string): BgmRouteKind {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (HOME_EXACT.has(path)) return "home";
  if (PAGE_PREFIXES.some((prefix) => path === prefix.replace(/\/$/, "") || path.startsWith(prefix))) return "page";
  if (HOME_PREFIXES.some((prefix) => path.startsWith(prefix))) return "home";
  return "none";
}
