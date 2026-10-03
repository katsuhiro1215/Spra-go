"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { AssetImage } from "@/components/app/asset-image";
import { AvatarBadge } from "@/components/app/avatar-badge";
import { Furigana } from "@/components/app/furigana";
import { useProfile } from "@/components/app/profile-provider";
import { upsertById } from "@/components/app/profile-list";
import { ProfileSheet, type SheetProfile } from "@/components/app/profile-sheet";
import { SkyPage, SkyTitle } from "@/components/app/sky-page";
import { SpruLoading } from "@/components/app/spru-loading";
import { isEmailVerified } from "@/components/auth/auth-flow";
import { FeedbackForm } from "@/components/app/feedback-form";
import { EmailVerifyNotice } from "@/components/auth/email-verify-notice";
import { SPRU_ICONS } from "@/components/spru/spru-assets";
import { SpruHouse } from "@/components/spru/spru-house";
import { apiFetch } from "@/lib/api";

type Profile = SheetProfile;

// 追加・編集のパネル。key は開くたびに変えて、パネルを作り直す(閉じる動きの間は中身を残す)
type SheetState = { open: boolean; target: Profile | null; key: number };

const PLATE = "max-w-full truncate rounded-full bg-[#fffaf0] px-2.5 py-0.5 text-[12.5px] font-black text-[#3b3226] shadow-[0_2px_5px_rgba(59,50,38,0.14)]";

/** プロフィール選び(docs/design/2026-09-28-top-profiles-design.md 4章)。スプルの家の前の芝生に家族が並ぶ */
export default function Page() {
  const router = useRouter();
  const { refresh: refreshProfile } = useProfile();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [managing, setManaging] = useState(false);
  const [sheet, setSheet] = useState<SheetState>({ open: false, target: null, key: 0 });
  // メールアドレスを確かめたか。確かめていなければお知らせを出す(docs/design/2026-09-29-email-verify-reset-design.md 3-5)
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    apiFetch("/api/user")
      .then(async (res) => {
        if (!active) return;

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const user = await res.json();
        if (!active) return;
        setEmailVerified(isEmailVerified(user));

        const profilesRes = await apiFetch("/api/profiles");
        if (!active) return;
        setProfiles(await profilesRes.json());
      })
      .catch(() => {
        if (active) router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  function openSheet(target: Profile | null) {
    setSheet((prev) => ({ open: true, target, key: prev.key + 1 }));
  }

  async function selectProfile(profile: Profile) {
    if (managing) {
      openSheet(profile);
      return;
    }

    const res = await apiFetch(`/api/profiles/${profile.id}/select`, { method: "POST" });

    if (res.ok) {
      // ヘッダーや下のメニューに、選んだプレイヤーをすぐ出す
      await refreshProfile();
      router.push("/");
    }
  }

  function handleDeleted(id: number) {
    const next = profiles?.filter((p) => p.id !== id) ?? null;
    setProfiles(next);
    // 最後の1人を消したら、編集中の表示もやめる(「プロフィールを編集」のボタンが消えるため)
    if (next && next.length === 0) setManaging(false);
  }

  return (
    <SkyPage className="items-center">
      <div className="relative z-10 flex flex-col items-center gap-1 px-6 pt-10">
        <SkyTitle className="text-2xl">
          だれが<Furigana text="冒険" reading="ぼうけん" />する？
        </SkyTitle>
        {profiles && profiles.length > 0 && (
          <button
            type="button"
            onClick={() => setManaging((prev) => !prev)}
            className="rounded-full bg-[#fffaf0] px-3 py-1.5 text-xs font-black text-[#2b5d7a] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white"
          >
            {managing ? "完了" : "プロフィールを編集"}
          </button>
        )}
        {emailVerified === false && <EmailVerifyNotice className="mt-3" />}
      </div>

      <SpruHouse width={230} eager className="z-10 mt-2" />

      {/* 家の前の芝生。上の辺はゆるく丸く、画面の下まで続く */}
      <div className="relative -mt-6 flex w-full flex-1 flex-col items-center rounded-t-[50%_60px] bg-gradient-to-b from-[#8fd06a] to-[#6cb24a] px-4 pt-10 pb-24">
        {!profiles ? (
          <SpruLoading />
        ) : (
          <>
            {profiles.length === 0 && (
              <p className="mb-4 rounded-full bg-[#fffaf0] px-4 py-1.5 text-sm font-bold text-[#3b3226]">
                まだプレイヤーがいません。最初のプレイヤーを作ろう！
              </p>
            )}
            <ul className="flex max-w-md flex-wrap justify-center gap-x-2 gap-y-4">
              {profiles.map((profile) => (
                <li key={profile.id}>
                  <button
                    type="button"
                    onClick={() => selectProfile(profile)}
                    aria-label={managing ? `${profile.name}を編集` : `${profile.name}で遊ぶ`}
                    className="group flex w-[92px] flex-col items-center gap-1 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-[#9fd8ff]"
                  >
                    <span className="relative transition-transform group-hover:scale-105">
                      <AvatarBadge avatar={profile.avatar} size={76} />
                      {managing && (
                        <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow">
                          <Pencil aria-hidden className="h-3.5 w-3.5 text-[#3b3226]" />
                        </span>
                      )}
                    </span>
                    <span className={PLATE}>{profile.name}</span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => openSheet(null)}
                  aria-label="プレイヤーを追加"
                  className="group flex w-[92px] flex-col items-center gap-1 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-[#9fd8ff]"
                >
                  <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[3px] border-dashed border-[#fffaf0] bg-[rgba(255,250,240,0.55)] transition-transform group-hover:scale-105">
                    <AssetImage asset={SPRU_ICONS["add-player"]} size={64} />
                  </span>
                  <span className={PLATE}>追加</span>
                </button>
              </li>
            </ul>

            {/* 保護者のかたへ(ご意見・ホーム画面に追加の案内) */}
            <section aria-label="保護者のかたへ" className="mt-10 flex w-full max-w-md flex-col items-center gap-3">
              <FeedbackForm />
            </section>
          </>
        )}
      </div>

      <ProfileSheet
        key={sheet.key}
        open={sheet.open}
        target={sheet.target}
        usedAvatars={profiles?.map((p) => p.avatar) ?? []}
        onClose={() => setSheet((prev) => ({ ...prev, open: false }))}
        onSaved={(saved) => setProfiles((prev) => (prev ? upsertById(prev, saved) : [saved]))}
        onDeleted={handleDeleted}
      />
    </SkyPage>
  );
}
