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
import type { LevelXp } from "@/lib/level-ring";

export type Profile = {
  id: number;
  name: string;
  /** アバターの名前(avatar-1〜6。GET /api/profiles/active が返す。docs/design/2026-09-29-spru-icons-design.md 4-1) */
  avatar: string | null;
  hp: number;
  max_hp: number;
  hp_regen_seconds: number | null;
  coins: number;
  points: number;
  xp: number;
  level: number;
  /** 今のレベルに届いた合計XPと、次のレベルの合計XP(ヘッダーのレベルの輪に使う) */
  level_xp?: LevelXp;
  current_streak: number;
};

/** プレイヤーが入っているか。loading: 確かめている間、active: 入っている、none: 入っていない(未ログイン・プロフィール未選択) */
export type ProfileStatus = "loading" | "active" | "none";

type ProfileContextValue = {
  profile: Profile | null;
  status: ProfileStatus;
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
  const [status, setStatus] = useState<ProfileStatus>("loading");

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch("/api/profiles/active");
      if (res.ok) {
        const data: Profile | null = await res.json();
        setProfile(data);
        setStatus(data ? "active" : "none");
      } else if (res.status === 401 || res.status === 403) {
        // ログアウトした・ログインしていない。前のプレイヤーの表示を残さない
        setProfile(null);
        setStatus("none");
      } else {
        setStatus((prev) => (prev === "loading" ? "none" : prev));
      }
    } catch {
      // 通信の失敗は致命的ではないため無視する(最初の確認だけは「入っていない」として右下の設定を出す)
      setStatus((prev) => (prev === "loading" ? "none" : prev));
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
    <ProfileContext.Provider value={{ profile, status, refresh, applyPartial }}>
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
