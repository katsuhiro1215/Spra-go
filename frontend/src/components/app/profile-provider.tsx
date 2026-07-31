"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { apiFetch } from "@/lib/api";

export type Profile = {
  id: number;
  name: string;
  hp: number;
  max_hp: number;
  hp_regen_seconds: number | null;
  coins: number;
  xp: number;
  level: number;
  current_streak: number;
};

type ProfileContextValue = {
  profile: Profile | null;
  refresh: () => Promise<void>;
  applyPartial: (partial: Partial<Profile>) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

/**
 * アクティブなプロフィール(HP/コイン/レベル等)を全画面で共有するContext。
 * 以前はAppHeaderが画面ごとに自分でfetchしていたため、クイズで回答して
 * HPが変化してもヘッダーの表示が更新されない(リロードするまで古いまま)
 * 不具合があった(2026-07-31 Owner指摘)。回答APIのレスポンスを
 * applyPartial()でこのContextに反映することで、ヘッダーに即時反映する。
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch("/api/profiles/active");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch {
      // 未ログイン等で失敗しても致命的ではないため無視
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, [refresh]);

  const applyPartial = useCallback((partial: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, refresh, applyPartial }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile は ProfileProvider の内側でのみ使用できます");
  }
  return ctx;
}
