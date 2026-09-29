# 学ぶタブを国旗のカードにする 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 学ぶタブの世界地図と丸い並びをやめ、どの幅でも国旗・国名・クリアしたステージの数のカードを「着いた国」「まだの国」に分けて並べる。

**Architecture:** サーバーは `GET /api/countries` に国ごとの `achievement: { cleared, total }` を足す（読み込みは国の数によらず2回増えるだけ）。画面は計算だけの部品（`components/learn/country-cards.ts`）とカードの見た目（`components/learn/country-card.tsx`）を新しく作り、`app/learn/page.tsx` を作り替える。世界地図の部品・画像・CSSと、地図にだけ使っていた `unlockedCountries` を消す。

**Tech Stack:** Laravel 13（Pest）/ Next.js 16・React 19・TypeScript・Tailwind CSS（Vitest）

**Spec:** `docs/design/2026-09-29-learn-flag-cards-design.md`

**ブランチ:** `feature/learn-flag-cards`（作成済み。設計書は #00250、この計画は #00251）。タスクのコミットは #00252 から順に。

## Global Constraints

- 返答・ドキュメント・コミットの要約は日本語。コミットは `git commit -q -m "#NNNNN: type:要約" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`
- カードの並びは、スマホの幅（`md` より狭い）で2列、パソコンの幅で3列。幅は最大768px（`max-w-3xl`）
- 国の順番はAPIの順（日本 → 旅の行き先の順）のまま。段に分けても段の中の順番は変えない
- 数の文は「3/20」、全部クリアは「ぜんぶクリア！」。読み上げは「日本、20ステージ中3クリア」「日本、ぜんぶクリア」、まだの国は「韓国(まだの国)」
- `total` は問題が1問以上あるステージだけを数える。`cleared` は今遊んでいるプロフィールのクリア（`cleared_at` がある）だけを数える
- 画面のテストは `frontend/` で `npx vitest run <ファイル>`、全部は `npm test`・`npm run typecheck`・`npm run lint`。サーバーのテストは リポジトリ直下で `./vendor/bin/sail test <ファイル>`（`--parallel` を付けない。結果は JSON の `"tool":"pest","result"` を見る）
- 開発用のデータベースは `migrate:fresh` しない。ブラウザで確かめたあとは町テストのデータを確認前の状態に戻す
- 開発用の画面は `http://localhost:3000`（すでに動いている）。スクリーンショットは `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` にだけ保存し、見終わったら消す

## Review Focus

1. 別の家族のプレイヤーが同じ国をクリアしていても、今のプレイヤーの数に入らない → Task 1 のサーバーのテスト（別のプロフィールのクリア）
2. 挑戦しただけでクリアしていないステージ、問題のないステージをクリアしていた記録は、数に入らない（`cleared` が `total` を超えない） → Task 1 のサーバーのテスト
3. プレイヤーを選んでいない状態でAPIを呼んでも、エラーにならず `cleared` が0になる → Task 1 のサーバーのテスト（`active_profile_id` を null にする）
4. まだ1つもクリアしていない国で、棒が0になり「0/20」と出る（割合が NaN にならない）。ステージの数が0の国が来ても画面が壊れない → Task 2 の `achievementRatio`・`achievementText`・`countryCardLabel` のテスト
5. 幅320pxで、長い国名（インドネシア）のカードが横にはみ出さず、下のメニューにも隠れない → Task 4 のブラウザでの確認

---

## ファイルの構成

| ファイル | 役割 | タスク |
|---|---|---|
| `routes/api.php`（`GET /countries`） | 国ごとの `achievement` を足す | 1 |
| `tests/Feature/CountriesIndexTest.php` | `achievement` のテスト | 1 |
| `frontend/src/components/learn/country-cards.ts`・`country-cards.test.ts` | 計算だけの部品（分け方・数の文・棒の割合・読み上げの名前） | 2 |
| `frontend/src/components/learn/country-card.tsx` | カードの見た目 | 3 |
| `frontend/src/app/learn/page.tsx` | 学ぶタブ（カードの並びにする） | 3 |
| `frontend/src/components/app/world-map.tsx`・`frontend/public/map/`・`frontend/src/app/globals.css`（地図の色） | 消す | 3 |
| `frontend/src/components/travel/travel.ts`・`travel.test.ts` | `unlockedCountries` とそのテストを消す | 3 |
| `SPEC.md`・`TASKS.md` | ドキュメント | 4 |

