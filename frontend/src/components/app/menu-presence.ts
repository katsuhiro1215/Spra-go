import { useEffect, useSyncExternalStore } from "react";

import type { ProfileStatus } from "@/components/app/profile-provider";

// 新しいメニュー(下のメニュー・クイズ中のヘッダー)が今出ているか(設計書4-7)。
// 出ている間は、右下の「文A」を隠し、音のボタンを1段下に置く

let shownCount = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** メニューが出たことを知らせる。返した関数で消えたことを知らせる(2回呼んでも1回分だけ減る) */
export function showMenu(): () => void {
  shownCount += 1;
  emit();
  let hidden = false;
  return () => {
    if (hidden) return;
    hidden = true;
    shownCount -= 1;
    emit();
  };
}

export function isMenuShown(): boolean {
  return shownCount > 0;
}

export function subscribeMenu(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 右下の「文A」を出すか。プレイヤーが入っておらず(ログイン・登録・LP・Owner/管理など)、新しいメニューも出ていないときだけ。
 * プレイヤーの画面の読み込み中はメニューがまだ無いので、メニューだけで決めると一瞬出て消えてしまう
 */
export function floatingSettingsVisible(menuShown: boolean, profileStatus: ProfileStatus): boolean {
  return !menuShown && profileStatus === "none";
}

/** このメニューが出ている間、「出ている」と知らせる(下のメニュー・クイズ中のヘッダーで呼ぶ) */
export function useRegisterMenu(): void {
  useEffect(() => showMenu(), []);
}

/** 新しいメニューが出ているか。サーバーでは「出ている」とみなし、右下の「文A」を最初は出さない(一瞬出て消えるのを防ぐ) */
export function useMenuShown(): boolean {
  return useSyncExternalStore(subscribeMenu, isMenuShown, () => true);
}
