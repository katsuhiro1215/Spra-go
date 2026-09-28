# 画面のまわりを整える 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ヘッダーをすっきりさせ、アバターと表示の設定を下のメニューの「じぶん」に移し、クイズ中はやめる・文A・体力だけのヘッダーにする。

**Architecture:** 画面を描かない決めごと（下のメニューの並び、メニューが出ているかの数え方、音のボタンの絵、クイズをやめたときの戻り先）を小さなファイルに分けて Vitest で確かめる。画面の部品は既存の `AppHeader`・`BottomNav`・`AccessibilityControls`・`SoundControls`・`WorldHud` を直し、`DisplaySettings`・`MeSheet`・`GameHeader` を足す。ダイアログは `radix-ui` の Dialog・AlertDialog・Popover をそのまま使い、見た目は新配色で書く。サーバー・DBは変えない。

**Tech Stack:** Next.js 16 + React 19 + TypeScript + Tailwind v4 / radix-ui / lucide-react / Vitest（node 環境）

**Spec:** `docs/design/2026-09-28-app-chrome-design.md`

## Global Constraints

- ブランチ `feature/app-chrome`。コミットは `#NNNNN: type:summary`（直前の番号+1、最初のタスクは `#00180`）で、末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- ドキュメント・コメントは日本語
- 配色はUIパレットのまま（クリーム `#fffaf0`、内側 `#f5efe1`・`#efe5cf`、枠 `#e8dfcf`、文字 `#3b3226`・`#6b5d45`・`#8a7a5a`、緑 `#3b7f26`（厚み `#285a19`）・明るい緑 `#5bb33e`、青 `#2b6fa3`、朱 `#c2402c`）
- 文言（そのまま使う）: 下のメニュー「学ぶ」「旅する」「世界」「ショップ」「じぶん」／「じぶん」の中「バッグ」「パスポート」「ふりがな」「文字の大きさ」「標準」「大」「特大」「プロフィールを切り替える」「ログアウト」／やめるの小窓「クイズをやめる？」「ここまでのポイントやコインはそのまま残るよ」「つづける」「やめる」
- Tailwind のダイアログの出入りの動きは `data-[state=open]:` / `data-[state=closed]:` で書く（このプロジェクトには `data-open:` の決めごとが無い）
- アイコンは今は線のアイコン（lucide-react・今のSVG）。スプルのアイコン画像は届いてから差し替える（この計画ではやらない）
- サーバー・DBは変えない
- スクリーンショットは `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` に置き、確かめたら消す。テスト用ログイン `test@example.com` / `password`、プロフィール「町テスト」

## Review Focus

1. 読み込んだ直後: 下のメニューがある画面で右下の「文A」が一瞬出てから消えない／ログイン画面では「文A」が出る（Task 6 のブラウザ確認で、それぞれ読み込み直して見る）
2. 「じぶん」を開いたままリンクでページを移る → 次のページでパネルが開いたまま残らない（Task 3 で `onNavigate` で閉じる。Task 6 のブラウザ確認）
3. クイズのURLを直接開いてから ✕ →「やめる」 → 「学ぶ」へ行く（Task 1 の `quizQuitTarget` のテスト、Task 6 のブラウザ確認）
4. 「じぶん」やクイズ中の「文A」でふりがなを切り替えると、今の画面の文字にすぐふりがなが付く（Task 6 のブラウザ確認）
5. 390px で、音のボタンが下のメニュー（右端の「じぶん」）やログイン画面の「文A」に重ならない（Task 2 の位置の決め方、Task 6 のブラウザ確認）

---

### Task 1: 画面を描かない決めごと

**Files:**
- Create: `frontend/src/components/app/nav-items.ts`、`frontend/src/components/app/nav-items.test.ts`
- Create: `frontend/src/components/app/menu-presence.ts`、`frontend/src/components/app/menu-presence.test.ts`
- Create: `frontend/src/components/app/sound-face.ts`、`frontend/src/components/app/sound-face.test.ts`
- Create: `frontend/src/components/quiz/quit.ts`、`frontend/src/components/quiz/quit.test.ts`

**Interfaces:**
- Produces:
  - `type NavKey = "learn" | "trip" | "world" | "shop"`、`NAV_ITEMS: { key: NavKey; href: string; label: string }[]`、`isNavActive(pathname: string, href: string): boolean`
  - `showMenu(): () => void`、`isMenuShown(): boolean`、`subscribeMenu(listener: () => void): () => void`、`useRegisterMenu(): void`、`useMenuShown(): boolean`
  - `soundFace(enabled: boolean): { face: "laugh" | "normal"; mark: string; dim: boolean }`
  - `quizQuitTarget(historyLength: number): "back" | "/learn"`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/app/nav-items.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { isNavActive, NAV_ITEMS } from "./nav-items";

describe("下のメニューの並び", () => {
  it("学ぶ・旅する・世界・ショップの順で、「じぶん」を足した5つの真ん中が世界", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual(["学ぶ", "旅する", "世界", "ショップ"]);
    expect(NAV_ITEMS.map((item) => item.href)).toEqual(["/learn", "/trip", "/", "/shop"]);
    expect(NAV_ITEMS[2].key).toBe("world");
  });
});

