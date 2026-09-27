# 画面の配色をそろえる — 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**ゴール:** 町以外のプレイヤーの画面（学ぶ・国・クイズ・ミニアプリ・復習・パスポート・プロフィール・ログイン・登録・ショップ・バッグ・旅先の国・旅のハブ）を、町と同じ時間帯の空の背景とクリーム色のカード・こげ茶の文字・緑のボタンにそろえる。

**アーキテクチャ:** 先に共通部品を作る。時間帯の空を描き時間帯を配る `SkyPage`、空の上の文字の `SkyTitle`・`SkyText`、クリーム色のカードの `Panel`、新配色の `AppButton`、クリーム色の札のヘッダー・戻るリンク・ステージの道。見た目の決めごと（空の上の文字の色・選択肢の色・答えの見出し・スタンプのバッジ）は計算だけの `palette.ts` に切り出してテストする。Ownerが用意したバッジの素材集（mascot-9・mascot-10）から使うものを今の切り抜きの道具で切り出し、`BadgeImage` で出す（小さい所は mascot-10、大きい所は mascot-9）。そのあと各画面の `SceneBackground` と白い文字・黒い半透明のカードを、共通部品と3章の色に差し替える。対象外の画面（未ログインのLPなど）は、今のボタンを `classic-button.tsx` に残して見た目を変えない。

**技術スタック:** Next.js 16.2.10 / React 19 / TypeScript / Tailwind CSS / Vitest、lucide-react（アイコン）。バックエンド（Laravel）は変えない

**設計書:** `docs/design/2026-09-28-ui-palette-design.md`（必ず併せて読むこと）

## 全体の制約

- 既存のバックエンドテスト（320件）とフロントのテスト（175件）はすべて通ること
- 色は設計書3章の値だけを使い、Tailwindの任意の値（`bg-[#fffaf0]` など）で書く（町の画面と同じ書き方）。色の名前（デザイントークン）は作らない
- 画面の流れ・ボタンの位置・機能は変えない。文言も変えない（例外は答えのあとの見出しだけ: 「Correct!!」→「せいかい！」、「Wrong...」→「おしい！」、「正解: 〇〇」→「こたえは「〇〇」」）
- 見出しやボタンの絵文字は lucide のアイコンに替える。国の `mood_emoji`（DBの中身）は残す。アイコンだけのときは `aria-hidden` と読み上げ用の文字（`sr-only`）を添える
- 対象外（見た目を変えない）: 未ログインのLP（`components/app/guest-landing.tsx`）、紹介ページ（`app/world/[code]/*`）、ブログ・about、Owner/管理画面（`app/owner/*`・`app/admin/*`）、ダッシュボード（`app/dashboard/*`）
- ふりがな（`AutoFurigana`・`Furigana`）と動きを減らす設定の対応は今のまま残す
- ESLint（`react-hooks`）の規則: effectの中で直接setStateしない（setTimeout・setIntervalのコールバックの中はよい）、描画中にrefの `.current` を読まない
- コミットは `#NNNNN: type:summary`（`git log --oneline -1` の番号+1）＋末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 作業ブランチは `feature/ui-palette`（作成済み）
- 開発サーバーはポート3000（すでに動いていれば新しく起動しない）。テスト用ログイン: `test@example.com` / `password`、プロフィール「町テスト」（id 7）。スクリーンショットは `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` にだけ保存し、確認後に消す。DBを変えて確かめたら元に戻す
- サブエージェントは使わない（最後の見直しも自分で行う）

## レビューで特に見る点

1. **夜（19時〜翌5時）に開いたとき、空の上に直接置いた文字が紺の背景で読めない**: 空の上の文字はすべて `SkyTitle`・`SkyText`（時間帯で色が変わる）か、クリーム色の札の中に入っていること。昼の水色の空の上の補足の文字も読めること（Task 1 の `skyTextClass` のテスト、Task 8 のブラウザ確認で4つの時間帯）
2. **対象外の画面が変わってしまう**: 未ログインのLP・紹介ページのクイズの試遊・Owner/管理のログインのボタンが今の色のままであること（Task 3 の `classic-button.tsx` への付け替え、Task 8 のブラウザ確認）
3. **明るいボタンの文字が読みにくい**: 明るい緑（正解）・山吹・朱色（不正解）のボタンの文字はこげ茶、緑・青のボタンは白い文字（Task 3 の `AppButton`、Task 8 のブラウザ確認）
4. **答えのあとのカードに情報が多い日**（コンボ・連続プレイ・相棒のハート・レベルアップが重なる）: 小さい画面でもカードがはみ出さず、［次へ］が押せること（Task 5 のカードに `max-h`＋スクロール、Task 8 のブラウザ確認）
5. **画面を開いた瞬間の色の切り替え・サーバーとの表示のずれ**: 最初は昼の色で描き、開いたあとに今の時間帯へ色が変わること。コンソールに表示のずれ（hydration）の警告が新しく出ないこと（Task 3 の `SkyPage`、Task 8 のブラウザ確認）

## あとから決めたこと（2026-09-28、実行中）

Ownerが実行中に mascot-11 を追加し、「パスポートのメダル・難易度バッジ・ボスステージの印」を今回に入れると決めた。設計書4-2に反映済み。この計画のうち、次の手順はこの節を優先する（コミット番号は「git log の番号+1」）:

- Task 1・2: 追加コミットで `stampBadge` を銅・銀・金のメダル（`medal-bronze`・`medal-silver`・`medal-gold`）にし、バッジに `passport`・`beginner`・`intermediate`・`advanced`・`boss`・`boss-battle` を足し、使わない `star`・`medal` を外した（済み）
- Task 3 のステージの道: ボスの丸のアイコンを lucide の `Crown` でなく `<BadgeImage badge="boss" size={30} />` にする
- Task 4: `palette.ts` に `difficultyBadge(difficulty: string): "beginner" | "intermediate" | "advanced" | null` を足す（テストを先に書く: 初級→beginner、中級→intermediate、上級→advanced、ほか→null）。国の画面の難易度のタブの文字の前に `<BadgeImage badge={...} size={20} />` を出す（`null` なら出さない）。地域の画面の「BOSS」の札の前に `<BadgeImage badge="boss" size={16} />`
- Task 5: クイズの「BOSS」の札の前に `<BadgeImage badge="boss" size={16} />`
- Task 6: ミニアプリの難易度のボタンに難易度のバッジ（20px）。「BOSS STAGE」の場面は lucide の `Swords` をやめ、`<BadgeImage badge="boss-battle" size={96} />` を上に出す。パスポートの見出しの `BookOpen` を `<BadgeImage badge="passport" size={32} />` にする。スタンプのバッジは `stampBadge` の返すメダル（40px）
- Task 7: 旅のハブの［パスポート］のリンクの文字の前に `<BadgeImage badge="passport" size={18} />`

## 計画で決めたこと（Task 8 で設計書にも反映する）

- **対象外の画面のボタン**: `AppButton` を新配色に置き換えると、同じ部品を使う対象外の画面（LP・紹介ページのクイズの試遊・Owner/管理のログイン）も変わってしまう。そこで今の `button.tsx` を `classic-button.tsx` にそのまま写し、対象外の4ファイルはそちらを読み込む
- **正しい答えの行**: 正しい答えは国旗の画像のこともある（`ChoiceLabel`）。文字列を返す `correctAnswerLine` は作らず、画面で「こたえは「〇〇」」と組み立てる（`palette.ts` の関数は4つ）
- **明るいボタンの文字**: コントラストを保つため、明るい緑・山吹・朱色のボタンの文字はこげ茶（`#3b3226`）、緑（`#3b7f26`）・青（`#2b6fa3`）のボタンは白
- **空の上の文字とリンク**: 見出しは `SkyTitle`、補足・「読み込み中...」は `SkyText`（時間帯で色が変わる。昼の補足は `#4a3f30`、夜は白）。空の上のリンク（「はじめての方はこちら」「← 別の国を選ぶ」など）はクリーム色の丸い札にする
- **ログイン・登録の見出し**: 今はカードの中にあるので、カードの中のまま（こげ茶の文字）にする。プロフィール選びの「だれが冒険する？」は空の上なので `SkyTitle`
- **旅のハブ**: 見出しを `SkyTitle` にするため、画面全体を `SkyPage` で包む（今の水色の背景は、昼の空の色とほぼ同じ）

## ファイル構成

**作成（`frontend/src/`）**
- `components/app/palette.ts`・`palette.test.ts` — 空の上の文字の色・選択肢の色・答えの見出し・スタンプのバッジ（計算だけ）
- `components/app/badge-image.tsx` — `BadgeImage`（バッジの画像）
- `public/spru/badges/*.webp`（8枚、`tools/spru-assets/extract.py` が書き出す）
- `components/app/sky-page.tsx` — `SkyPage`・`useSkyTime`・`SkyTitle`・`SkyText`
- `components/app/panel.tsx` — `Panel`
- `components/app/classic-button.tsx` — 今のボタン（対象外の画面用）

**変更（リポジトリ直下）**
- `tools/spru-assets/crops.json`（素材集 m9・m10 と badges の組）・`tools/spru-assets/extract.py`（badges の組の書き出し）

**変更（`frontend/src/`）**
- `components/spru/spru-assets.ts`（`extract.py` が書き出す。手で直さない）
- 町の上の段: `components/world/world-hud.tsx`（HP・学習ポイントの札の絵）
- 共通: `components/app/button.tsx`・`app-header.tsx`・`back-link.tsx`・`stage-path.tsx`・`hp-gauge.tsx`・`learn-points-badge.tsx`・`points-badge.tsx`・`world-map.tsx`、`app/globals.css`（世界地図の色）
- 対象外の付け替え: `components/app/guest-landing.tsx`・`app/world/[code]/quiz-preview.tsx`・`app/owner/login/page.tsx`・`app/admin/login/page.tsx`
- 学ぶ流れ: `app/learn/page.tsx`・`app/travel/[countryId]/page.tsx`・`app/travel/[countryId]/start/page.tsx`・`app/travel/[countryId]/region/[regionId]/page.tsx`
- クイズ: `app/quiz/[stageId]/page.tsx`・`app/review/page.tsx`・`components/quiz/quiz-session.tsx`・`components/app/matching-question.tsx`・`ordering-question.tsx`・`sorting-question.tsx`
- そのほか: `app/play/[id]/page.tsx`・`app/passport/page.tsx`・`app/profiles/page.tsx`・`app/login/page.tsx`・`app/register/page.tsx`・`app/shop/page.tsx`・`app/bag/page.tsx`・`app/trip/[key]/page.tsx`・`app/trip/page.tsx`

