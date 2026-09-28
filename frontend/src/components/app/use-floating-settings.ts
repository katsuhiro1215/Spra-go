"use client";

import { floatingSettingsVisible, useMenuShown } from "@/components/app/menu-presence";
import { useProfile } from "@/components/app/profile-provider";

/** 右下の「文A」を出すか(設計書4-7)。音のボタンの位置もこれで決める */
export function useFloatingSettingsShown(): boolean {
  const menuShown = useMenuShown();
  const { status } = useProfile();
  return floatingSettingsVisible(menuShown, status);
}