---

### Task 1: 国の一覧に、国ごとのクリアの数を足す

**Files:**
- Modify: `routes/api.php`（`Route::middleware(['auth:sanctum'])->get('/countries', …)`）
- Test: `tests/Feature/CountriesIndexTest.php`

**Interfaces:**
- Produces: `GET /api/countries` の各国に `achievement: { cleared: int, total: int }`（ほかの項目は今のまま）

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/CountriesIndexTest.php` の先頭の `use` を次にする:

```php
use App\Models\Category;
use App\Models\Country;
use App\Models\ProfileStageProgress;
use App\Models\Stage;
```

ファイルの最後に足す:

```php

it('国ごとに、問題のあるステージの数と今のプロフィールがクリアした数(achievement)を返す', function () {
    $profile = createActiveProfile();
    $japan = createCountryWithStageContent('jp', '日本');
    createCountryWithStageContent('us', 'アメリカ');

    $category = Category::create(['name' => '日本の2つ目']);
    $second = Stage::create(['category_id' => $category->id, 'country_id' => $japan->id, 'difficulty' => '初級', 'stage_number' => 2]);
    [$question] = createQuestionWithChoices();
    $second->questions()->attach($question->id, ['order' => 1]);
    // 問題のないステージは数えない(クリアの記録があっても数えない)
    $empty = Stage::create(['category_id' => $category->id, 'country_id' => $japan->id, 'difficulty' => '初級', 'stage_number' => 3]);

    $first = $japan->stages()->where('stage_number', 1)->firstOrFail();
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $first->id, 'cleared_at' => now()]);
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $empty->id, 'cleared_at' => now()]);
    // 挑戦しただけ(クリアしていない)は数えない
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $second->id, 'attempts' => 1]);
    // 同じ家族の別のプレイヤーのクリアは数えない
    $other = createFamilyMember($profile);
    ProfileStageProgress::create(['user_profile_id' => $other->id, 'stage_id' => $second->id, 'cleared_at' => now()]);

    $byCode = collect($this->getJson('/api/countries')->assertOk()->json())->keyBy('code');

    expect($byCode['jp']['achievement'])->toBe(['cleared' => 1, 'total' => 2])
        ->and($byCode['us']['achievement'])->toBe(['cleared' => 0, 'total' => 1]);
});

it('プレイヤーを選んでいないときは、クリアした数を0にする', function () {
    $profile = createActiveProfile();
    $japan = createCountryWithStageContent('jp', '日本');
    ProfileStageProgress::create([
        'user_profile_id' => $profile->id,
        'stage_id' => $japan->stages()->firstOrFail()->id,
        'cleared_at' => now(),
    ]);

    $countries = $this->withSession(['active_profile_id' => null])->getJson('/api/countries')->assertOk()->json();

    expect(collect($countries)->firstWhere('code', 'jp')['achievement'])->toBe(['cleared' => 0, 'total' => 1]);
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/CountriesIndexTest.php 2>&1 | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`
Expected: `"result":"failed","tests":6,"passed":4`（`achievement` がない）

- [ ] **Step 3: 国の一覧に数を足す**

`routes/api.php` の

```php
    $codes = Travel::countryCodes();
    $locked = Travel::lockedCountryIds(ActiveProfile::find($request));

    return Country::query()
        ->whereIn(DB::raw('LOWER(code)'), $codes)
        ->whereHas('stages.questions')
        ->get()
        ->sortBy(fn (Country $country) => array_search(strtolower($country->code), $codes, true))
```

を

```php
    $codes = Travel::countryCodes();
    $profile = ActiveProfile::find($request);
    $locked = Travel::lockedCountryIds($profile);

    $countries = Country::query()
        ->whereIn(DB::raw('LOWER(code)'), $codes)
        ->whereHas('stages.questions')
        ->get();

    // 国旗のカードの進み具合(docs/design/2026-09-29-learn-flag-cards-design.md 4章)。問題のあるステージ(id => 国のid)と、
    // 今のプロフィールがそのうちクリアしたステージを、国の数によらずまとめて1回ずつ読む
    $stageCountries = Stage::query()
        ->whereIn('country_id', $countries->pluck('id'))
        ->whereHas('questions')
        ->pluck('country_id', 'id');
    $clearedStageIds = $profile
        ? ProfileStageProgress::query()
            ->where('user_profile_id', $profile->id)
            ->whereNotNull('cleared_at')
            ->whereIn('stage_id', $stageCountries->keys())
            ->pluck('stage_id')
            ->all()
        : [];
    $clearedCountries = $stageCountries->only($clearedStageIds);

    return $countries
        ->sortBy(fn (Country $country) => array_search(strtolower($country->code), $codes, true))
```

に、同じ route の

```php
            'has_language_mode' => $country->stages()
                ->whereHas('category', fn ($q) => $q->where('is_language_mode', true))
                ->whereHas('questions')
                ->exists(),
        ])