**変えない**: `components/app/scene-background.tsx`（LPだけが使う）、`components/quiz/stage-start-card.tsx`・`level-up-overlay.tsx`（すでに新配色）、バックエンド

**ドキュメント**: `SPEC.md`・`TASKS.md`・`docs/design/2026-09-28-ui-palette-design.md`

## よく使う置き換え（Task 5〜7 で使う）

画面の中で次の形が出てきたら、右の形にする（完全一致でなくても、同じ役割のものは同じように直す）。

| 役割 | 今 | 新しい形 |
|---|---|---|
| 画面の外側 | `<div className="relative flex min-h-screen flex-col overflow-hidden">` ＋ `<SceneBackground />` | `<SkyPage>`（外側の `div` と `SceneBackground` を消し、閉じタグも `</SkyPage>` に。外側に `items-center` などがあれば `<SkyPage className="items-center ...">`） |
| 空の上の見出し | `<h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">` | `<SkyTitle className="text-3xl">`（`as` は既定で `h1`。`h2` のときは `as="h2"`） |
| 空の上の補足 | `text-sm text-white/85 drop-shadow` など空の上の `p`・`span` | `<SkyText muted className="text-sm">`（強い文字は `muted` なし） |
| 空の上のリンク | `text-sm text-white/85 drop-shadow hover:underline` などの `Link` | `className="rounded-full bg-[#fffaf0] px-3 py-1.5 text-sm font-black text-[#2b5d7a] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white"` |
| 半透明の黒いカード | `rounded-lg border border-white/30 bg-black/20 p-4 shadow-lg backdrop-blur-sm hover:bg-black/30` | `rounded-2xl border-2 border-b-4 border-[#e8dfcf] bg-white p-4 text-[#3b3226] hover:bg-[#fffaf0]`（押せるカード）、押せないカードは `<Panel>` |
| 白い半透明のカード | `rounded-2xl bg-white/90 p-6 shadow-xl backdrop-blur-sm` | `rounded-3xl bg-[#fffaf0] p-6 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]` |
| カードの中の白い文字 | `text-white`・`text-white/90` | `text-[#3b3226]` |
| カードの中の薄い白い文字 | `text-white/70`・`text-white/80`・`text-muted-foreground` | `text-[#6b5d45]` |
| 大きな数字（点数） | `text-primary` | `text-[#2e6b1c]` |
| 達成率のバー | 外 `bg-white/20`、中 `bg-linear-to-r from-amber-400 to-amber-300` | 外 `bg-[#efe5cf]`、中 `bg-[#5bb33e]` |
| タブ（選ばれた） | `bg-amber-400 text-amber-950` | `bg-[#3b7f26] text-white` |
| タブ（ほか） | `bg-black/25 text-white/80 hover:bg-black/35` | `bg-[#fffaf0] text-[#3b3226] hover:bg-white` |
| タブ（ロック） | `bg-black/15 text-white/50` | `bg-[#efe5cf] text-[#8a7a5a]` |
| 入力欄 | `border-2 border-white/40 bg-white/90 ... text-slate-900 outline-none focus-visible:border-sky-400` | `border-2 border-[#e8dfcf] bg-white ... text-[#3b3226] outline-none focus-visible:border-[#2b6fa3]` |
| エラーの文字 | `text-rose-200` | `text-[#c2402c]` |
| 画面いっぱいの「読み込み中...」（`SkyPage` の外） | `flex min-h-screen items-center justify-center text-sm text-muted-foreground` | `flex min-h-screen items-center justify-center bg-[#8fd4e9] text-sm text-[#3b3226]` |
| 絵文字 | 🔒🏆🚩🗺🛒✈️📔❔🔑🎉⭐👑⚔🧪🖼️🧑🏅 | lucide: `Lock`・`Trophy`・`Flag`・`Map`・`Store`・`Plane`・`BookOpen`・`CircleHelp`・`KeyRound`・`PartyPopper`・`Star`・`Crown`・`Swords`・`FlaskConical`・`Image`（`ImageIcon` として読み込む）・`User`・`Award`（16px以下の小さなアイコン） |
| 絵文字（バッジにするもの） | 🔥❤️💰🥇🥈🥉 | `BadgeImage`（設計書4-2: 🔥＝`streak`、❤️＝`hp`、💰＝`coins`、🥇🥈🥉＝`stampBadge` のバッジ） |

---

### Task 1: 見た目の決めごとの計算（palette.ts）

**Files:**
- Create: `frontend/src/components/app/palette.ts`
- Test: `frontend/src/components/app/palette.test.ts`

**Interfaces:**
- Produces:
  - `type SkyInk = "ink" | "white"`、`skyInk(time: TimeOfDay): SkyInk`
  - `type SkyTextKind = "title" | "text" | "muted"`、`skyTextClass(time: TimeOfDay, kind: SkyTextKind): string`
  - `type ChoiceTone = "default" | "secondary" | "danger" | "locked"`、`choiceTone(state: { answered: boolean; isCorrect: boolean; isSelected: boolean }): ChoiceTone`
  - `answerHeadline(correct: boolean): string`
  - `type StampTier = "none" | "bronze" | "silver" | "gold"`、`stampBadge(tier: StampTier): { badge: "star" | "medal" | "trophy" | null; ring: string; label: string }`

- [ ] **Step 1: 失敗するテストを書く（`palette.test.ts`）**

```ts
import { describe, expect, it } from "vitest";

import { answerHeadline, choiceTone, skyInk, skyTextClass, stampBadge } from "./palette";

describe("空の上の文字の色", () => {
  it("夜だけ白、朝・昼・夕方はこげ茶", () => {
    expect(skyInk("morning")).toBe("ink");
    expect(skyInk("day")).toBe("ink");
    expect(skyInk("evening")).toBe("ink");
    expect(skyInk("night")).toBe("white");
  });

  it("昼は見出しも文字もこげ茶、補足は少し薄いこげ茶", () => {
    expect(skyTextClass("day", "title")).toBe("text-[#3b3226]");
    expect(skyTextClass("day", "text")).toBe("text-[#3b3226]");
    expect(skyTextClass("day", "muted")).toBe("text-[#4a3f30]");
  });

  it("夜は白。見出しには影を付ける", () => {
    expect(skyTextClass("night", "title")).toBe("text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]");
    expect(skyTextClass("night", "text")).toBe("text-white");
    expect(skyTextClass("night", "muted")).toBe("text-white/85");
  });
});

describe("選択肢のボタンの色", () => {
  it("答える前は白", () => {
    expect(choiceTone({ answered: false, isCorrect: true, isSelected: true })).toBe("default");
  });

  it("答えたあと、正解は明るい緑、選んだ不正解は朱色、ほかはベージュ", () => {
    expect(choiceTone({ answered: true, isCorrect: true, isSelected: false })).toBe("secondary");
    expect(choiceTone({ answered: true, isCorrect: true, isSelected: true })).toBe("secondary");
    expect(choiceTone({ answered: true, isCorrect: false, isSelected: true })).toBe("danger");
    expect(choiceTone({ answered: true, isCorrect: false, isSelected: false })).toBe("locked");
  });
});

describe("答えのあとの見出し", () => {
  it("正解は「せいかい！」、不正解は「おしい！」", () => {
    expect(answerHeadline(true)).toBe("せいかい！");
    expect(answerHeadline(false)).toBe("おしい！");
  });
});

describe("パスポートのスタンプのバッジ", () => {
  it("段が上がるほど豪華なバッジ(星 → 金メダル → トロフィー)と、今の文言を返す", () => {
    expect(stampBadge("bronze")).toEqual({ badge: "star", ring: "border-[#c47a45]", label: "初級クリア" });
    expect(stampBadge("silver")).toEqual({ badge: "medal", ring: "border-[#9aa3ab]", label: "中級までクリア" });
    expect(stampBadge("gold")).toEqual({ badge: "trophy", ring: "border-[#d4a72c]", label: "全難易度クリア" });
  });

  it("未訪問はバッジなし", () => {
    expect(stampBadge("none")).toEqual({ badge: null, ring: "border-[#e8dfcf]", label: "未訪問" });
  });
});
```

- [ ] **Step 2: テストを走らせて失敗を確かめる**

Run: `cd frontend && npx vitest run src/components/app/palette.test.ts`
Expected: FAIL（`./palette` が見つからない）

- [ ] **Step 3: 実装する（`palette.ts`）**

```ts
import type { TimeOfDay } from "@/components/world/time-of-day";

// 町以外の画面の見た目の決めごと(docs/design/2026-09-28-ui-palette-design.md 3章・4章)。
// Tailwind が読み取れるよう、クラス名は省略せずに書く

export type SkyInk = "ink" | "white";

/** 空の上に直接置く文字の色の種類。白い文字は昼の水色の空ではコントラストが足りないので、夜だけ白 */
export function skyInk(time: TimeOfDay): SkyInk {
  return time === "night" ? "white" : "ink";
}

export type SkyTextKind = "title" | "text" | "muted";

const SKY_TEXT: Record<SkyInk, Record<SkyTextKind, string>> = {
  ink: { title: "text-[#3b3226]", text: "text-[#3b3226]", muted: "text-[#4a3f30]" },
  white: { title: "text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]", text: "text-white", muted: "text-white/85" },
};

export function skyTextClass(time: TimeOfDay, kind: SkyTextKind): string {
  return SKY_TEXT[skyInk(time)][kind];
}

export type ChoiceTone = "default" | "secondary" | "danger" | "locked";

/** 選択肢のボタンの色(AppButton の variant)。答えたあとは、正解・選んだ不正解・ほか */
export function choiceTone({ answered, isCorrect, isSelected }: { answered: boolean; isCorrect: boolean; isSelected: boolean }): ChoiceTone {
  if (!answered) return "default";
  if (isCorrect) return "secondary";
  return isSelected ? "danger" : "locked";
}

/** 答えのあとのカードの見出し。まちがえても落ち込まないよう「おしい！」 */
export function answerHeadline(correct: boolean): string {
  return correct ? "せいかい！" : "おしい！";
}

export type StampTier = "none" | "bronze" | "silver" | "gold";

type StampBadge = { badge: "star" | "medal" | "trophy" | null; ring: string; label: string };

// 素材集(mascot-9)に銀・銅のメダルがないので、段が上がるほど豪華なバッジにする(設計書4-2)。丸のふちは金・銀・銅の色
const STAMP_BADGES: Record<StampTier, StampBadge> = {
  gold: { badge: "trophy", ring: "border-[#d4a72c]", label: "全難易度クリア" },
  silver: { badge: "medal", ring: "border-[#9aa3ab]", label: "中級までクリア" },
  bronze: { badge: "star", ring: "border-[#c47a45]", label: "初級クリア" },
  none: { badge: null, ring: "border-[#e8dfcf]", label: "未訪問" },
};

/** パスポートの国スタンプの段位から、バッジ(未訪問は null)・丸のふちの色・文言を返す */
export function stampBadge(tier: StampTier): StampBadge {
  return STAMP_BADGES[tier];
}
```