describe("下のメニューの選択中", () => {
  it("世界は町(/)のときだけ選択中", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/learn", "/")).toBe(false);
  });

  it("ほかはそのページとその下で選択中。名前が似ているだけのページやバッグでは選択中にしない", () => {
    expect(isNavActive("/learn", "/learn")).toBe(true);
    expect(isNavActive("/trip/id", "/trip")).toBe(true);
    expect(isNavActive("/shopping", "/shop")).toBe(false);
    expect(isNavActive("/bag", "/shop")).toBe(false);
  });
});
```

`frontend/src/components/app/menu-presence.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { isMenuShown, showMenu, subscribeMenu } from "./menu-presence";

describe("新しいメニューが出ているか", () => {
  it("はじめは出ていない", () => {
    expect(isMenuShown()).toBe(false);
  });

  it("1つ出すと出ている、消すと出ていない", () => {
    const hide = showMenu();
    expect(isMenuShown()).toBe(true);
    hide();
    expect(isMenuShown()).toBe(false);
  });

  it("2つ出したら、両方消すまで出ている", () => {
    const hideA = showMenu();
    const hideB = showMenu();
    hideA();
    expect(isMenuShown()).toBe(true);
    hideB();
    expect(isMenuShown()).toBe(false);
  });

  it("同じものを2回消しても、ほかのメニューの分は減らない", () => {
    const hideA = showMenu();
    const hideB = showMenu();
    hideA();
    hideA();
    expect(isMenuShown()).toBe(true);
    hideB();
    expect(isMenuShown()).toBe(false);
  });

  it("出す・消すたびに知らせる", () => {
    let calls = 0;
    const unsubscribe = subscribeMenu(() => {
      calls += 1;
    });
    const hide = showMenu();
    hide();
    unsubscribe();
    expect(calls).toBe(2);
  });
});
```

`frontend/src/components/app/sound-face.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { soundFace } from "./sound-face";

describe("音のボタンの絵", () => {
  it("オンは笑顔に♪", () => {
    expect(soundFace(true)).toEqual({ face: "laugh", mark: "♪", dim: false });
  });

  it("オフはふつうの顔を薄くして✕", () => {
    expect(soundFace(false)).toEqual({ face: "normal", mark: "✕", dim: true });
  });
});
```

`frontend/src/components/quiz/quit.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { quizQuitTarget } from "./quit";