```

を

```php
            'has_language_mode' => $country->stages()
                ->whereHas('category', fn ($q) => $q->where('is_language_mode', true))
                ->whereHas('questions')
                ->exists(),
            'achievement' => [
                'cleared' => $clearedCountries->filter(fn ($countryId) => (int) $countryId === $country->id)->count(),
                'total' => $stageCountries->filter(fn ($countryId) => (int) $countryId === $country->id)->count(),
            ],
        ])
```

に直す。route の先頭のコメント（`// 学ぶタブ向け(…)`）の最後の行の次に、次の1行を足す:

```php
    // 国ごとの achievement(クリアしたステージの数/問題のあるステージの数)は国旗のカードに出す(docs/design/2026-09-29-learn-flag-cards-design.md)
```

（`Stage`・`ProfileStageProgress`・`ActiveProfile`・`DB` の `use` は `routes/api.php` にもうある）

- [ ] **Step 4: テストが通るのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/CountriesIndexTest.php 2>&1 | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`
Expected: `"result":"passed","tests":6,"passed":6`

- [ ] **Step 5: コミット**

```bash
git add routes/api.php tests/Feature/CountriesIndexTest.php
git commit -q -m "#00252: feat:学ぶタブの国の一覧に、国ごとのクリアしたステージの数と全部の数(achievement)を足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: カードの計算だけの部品を作る

**Files:**
- Create: `frontend/src/components/learn/country-cards.ts`
- Test: `frontend/src/components/learn/country-cards.test.ts`

**Interfaces:**
- Consumes: Task 1 の `achievement: { cleared, total }`（型として受ける）
- Produces（`@/components/learn/country-cards`）:
  - `type Achievement = { cleared: number; total: number }`
  - `type LearnCountry = { id: number; code: string; name: string; locked: boolean; achievement: Achievement }`
  - `learnSections<T extends { locked: boolean }>(countries: T[]): { arrived: T[]; notYet: T[] }`
  - `isAllCleared(achievement: Achievement): boolean`
  - `achievementText(achievement: Achievement): string | null`
  - `achievementRatio(achievement: Achievement): number`
  - `countryCardLabel(name: string, achievement: Achievement): string`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/learn/country-cards.test.ts` を作る:

```ts
import { describe, expect, it } from "vitest";

import { achievementRatio, achievementText, countryCardLabel, isAllCleared, learnSections } from "./country-cards";