- [ ] **Step 4: テストを走らせて通ることを確かめる**

Run: `cd frontend && npx vitest run src/components/app/palette.test.ts`
Expected: PASS（8件）

- [ ] **Step 5: 全体を確かめてコミットする**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: PASS（テスト183件）

```bash
git add frontend/src/components/app/palette.ts frontend/src/components/app/palette.test.ts
git commit -m "#00156: feature:町以外の画面の見た目の決めごと(空の上の文字の色・選択肢の色・答えの見出し・スタンプのバッジ)を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: バッジの画像（mascot-9・mascot-10 の切り抜き）

**Files:**
- Modify: `tools/spru-assets/crops.json`、`tools/spru-assets/extract.py`
- 書き出し: `frontend/public/spru/badges/*.webp`（8枚）、`frontend/src/components/spru/spru-assets.ts`
- Create: `frontend/src/components/app/badge-image.tsx`

**Interfaces:**
- Produces:
  - `BADGE_IMAGES`・`type BadgeKey = "streak" | "points" | "coins" | "hp" | "star" | "medal" | "trophy" | "crown"`（`components/spru/spru-assets.ts`）
  - `BadgeImage({ badge: BadgeKey, size: number, className?, alt? })`（高さ `size` で出す。`alt` がなければ飾り＝`aria-hidden`）

- [ ] **Step 1: 切り抜く範囲を足す（`crops.json`）**

`sources` に `"m9": "mascot-9.png", "m10": "mascot-10.png"` を足し、最後（`costumes` の後）に `badges` の組を足す。範囲は素材集の上のピクセル座標（濃い部分の塊から求めたもの）。mascot-10は小さく使うので0.5倍、mascot-9は大きく使うので0.6倍にする:

```json
  "badges": [
    { "key": "streak", "source": "m10", "box": [88, 260, 260, 456], "scale": 0.5 },
    { "key": "points", "source": "m10", "box": [348, 264, 556, 456], "scale": 0.5 },
    { "key": "coins", "source": "m10", "box": [936, 276, 1148, 472], "scale": 0.5 },
    { "key": "hp", "source": "m10", "box": [1212, 24, 1476, 244], "scale": 0.5 },
    { "key": "star", "source": "m9", "box": [336, 20, 580, 260], "scale": 0.6 },
    { "key": "medal", "source": "m9", "box": [48, 32, 284, 272], "scale": 0.6 },
    { "key": "trophy", "source": "m9", "box": [644, 16, 864, 284], "scale": 0.6 },
    { "key": "crown", "source": "m9", "box": [1244, 556, 1492, 788], "scale": 0.6 }
  ]
```

- [ ] **Step 2: 書き出しに badges の組を足す（`extract.py`）**

- 先頭の説明の「出力:」の行の最後に `、バッジ badges/` を足す
- `write_ts` の引数に `badges: dict,` を足し（`costumes: dict,` の次）、`COSTUME_IMAGES` の後に次を足す:

```python
export const BADGE_IMAGES = {{
{entries(badges)}
}} as const satisfies Record<string, SpruImage>;
```

- 型の一覧の `export type CostumeKey = keyof typeof COSTUME_IMAGES;` の次に `export type BadgeKey = keyof typeof BADGE_IMAGES;` を足す
- `main` の `for group in ("bloom", "garden", "companions", "outing", "costumes"):` に `"badges"` を足し、`write_ts(...)` に `parts["badges"]`（`parts["costumes"]` の次）を渡し、最後の表示に `・バッジ {len(parts['badges'])}` を足す

- [ ] **Step 3: 書き出す**

Run: `python3 tools/spru-assets/extract.py ../../company/mascot/assets && ls frontend/public/spru/badges && git status --short frontend/public/spru frontend/src/components/spru`
Expected: `badges/` に8枚（`coins.webp`・`crown.webp`・`hp.webp`・`medal.webp`・`points.webp`・`star.webp`・`streak.webp`・`trophy.webp`）。今までの画像は変わらない（`git status` に出るのは `badges/` と `spru-assets.ts` だけ。今までの画像が変わって出たら、書き出しが変わった原因を調べる）

- [ ] **Step 4: バッジの部品（`badge-image.tsx`）**

```tsx
import Image from "next/image";

import { BADGE_IMAGES, type BadgeKey } from "@/components/spru/spru-assets";

/** バッジの画像(設計書4-2)。小さい所(20〜24px)は mascot-10、大きい所(40〜72px)は mascot-9 のキーを使う。alt がなければ飾り */
export function BadgeImage({ badge, size, className, alt }: { badge: BadgeKey; size: number; className?: string; alt?: string }) {
  const asset = BADGE_IMAGES[badge];
  return (
    <Image
      src={asset.src}
      alt={alt ?? ""}
      width={Math.round((asset.width * size) / asset.height)}
      height={size}
      aria-hidden={alt ? undefined : true}
      className={`shrink-0 ${className ?? ""}`}
      style={{ height: size, width: "auto" }}
    />
  );
}
```

- [ ] **Step 5: 型・lint・テストを走らせ、見た目を確かめる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: PASS（テスト183件）

書き出したバッジを `Read` で開き、光のふちが落ちていて、形が欠けていないことを見る（トロフィーの横のきらきらは離れているので落ちてよい）。

- [ ] **Step 6: コミットする**

```bash
git add tools/spru-assets/crops.json tools/spru-assets/extract.py frontend/public/spru/badges frontend/src/components/spru/spru-assets.ts frontend/src/components/app/badge-image.tsx
git commit -m "#00157: feature:Ownerが用意したバッジの素材集(mascot-9・mascot-10)から、炎・葉・宝箱・ハート・星・金メダル・トロフィー・王冠の8つを切り抜いて使えるようにする

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 共通部品（空の背景・カード・ボタン・ヘッダー・戻るリンク・ステージの道）

**Files:**
- Create: `frontend/src/components/app/sky-page.tsx`、`frontend/src/components/app/panel.tsx`、`frontend/src/components/app/classic-button.tsx`
- Modify: `frontend/src/components/app/button.tsx`、`app-header.tsx`、`back-link.tsx`、`stage-path.tsx`、`hp-gauge.tsx`、`learn-points-badge.tsx`、`points-badge.tsx`、`frontend/src/components/world/world-hud.tsx`、`components/app/guest-landing.tsx`、`app/world/[code]/quiz-preview.tsx`、`app/owner/login/page.tsx`、`app/admin/login/page.tsx`

**Interfaces:**
- Consumes: Task 1 の `skyTextClass`、Task 2 の `BadgeImage`、町の `TIME_THEME`（`components/world/ambience.tsx`）・`getTimeOfDay`（`components/world/time-of-day.ts`）
- Produces:
  - `SkyPage({ children, className? })`、`useSkyTime(): TimeOfDay`
  - `SkyTitle({ children, className?, as?: "h1" | "h2" | "p" })`
  - `SkyText({ children, className?, muted?: boolean, as?: "p" | "span" | "div" })`
  - `Panel({ children, className?, as?: "div" | "section", ...aria })`（`aria-labelledby` を渡せる）
  - `AppButton` の variant（名前は今のまま）が新配色
  - `components/app/classic-button.tsx` の `Button`（今の見た目）

- [ ] **Step 1: 空の背景（`sky-page.tsx`）**

```tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { TIME_THEME } from "@/components/world/ambience";
import { getTimeOfDay, type TimeOfDay } from "@/components/world/time-of-day";

import { skyTextClass } from "./palette";

const SkyTimeContext = createContext<TimeOfDay>("day");

/** SkyPage の中で、今の時間帯を知る(空の上の文字の色に使う) */
export function useSkyTime(): TimeOfDay {
  return useContext(SkyTimeContext);
}

/**
 * 町以外の画面のいちばん外側。町と同じ時間帯の空を背景にする(設計書4章)。
 * サーバーとブラウザで時刻がずれて表示が崩れないよう、最初は昼の色で描き、開いたあとに端末の時計で決める
 */
export function SkyPage({ children, className }: { children: ReactNode; className?: string }) {
  const [time, setTime] = useState<TimeOfDay>("day");

  useEffect(() => {
    const update = () => setTime(getTimeOfDay(new Date()));
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  return (
    <SkyTimeContext.Provider value={time}>
      <div
        className={`relative flex min-h-screen flex-col overflow-hidden transition-[background] duration-700 ${className ?? ""}`}
        style={{ background: TIME_THEME[time].background }}
      >
        {children}
      </div>
    </SkyTimeContext.Provider>
  );
}

/** 空の上に直接置く見出し。朝・昼・夕方はこげ茶、夜は白 */
export function SkyTitle({
  children,
  className,
  as: Tag = "h1",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "p";
}) {
  const time = useSkyTime();
  return <Tag className={`font-black ${skyTextClass(time, "title")} ${className ?? ""}`}>{children}</Tag>;
}

/** 空の上に直接置く文字(補足・「読み込み中...」など)。muted は少し薄い色 */
export function SkyText({
  children,
  className,
  muted = false,
  as: Tag = "p",
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
  as?: "p" | "span" | "div";
}) {
  const time = useSkyTime();
  return <Tag className={`font-bold ${skyTextClass(time, muted ? "muted" : "text")} ${className ?? ""}`}>{children}</Tag>;
}
```