describe("クイズをやめたときの戻り先", () => {
  it("1つ前の画面があれば戻る", () => {
    expect(quizQuitTarget(2)).toBe("back");
    expect(quizQuitTarget(5)).toBe("back");
  });

  it("クイズのURLを直接開いたとき(1つ前が無い)は「学ぶ」へ", () => {
    expect(quizQuitTarget(1)).toBe("/learn");
    expect(quizQuitTarget(0)).toBe("/learn");
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/app/nav-items.test.ts src/components/app/menu-presence.test.ts src/components/app/sound-face.test.ts src/components/quiz/quit.test.ts`
Expected: 4ファイルとも FAIL（`Cannot find module './nav-items'` などモジュールが無い）

- [ ] **Step 3: 実装する**

`frontend/src/components/app/nav-items.ts`

```ts
// 下のメニュー(docs/design/2026-09-28-app-chrome-design.md 4-5)。画面を描かない部分だけをここに置く。
// 「じぶん」はページを移らずパネルを開くボタンなので、ここには入れない

export type NavKey = "learn" | "trip" | "world" | "shop";

export const NAV_ITEMS: { key: NavKey; href: string; label: string }[] = [
  { key: "learn", href: "/learn", label: "学ぶ" },
  { key: "trip", href: "/trip", label: "旅する" },
  { key: "world", href: "/", label: "世界" },
  { key: "shop", href: "/shop", label: "ショップ" },
];

/** そのページにいるとき選択中にする。世界(/)はちょうど町のときだけ、ほかはそのページとその下 */
export function isNavActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
```

`frontend/src/components/app/menu-presence.ts`

```ts
import { useEffect, useSyncExternalStore } from "react";

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

/** このメニューが出ている間、「出ている」と知らせる(下のメニュー・クイズ中のヘッダーで呼ぶ) */
export function useRegisterMenu(): void {
  useEffect(() => showMenu(), []);
}

/** 新しいメニューが出ているか。サーバーでは「出ている」とみなし、右下の「文A」を最初は出さない(一瞬出て消えるのを防ぐ) */
export function useMenuShown(): boolean {
  return useSyncExternalStore(subscribeMenu, isMenuShown, () => true);
}
```

`frontend/src/components/app/sound-face.ts`

```ts
// 音のボタンの絵(設計書4-7)。スプルの顔を使い、専用のアイコンが届いたら差し替える

/** オンは笑顔に♪、オフはふつうの顔を薄くして✕ */
export function soundFace(enabled: boolean): { face: "laugh" | "normal"; mark: string; dim: boolean } {
  return enabled ? { face: "laugh", mark: "♪", dim: false } : { face: "normal", mark: "✕", dim: true };
}
```

`frontend/src/components/quiz/quit.ts`

```ts
/** クイズをやめたときの戻り先(設計書4-2)。1つ前の画面があれば戻り、URLを直接開いたときは「学ぶ」へ */
export function quizQuitTarget(historyLength: number): "back" | "/learn" {
  return historyLength > 1 ? "back" : "/learn";
}
```

- [ ] **Step 4: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/app/nav-items.test.ts src/components/app/menu-presence.test.ts src/components/app/sound-face.test.ts src/components/quiz/quit.test.ts`
Expected: PASS（12件）

- [ ] **Step 5: 全体を確かめてコミットする**

Run: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
Expected: Vitest PASS（204件）、型チェックとlintはエラーなし

```bash
git add frontend/src/components/app/nav-items.ts frontend/src/components/app/nav-items.test.ts frontend/src/components/app/menu-presence.ts frontend/src/components/app/menu-presence.test.ts frontend/src/components/app/sound-face.ts frontend/src/components/app/sound-face.test.ts frontend/src/components/quiz/quit.ts frontend/src/components/quiz/quit.test.ts
git commit -m "#00180: feat:下のメニューの並び・メニューが出ているかの数え方・音のボタンの絵・クイズをやめたときの戻り先を足す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 表示の設定と、右下のボタン

**Files:**
- Create: `frontend/src/components/app/display-settings.tsx`
- Modify: `frontend/src/components/app/accessibility-controls.tsx`（全体を置き換える）
- Modify: `frontend/src/components/app/sound-controls.tsx`（全体を置き換える）

**Interfaces:**
- Consumes: `useMenuShown()`・`soundFace()`（Task 1）、`useAccessibility()`（既存: `fontScale`・`setFontScale`・`furigana`・`toggleFurigana`）、`useSound()`（既存: `enabled`・`toggleEnabled`）、`SPRU_FACES`（既存）
- Produces: `DisplaySettings()`（引数なし）

計算部分は Task 1 でテスト済み。見た目は型チェック・lint と Task 6 のブラウザ確認で確かめる。

- [ ] **Step 1: 表示の設定を書く**

`frontend/src/components/app/display-settings.tsx`

```tsx
"use client";

import { useAccessibility } from "@/components/app/accessibility-provider";
import { AutoFurigana } from "@/components/app/auto-furigana";

const FONT_SCALE_LABELS = {
  base: "標準",
  lg: "大",
  xl: "特大",
} as const;

type FontScaleKey = keyof typeof FONT_SCALE_LABELS;

/** ふりがなのオン・オフと文字の大きさ(設計書4-3)。「じぶん」・クイズ中の「文A」・右下の「文A」で使う */
export function DisplaySettings() {
  const { fontScale, setFontScale, furigana, toggleFurigana } = useAccessibility();

  return (
    <div className="flex flex-col gap-3 text-[#3b3226]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black">ふりがな</span>
        <button
          type="button"
          role="switch"
          aria-checked={furigana}
          aria-label="ふりがな"
          onClick={toggleFurigana}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${furigana ? "bg-[#5bb33e]" : "bg-[#d9cdb4]"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${furigana ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black">
          <AutoFurigana text="文字の大きさ" />
        </span>
        <div role="group" aria-label="文字の大きさ" className="flex rounded-full bg-[#efe5cf] p-0.5">
          {(Object.keys(FONT_SCALE_LABELS) as FontScaleKey[]).map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => setFontScale(scale)}
              aria-pressed={fontScale === scale}
              className={`rounded-full px-3 py-1 text-xs font-black ${
                fontScale === scale ? "bg-[#3b7f26] text-white" : "text-[#6b5d45]"
              }`}
            >
              {FONT_SCALE_LABELS[scale]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 右下の「文A」を直す**

`frontend/src/components/app/accessibility-controls.tsx` を次のものに置き換える。

```tsx
"use client";

import { useState } from "react";

import { DisplaySettings } from "@/components/app/display-settings";
import { useMenuShown } from "@/components/app/menu-presence";

/**
 * 画面右下に浮かぶ、文字の大きさ・ふりがなの切替(RootLayoutに配置)。
 * 下のメニューかクイズ中のヘッダーが出ている画面では、そちらに設定があるので出さない(設計書4-7)
 */
export function AccessibilityControls() {
  const menuShown = useMenuShown();
  const [open, setOpen] = useState(false);

  if (menuShown) return null;

  return (
    <div className="fixed right-3 bottom-20 z-50">
      {open && (
        <div className="mb-2 w-64 rounded-2xl bg-[#fffaf0] p-4 shadow-[0_8px_22px_rgba(40,70,90,0.2)]">
          <DisplaySettings />
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="表示設定(文字サイズ・ふりがな)を開く"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-lg shadow-lg hover:bg-muted"
      >
        文A
      </button>
    </div>
  );
}
```

- [ ] **Step 3: 音のボタンをスプルの顔にする**

`frontend/src/components/app/sound-controls.tsx` を次のものに置き換える。

```tsx
"use client";

import Image from "next/image";

import { useMenuShown } from "@/components/app/menu-presence";
import { soundFace } from "@/components/app/sound-face";
import { useSound } from "@/components/app/sound-provider";
import { SPRU_FACES } from "@/components/spru/spru-assets";

/**
 * 画面右下に浮かぶ、効果音のオン・オフ(スプルの顔、設計書4-7)。
 * 右下の「文A」が出ている画面ではその上、出ていない画面(下のメニュー・クイズ中のヘッダーがある)では1段下に置く
 */
export function SoundControls() {
  const { enabled, toggleEnabled } = useSound();
  const menuShown = useMenuShown();
  const look = soundFace(enabled);
  const face = SPRU_FACES[look.face];

  return (
    <button
      onClick={toggleEnabled}
      aria-pressed={enabled}
      aria-label={enabled ? "効果音をオフにする" : "効果音をオンにする"}
      className={`fixed right-3 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-[#fffaf0] shadow-[0_3px_8px_rgba(0,0,0,0.2)] ${
        menuShown ? "bottom-20" : "bottom-36"
      }`}
    >
      <Image
        src={face.src}
        alt=""
        width={36}
        height={36}
        className={`h-9 w-9 rounded-full object-cover ${look.dim ? "opacity-50 grayscale" : ""}`}
      />
      <span
        aria-hidden
        className={`absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-black text-white ${
          enabled ? "bg-[#3b7f26]" : "bg-[#8a7a5a]"
        }`}
      >
        {look.mark}
      </span>
    </button>
  );
}
```

- [ ] **Step 4: 確かめてコミットする**

Run: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
Expected: Vitest PASS（204件）、型チェックとlintはエラーなし

```bash
git add frontend/src/components/app/display-settings.tsx frontend/src/components/app/accessibility-controls.tsx frontend/src/components/app/sound-controls.tsx
git commit -m "#00181: feat:ふりがなと文字の大きさを共通の部品にし、右下の文Aをメニューのない画面だけに出し、音のボタンをスプルの顔にする

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 下のメニューと「じぶん」のパネル

**Files:**
- Create: `frontend/src/components/app/me-sheet.tsx`
- Modify: `frontend/src/components/app/bottom-nav.tsx`（全体を置き換える）

**Interfaces:**
- Consumes: `NAV_ITEMS`・`isNavActive`・`NavKey`・`useRegisterMenu`（Task 1）、`DisplaySettings`（Task 2）、`useProfile()`（既存: `profile.name`・`profile.level`）、`BadgeImage`（既存、`passport` バッジ）、`apiFetch`（既存）
- Produces: `MeSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void })`

- [ ] **Step 1: 「じぶん」のパネルを書く**

`frontend/src/components/app/me-sheet.tsx`

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeftRight, Backpack, LogOut } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { BadgeImage } from "@/components/app/badge-image";
import { DisplaySettings } from "@/components/app/display-settings";
import { useProfile } from "@/components/app/profile-provider";
import { apiFetch } from "@/lib/api";

/**
 * 下のメニューの「じぶん」で開く、下から出るパネル(設計書4-4)。外側のタップ・Escで閉じ、
 * 開いている間はパネルの中だけをキーボードで行き来できる(radix-ui の Dialog)
 */
export function MeSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { profile } = useProfile();
  const close = () => onOpenChange(false);

  async function handleLogout() {
    close();
    await apiFetch("/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(38,48,28,0.45)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-t-[22px] bg-[#fffaf0] px-4 pt-3 pb-8 text-[#3b3226] shadow-[0_-8px_24px_rgba(0,0,0,0.2)] outline-none duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom"
        >
          <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#e0d6c2]" />
          <div className="mb-2 flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2b6fa3] text-lg font-black text-white"
            >
              {profile?.name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate text-base font-black">
                {profile?.name ?? "じぶん"}
              </DialogPrimitive.Title>
              {profile && <p className="text-xs font-bold text-[#6b5d45]">Lv.{profile.level}</p>}
            </div>
          </div>

          <ul className="flex flex-col">
            <SheetLink href="/bag" icon={<Backpack aria-hidden className="h-5 w-5" />} label="バッグ" onNavigate={close} />
            <SheetLink href="/passport" icon={<BadgeImage badge="passport" size={22} />} label="パスポート" onNavigate={close} />
          </ul>

          <div className="my-3 rounded-2xl bg-[#f5efe1] p-3">
            <DisplaySettings />
          </div>

          <ul className="flex flex-col">
            <SheetLink
              href="/profiles"
              icon={<ArrowLeftRight aria-hidden className="h-5 w-5" />}
              label="プロフィールを切り替える"
              onNavigate={close}
            />
            <li>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left text-sm font-black text-[#c2402c] hover:bg-[#fdecea]"
              >
                <span className="flex h-7 w-7 items-center justify-center">
                  <LogOut aria-hidden className="h-5 w-5" />
                </span>
                ログアウト
              </button>
            </li>
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SheetLink({ href, icon, label, onNavigate }: { href: string; icon: ReactNode; label: string; onNavigate: () => void }) {
  return (
    <li className="border-b border-[#efe5cf]">
      <Link href={href} onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-2 py-3 text-sm font-black hover:bg-[#f5efe1]">
        <span className="flex h-7 w-7 items-center justify-center text-[#6b5d45]">{icon}</span>
        {label}
        <span aria-hidden className="ml-auto text-[#b9ad96]">
          ›
        </span>
      </Link>
    </li>
  );
}
```

- [ ] **Step 2: 下のメニューを直す**

`frontend/src/components/app/bottom-nav.tsx` を次のものに置き換える。

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { MeSheet } from "@/components/app/me-sheet";
import { useRegisterMenu } from "@/components/app/menu-presence";
import { isNavActive, NAV_ITEMS, type NavKey } from "@/components/app/nav-items";
import { useProfile } from "@/components/app/profile-provider";

const ICON_PROPS = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

// 今は線のアイコン。スプルのアイコン画像が届いたら差し替える(設計書5章)
const ICONS: Record<NavKey, ReactNode> = {
  learn: (
    <svg {...ICON_PROPS}>
      <path d="M3 5.5c3-1.5 6-1.5 9 .5 3-2 6-2 9-.5v13c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5z M12 6v13" />
    </svg>
  ),
  trip: (
    <svg {...ICON_PROPS}>
      <path d="M3 13.5l7.5-2.2L14 4.5c.5-1 2-1 2.3.1l-1.4 6 4.6-1.4c1.4-.4 2.5 1.2 1.3 2.1L5.4 18.2c-.7.4-1.5-.1-1.5-.9z" />
    </svg>
  ),
  world: (
    <svg {...ICON_PROPS} width={28} height={28}>
      <circle cx={12} cy={12} r={9} />
      <path d="M3 12h18 M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
    </svg>
  ),
  shop: (
    <svg {...ICON_PROPS}>
      <path d="M3.5 9l1.5-5h14l1.5 5 M3.5 9c0 1.7 1.3 3 2.8 3s2.9-1.3 2.9-3c0 1.7 1.3 3 2.8 3s2.8-1.3 2.8-3c0 1.7 1.3 3 2.9 3s2.8-1.3 2.8-3 M5.5 12v8h13v-8 M10 20v-4.5h4V20" />
    </svg>
  ),
};

const ITEM_CLASS = "relative flex h-[68px] flex-col items-center justify-center gap-0.5 text-[11.5px]";
const ACTIVE_TEXT = "font-black text-[#3b7f26]";
const IDLE_TEXT = "font-bold text-[#6b5d45] hover:text-[#3b3226]";

function ActiveBar() {
  return <span className="absolute top-1.5 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-[#5bb33e]" />;
}

/**
 * 画面下部の常設ナビ(設計書4-5)。学ぶ・旅する・世界(真ん中で丸く大きく)・ショップ・じぶん。
 * 「じぶん」はページを移らず、下から出るパネル(MeSheet)を開く。各ページは下端の余白(pb-24)を確保すること
 */
export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const [meOpen, setMeOpen] = useState(false);
  useRegisterMenu();

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 mx-auto grid max-w-[480px] grid-cols-5 rounded-t-[22px] bg-[#fffaf0] shadow-[0_-4px_14px_rgba(59,50,38,0.12)]"
        aria-label="メインナビゲーション"
      >
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          if (item.key === "world") {
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${ITEM_CLASS} justify-end pb-2 ${active ? ACTIVE_TEXT : IDLE_TEXT}`}
              >
                <span
                  className={`absolute -top-5 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-4 border-[#fffaf0] text-white shadow-[0_4px_10px_rgba(40,70,90,0.25)] ${
                    active ? "bg-[#3b7f26]" : "bg-[#5bb33e]"
                  }`}
                >
                  {ICONS.world}
                </span>
                {item.label}
              </Link>
            );
          }
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`${ITEM_CLASS} ${active ? ACTIVE_TEXT : IDLE_TEXT}`}
            >
              {active && <ActiveBar />}
              {ICONS[item.key]}
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMeOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={meOpen}
          className={`${ITEM_CLASS} ${meOpen ? ACTIVE_TEXT : IDLE_TEXT}`}
        >
          {meOpen && <ActiveBar />}
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2b6fa3] text-[11px] font-black text-white"
          >
            {profile?.name.slice(0, 1) ?? ""}
          </span>
          じぶん
        </button>
      </nav>
      <MeSheet open={meOpen} onOpenChange={setMeOpen} />
    </>
  );
}
```

- [ ] **Step 3: 確かめてコミットする**

Run: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
Expected: Vitest PASS（204件）、型チェックとlintはエラーなし

```bash
git add frontend/src/components/app/me-sheet.tsx frontend/src/components/app/bottom-nav.tsx
git commit -m "#00182: feat:下のメニューを学ぶ・旅する・世界(真ん中で大きく)・ショップ・じぶんにし、じぶんで下から出るパネルを開く

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: ふつうの画面のヘッダーと、町の上の段

**Files:**
- Modify: `frontend/src/components/app/app-header.tsx`（全体を置き換える）
- Modify: `frontend/src/components/app/hp-gauge.tsx`（バーをいつも出して横に伸ばす）
- Modify: `frontend/src/components/world/world-hud.tsx`（1段目のロゴと右端）

**Interfaces:**
- Consumes: `useProfile()`（既存）、`HpGauge`（既存、この Task で直す）、`LearnPointsBadge`・`PointsBadge`・`BadgeImage`（既存）
- Produces: `HpGauge({ value, max, className })` はバーをいつも出し、`className` で幅を決める（Task 5 もこれを使う）

- [ ] **Step 1: 体力ゲージのバーをいつも出す**

`frontend/src/components/app/hp-gauge.tsx` の本体を次のものに置き換える（`BadgeImage` の import はそのまま）。

```tsx
/**
 * 体力ゲージ(設計書4-1)。バーはスマホでもいつも出し、親から渡す幅(className)いっぱいに伸ばす
 */
export function HpGauge({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full bg-[#fffaf0] py-1 pr-3 pl-1.5 shadow-[0_2px_6px_rgba(59,50,38,0.15)] ${className ?? ""}`}
    >
      <BadgeImage badge="hp" size={20} />
      <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#efe5cf]">
        <div
          className="h-full rounded-full bg-[#e5533f] transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-black text-[#3b3226]">
        {value}/{max}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: ヘッダーを直す**

`frontend/src/components/app/app-header.tsx` を次のものに置き換える。

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";

import { BadgeImage } from "@/components/app/badge-image";
import { HpGauge } from "@/components/app/hp-gauge";
import { LearnPointsBadge } from "@/components/app/learn-points-badge";
import { PointsBadge } from "@/components/app/points-badge";
import { useProfile } from "@/components/app/profile-provider";

/**
 * ゲーム内の全画面共通ヘッダー(設計書4-1)。左にロゴのマーク、右に縦2段で体力ゲージと連続・ポイント・コイン。
 * プロフィールの切り替え・ログアウトは下のメニューの「じぶん」に移した。
 * RootLayoutに置かないのは、ログイン前/マーケティングページでは表示したくないため。
 * プロフィール情報は`ProfileProvider`から取得する(回答APIの結果がすぐに反映される)
 */
export function AppHeader() {
  const { profile } = useProfile();

  return (
    <header className="relative z-30 flex shrink-0 items-center justify-between gap-3 px-3 pt-2 pb-1 sm:px-6">
      <Link
        href="/"
        aria-label="SpraGo"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fffaf0] shadow-[0_2px_6px_rgba(59,50,38,0.15)]"
      >
        <Image src="/logo.svg" alt="" width={28} height={28} aria-hidden />
      </Link>

      <div className="flex w-[196px] flex-col items-end gap-1">
        <HpGauge value={profile?.hp ?? 0} max={profile?.max_hp ?? 20} className="w-full" />
        <div className="flex items-center gap-1">
          {typeof profile?.current_streak === "number" && profile.current_streak > 0 && (
            <span
              className="flex items-center gap-1 rounded-full bg-[#fffaf0] px-2 py-1 text-xs font-black whitespace-nowrap text-[#c2402c] shadow-[0_2px_6px_rgba(59,50,38,0.15)]"
              title="連続プレイ日数"
            >
              <BadgeImage badge="streak" size={16} />
              {profile.current_streak}日
            </span>
          )}
          <LearnPointsBadge value={profile?.points ?? 0} />
          <PointsBadge value={profile?.coins ?? 0} />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: 町の上の段を直す**

`frontend/src/components/world/world-hud.tsx` の import に足す。

```tsx
import { Backpack } from "lucide-react";
```

1段目のロゴのリンクを次のものに置き換える（「SpraGo」の文字を外し、読み上げ用の名前を付ける）。

```tsx
        <Link href="/" aria-label="SpraGo" className="flex items-center">
          <Image src="/logo.svg" alt="" width={28} height={28} aria-hidden />
        </Link>
```

1段目の右側（ハートとポイントのピルが並ぶ `<div className="flex items-center gap-1.5">`）の、ポイントのピルの後ろに足す。

```tsx
          <Link
            href="/bag"
            aria-label="バッグ"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5efe1] text-[#6b5d45]"
          >
            <Backpack aria-hidden className="h-5 w-5" />
          </Link>
```

- [ ] **Step 4: 確かめてコミットする**

Run: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
Expected: Vitest PASS（204件）、型チェックとlintはエラーなし

```bash
git add frontend/src/components/app/app-header.tsx frontend/src/components/app/hp-gauge.tsx frontend/src/components/world/world-hud.tsx
git commit -m "#00183: feat:ヘッダーをロゴのマークと縦2段(体力ゲージ・連続・ポイント・コイン)にし、町の上の段にバッグのボタンを足す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: クイズ中のヘッダー

**Files:**
- Create: `frontend/src/components/quiz/game-header.tsx`
- Modify: `frontend/src/components/quiz/quiz-session.tsx`（問題に答えている間の画面の `<AppHeader />` を `<GameHeader />` に）

**Interfaces:**
- Consumes: `useRegisterMenu`（Task 1）、`quizQuitTarget`（Task 1）、`DisplaySettings`（Task 2）、`HpGauge`（Task 4）、`useProfile()`（既存）
- Produces: `GameHeader()`（引数なし）

- [ ] **Step 1: クイズ中のヘッダーを書く**

`frontend/src/components/quiz/game-header.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { AlertDialog as AlertDialogPrimitive, Popover as PopoverPrimitive } from "radix-ui";

import { DisplaySettings } from "@/components/app/display-settings";
import { HpGauge } from "@/components/app/hp-gauge";
import { useRegisterMenu } from "@/components/app/menu-presence";
import { useProfile } from "@/components/app/profile-provider";

import { quizQuitTarget } from "./quit";

const ROUND_BUTTON =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fffaf0] text-[#6b5d45] shadow-[0_2px_6px_rgba(59,50,38,0.15)] outline-none focus-visible:ring-2 focus-visible:ring-[#2b6fa3]";

/** クイズに答えている間のヘッダー(設計書4-2)。やめる(✕)・文A(ふりがな・文字の大きさ)・体力ゲージだけ */
export function GameHeader() {
  const router = useRouter();
  const { profile } = useProfile();
  useRegisterMenu();

  function quit() {
    if (quizQuitTarget(window.history.length) === "back") router.back();
    else router.push("/learn");
  }

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 px-3 sm:px-6">
      <AlertDialogPrimitive.Root>
        <AlertDialogPrimitive.Trigger asChild>
          <button type="button" aria-label="クイズをやめる" className={ROUND_BUTTON}>
            <X aria-hidden className="h-5 w-5" />
          </button>
        </AlertDialogPrimitive.Trigger>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(38,48,28,0.45)]" />
          <AlertDialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[340px] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-3xl bg-[#fffaf0] p-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)] outline-none">
            <AlertDialogPrimitive.Title className="text-lg font-black">クイズをやめる？</AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-sm font-bold text-[#6b5d45]">
              ここまでのポイントやコインはそのまま残るよ
            </AlertDialogPrimitive.Description>
            <div className="mt-1 flex gap-2">
              <AlertDialogPrimitive.Cancel className="h-12 flex-1 rounded-2xl border-b-4 border-[#285a19] bg-[#3b7f26] text-base font-black text-white">
                つづける
              </AlertDialogPrimitive.Cancel>
              <AlertDialogPrimitive.Action
                onClick={quit}
                className="h-12 flex-1 rounded-2xl border-2 border-b-4 border-[#e8dfcf] bg-white text-base font-black text-[#3b3226]"
              >
                やめる
              </AlertDialogPrimitive.Action>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>

      <PopoverPrimitive.Root>
        <PopoverPrimitive.Trigger asChild>
          <button type="button" aria-label="表示設定(文字サイズ・ふりがな)を開く" className={`${ROUND_BUTTON} text-sm font-black`}>
            文A
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={8}
            className="z-50 w-64 rounded-2xl bg-[#fffaf0] p-4 shadow-[0_8px_22px_rgba(40,70,90,0.2)] outline-none"
          >
            <DisplaySettings />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      <HpGauge value={profile?.hp ?? 0} max={profile?.max_hp ?? 20} className="min-w-0 flex-1" />
    </header>
  );
}
```

- [ ] **Step 2: クイズで使う**

`quiz-session.tsx` の import に足す（`./level-up-overlay` の並び）。

```tsx
import { GameHeader } from "./game-header";
```

問題に答えている間の画面（`return (` のすぐ下が `<SkyPage>`、その次が `<AppHeader />`、その次が `{currentIndex === 0 && !practice && stageNumber !== null && <StageStartCard ...`）の `<AppHeader />` を `<GameHeader />` にする。体力がなくなった画面と結果画面の `<AppHeader />` はそのまま。

```tsx
    <SkyPage>
      <GameHeader />
      {currentIndex === 0 && !practice && stageNumber !== null && <StageStartCard key={runId} stageNumber={stageNumber} />}
```

- [ ] **Step 3: 確かめてコミットする**

Run: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
Expected: Vitest PASS（204件）、型チェックとlintはエラーなし

```bash
git add frontend/src/components/quiz/game-header.tsx frontend/src/components/quiz/quiz-session.tsx
git commit -m "#00184: feat:クイズ中はやめる(確かめてから戻る)・文A・体力ゲージだけのヘッダーにする

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: ブラウザで確かめ、SPEC・TASKSを更新する

**Files:**
- Modify: `SPEC.md`、`TASKS.md`

- [ ] **Step 1: ふつうの画面・「じぶん」を確かめる（390px）**

ログインして（`test@example.com` / `password`、「町テスト」）、`/learn`・`/shop`・`/passport` を開く。それぞれ**読み込み直して**見る。

- ヘッダー: 左にロゴのマークだけ、右に体力ゲージ（バー付き）と、その下に連続・ポイント・コイン
- 下のメニュー: 学ぶ・旅する・世界（真ん中で丸く大きい）・ショップ・じぶん。今のページが光る
- 右下は音のボタン（スプルの顔）だけで、「文A」は一瞬も出ない。音のボタンが「じぶん」に重ならない
- 音のボタンを押すと、顔が薄くなって✕、もう一度でもとに戻る

「じぶん」を押す。

- 下からパネルが出る（名前・Lv、バッグ、パスポート、ふりがな、文字の大きさ、プロフィールを切り替える、ログアウト）
- 外側のタップで閉じる。もう一度開いて Esc で閉じる
- 開いて「ふりがな」をオンにすると、パネルの外の見出しにふりがなが付く。オフに戻す
- 開いて「パスポート」を押すと、パスポートに移り、パネルは閉じている

スクリーンショットを撮って見たら消す。

- [ ] **Step 2: クイズ中を確かめる（390px）**

`/learn` から国・ステージを選んでクイズを始める。

- ヘッダー: ✕・文A・体力ゲージ（横いっぱい）だけ。ロゴ・連続・ポイント・コインは出ない。右下は音のボタンだけ
- 文A: 押すと小さなパネル。ふりがなをオンにすると、問題文にふりがなが付く。オフに戻す
- ✕ →「つづける」: 小窓が閉じ、クイズがそのまま続く
- ✕ →「やめる」: 1つ前の画面（ステージを選んだ画面）に戻る

クイズのURL（`/quiz/{ステージのid}`）を新しいタブで直接開き、✕ →「やめる」で「学ぶ」（`/learn`）へ行くことを見る。

結果画面を見るため、開発DBの「町テスト」（id 7）を記録してから答え、あとで元に戻す。`storage/app/private/chrome-check.php`（git に入らない場所）に次を書く。

```php
<?php
// 開発DBの「町テスト」(id 7)を、ブラウザ確認の前に記録し、確認のあとに元へ戻す。使い終わったら消す
$id = 7;
$path = storage_path('app/private/chrome-check-snapshot.json');
$tables = collect(DB::select("SELECT TABLE_NAME AS t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'user_profile_id'"))->pluck('t');

if (($mode ?? 'save') === 'save') {
    $snap = ['profile' => (array) DB::table('user_profiles')->find($id), 'rows' => []];
    foreach ($tables as $t) {
        $snap['rows'][$t] = DB::table($t)->where('user_profile_id', $id)->get()->map(fn ($r) => (array) $r)->all();
    }
    file_put_contents($path, json_encode($snap));
    echo "saved\n";
} else {
    $snap = json_decode(file_get_contents($path), true);
    DB::table('user_profiles')->where('id', $id)->update($snap['profile']);
    foreach ($tables as $t) {
        $keep = collect($snap['rows'][$t] ?? []);
        DB::table($t)->where('user_profile_id', $id)->whereNotIn('id', $keep->pluck('id'))->delete();
        foreach ($keep as $row) {
            DB::table($t)->where('id', $row['id'])->update($row);
        }
    }
    echo "restored\n";
}
```

Run: `./vendor/bin/sail artisan tinker --execute='$mode="save"; require storage_path("app/private/chrome-check.php");'`
Expected: `saved`

クイズを開き直して最後の問題まで答え、「結果を見る」を押す。

- 結果画面: ふつうのヘッダー（ロゴのマーク・縦2段）と下のメニューに戻り、右下は音のボタンだけ

Run: `./vendor/bin/sail artisan tinker --execute='$mode="restore"; require storage_path("app/private/chrome-check.php");'`
Expected: `restored`。記録の前と、`current_streak`・`best_streak`・`xp`・`coins`・`hp`・`points` が同じ。`chrome-check.php` と `chrome-check-snapshot.json` を消す

- [ ] **Step 3: 町・ログイン画面・1280px を確かめる**

- 町（`/`）: ロゴのマークだけ、右端のバッグのボタンでバッグへ。下のメニューの「世界」が光る
- 「じぶん」→「ログアウト」で、ログイン画面に移る
- ログイン画面: 右下に「文A」と、その上に音のボタンが出る（重ならない）。「文A」のパネルで、ふりがなを切り替えられる
- ログインし直し、1280px で `/learn` と、クイズ中のヘッダーを見る。横にはみ出さない
- どの画面もコンソールにエラーが無い

スクリーンショットは見たら消す。ブラウザを閉じる。

- [ ] **Step 4: SPEC・TASKSを更新する**

`SPEC.md` の「✅（2026-09-28）町以外のプレイヤーの画面（…）を、町と同じ時間帯の空の背景…」の行の下に足す。

```markdown
- ✅（2026-09-28）画面のまわりを整えた: ヘッダーは左にロゴのマークだけ、右に縦2段で体力ゲージ（スマホでもバー付き）と連続・ポイント・コイン。右上のアバターをなくし、下のメニューを 学ぶ・旅する・世界（真ん中で丸く大きく）・ショップ・じぶん にした。「じぶん」は下から出るパネルで、バッグ・パスポート・ふりがな・文字の大きさ・プロフィールの切り替え・ログアウト。クイズ中のヘッダーは、やめる（確かめてから前の画面へ）・文A・体力ゲージだけ。右下の「文A」は新しいメニューのない画面（ログイン・登録・プロフィール選び・LP・Owner/管理）だけに残し、音のボタンはスプルの顔にした。町の上の段にバッグのボタンを足した。アイコンは今は線のアイコンで、スプルのアイコン画像に差し替える予定（`docs/design/2026-09-28-app-chrome-design.md`）
```

`SPEC.md` のその次の行の「ヘッダーの簡略化（Passport/Shopアイコン・ストリーク表示の整理、ボトムナビとの重複解消）、」を取り除く（行の残りはそのまま）。

`SPEC.md` の「2026-09-28時点で192件」を「2026-09-28時点で204件」にする。

`TASKS.md` の「**連続プレイの節目（3日・7日・30日）のお祝いと、パスポートのバッジ**」の行の下に足す。

```markdown
- [x] **画面のまわりを整える**（2026-09-28。ヘッダー・下のメニュー・「じぶん」・クイズ中のヘッダー・右下のボタン。設計書 `docs/design/2026-09-28-app-chrome-design.md`、実装計画 `docs/design/2026-09-28-app-chrome-plan.md`）
- [ ] スプルのアイコン画像（Ownerが用意）が届いたら、線のアイコンと差し替える: 下のメニュー（学ぶ・旅する・世界・ショップ）、音のボタン（オン・オフ）、「じぶん」の中（バッグ・パスポート・ふりがな・文字の大きさ・プロフィールを切り替える・ログアウト）。町のバッグのボタンはバッグと同じ絵。`tools/spru-assets/crops.json` に足して切り抜く
```

- [ ] **Step 5: 全体を確かめてコミットする**

Run: `./vendor/bin/sail artisan test && cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
Expected: バックエンド PASS（332件）、Vitest PASS（204件）、型チェックとlintはエラーなし

```bash
git add SPEC.md TASKS.md
git commit -m "#00185: docs:画面のまわりを整えたことをSPEC/TASKSに反映し、スプルのアイコンの差し替えをタスクにする

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