describe("学ぶタブの国旗のカード(設計書 2026-09-29-learn-flag-cards 3・5章)", () => {
  it("着いた国とまだの国に分け、段の中はAPIの順のまま", () => {
    const countries = [
      { code: "jp", locked: false },
      { code: "id", locked: true },
      { code: "us", locked: false },
      { code: "kr", locked: true },
    ];
    const { arrived, notYet } = learnSections(countries);
    expect(arrived.map((country) => country.code)).toEqual(["jp", "us"]);
    expect(notYet.map((country) => country.code)).toEqual(["id", "kr"]);
  });

  it("まだの国がなければ、まだの国は空", () => {
    expect(learnSections([{ code: "jp", locked: false }]).notYet).toEqual([]);
  });

  it("全部クリアは、ステージが1つ以上あって全部クリアしたときだけ", () => {
    expect(isAllCleared({ cleared: 20, total: 20 })).toBe(true);
    expect(isAllCleared({ cleared: 3, total: 20 })).toBe(false);
    expect(isAllCleared({ cleared: 0, total: 0 })).toBe(false);
  });

  it("数の文は 3/20・0/20、全部クリアは「ぜんぶクリア！」、ステージがなければ null", () => {
    expect(achievementText({ cleared: 3, total: 20 })).toBe("3/20");
    expect(achievementText({ cleared: 0, total: 20 })).toBe("0/20");
    expect(achievementText({ cleared: 20, total: 20 })).toBe("ぜんぶクリア！");
    expect(achievementText({ cleared: 0, total: 0 })).toBeNull();
  });

  it("棒の割合は0〜1(ステージがなければ0、超えても1)", () => {
    expect(achievementRatio({ cleared: 3, total: 20 })).toBeCloseTo(0.15);
    expect(achievementRatio({ cleared: 0, total: 20 })).toBe(0);
    expect(achievementRatio({ cleared: 0, total: 0 })).toBe(0);
    expect(achievementRatio({ cleared: 25, total: 20 })).toBe(1);
  });

  it("読み上げの名前は「日本、20ステージ中3クリア」、全部クリアは「日本、ぜんぶクリア」、ステージがなければ国名だけ", () => {
    expect(countryCardLabel("日本", { cleared: 3, total: 20 })).toBe("日本、20ステージ中3クリア");
    expect(countryCardLabel("日本", { cleared: 20, total: 20 })).toBe("日本、ぜんぶクリア");
    expect(countryCardLabel("日本", { cleared: 0, total: 0 })).toBe("日本");
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/learn/country-cards.test.ts`
Expected: FAIL（`./country-cards` がない）

- [ ] **Step 3: 部品を作る**

`frontend/src/components/learn/country-cards.ts` を作る:

```ts
// 学ぶタブの国旗のカードの計算(docs/design/2026-09-29-learn-flag-cards-design.md 5章)。画面を描かない部分だけをここに置く

/** 国ごとの進み具合(GET /api/countries の achievement)。問題のあるステージの数と、今のプレイヤーがクリアした数 */
export type Achievement = { cleared: number; total: number };

/** 学ぶタブで使う国(GET /api/countries のうち使う項目) */
export type LearnCountry = { id: number; code: string; name: string; locked: boolean; achievement: Achievement };

/** 「着いた国」と「まだの国」に分ける。段の中の順番はAPIの順(日本 → 旅の行き先)のまま */
export function learnSections<T extends { locked: boolean }>(countries: T[]): { arrived: T[]; notYet: T[] } {
  return {
    arrived: countries.filter((country) => !country.locked),
    notYet: countries.filter((country) => country.locked),
  };
}

/** ステージが1つ以上あり、全部クリアした */
export function isAllCleared({ cleared, total }: Achievement): boolean {
  return total > 0 && cleared >= total;
}

/** カードの数の文。「3/20」、全部クリアは「ぜんぶクリア！」、ステージがなければ null(数を出さない) */
export function achievementText(achievement: Achievement): string | null {
  if (achievement.total <= 0) return null;
  return isAllCleared(achievement) ? "ぜんぶクリア！" : `${achievement.cleared}/${achievement.total}`;
}

/** 進み具合の棒の割合(0〜1) */
export function achievementRatio({ cleared, total }: Achievement): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, cleared / total));
}

/** 着いた国のカードの読み上げの名前 */
export function countryCardLabel(name: string, achievement: Achievement): string {
  if (achievement.total <= 0) return name;
  return isAllCleared(achievement)
    ? `${name}、ぜんぶクリア`
    : `${name}、${achievement.total}ステージ中${achievement.cleared}クリア`;
}
```

- [ ] **Step 4: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/learn/country-cards.test.ts`
Expected: PASS（6件）

- [ ] **Step 5: コミット**

```bash
git add frontend/src/components/learn/country-cards.ts frontend/src/components/learn/country-cards.test.ts
git commit -q -m "#00253: feat:学ぶタブの国旗のカードの計算(着いた国とまだの国の分け方・数の文・棒の割合・読み上げの名前)を足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 学ぶタブを国旗のカードにし、世界地図を消す

**Files:**
- Create: `frontend/src/components/learn/country-card.tsx`
- Modify: `frontend/src/app/learn/page.tsx`（全体）
- Modify: `frontend/src/app/globals.css`（世界地図の色を消す）
- Modify: `frontend/src/components/travel/travel.ts`・`frontend/src/components/travel/travel.test.ts`（`unlockedCountries` を消す）
- Delete: `frontend/src/components/app/world-map.tsx`・`frontend/public/map/world.svg`・`frontend/public/map/README.md`

**Interfaces:**
- Consumes: Task 2 の `LearnCountry`・`learnSections`・`isAllCleared`・`achievementText`・`achievementRatio`・`countryCardLabel`
- Produces: `ArrivedCountryCard({ country: LearnCountry })`・`LockedCountryCard({ country: LearnCountry; onSelect: () => void })`（`@/components/learn/country-card`）

画面の見た目の部品なので、見た目はTask 4のブラウザで確かめる。計算はTask 2のテストで確かめてある。

- [ ] **Step 1: カードの見た目を作る**

`frontend/src/components/learn/country-card.tsx` を作る:

```tsx
import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";

import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { SPRU_STAGES } from "@/components/spru/spru-assets";

import { achievementRatio, achievementText, countryCardLabel, isAllCleared, type LearnCountry } from "./country-cards";

// 学ぶタブの国旗のカード(docs/design/2026-09-29-learn-flag-cards-design.md 3-2・3-3)
const CARD_CLASS =
  "relative flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-b-4 p-3 text-center shadow-lg transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b6fa3] focus-visible:ring-offset-2";

/** カードの国旗(縦横2:3)。国名は下に文字で出すので alt は空 */
function CardFlag({ code, locked = false }: { code: string; locked?: boolean }) {
  return (
    <span
      className={`relative block aspect-[3/2] w-full max-w-28 overflow-hidden rounded-md border border-[#e8dfcf] ${locked ? "opacity-70 grayscale" : ""}`}
    >
      <Image src={`/flag/${code}.svg`} alt="" fill sizes="112px" className="object-cover" />
    </span>
  );
}

/** 着いた国のカード。国旗・国名・進み具合の棒と数。押すとその国の画面へ */
export function ArrivedCountryCard({ country }: { country: LearnCountry }) {
  const text = achievementText(country.achievement);
  return (
    <Link
      href={`/travel/${country.id}/start`}
      aria-label={countryCardLabel(country.name, country.achievement)}
      className={`${CARD_CLASS} border-[#e8dfcf] bg-[#fffaf0] text-[#3b3226] hover:-translate-y-0.5 active:translate-y-0.5`}
    >
      <CardFlag code={country.code} />
      <span className="text-base leading-tight font-black">
        <AutoFurigana text={country.name} />
      </span>
      {text && (
        <span aria-hidden className="flex w-full flex-col items-center gap-1">
          <span className="block h-2 w-full overflow-hidden rounded-full bg-[#efe5cf]">
            <span
              className="block h-full rounded-full bg-[#5bb33e]"
              style={{ width: `${achievementRatio(country.achievement) * 100}%` }}
            />
          </span>
          <span className="flex items-center gap-1 text-xs font-black text-[#6b5d45]">
            {isAllCleared(country.achievement) && <AssetImage asset={SPRU_STAGES.cleared} size={18} />}
            {text}
          </span>
        </span>
      )}
    </Link>
  );
}

/** まだの国のカード。灰色の国旗に鍵、国名だけ。押すと「せかいへ」の案内を出す */
export function LockedCountryCard({ country, onSelect }: { country: LearnCountry; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${country.name}(まだの国)`}
      className={`${CARD_CLASS} border-[#dccfb4] bg-[#efe5cf] text-[#8a7a5a]`}
    >
      <Lock aria-hidden className="absolute top-2 left-2 h-4 w-4" />
      <CardFlag code={country.code} locked />
      <span className="text-base leading-tight font-black">
        <AutoFurigana text={country.name} />
      </span>
    </button>
  );
}
```

- [ ] **Step 2: 学ぶタブをカードの並びにする**

`frontend/src/app/learn/page.tsx` を次の内容にする（読み込み・ミニアプリの引き出し・鍵の国の案内は今のまま）:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { Furigana } from "@/components/app/furigana";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { LoadingScreen, SpruLoading } from "@/components/app/spru-loading";
import { ArrivedCountryCard, LockedCountryCard } from "@/components/learn/country-card";
import { learnSections, type LearnCountry } from "@/components/learn/country-cards";
import { LockedCountrySheet } from "@/components/travel/locked-country";
import { apiFetch } from "@/lib/api";

type Category = {
  id: number;
  parent_id: number | null;
  name: string;
};

type Status = "checking" | "ready";

const tileVariants = ["primary", "secondary", "warning", "danger"] as const;

// 国旗のカードの並び(docs/design/2026-09-29-learn-flag-cards-design.md 3-1)。スマホ2列・パソコン3列
const CARD_GRID_CLASS = "grid grid-cols-2 gap-4 md:grid-cols-3";

export default function Page() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [countries, setCountries] = useState<LearnCountry[] | null>(null);
  const [miniAppOpen, setMiniAppOpen] = useState(false);
  const [lockedCountry, setLockedCountry] = useState<LearnCountry | null>(null);

  useEffect(() => {
    let active = true;

    apiFetch("/api/user")
      .then(async (userRes) => {
        if (!active) return;

        if (!userRes.ok) {
          router.replace("/login");
          return;
        }

        const activeRes = await apiFetch("/api/profiles/active");
        if (!active) return;

        const activeProfile = await activeRes.json();
        if (!activeProfile) {
          router.replace("/profiles");
          return;
        }

        setStatus("ready");

        const [categoriesRes, countriesRes] = await Promise.all([
          apiFetch("/api/categories"),
          apiFetch("/api/countries"),
        ]);
        if (!active) return;
        if (categoriesRes.ok) {
          setCategories(await categoriesRes.json());
        }
        if (countriesRes.ok) {
          setCountries(await countriesRes.json());
        }
      })
      .catch(() => {
        if (active) router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (status === "checking") {
    return (
      <LoadingScreen />
    );
  }

  const rootCategories = (categories ?? []).filter(
    (c) => c.parent_id === null,
  );
  const { arrived, notYet } = learnSections(countries ?? []);

  return (
    <SkyPage>
      <AppHeader />

      <main className="relative z-10 flex flex-1 flex-col items-center gap-8 px-6 py-10 pb-24">
        <div className="text-center">
          <SkyTitle className="text-3xl">
            どこから<Furigana text="冒険" reading="ぼうけん" />する？
          </SkyTitle>
          <SkyText muted className="mt-1 text-sm">
            着いた国で学べるよ
          </SkyText>
        </div>

        {!countries ? (
          <SpruLoading />
        ) : countries.length === 0 ? (
          <SkyText muted className="text-sm">
            まだ国が登録されていません。お楽しみに。
          </SkyText>
        ) : (
          <div className="flex w-full max-w-3xl flex-col gap-8">
            {arrived.length > 0 && (
              <section className="flex flex-col gap-3">
                <SkyTitle as="h2" className="text-lg">
                  <AutoFurigana text="着いた国" />
                </SkyTitle>
                <div className={CARD_GRID_CLASS}>
                  {arrived.map((country) => (
                    <ArrivedCountryCard key={country.id} country={country} />
                  ))}
                </div>
              </section>
            )}
            {notYet.length > 0 && (
              <section className="flex flex-col gap-3">
                <div>
                  <SkyTitle as="h2" className="text-lg">
                    <AutoFurigana text="まだの国" />
                  </SkyTitle>
                  <SkyText muted className="mt-0.5 text-xs">
                    <AutoFurigana text="せかいでチケットを使うと行けるよ" />
                  </SkyText>
                </div>
                <div className={CARD_GRID_CLASS}>
                  {notYet.map((country) => (
                    <LockedCountryCard key={country.id} country={country} onSelect={() => setLockedCountry(country)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* ミニアプリ: 右端タブから引き出すドロワー(メインのアプリ選択を邪魔しない) */}
      <button
        type="button"
        onClick={() => setMiniAppOpen(true)}
        aria-label="ミニアプリを開く"
        className="fixed top-1/2 right-0 z-30 -translate-y-1/2 rounded-l-xl bg-[#fffaf0] px-2 py-3 text-[#3b3226] shadow-[0_4px_14px_rgba(59,50,38,0.2)] hover:bg-white"
      >
        ◀
      </button>

      {miniAppOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            aria-label="ミニアプリを閉じる"
            onClick={() => setMiniAppOpen(false)}
            className="flex-1 bg-[rgba(38,48,28,0.38)]"
          />
          <div className="flex w-72 max-w-[85vw] flex-col gap-3 overflow-y-auto bg-[#fffaf0] p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#3b3226]">ミニアプリ</h2>
              <button
                type="button"
                onClick={() => setMiniAppOpen(false)}
                aria-label="閉じる"
                className="rounded-full p-1 text-[#6b5d45] hover:bg-[#f5efe1]"
              >
                ✕
              </button>
            </div>
            {!categories ? (
              <p className="text-xs text-[#6b5d45]">読み込み中...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {rootCategories.map((category, index) => (
                  <Link
                    key={category.id}
                    href={`/play/${category.id}`}
                    onClick={() => setMiniAppOpen(false)}
                  >
                    <AppButton
                      variant={tileVariants[index % tileVariants.length]}
                      size="sm"
                      className="w-full shadow"
                    >
                      {category.name}
                    </AppButton>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {lockedCountry && <LockedCountrySheet name={lockedCountry.name} onClose={() => setLockedCountry(null)} />}

      <BottomNav />
    </SkyPage>
  );
}
```

- [ ] **Step 3: 世界地図と、地図にだけ使っていた物を消す**

```bash
git rm -q frontend/src/components/app/world-map.tsx frontend/public/map/world.svg frontend/public/map/README.md
python3 - <<'EOF'
from pathlib import Path
p = Path("frontend/src/app/globals.css")
s = p.read_text(encoding="utf-8")
start = s.index("\n  /*\n   * 世界地図(public/map/world.svg)上の国クリック領域。")
end_marker = "  @media (prefers-reduced-motion: reduce) {\n    .world-map-playable {\n      transition: none;\n    }\n  }\n"
end = s.index(end_marker, start) + len(end_marker)
p.write_text(s[:start] + s[end:], encoding="utf-8")
print("removed", end - start, "chars")
EOF
```

`frontend/src/components/travel/travel.ts` の

```ts
/** 学ぶタブで、鍵のない国だけを並びのまま残す(地図の表示に渡す。設計書5-5) */
export function unlockedCountries<T extends { locked: boolean }>(countries: T[]): T[] {
  return countries.filter((country) => !country.locked);
}

```

を消す。`frontend/src/components/travel/travel.test.ts` の import の `  unlockedCountries,` の行と、

```ts
  it("鍵のない国だけを並びのまま残す(地図に渡す)", () => {
    const countries = [
      { code: "jp", locked: false },
      { code: "id", locked: true },
      { code: "us", locked: false },
    ];
    expect(unlockedCountries(countries).map((country) => country.code)).toEqual(["jp", "us"]);
  });

```

を消す（分け方は `learnSections` のテストで確かめている）。

Run: `cd frontend && grep -rn "world-map\|WorldMap\|unlockedCountries\|/map/world" src public`
Expected: 何も出ない

- [ ] **Step 4: 型・lint・画面のテスト全部を確かめる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: エラーなし。テストは全部 PASS（Task 2 の6件を足し、`unlockedCountries` の1件を消した数）

- [ ] **Step 5: コミット**

```bash
git add frontend/src/components/learn/country-card.tsx frontend/src/app/learn/page.tsx frontend/src/app/globals.css frontend/src/components/travel/travel.ts frontend/src/components/travel/travel.test.ts
git commit -q -m "#00254: feat:学ぶタブを国旗のカード(着いた国とまだの国、クリアの数)にし、世界地図と丸い並びをなくす" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

（`world-map.tsx`・`public/map/` の削除は Step 3 の `git rm` で入っている）

---

### Task 4: ブラウザで確かめ、ドキュメントを直す

**Files:**
- Modify: `SPEC.md`・`TASKS.md`

**Interfaces:**
- Consumes: Task 1〜3 のすべて
- Produces: なし

- [ ] **Step 1: 開発用のデータの確認前の状態を記録する**

Run（リポジトリ直下で）:

```bash
./vendor/bin/sail artisan tinker --execute='$p=App\Models\UserProfile::find(7); echo json_encode([$p->only(["current_streak","best_streak","last_played_date","xp","coins","hp","points","avatar","level","last_review_on"]), DB::table("profile_errands")->where("user_profile_id",7)->pluck("id"), DB::table("profile_world_items")->where("user_profile_id",7)->count(), DB::table("profile_stage_progress")->where("user_profile_id",7)->count(), DB::table("profile_currency_ledger")->max("id")]), PHP_EOL;'
```

Expected: 1行のJSON。これを確認前の状態として控える

- [ ] **Step 2: ブラウザで確かめる（幅390px）**

`test@example.com` / `password` でログインし、町テストを選ぶ（ログイン済みならそのまま）。`/learn` を開く。

- 「着いた国」に日本のカード（国旗・国名〔ふりがな付き〕・棒・「0/20」）が出る
- 「まだの国」と「せかいでチケットを使うと行けるよ」の下に、5か国のカードが灰色の国旗と鍵で出る
- まだの国のカード（韓国）を押すと「韓国はまだの国」の案内が出て、「閉じる」で閉じられる
- 日本のカードを押すと、日本の画面（`/travel/{id}/start`）へ移る
- 右端の `◀` でミニアプリの引き出しが開く

- [ ] **Step 3: 幅320pxと1280pxでも確かめる**

- 320px: カードが2列で横にはみ出さない（`document.documentElement.scrollWidth` が320）。「インドネシア」の国名がカードの中におさまる。いちばん下のカードが下のメニューに隠れずに見える（下までスクロールして確かめる）
- 1280px: カードが3列で、幅768pxの中におさまる。「フラッグ／地図」の切り替えがない

合わないところは直し、Ruling として記録する。

- [ ] **Step 4: 開発用のデータを元に戻す**

Step 1 のコマンドをもう一度流す。
Expected: Step 1 と同じ（学ぶタブと国の画面を開くだけでは変わらない。町を開いて今日のおつかいが増えていたら、町テスト＝id 7 の増えた `profile_errands` の行を消す: `DB::table("profile_errands")->where("user_profile_id",7)->whereNotIn("id",[<Step 1 のid>])->delete();`）

- [ ] **Step 5: ドキュメントを直す**

リポジトリ直下で:

```bash
python3 - <<'EOF'
from pathlib import Path
p = Path("SPEC.md")
s = p.read_text(encoding="utf-8")
old = "モバイル幅は従来のグリッド表示を維持\n"
assert s.count(old) == 1
s = s.replace(old, "モバイル幅は従来のグリッド表示を維持（2026-09-29にやめた。下の行）\n"
  "- ✅（2026-09-29）**学ぶタブを国旗のカードにした**: どの幅でも、国旗・国名・クリアしたステージの数（「3/20」、全部クリアは「ぜんぶクリア！」）のカードを「着いた国」「まだの国」に分けて並べる（スマホ2列・パソコン3列）。パソコンの幅の「フラッグ／地図」の切り替え・丸い並び・世界地図（`WorldMap`・`public/map/`）はやめ、地図の役割はせかいタブにまとめた。数は `GET /api/countries` の `achievement: { cleared, total }`（問題のあるステージの数と、今のプロフィールがクリアした数）（`docs/design/2026-09-29-learn-flag-cards-design.md`）\n", 1)
old2 = "世界地図→`WorldMap`再利用、"
assert s.count(old2) == 1
s = s.replace(old2, "世界地図→`WorldMap`再利用（2026-09-29に `WorldMap` は消した。地図を使うときは、せかいタブの地図を元に考える）、", 1)
p.write_text(s, encoding="utf-8")

p = Path("TASKS.md")
s = p.read_text(encoding="utf-8")
anchor = "- [ ] **メール確認・パスワード再設定のページを作る**"
assert s.count(anchor) == 1
s = s.replace(anchor, "- [x] **学ぶタブを国旗のカードにする**（2026-09-29。設計書 `docs/design/2026-09-29-learn-flag-cards-design.md`、実装計画 `docs/design/2026-09-29-learn-flag-cards-plan.md`）: 世界地図と丸い並びをやめ、どの幅でも国旗・国名・クリアの数のカードを「着いた国」「まだの国」に分けて並べる\n" + anchor, 1)
p.write_text(s, encoding="utf-8")
print("ok")
EOF
```

Expected: `ok`

- [ ] **Step 6: サーバーと画面のテスト全部・型・lint を確かめる**

Run: `./vendor/bin/sail test 2>&1 | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`（2分を超えるので長く待てる形で）と `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: サーバーは `"result":"passed"`（388件）、画面は全部 PASS、エラーなし

- [ ] **Step 7: コミット**

```bash
git add SPEC.md TASKS.md
git commit -q -m "#00255: docs:学ぶタブの国旗のカードをSPEC/TASKSに反映する" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

（Step 2〜3 で直したところがあれば、そのファイルも `git add` する）