- [ ] **Step 2: カード（`panel.tsx`）**

```tsx
import type { ReactNode } from "react";

/** クリーム色のカード(設計書3章)。押せるカードには使わず、白いボタンの形にする */
export function Panel({
  children,
  className,
  as: Tag = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
  "aria-labelledby"?: string;
  "aria-label"?: string;
}) {
  return (
    <Tag
      className={`rounded-3xl bg-[#fffaf0] p-4 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)] ${className ?? ""}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
```

- [ ] **Step 3: 今のボタンを残し、対象外の4ファイルを付け替える**

`frontend/src/components/app/button.tsx` の中身を、そのまま `frontend/src/components/app/classic-button.tsx` に写す（関数名 `Button`・`ButtonProps` もそのまま）。先頭に次のコメントを足す:

```ts
// 未ログインのLP・紹介ページ・Owner/管理のログインで使う、前の配色のボタン(docs/design/2026-09-28-ui-palette-design.md 7章。対象外の画面の見た目を変えないため)
```

次の4ファイルの `import { Button as AppButton } from "@/components/app/button";` を `import { Button as AppButton } from "@/components/app/classic-button";` にする:
`frontend/src/components/app/guest-landing.tsx`、`frontend/src/app/world/[code]/quiz-preview.tsx`、`frontend/src/app/owner/login/page.tsx`、`frontend/src/app/admin/login/page.tsx`

- [ ] **Step 4: ボタンを新配色にする（`button.tsx`）**

`buttonVariants` を次にする（`ButtonProps`・`Button` は今のまま）:

```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-black transition-colors disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b6fa3] focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-2 border-b-4 border-[#e8dfcf] bg-white text-[#3b3226] hover:bg-[#fffaf0] active:border-b-2",
        primary:
          "border-b-4 border-[#285a19] bg-[#3b7f26] text-white hover:bg-[#438b2d] active:border-b-0",
        secondary:
          "border-b-4 border-[#3b7f26] bg-[#5bb33e] text-[#3b3226] hover:bg-[#66bd49] active:border-b-0",
        warning:
          "border-b-4 border-[#c98f12] bg-[#f2b632] text-[#3b3226] hover:bg-[#f5c04d] active:border-b-0",
        danger:
          "border-b-4 border-[#c9573b] bg-[#f28b6d] text-[#3b3226] hover:bg-[#f49a7f] active:border-b-0",
        ghost:
          "border-0 border-transparent bg-transparent text-[#3b3226] hover:bg-[#f5efe1]",
        locked:
          "border-b-4 border-[#dccfb4] bg-[#efe5cf] text-[#8a7a5a] hover:bg-[#efe5cf]",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
```

- [ ] **Step 5: ヘッダーとバッジ**

`app-header.tsx`:
- 先頭の `import` に `import { BadgeImage } from "@/components/app/badge-image";` を足す
- `<header>` の `className` を `"relative z-30 flex h-14 shrink-0 items-center justify-between px-3 sm:px-6"` にする
- ロゴの `Link` の `className` を `"flex shrink-0 items-center gap-2 rounded-full bg-[#fffaf0] py-1 pr-1.5 pl-1.5 text-base font-black text-[#2e6b1c] shadow-[0_2px_6px_rgba(59,50,38,0.15)] sm:pr-3"` にする
- 連続プレイの札を次にする:

```tsx
            <span
              className="flex items-center gap-1 rounded-full bg-[#fffaf0] px-2 py-1 text-xs font-black whitespace-nowrap text-[#c2402c] shadow-[0_2px_6px_rgba(59,50,38,0.15)]"
              title="連続プレイ日数"
            >
              <BadgeImage badge="streak" size={18} />
              {profile.current_streak}日
            </span>
```

- アバターの `button` の `className` を `"rounded-full outline-none ring-[#2b6fa3] focus-visible:ring-2"`、`Avatar` を `className="border-2 border-[#fffaf0] shadow-[0_2px_6px_rgba(59,50,38,0.15)]"`、`AvatarFallback` を `className="bg-[#2b6fa3] font-black text-white"` にする

`learn-points-badge.tsx`・`points-badge.tsx`・`hp-gauge.tsx` は、`lucide-react` の `import`（`Sprout`・`Coins`・`Heart`）を `import { BadgeImage } from "@/components/app/badge-image";` に替える。

`learn-points-badge.tsx` の `div` と中身:

```tsx
    <div
      className={`flex items-center gap-1 rounded-full bg-[#fffaf0] px-2.5 py-1 shadow-[0_2px_6px_rgba(59,50,38,0.15)] ${className ?? ""}`}
      title="学習ポイント"
    >
      <BadgeImage badge="points" size={20} />
      <span className="text-xs font-black text-[#2e6b1c]">
        {value.toLocaleString()}
        <span className="ml-0.5 text-[10px]">pt</span>
      </span>
    </div>
```

`points-badge.tsx` の `div` と中身:

```tsx
    <div
      className={`flex items-center gap-1.5 rounded-full bg-[#fffaf0] px-3 py-1 shadow-[0_2px_6px_rgba(59,50,38,0.15)] ${className ?? ""}`}
    >
      <BadgeImage badge="coins" size={20} />
      <span className="text-xs font-black text-[#3b3226]">
        {value.toLocaleString()}
      </span>
    </div>
```

`hp-gauge.tsx` の `div` と中身:

```tsx
    <div
      className={`flex items-center gap-1.5 rounded-full bg-[#fffaf0] py-1 pr-3 pl-1.5 shadow-[0_2px_6px_rgba(59,50,38,0.15)] ${className ?? ""}`}
    >
      <BadgeImage badge="hp" size={20} />
      {/* スマホ幅ではヘッダーに収まらないため、バーを省いてハートと数値だけにする */}
      <div className="hidden h-2.5 w-24 overflow-hidden rounded-full bg-[#efe5cf] sm:block">
        <div
          className="h-full rounded-full bg-[#e5533f] transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-black text-[#3b3226]">
        {value}/{max}
      </span>
    </div>
```

`components/world/world-hud.tsx`（町の上の段）は色・形を変えず、札の絵だけヘッダーとそろえる: `<Heart className="h-4 w-4 fill-[#e5533f] text-[#e5533f]" aria-hidden />` を `<BadgeImage badge="hp" size={18} />` に、`<Sprout className="h-4 w-4" aria-hidden />` を `<BadgeImage badge="points" size={18} />` にし、使わなくなった `lucide-react` の `import`（`Heart`・`Sprout`）を消して `import { BadgeImage } from "@/components/app/badge-image";` を足す。

- [ ] **Step 6: 戻るリンク（`back-link.tsx`）**

`Link` の `className` を次にする:

```tsx
      className={`inline-flex items-center gap-1 rounded-full bg-[#fffaf0] px-3 py-1.5 text-sm font-black text-[#2b5d7a] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white ${className ?? ""}`}
```

- [ ] **Step 7: ステージの道（`stage-path.tsx`）**

- 先頭に `import { Check, Crown, Lock, Star } from "lucide-react";` を足す
- `let icon = "⭐"; ...` の4行を次にする:

```tsx
        let icon = <Star aria-hidden className="h-6 w-6 fill-current" />;
        if (stage.locked) icon = <Lock aria-hidden className="h-6 w-6" />;
        else if (stage.cleared) icon = <Check aria-hidden className="h-6 w-6" strokeWidth={3} />;
        else if (stage.is_boss) icon = <Crown aria-hidden className="h-6 w-6 fill-current" />;
```

- 色を次にする:

```tsx
        let colorClasses = "border-[#c98f12] bg-[#f2b632] text-[#3b3226]";
        if (isSelected) {
          colorClasses = "border-[#1d4f76] bg-[#2b6fa3] text-white ring-4 ring-[#9fd8ff]";
        } else if (stage.locked) {
          colorClasses = "border-[#dccfb4] bg-[#efe5cf] text-[#8a7a5a]";
        } else if (stage.cleared) {
          colorClasses = "border-[#3b7f26] bg-[#5bb33e] text-[#3b3226]";
        } else if (stage.is_boss) {
          colorClasses = "border-[#b04a31] bg-[#e5664a] text-white";
        }
```

- 「START」の吹き出しの `className` を `"absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce rounded-full border-2 border-[#2b6fa3] bg-[#fffaf0] px-2 py-0.5 text-[10px] font-black whitespace-nowrap text-[#2b6fa3] shadow"` にする
- アイコンの `<span aria-hidden>{icon}</span>` は `<span aria-hidden className="flex">{icon}</span>` にする

- [ ] **Step 8: 型・lint・テストを走らせる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: PASS（テスト183件）

- [ ] **Step 9: コミットする**

```bash
git add frontend/src/components/app/sky-page.tsx frontend/src/components/app/panel.tsx frontend/src/components/app/classic-button.tsx frontend/src/components/app/button.tsx frontend/src/components/app/app-header.tsx frontend/src/components/app/back-link.tsx frontend/src/components/app/stage-path.tsx frontend/src/components/app/hp-gauge.tsx frontend/src/components/app/learn-points-badge.tsx frontend/src/components/app/points-badge.tsx frontend/src/components/world/world-hud.tsx frontend/src/components/app/guest-landing.tsx "frontend/src/app/world/[code]/quiz-preview.tsx" frontend/src/app/owner/login/page.tsx frontend/src/app/admin/login/page.tsx
git commit -m "#00158: feature:町以外の画面の共通部品(時間帯の空の背景・カード・新配色のボタン・バッジの札のヘッダー・戻るリンク・ステージの道)を追加し、対象外の画面は前のボタンのままにする

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 学ぶ流れ（学ぶ・国の詳しい画面・出発前の画面・地域の画面・世界地図）

**Files:**
- Modify: `frontend/src/app/learn/page.tsx`、`frontend/src/app/travel/[countryId]/page.tsx`、`frontend/src/app/travel/[countryId]/start/page.tsx`、`frontend/src/app/travel/[countryId]/region/[regionId]/page.tsx`、`frontend/src/components/app/world-map.tsx`、`frontend/src/app/globals.css`

**Interfaces:**
- Consumes: Task 3 の `SkyPage`・`SkyTitle`・`SkyText`・`Panel`・新配色の `AppButton`・`BackLink`・`StagePath`

- [ ] **Step 1: 学ぶ（`app/learn/page.tsx`）**

- `SceneBackground` の `import` を消し、`import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";` と `import { Flag, Map as MapIcon } from "lucide-react";` を足す
- 「読み込み中...」（`status === "checking"`）は「よく使う置き換え」の画面いっぱいの形にする
- 外側を `<SkyPage>` にする（`<SceneBackground />` を消す）
- 見出しを次にする:

```tsx
        <div className="text-center">
          <SkyTitle className="text-3xl">
            どこから<Furigana text="冒険" reading="ぼうけん" />する？
          </SkyTitle>
          <SkyText muted className="mt-1 text-sm">
            好きな国を選んでね
          </SkyText>
        </div>
```

- 「フラッグ／地図」の切り替えボタン2つの `className` の色を、選ばれた＝`bg-[#3b7f26] text-white`、ほか＝`bg-[#fffaf0] text-[#3b3226] hover:bg-white` にし、中身の `🚩 フラッグ` を `<Flag aria-hidden className="mr-1 inline h-3.5 w-3.5" />フラッグ`、`🗺 地図` を `<MapIcon aria-hidden className="mr-1 inline h-3.5 w-3.5" />地図` にする
- 「読み込み中...」「まだ国が登録されていません。お楽しみに。」の `p` を `<SkyText muted className="text-sm">` にする
- モバイルの国のボタン（`AppButton variant="default"`）はそのまま（新配色になる）。国旗の `span` の `border-white/40` を `border-[#e8dfcf]` にする
- 「あなたの国?」の札の `bg-amber-400 ... text-amber-950` を `bg-[#f2b632] ... text-[#3b3226]` にする（2か所）
- デスクトップの円の並びの後ろのぼかし `bg-white/10` はそのまま
- 地図の下の案内「色が付いている国をクリックしてね」の `p` を `<SkyText muted className="mt-2 text-center text-xs">` にする
- ミニアプリの引き出しタブ（右端の `button`）の `className` を `"fixed top-1/2 right-0 z-30 -translate-y-1/2 rounded-l-xl bg-[#fffaf0] px-2 py-3 text-[#3b3226] shadow-[0_4px_14px_rgba(59,50,38,0.2)] hover:bg-white"` にする
- 引き出しの中の黒い背景 `bg-slate-900` を `bg-[#fffaf0]` に、見出し `text-white` を `text-[#3b3226]` に、閉じるボタン `text-white/70 hover:bg-white/10 hover:text-white` を `text-[#6b5d45] hover:bg-[#f5efe1]` に、「読み込み中...」の `text-white/70` を `text-[#6b5d45]` にする。暗幕 `bg-black/50` は `bg-[rgba(38,48,28,0.38)]` にする

- [ ] **Step 2: 世界地図の色（`world-map.tsx`・`globals.css`）**

- `world-map.tsx` の読み込み中の `text-white/70` を `text-[#6b5d45]` に、`[&_path[id]]:stroke-white/40` を `[&_path[id]]:stroke-[#fffaf0]` にする。地図をクリーム色のカードに載せるため、`learn/page.tsx` の `<WorldMap ... />` を `<Panel className="p-3">` で包む（`import { Panel } from "@/components/app/panel";`）
- `globals.css` の世界地図の色を次にする: `.world-map-playable` の `fill: #fbbf24` → `fill: #5bb33e`、ホバー・フォーカスの `fill: #fde68a` → `fill: #7cc26a`、`.world-map-suggested` の `fill: #f59e0b` → `fill: #3b7f26`

- [ ] **Step 3: 国の詳しい画面（`app/travel/[countryId]/page.tsx`）**

- `SceneBackground` の `import` を消し、`import { SkyPage, SkyText } from "@/components/app/sky-page";`・`import { Panel } from "@/components/app/panel";`・`import { Lock, Trophy } from "lucide-react";` を足す
- 「読み込み中...」と「この国は見つかりませんでした。」の画面は、「よく使う置き換え」の画面いっぱいの形（見つからないときの `Link` は `text-[#2b5d7a] underline`）
- 外側を `<SkyPage>` にする
- `<BackLink />` の下の国旗〜達成率を `Panel` にまとめる:

```tsx
          <Panel className="mt-3 flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md border border-[#e8dfcf] shadow">
                <Image src={`/flag/${country.code}.svg`} alt={country.name} fill className="object-cover" />
              </div>
              <div>
                <h1 className="text-3xl font-black">
                  {country.mood_emoji ? `${country.mood_emoji} ` : ""}
                  {country.name}
                </h1>
                {country.intro_message && <p className="mt-1 text-sm font-bold text-[#6b5d45]">{country.intro_message}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-[#efe5cf]">
                <div className="h-full rounded-full bg-[#5bb33e]" style={{ width: `${percent}%` }} />
              </div>
              <span className="text-xs font-bold whitespace-nowrap text-[#6b5d45]">
                達成率 {percent}%({country.achievement.cleared}/{country.achievement.total})
              </span>
            </div>
          </Panel>
```

- 「〇〇について学ぶ／英語を学ぶ」の2つのボタンの色を、選ばれた＝`bg-[#3b7f26] text-white`、ほか＝`bg-[#fffaf0] text-[#3b3226] hover:bg-white` にする（`shadow` はそのまま）
- 「まだこの国のクイズがありません。お楽しみに。」を `<SkyText muted className="text-sm">` に、「地域を選ぶ」の `h2` を `<SkyText as="div" className="text-sm">` で包んだ見出しにする（`<h2><SkyText as="span" className="text-sm">地域を選ぶ</SkyText></h2>`）
- 地域のカードの `div` を `"flex flex-col gap-2 rounded-2xl border-2 border-b-4 border-[#e8dfcf] bg-white p-4 text-[#3b3226] hover:bg-[#fffaf0]"` に、中の `text-white` を `text-[#3b3226]`、`text-white/80` を `text-[#6b5d45]`、バーを「よく使う置き換え」の達成率の形にする
- 難易度のタブの色を「よく使う置き換え」のタブの形にする。`{group.locked && "🔒"}` を `{group.locked && <Lock aria-hidden className="h-3.5 w-3.5" />}`、`{allCleared && "🏆"}` を `{allCleared && <Trophy aria-hidden className="h-3.5 w-3.5 text-[#c98f12]" />}` にする
- 「ひとつ前の難易度をクリアすると挑戦できます。」の `p` を `<SkyText muted className="text-xs">` にする

- [ ] **Step 4: 出発前の画面（`app/travel/[countryId]/start/page.tsx`）**

- `SceneBackground` の `import` を消し、`import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";` を足す
- 読み込み中・見つからないときは「よく使う置き換え」の形
- 外側を `<SkyPage>` にする。国旗の枠の `border-white/40` を `border-[#fffaf0]` にする
- 国名の `h1` を `<SkyTitle className="text-3xl">`、紹介文と「ゲームを開始しますか？」を `<SkyText muted className="text-sm">` にする
- 「← 別の国を選ぶ」の `Link` を「よく使う置き換え」の空の上のリンクの形（`self-center` を足す）にする
- 「英語を学ぶ」のボタンは `variant="secondary"` のまま（明るい緑・こげ茶の文字になる）

- [ ] **Step 5: 地域の画面（`app/travel/[countryId]/region/[regionId]/page.tsx`）**

- `SceneBackground` の `import` を消し、`import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";`・`import { Lock } from "lucide-react";` を足す
- 読み込み中・見つからないときは「よく使う置き換え」の形
- 外側を `<SkyPage>` にする
- パンくずの `p` を `<SkyText muted as="div" className="flex flex-wrap items-center gap-1 text-sm">` にする（中の `Link` の `hover:underline` はそのまま）
- 地域名の `h1` を `<SkyTitle className="mt-2 text-3xl">`、達成率の文字を `<SkyText muted as="span" className="text-xs whitespace-nowrap">`、バーを「よく使う置き換え」の達成率の形にする
- 「まだこの地域のクイズがありません。お楽しみに。」を `<SkyText muted className="text-sm">` にする
- 子の地域のカードを「よく使う置き換え」の押せるカードの形にする
- グループの見出しの `h2` を `<h2><SkyText as="span" className="text-sm">{group.category.name} ・ {group.difficulty}</SkyText></h2>` にする
- クリアの印 `bg-emerald-500 ... text-white` を `bg-[#3b7f26] ... text-white` にし、`{stage.locked ? "🔒" : stage.stage_number}` を `{stage.locked ? <Lock aria-hidden className="h-4 w-4" /> : stage.stage_number}` にする（ロックのボタンに `aria-label={`ステージ${stage.stage_number}(ロック中)`}` を足す）

- [ ] **Step 6: 型・lint・テストを走らせる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: PASS（テスト183件）

- [ ] **Step 7: 画面で確かめる（390px）**

開発サーバーで `/learn`・`/travel/7/start`・`/travel/7` を開き、空の背景・クリーム色のカード・緑のタブ・ステージの道が出ること、白い文字が残っていないことを見る。スクリーンショットは確認後に消す。

- [ ] **Step 8: コミットする**

```bash
git add frontend/src/app/learn/page.tsx "frontend/src/app/travel/[countryId]/page.tsx" "frontend/src/app/travel/[countryId]/start/page.tsx" "frontend/src/app/travel/[countryId]/region/[regionId]/page.tsx" frontend/src/components/app/world-map.tsx frontend/src/app/globals.css
git commit -m "#00159: style:学ぶ・国の画面(詳しい画面・出発前・地域)と世界地図を明るい新配色にそろえる

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: クイズ（ステージ・復習・問題の形・答えのあとのカード・結果）

**Files:**
- Modify: `frontend/src/app/quiz/[stageId]/page.tsx`、`frontend/src/app/review/page.tsx`、`frontend/src/components/quiz/quiz-session.tsx`、`frontend/src/components/app/matching-question.tsx`、`frontend/src/components/app/ordering-question.tsx`、`frontend/src/components/app/sorting-question.tsx`

**Interfaces:**
- Consumes: Task 1 の `choiceTone`・`answerHeadline`、Task 2 の `BadgeImage`、Task 3 の `SkyPage`・`SkyText`・新配色の `AppButton`

- [ ] **Step 1: ステージ・復習の画面の周り**

`app/quiz/[stageId]/page.tsx`:
- `SceneBackground` の `import` を消し、`import { SkyPage, SkyText } from "@/components/app/sky-page";`・`import { BadgeImage } from "@/components/app/badge-image";` を足す
- 「読み込み中...」と「このステージは見つかりませんでした。」の画面の外側を `<SkyPage>` にし、文字を `<SkyText muted className="text-sm">` に、「ホームに戻る」の `Link` を「よく使う置き換え」の空の上のリンクの形にする
- 称号の知らせを次にする:

```tsx
      <p className="flex items-center justify-center gap-2 text-sm font-black text-[#7a5a0e]">
        <BadgeImage badge="crown" size={44} />
        称号「{data.title}」を獲得しました！
      </p>
```

- BOSSの札の `bg-rose-500 ... text-white` を `bg-[#e5664a] ... text-white` にする

`app/review/page.tsx`:
- `SceneBackground` の `import` を消し、`import { SkyPage, SkyText } from "@/components/app/sky-page";` を足す
- 「読み込み中...」の画面の外側を `<SkyPage>` にし、文字を `<SkyText muted className="text-sm">` にする
- 「closed」の画面の外側を `<SkyPage>` にし、カードの `rounded-2xl bg-white/90 p-8 shadow-xl backdrop-blur-sm` を「よく使う置き換え」の白い半透明のカードの形（`p-8`）にする

- [ ] **Step 2: 問題の形（並べ替え・仕分け・マッチング）**

3ファイル共通で、`cn(...)` の中の色を次にする:
- ふち `border-slate-200` → `border-[#e8dfcf]`
- 選んでいるもの `border-sky-400 bg-sky-50` → `border-[#2b6fa3] bg-[#e6f1f9]`
- 正解（マッチング）`border-green-500 bg-green-50` → `border-[#3b7f26] bg-[#e5f4dc]`
- 不正解（マッチング）`border-rose-500 bg-rose-50` → `border-[#c9573b] bg-[#fde6de]`
- 文字 `text-slate-600`・`text-slate-700` → `text-[#6b5d45]`・`text-[#3b3226]`
- 画像の枠 `border-border` → `border-[#e8dfcf]`

`ordering-question.tsx` の番号の丸を、選んでいる＝`bg-[#2b6fa3] text-white`、ほか＝`bg-[#f5efe1] text-[#8a7a5a]` にする。

- [ ] **Step 3: 問題のカードと選択肢（`quiz-session.tsx`）**

- `SceneBackground` の `import` を消し、`import { SkyPage } from "@/components/app/sky-page";`・`import { answerHeadline, choiceTone } from "@/components/app/palette";`・`import { BadgeImage } from "@/components/app/badge-image";` を足す
- HPがなくなったとき・結果・問題の3つの画面の外側を `<SkyPage>` にする
- 3つの画面のカード `rounded-2xl bg-white/90 p-8 shadow-xl backdrop-blur-sm`（HP・結果）と `rounded-2xl bg-white/90 p-6 shadow-xl backdrop-blur-sm`（問題）を「よく使う置き換え」の白い半透明のカードの形にする（`p-8`・`p-6` はそのまま）
- カードの中の `text-muted-foreground` を `text-[#6b5d45]` に、`text-primary` を `text-[#2e6b1c]` に、見出しの `font-bold` を `font-black` にする
- 問題の画像・国旗の枠と `ChoiceLabel` の国旗の枠の `border-border` を `border-[#e8dfcf]` にする
- 選択肢の色の決め方を `choiceTone` にする:

```tsx
              {question.choices.map((choice) => {
                const variant = choiceTone({
                  answered,
                  isCorrect: choice.id === correctChoiceId,
                  isSelected: choice.id === selectedChoiceId,
                });

                return (
```

（その下の `AppButton` と、✓・✕を添える2行は今のまま）

- [ ] **Step 4: 答えのあとのカード（`quiz-session.tsx`）**

`{answered && ( <div className={`fixed inset-0 z-50 ...`}> ... </div> )}` の全体を次にする（中で使う変数・関数は今のもの）:

```tsx
      {/* 正解・不正解のカード(設計書2章の案A)。空は明るいまま、クリーム色のカードで知らせる */}
      {answered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(143,212,233,0.55)] px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="answer-headline"
            className="animate-pop-in flex max-h-[90vh] w-full max-w-[360px] flex-col items-center gap-3 overflow-y-auto rounded-3xl bg-[#fffaf0] px-5 pt-5 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.2)]"
          >
            <div className="flex items-end gap-3">
              <SpruFigure
                key={currentIndex}
                image={pickAnswerImage({
                  correct: lastCorrect,
                  combo: combo?.combo ?? 0,
                  comboBonus: combo?.combo_milestone_bonus_coin ?? 0,
                })}
                standHeight={100}
                bloom={bloomOf(spruGrowth)}
                className="animate-pop-in"
              />
              {partner && (
                <CompanionImage
                  key={`partner-${currentIndex}`}
                  companionKey={partner.key}
                  standHeight={100}
                  className="animate-pop-in"
                />
              )}
            </div>
            <p id="answer-headline" className={`text-4xl font-black ${lastCorrect ? "text-[#2e6b1c]" : "text-[#b4472c]"}`}>
              {answerHeadline(lastCorrect)}
            </p>
            {lastCorrect ? (
              <>
                <p className="flex gap-4 text-base font-black text-[#2e6b1c]">
                  {typeof lastDelta?.xp === "number" && <span>+{lastDelta.xp}XP</span>}
                  {typeof lastDelta?.coin === "number" && <span>+{lastDelta.coin}Coin</span>}
                  {typeof lastDelta?.point === "number" && <span>+{lastDelta.point}pt</span>}
                </p>
                {combo && combo.combo >= 2 && (
                  <p className="flex items-center gap-1 text-base font-black text-[#c2402c]">
                    <BadgeImage badge="streak" size={22} />
                    {combo.combo}コンボ！
                  </p>
                )}
                {combo && combo.combo_milestone_bonus_coin > 0 && (
                  <p className="text-sm font-bold text-[#7a5a0e]">ボーナス +{combo.combo_milestone_bonus_coin}Coin</p>
                )}
                {streak?.streak_extended_today && (
                  <p className="flex items-center gap-1 text-sm font-bold text-[#c2402c]">
                    <BadgeImage badge="streak" size={20} />
                    {streak.streak}日連続プレイ！
                    {streak.streak_milestone_bonus_coin > 0 && ` ボーナス+${streak.streak_milestone_bonus_coin}Coin`}
                  </p>
                )}
                {partnerUp && (
                  <div className="flex w-full flex-col items-center gap-1 rounded-2xl bg-[#fdeef2] px-4 py-2">
                    <p className="text-sm font-black text-[#b03a64]">
                      <AutoFurigana text={`${partnerUp.name}とのなかよし度が上がった！`} />
                    </p>
                    <p className="text-lg tracking-widest text-[#d9467a]" aria-label={`ハート${partnerUp.hearts}つ`}>
                      {heartsText(partnerUp.hearts)}
                    </p>
                    {partnerUp.new_line && (
                      <p className="text-sm font-bold">
                        <AutoFurigana text={`「${partnerUp.new_line}」`} />
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-base font-bold text-[#6b5d45]">
                {typeof lastDelta?.hp === "number" && (
                  <span className="flex items-center gap-1 text-[#c2402c]">
                    <BadgeImage badge="hp" size={22} />
                    {lastDelta.hp}
                  </span>
                )}
                {correctChoiceLabel && (
                  <span className="flex items-center gap-1">
                    こたえは「<ChoiceLabel label={correctChoiceLabel} />」
                  </span>
                )}
              </div>
            )}

            <AppButton variant="primary" size="lg" onClick={handleNext} className="mt-1 w-full">
              {isLastQuestion ? "結果を見る ▶" : "次へ ▶"}
            </AppButton>
          </div>
        </div>
      )}
```

（`heartsText` の読み込み・`AutoFurigana` の読み込みは今のまま使う）

- [ ] **Step 4b: 結果の画面の全問正解のトロフィー（`quiz-session.tsx`）**

結果の画面の、スプルと相棒を並べている `div` の中（`CompanionImage` の次）に足す（練習のやり直しでは出さない）:

```tsx
              {!practice && score === round.length && <BadgeImage badge="trophy" size={72} alt="全問正解のトロフィー" />}
```

- [ ] **Step 5: 型・lint・テストを走らせる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: PASS（テスト183件）

- [ ] **Step 6: 画面で確かめる（390px）**

開発サーバーでインドネシア初級のステージを開き、問題のカード・選択肢、正解のカード（せいかい！）・不正解のカード（おしい！こたえは「〇〇」）、結果のカードを見る。確認のために記録（クリア・ポイント・HP）が変わったら元に戻す。スクリーンショットは確認後に消す。

- [ ] **Step 7: コミットする**

```bash
git add "frontend/src/app/quiz/[stageId]/page.tsx" frontend/src/app/review/page.tsx frontend/src/components/quiz/quiz-session.tsx frontend/src/components/app/matching-question.tsx frontend/src/components/app/ordering-question.tsx frontend/src/components/app/sorting-question.tsx
git commit -m "#00160: style:クイズ(問題のカード・選択肢・並べ替えなどの形・結果)を新配色にし、答えのあとは明るいカードで「せいかい！」「おしい！」と知らせ、炎・ハート・トロフィー・王冠のバッジを出す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: ミニアプリとパスポート

**Files:**
- Modify: `frontend/src/app/play/[id]/page.tsx`、`frontend/src/app/passport/page.tsx`

**Interfaces:**
- Consumes: Task 1 の `stampBadge`、Task 2 の `BadgeImage`、Task 3 の `SkyPage`・`SkyTitle`・`SkyText`・`Panel`

- [ ] **Step 1: ミニアプリ（`app/play/[id]/page.tsx`）**

- `SceneBackground` の `import` を消し、`import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";`・`import { Lock, Swords, Trophy } from "lucide-react";` を足す
- 読み込み中は「よく使う置き換え」の画面いっぱいの形
- 外側を `<SkyPage>` にする。見出しの `h1` を `<SkyTitle className="mt-2 text-3xl">`、「読み込み中...」「まだクイズがありません。お楽しみに。」を `<SkyText muted className="text-sm">` にする
- 難易度のボタンの `{progressionLocked && "🔒"}` を `{progressionLocked && <Lock aria-hidden className="h-4 w-4" />}` に、クリアの札を次にする:

```tsx
                        <span className="flex items-center gap-1 rounded-full bg-[#f2b632] px-2 py-0.5 text-[10px] font-black text-[#3b3226]">
                          <Trophy aria-hidden className="h-3 w-3" />
                          クリア
                        </span>
```

- ステージ開始の画面（`stageIntro`）を次にする:

```tsx
      {stageIntro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(143,212,233,0.7)] px-4">
          <div className="flex flex-col items-center gap-2 rounded-3xl bg-[#fffaf0] px-8 py-6 text-center shadow-[0_16px_36px_rgba(0,0,0,0.2)]">
            {stageIntro.isBoss ? (
              <p className="animate-stage-intro flex items-center gap-2 text-4xl font-black text-[#b4472c]">
                <Swords aria-hidden className="h-8 w-8" />
                BOSS STAGE
                <Swords aria-hidden className="h-8 w-8" />
              </p>
            ) : (
              <p className="animate-stage-intro text-5xl font-black text-[#2b6fa3]">STAGE {stageIntro.stageNumber}</p>
            )}
            <p className="animate-stage-intro-subtitle text-base font-bold text-[#6b5d45]">
              {category?.name} ・ {stageIntro.difficulty}
            </p>
          </div>
        </div>
      )}
```

- [ ] **Step 2: パスポート（`app/passport/page.tsx`）**

- `SceneBackground` の `import` を消し、`import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";`・`import { stampBadge, type StampTier } from "@/components/app/palette";`・`import { BadgeImage } from "@/components/app/badge-image";`・`import { BookOpen, CircleHelp, KeyRound, Lock, PartyPopper, Plane, Trophy } from "lucide-react";` を足す
- ファイルの中の `type StampTier = ...` と `STAMP_STYLES` を消す（`StampTier` は `palette.ts` のものを使う）
- 読み込み中・失敗は「よく使う置き換え」の画面いっぱいの形
- 外側を `<SkyPage>` にする
- 見出しを次にする:

```tsx
        <div className="text-center">
          <SkyTitle className="flex items-center justify-center gap-2 text-3xl">
            <BookOpen aria-hidden className="h-7 w-7" />
            マイパスポート
          </SkyTitle>
          <SkyText muted className="mt-1 text-sm">
            旅の成果がすべて残る場所
          </SkyText>
        </div>
```

- `SummaryBadge` の `div` を `"flex flex-col items-center rounded-2xl bg-[#fffaf0] px-4 py-2 text-[#3b3226] shadow-[0_2px_6px_rgba(59,50,38,0.15)]"`、ラベルを `text-[10px] font-bold text-[#6b5d45]`、値を `text-lg font-black` にする
- パスポート帳本体の `div` を `"rounded-3xl border-4 border-[#e8dfcf] bg-[#fffaf0] p-6 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)] sm:p-8"` にする
- 見出し `h2` の `text-amber-900/80` を `text-[#6b5d45]`、説明の `text-amber-900/60` を `text-[#8a7a5a]`、区切り `border-amber-900/10`・`border-amber-900/15`・`border-amber-900/20` を `border-[#efe5cf]` にする
- スタンプのカードの `bg-white/60` を `bg-white` にする
- スタンプの丸を次にする:

```tsx
                  const stamp = stampBadge(country.stamp_tier);
                  return (
                    <div
                      key={country.code}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-[#efe5cf] bg-white p-3 text-center"
                    >
                      <div
                        className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 bg-white ${stamp.ring} ${
                          country.stamp_tier === "none" ? "grayscale" : "-rotate-6"
                        }`}
                      >
                        <div className="relative h-10 w-14 overflow-hidden rounded-sm border border-[#efe5cf]">
                          <Image src={`/flag/${country.code}.svg`} alt={country.name} fill className="object-cover" />
                        </div>
                        <span className="absolute -right-4 -bottom-3">
                          {stamp.badge ? (
                            <BadgeImage badge={stamp.badge} size={40} />
                          ) : (
                            <span className="flex rounded-full bg-white p-0.5 shadow">
                              <CircleHelp aria-hidden className="h-6 w-6 text-[#b9ad96]" />
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-sm font-black">
                        {country.mood_emoji ? `${country.mood_emoji} ` : ""}
                        {country.name}
                      </p>
                      <p className="text-[11px] font-bold text-[#8a7a5a]">{stamp.label}</p>
```

- 鍵の `{unlocked ? "🔑" : "🔒"}` を `{unlocked ? <KeyRound aria-hidden className="h-3.5 w-3.5 text-[#c98f12]" /> : <Lock aria-hidden className="h-3.5 w-3.5 text-[#b9ad96]" />}` にし、その `span` に `<span className="sr-only">{`${difficulty}${unlocked ? "解放済み" : "未解放"}`}</span>` を足す
- 「獲得した称号」の見出し `h2` を `flex items-center gap-2` にし、先頭に `<BadgeImage badge="crown" size={32} />` を足す
- 称号の札の `border-amber-400 bg-amber-100 ... text-amber-800` を `border-[#f2b632] bg-[#fff4d6] ... text-[#7a5a0e]` にし、`🏆 {title}` を `<Trophy aria-hidden className="mr-1 inline h-3.5 w-3.5" />{title}` にする
- 航空券の `border-amber-900/30 bg-white/70` を `border-[#d9cdb4] bg-white` にし、`<span>✈️</span>` を `<Plane aria-hidden className="h-3.5 w-3.5 text-[#2b6fa3]" />` にする
- 思い出の `🎉{" "}` を `<PartyPopper aria-hidden className="mr-1 inline h-4 w-4 text-[#c98f12]" />` にし、日付の `text-amber-900/60` を `text-[#8a7a5a]` にする

- [ ] **Step 3: 型・lint・テストを走らせる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: PASS（テスト183件）

- [ ] **Step 4: コミットする**

```bash
git add "frontend/src/app/play/[id]/page.tsx" frontend/src/app/passport/page.tsx
git commit -m "#00161: style:ミニアプリとパスポートを新配色にそろえ、スタンプの絵文字を星・金メダル・トロフィーのバッジにする

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: プロフィール・ログイン・登録・ショップ・バッグ・旅先の国・旅のハブ

**Files:**
- Modify: `frontend/src/app/profiles/page.tsx`、`frontend/src/app/login/page.tsx`、`frontend/src/app/register/page.tsx`、`frontend/src/app/shop/page.tsx`、`frontend/src/app/bag/page.tsx`、`frontend/src/app/trip/[key]/page.tsx`、`frontend/src/app/trip/page.tsx`

**Interfaces:**
- Consumes: Task 2 の `BadgeImage`、Task 3 の `SkyPage`・`SkyTitle`・`SkyText`・`Panel`・新配色の `AppButton`

- [ ] **Step 1: プロフィール選び（`app/profiles/page.tsx`）**

- `SceneBackground` の `import` を消し、`import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";`・`import { Pencil } from "lucide-react";` を足す
- 外側を `<SkyPage className="items-center px-6 py-12">` にする
- 見出しの `h1` を `<SkyTitle className="text-2xl">` にする
- 「プロフィールを編集／完了」の `button` を「よく使う置き換え」の空の上のリンクの形（`text-xs`）にする
- 「読み込み中...」「まだプレイヤーがいません。…」を `<SkyText muted className="text-sm">` にする
- 名前の編集欄と追加の入力欄を「よく使う置き換え」の入力欄の形にする
- 「取消」の `AppButton variant="ghost"` の `text-white` を消す（こげ茶になる）
- 「このプロフィールを削除」の `text-rose-200 ... hover:text-rose-100` を `text-[#c2402c] ... hover:text-[#a33a22]` に、エラーの `text-rose-200` を `text-[#c2402c]` にする（編集欄の周りは空の上なので、編集欄のかたまり `div` に `rounded-2xl bg-[#fffaf0] p-2 shadow` を足す）
- 編集中の印 `✎` を `<Pencil aria-hidden className="h-3.5 w-3.5 text-[#3b3226]" />` にする
- 名前の `span` の `text-white drop-shadow` を、`<SkyText as="span" className="text-sm">` にする
- 追加のフォームの `rounded-2xl border border-white/30 bg-black/30 p-4 shadow-xl backdrop-blur-sm` を `rounded-3xl bg-[#fffaf0] p-4 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]` に、ラベルの `text-white/90` を `text-[#3b3226]` にする

- [ ] **Step 2: ログイン・登録（`app/login/page.tsx`・`app/register/page.tsx`）**

2ファイル共通:
- `SceneBackground` の `import` を消し、`import { SkyPage } from "@/components/app/sky-page";` を足す
- 外側を `<SkyPage className="items-center justify-center px-6 py-12">` にする
- カードの `rounded-2xl border border-white/30 bg-black/30 p-6 shadow-xl backdrop-blur-sm` を `rounded-3xl bg-[#fffaf0] p-6 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]` にする
- カードの中の見出しの `text-white drop-shadow` を `text-[#3b3226]`（`font-bold` を `font-black`）に、説明の `text-white/80` を `text-[#6b5d45]` に、ラベルの `text-white/90` を `text-[#3b3226]` にする
- 入力欄とエラーの文字を「よく使う置き換え」の形にする
- カードの下のリンク（「はじめての方はこちら」「すでにアカウントをお持ちの方はこちら」）を「よく使う置き換え」の空の上のリンクの形にする

- [ ] **Step 3: ショップ（`app/shop/page.tsx`）**

- `SceneBackground` の `import` を消し、`import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";`・`import { BadgeImage } from "@/components/app/badge-image";`・`import { Award, FlaskConical, Image as ImageIcon, Plane, Store, User } from "lucide-react";`・`import type { ReactNode } from "react";` を足す（`react` の既存の `import` にまとめる）
- `TYPE_ICON` を次にする:

```tsx
const TYPE_ICON: Record<Exclude<ItemType, "decoration">, ReactNode> = {
  potion: <FlaskConical aria-hidden className="h-7 w-7 text-[#e5533f]" />,
  plane: <Plane aria-hidden className="h-7 w-7 text-[#2b6fa3]" />,
  background: <ImageIcon aria-hidden className="h-7 w-7 text-[#3b7f26]" />,
  character: <User aria-hidden className="h-7 w-7 text-[#6b5d45]" />,
  title: <Award aria-hidden className="h-7 w-7 text-[#c98f12]" />,
};
```

- 読み込み中（2か所）は「よく使う置き換え」の画面いっぱいの形
- 外側を `<SkyPage>` にする
- 見出し `🛒 ショップ` を次にする:

```tsx
            <SkyTitle className="mt-2 flex items-center gap-2 text-3xl">
              <Store aria-hidden className="h-7 w-7" />
              ショップ
            </SkyTitle>
```

- メッセージの `rounded-md bg-black/30 px-4 py-2 text-sm text-white shadow` を `rounded-2xl bg-[#fffaf0] px-4 py-2 text-sm font-bold text-[#3b3226] shadow` にする
- 3つの欄の見出し `h2` の `text-white/90 drop-shadow` を、`<h2 ...><SkyText as="span" className="text-sm">…</SkyText></h2>` にする（「💰 コインを購入」は `<span className="inline-flex items-center gap-1"><BadgeImage badge="coins" size={22} />コインを<Furigana …/></span>` にする）
- べんりアイテムのカードの `rounded-lg border border-white/30 bg-black/20 p-4 shadow-lg backdrop-blur-sm` を `rounded-2xl bg-[#fffaf0] p-4 text-[#3b3226] shadow-lg` に、`<span className="text-3xl">{TYPE_ICON[…]}</span>` を `<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5efe1]">{TYPE_ICON[…]}</span>` に、名前の `text-white` を `text-[#3b3226]`（`font-semibold` を `font-black`）、説明の `text-white/70` を `text-[#6b5d45]`、値段の `text-amber-300` を `text-[#7a5a0e]` にする
- 「まだアイテムがありません。お楽しみに。」を `<SkyText muted className="text-sm">` にする
- コインの袋のカードの `rounded-lg border border-amber-300/40 bg-black/20 p-4 text-center shadow-lg backdrop-blur-sm` を `rounded-2xl bg-[#fffaf0] p-4 text-center text-[#3b3226] shadow-lg` に、ラベルの `text-white` を `text-[#3b3226]`、値段の `text-amber-300` を `text-[#7a5a0e]` にする
- Stripeの説明の `text-white/60` の `p` を `<SkyText muted className="text-xs">` にする

- [ ] **Step 4: バッグ（`app/bag/page.tsx`）**

- `SceneBackground` の `import` を消し、`import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";`・`import { Panel } from "@/components/app/panel";` を足す
- 外側を `<SkyPage>` にする
- 見出しの `h1` を `<SkyTitle className="text-2xl">`、説明の `p` を `<SkyText muted className="text-sm">`、「読み込み中...」を `<SkyText muted className="text-sm">` にする
- からっぽのときの `div`（`rounded-lg bg-black/25 p-4 text-sm text-white`）を `<Panel className="flex flex-col items-start gap-3 text-sm">` にする（中のリンクの色は `text-[#2b5d7a] underline`）
- 「町に置いているアイテム: 〇こ」の `p` を `<SkyText muted className="text-xs">` にする

- [ ] **Step 5: 旅先の国の画面（`app/trip/[key]/page.tsx`）**

- `SceneBackground` の `import` を消し、`import { SkyPage, SkyText } from "@/components/app/sky-page";` を足す
- 外側を `<SkyPage>` にする
- 「〇〇で学ぶ(初級)」の `h2` を `<h2 id="trip-stages-title"><SkyText as="span" className="text-sm">…</SkyText></h2>` にする
- 「まだこの国のステージがありません。」「読み込み中...」の `p` を `<SkyText muted className="text-sm">` にする
- 読み込み中の画面いっぱいの `div` は「よく使う置き換え」の形

- [ ] **Step 6: 旅のハブ（`app/trip/page.tsx`）**

- `import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";` を足す
- 外側の `<div className="relative flex min-h-screen flex-col overflow-hidden bg-[#8fd3f0]">` を `<SkyPage>` にする
- 見出しの `h1` を `<SkyTitle className="text-2xl">`、「読み込み中...」を `<SkyText muted className="text-sm">` にする

- [ ] **Step 7: 型・lint・テストを走らせる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: PASS（テスト183件）。`SceneBackground` を読み込んでいるのが `guest-landing.tsx` だけになっていること:

Run: `cd frontend && grep -rln "SceneBackground" src/app src/components | grep -v scene-background.tsx`
Expected: `src/components/app/guest-landing.tsx` だけ

- [ ] **Step 8: コミットする**

```bash
git add frontend/src/app/profiles/page.tsx frontend/src/app/login/page.tsx frontend/src/app/register/page.tsx frontend/src/app/shop/page.tsx frontend/src/app/bag/page.tsx "frontend/src/app/trip/[key]/page.tsx" frontend/src/app/trip/page.tsx
git commit -m "#00162: style:プロフィール選び・ログイン・登録・ショップ・バッグ・旅先の国・旅のハブを新配色にそろえる

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: ブラウザでの確認と、SPEC・TASKS・設計書の更新

**Files:**
- Modify: `SPEC.md`、`TASKS.md`、`docs/design/2026-09-28-ui-palette-design.md`

- [ ] **Step 1: ブラウザで確かめる（Playwright、390px と 1280px）**

プロフィール「町テスト」（id 7）で確かめる。時間帯は Playwright の `page.clock.setFixedTime(new Date("2026-09-28T08:00:00"))`（朝）・`T12:00`（昼）・`T17:00`（夕方）・`T21:00`（夜）で、画面を開く前に時計をずらして確かめる。

1. 5章の画面（学ぶ・国の3画面・クイズ・復習・ミニアプリ・パスポート・プロフィール・ログイン・登録・ショップ・バッグ・旅先の国・旅のハブ）を開き、崩れ・白い文字の残り・読みにくさがない。バッジ（設計書4-2）がヘッダー・町の上の段・答えのカード・結果・パスポート・ショップに出て、つぶれずに見える
2. 4つの時間帯で背景と見出しの色が変わる（夜は見出しが白、ほかはこげ茶）。夜に空の上の補足の文字が読める
3. クイズ: 正解のカード（せいかい！）・不正解のカード（おしい！こたえは「〇〇」）・並べ替え・仕分け・マッチング（出る問題があれば）・結果・レベルアップ（`tinker` でXPを調整）・HPがなくなったとき（`tinker` でHPを0に）
4. ふりがなを付けたとき・動きを減らす設定のとき
5. 未ログインのLP（ログアウトして `/`）とOwnerのログイン（`/owner/login`）のボタンが前の色のまま
6. コンソールに表示のずれ（hydration）の警告が新しく出ていない（`/bag` の背景の警告は `SceneBackground` をやめたので出なくなるはず）

確かめたあと、DBの記録（XP・ポイント・HP・クリアの記録・おつかい）を元に戻し、ブラウザのふりがな・動きの設定・時計を戻し、スクリーンショットを消す。

- [ ] **Step 2: 設計書を直す（計画で決めたこと）**

`docs/design/2026-09-28-ui-palette-design.md` に次を反映する:
- 4章の `AppButton` の行に「明るい緑・山吹・朱色のボタンの文字はこげ茶、緑・青は白（コントラストのため）」を足す
- 4章の表に `ClassicButton`（`components/app/classic-button.tsx`）の行を足す: 「前の配色のボタン。未ログインのLP・紹介ページのクイズの試遊・Owner/管理のログインで使い、対象外の画面の見た目を変えない」
- 4章の表に `SkyText` の行を足す: 「空の上に直接置く補足の文字。時間帯で色を変える（昼の補足は `#4a3f30`、夜は白）」。空の上のリンクはクリーム色の丸い札にする、と書く
- 4章の「計算だけの部品」から `correctAnswerLine` を消し、「正しい答えは国旗の画像のこともあるので、画面で「こたえは「〇〇」」と組み立てる」と書く
- 5章のプロフィール選び・ログイン・登録の行を「ログイン・登録の見出しはカードの中のまま（こげ茶）。プロフィール選びの見出しは `SkyTitle`」にする
- 5章の旅のハブの行を「画面全体を `SkyPage` で包み、見出しを `SkyTitle` にする」にする

- [ ] **Step 3: `SPEC.md` を更新する**

- 4-2（ボトムナビの項目の後）に1行足す: `- ✅（2026-09-28）町以外のプレイヤーの画面（学ぶ・国・クイズ・ミニアプリ・復習・パスポート・プロフィール・ログイン・登録・ショップ・バッグ・旅先の国・旅のハブ）を、町と同じ時間帯の空の背景・クリーム色のカード・こげ茶の文字・緑のボタンにそろえた。答えのあとは明るいカードで「せいかい！」「おしい！」と知らせる。共通部品は \`components/app/sky-page.tsx\`（\`SkyPage\`・\`SkyTitle\`・\`SkyText\`）・\`panel.tsx\`・\`button.tsx\`、決めごとは \`palette.ts\`。季節の風景の背景（\`SceneBackground\`）と前の配色のボタン（\`classic-button.tsx\`）は、未ログインのLP・紹介ページ・Owner/管理のログインだけで使う（\`docs/design/2026-09-28-ui-palette-design.md\`）`
- 4-9の最後の `- ❌ 町以外の画面の配色統一は未着手（\`TASKS.md\`参照）` の行を消す
- 6-1のフロントのテスト件数を実際の件数にする

- [ ] **Step 4: `TASKS.md` を更新する**

`- [ ] **町以外の画面の見た目を新しい明るい配色にそろえる**: 現状は…` の行を `- [x] **町以外の画面の見た目を新しい明るい配色にそろえる**（2026-09-28。町と同じ時間帯の空の背景・クリーム色のカード。設計書 \`docs/design/2026-09-28-ui-palette-design.md\`、実装計画 \`docs/design/2026-09-28-ui-palette-plan.md\`）` にする。

- [ ] **Step 5: 全体のテストを走らせてコミットする**

Run: `./vendor/bin/sail artisan test --compact && cd frontend && npm test && npm run typecheck && npm run lint`
Expected: PASS（バックエンド320件・フロント183件）

```bash
git add SPEC.md TASKS.md docs/design/2026-09-28-ui-palette-design.md
git commit -m "#00163: docs:町以外の画面の配色統一をSPEC/TASKSに反映し、計画で決めたことを設計書に足す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
