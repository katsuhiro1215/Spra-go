# 連続プレイの節目 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 連続プレイが3日・7日・30日に届いた日に全画面でお祝いし、もらった節目のバッジをパスポートに残す。

**Architecture:** 節目の判定と「初めてか」はサーバー（`UserProfile::registerDailyStreak()`）で決めて、答えのAPIの `profile` で返す。パスポートのAPIは、いちばん長い連続と節目ごとの「もらったか」を返す。画面は、レベルアップと同じ形のお祝いを「つぎへ」のあとに挟み、パスポートに欄を足す。DBは変えない。

**Tech Stack:** Laravel 13（Sail）+ Pest / Next.js 16 + React 19 + TypeScript + Tailwind v4 / Vitest / 画像の切り抜きは Python（Pillow）

**Spec:** `docs/design/2026-09-28-streak-milestones-design.md`

## Global Constraints

- ブランチ `feature/streak-milestones`。コミットは `#NNNNN: type:summary`（直前の番号+1、最初は `#00171`）で、末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- ドキュメント・コメントは日本語
- 節目は `[3, 7, 30]` だけ。7日ごとの50コイン（`STREAK_BONUS_INTERVAL_DAYS`・`STREAK_BONUS_COIN`）は変えない
- DBのマイグレーションは作らない。`migrate:fresh` は使わない
- 文言（そのまま使う）
  - お祝いの見出し「{days}日連続プレイ！」
  - 初めて「バッジをゲット！パスポートに入れたよ」、2回目から「また{days}日つづいたね！」
  - ボーナス「ボーナス +{coin}Coin」
  - パスポートの欄の見出し「連続プレイのバッジ」、下の行「いちばん長い連続: {N}日」
  - バッジの説明文「{days}日連続のバッジ（もらった）」「{days}日連続のバッジ（まだ）」
- 画像の切り抜きは `python3 tools/spru-assets/extract.py ../../company/mascot/assets`（リポジトリ直下で。全素材を作り直すので数分かかる。バックグラウンドで流す）。`spru-assets.ts` は手で直さない
- スクリーンショットは `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` に置き、確かめたら消す
- ブラウザ確認で変えた開発DBは、確認のあとに元へ戻す（テスト用ログイン `test@example.com` / `password`、プロフィール「町テスト」id 7）

## Review Focus

1. レベルアップと節目が同じ答えで起きたとき → レベルアップ → 節目のお祝い → 次の問題の順に、どちらも1回ずつ出る（Task 6 のブラウザ確認）
2. 1日の最初の答えが不正解のとき → 答えのカードに「N日連続プレイ！」が出て、節目ならお祝いも出る（Task 1 のAPIテスト、Task 6 のブラウザ確認）
3. お祝いを閉じたあと、同じ回の次の答えや「もう一度」でお祝いがもう一度出ない（Task 4 で `resetRun` と「つづける」で消す。Task 6 のブラウザ確認）
4. プロフィールを選んでいない・いちばん長い連続が0日のパスポート → 3つとも白黒で「いちばん長い連続: 0日」、エラーにならない（Task 2 のAPIテスト）
5. 最後の問題で節目に届いたとき → お祝いのあとに結果画面へ進む（Task 4 の `handleMilestoneContinue` が `advance()` を呼ぶ。Task 6 のブラウザ確認）

---

### Task 1: 連続が節目に届いたことを、答えのAPIで返す

**Files:**
- Modify: `app/Models/UserProfile.php`（決めごとの並び・`registerDailyStreak()`）
- Modify: `routes/api.php`（回答API `POST /api/questions/{question}/answer` の `$economy`）
- Test: `tests/Feature/StreakTest.php`

**Interfaces:**
- Produces: `UserProfile::STREAK_MILESTONES`（`public const`、`[3, 7, 30]`）。`registerDailyStreak()` の戻り値に `milestone: int|null` と `milestone_first: bool`。答えのAPIの `profile.streak_milestone`（`int|null`）と `profile.streak_milestone_first`（`bool`）

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/StreakTest.php` の `answerOnce()` の下に、準備の関数を足す。

```php
/** 「きのう(2026-08-01)まで $current 日つづいていて、いちばん長い連続は $best 日」の状態にする */
function prepareStreak(\App\Models\UserProfile $profile, int $current, int $best): void
{
    $profile->update([
        'current_streak' => $current,
        'best_streak' => $best,
        'last_played_date' => '2026-08-01',
    ]);
}
```

ファイルの最後に次を足す。

```php
it('連続が節目(3日・7日・30日)に伸びた日は、その日数を返す', function (int $before, ?int $milestone) {
    Carbon::setTestNow(Carbon::parse('2026-08-02 10:00:00', 'Asia/Tokyo'));
    $profile = createActiveProfile();
    prepareStreak($profile, $before, $before);
    [$question, $correct] = createQuestionWithChoices();

    $response = answerOnce($question->id, $correct->id);

    expect($response->json('profile.streak'))->toBe($before + 1);
    expect($response->json('profile.streak_milestone'))->toBe($milestone);
})->with([
    '2日' => [1, null],
    '3日' => [2, 3],
    '4日' => [3, null],
    '7日' => [6, 7],
    '14日' => [13, null],
    '30日' => [29, 30],
]);

it('初めて節目に届いた日は、初めてと返す', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-02 10:00:00', 'Asia/Tokyo'));
    $profile = createActiveProfile();
    prepareStreak($profile, 2, 2);
    [$question, $correct] = createQuestionWithChoices();

    $response = answerOnce($question->id, $correct->id);

    expect($response->json('profile.streak_milestone'))->toBe(3);
    expect($response->json('profile.streak_milestone_first'))->toBeTrue();
});

it('いちばん長い連続がすでに節目以上なら、2回目と返す', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-02 10:00:00', 'Asia/Tokyo'));
    $profile = createActiveProfile();
    prepareStreak($profile, 2, 10);
    [$question, $correct] = createQuestionWithChoices();

    $response = answerOnce($question->id, $correct->id);

    expect($response->json('profile.streak_milestone'))->toBe(3);
    expect($response->json('profile.streak_milestone_first'))->toBeFalse();
    expect($profile->fresh()->best_streak)->toBe(10);
});

it('同じ日の2問目は、節目を返さない', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-02 10:00:00', 'Asia/Tokyo'));
    $profile = createActiveProfile();
    prepareStreak($profile, 2, 2);
    [$q1, $c1] = createQuestionWithChoices();
    answerOnce($q1->id, $c1->id);

    [$q2, $c2] = createQuestionWithChoices();
    $response = answerOnce($q2->id, $c2->id);

    expect($response->json('profile.streak'))->toBe(3);
    expect($response->json('profile.streak_milestone'))->toBeNull();
    expect($response->json('profile.streak_milestone_first'))->toBeFalse();
});

it('1日の最初の答えが不正解でも、節目を返す', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-02 10:00:00', 'Asia/Tokyo'));
    $profile = createActiveProfile();
    prepareStreak($profile, 2, 2);
    [$question, , $wrong] = createQuestionWithChoices();

    $response = answerOnce($question->id, $wrong->id);

    expect($response->json('correct'))->toBeFalse();
    expect($response->json('profile.streak_milestone'))->toBe(3);
    expect($response->json('profile.streak_milestone_first'))->toBeTrue();
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `./vendor/bin/sail artisan test tests/Feature/StreakTest.php`
Expected: 新しい10件のうち7件が FAIL（「3日・7日・30日」は `null` が返って FAIL、「初めて」「2回目」「同じ日の2問目」「不正解でも」は `streak_milestone_first` が `null` で FAIL）。`null` を期待する「2日・4日・14日」の3件は、項目がまだ無くても `null` になるので PASS。今までの5件も PASS

- [ ] **Step 3: 実装する**

`app/Models/UserProfile.php` の `STREAK_BONUS_COIN` の下に足す。

```php
    /**
     * 連続プレイの節目。この日数に届いた日をお祝いし、パスポートにバッジを残す
     * (docs/design/2026-09-28-streak-milestones-design.md)
     */
    public const STREAK_MILESTONES = [3, 7, 30];
```

`registerDailyStreak()` を次のように直す（PHPDocの戻り値・同じ日の戻り値・伸びたときの戻り値）。

```php
    /**
     * 毎日プレイのストリーク(継続日数)を更新する。1日1回だけカウントし
     * (同じ日に何問答えても増えない)、前日にプレイしていなければリセットする。
     * 日の境界はSTREAK_TIMEZONE(Asia/Tokyo)固定。docs/AppInfo.mdが
     * 「最重要要素」の1つとして挙げるが、これまで未実装だった(docs/AppRoadmap.md)。
     * 節目(STREAK_MILESTONES)に届いた日は milestone にその日数を入れ、伸びる前の
     * いちばん長い連続が節目より短ければ milestone_first を true にする。
     *
     * @return array{streak: int, best_streak: int, streak_extended_today: bool, milestone_bonus_coin: int, milestone: int|null, milestone_first: bool}
     */
    public function registerDailyStreak(): array
    {
        $today = Carbon::now(self::STREAK_TIMEZONE)->toDateString();
        $lastPlayed = $this->last_played_date?->toDateString();

        if ($lastPlayed === $today) {
            return [
                'streak' => $this->current_streak,
                'best_streak' => $this->best_streak,
                'streak_extended_today' => false,
                'milestone_bonus_coin' => 0,
                'milestone' => null,
                'milestone_first' => false,
            ];
        }

        $previousBest = (int) $this->best_streak;
        $yesterday = Carbon::now(self::STREAK_TIMEZONE)->subDay()->toDateString();
        $this->current_streak = $lastPlayed === $yesterday ? $this->current_streak + 1 : 1;
        $this->best_streak = max($this->best_streak, $this->current_streak);
        $this->last_played_date = $today;
        $this->save();

        $milestoneBonusCoin = $this->current_streak % self::STREAK_BONUS_INTERVAL_DAYS === 0
            ? self::STREAK_BONUS_COIN
            : 0;
        $milestone = in_array((int) $this->current_streak, self::STREAK_MILESTONES, true)
            ? (int) $this->current_streak
            : null;

        return [
            'streak' => $this->current_streak,
            'best_streak' => $this->best_streak,
            'streak_extended_today' => true,
            'milestone_bonus_coin' => $milestoneBonusCoin,
            'milestone' => $milestone,
            'milestone_first' => $milestone !== null && $previousBest < $milestone,
        ];
    }
```

`routes/api.php` の回答APIの `$economy` で、`'streak_milestone_bonus_coin' => $streak['milestone_bonus_coin'],` の下に足す。

```php
            'streak_milestone' => $streak['milestone'],
            'streak_milestone_first' => $streak['milestone_first'],
```

- [ ] **Step 4: テストが通るのを確かめる**

Run: `./vendor/bin/sail artisan test tests/Feature/StreakTest.php`
Expected: PASS（15件）

- [ ] **Step 5: 全体のテストを流してコミットする**

Run: `./vendor/bin/sail artisan test`
Expected: PASS（330件）

```bash
git add app/Models/UserProfile.php routes/api.php tests/Feature/StreakTest.php
git commit -m "#00171: feat:連続プレイが節目(3日・7日・30日)に届いた日と初めてかを、答えのAPIで返す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: パスポートのAPIで、いちばん長い連続と節目のバッジを返す

**Files:**
- Modify: `routes/api.php`（`GET /api/passport` の最後の `return`）
- Test: `tests/Feature/PassportTest.php`

**Interfaces:**
- Consumes: `UserProfile::STREAK_MILESTONES`（Task 1）
- Produces: パスポートのAPIの `best_streak`（`int`）と `streak_milestones`（`array<{days: int, earned: bool}>`、3日・7日・30日の順）

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/PassportTest.php` の `use` に `use App\Models\User;` を足し、ファイルの最後に次を足す。

```php
it('いちばん長い連続と、節目ごとのバッジをもらったかを返す', function () {
    $profile = createActiveProfile();
    $profile->update(['best_streak' => 7, 'current_streak' => 1]);

    $response = $this->getJson('/api/passport');

    $response->assertOk();
    expect($response->json('best_streak'))->toBe(7);
    expect($response->json('streak_milestones'))->toBe([
        ['days' => 3, 'earned' => true],
        ['days' => 7, 'earned' => true],
        ['days' => 30, 'earned' => false],
    ]);
});

it('プロフィールを選んでいなければ、連続は0日でバッジはどれもまだ', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->withHeader('Referer', 'http://localhost');

    $response = $this->getJson('/api/passport');

    $response->assertOk();
    expect($response->json('best_streak'))->toBe(0);
    expect(collect($response->json('streak_milestones'))->pluck('earned')->all())->toBe([false, false, false]);
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `./vendor/bin/sail artisan test tests/Feature/PassportTest.php`
Expected: 新しい2件が FAIL（`best_streak` が `null`）。今までの2件は PASS

- [ ] **Step 3: 実装する**

`routes/api.php` の `GET /api/passport` で、`$titles = ...;` の下に足す。

```php
    // 連続プレイの節目のバッジ(docs/design/2026-09-28-streak-milestones-design.md 3-4)。一度届いたら、途切れても消えない
    $bestStreak = $profileId
        ? (int) (UserProfile::query()->whereKey($profileId)->value('best_streak') ?? 0)
        : 0;
```

同じルートの `return [` を次のようにする。

```php
    return [
        'countries' => $countries,
        'titles' => $titles,
        'visited_count' => $countries->filter(fn ($c) => $c['stamp_tier'] !== 'none')->count(),
        'best_streak' => $bestStreak,
        'streak_milestones' => collect(UserProfile::STREAK_MILESTONES)
            ->map(fn (int $days) => ['days' => $days, 'earned' => $bestStreak >= $days])
            ->all(),
    ];
```

- [ ] **Step 4: テストが通るのを確かめる**

Run: `./vendor/bin/sail artisan test tests/Feature/PassportTest.php`
Expected: PASS（4件）

- [ ] **Step 5: 全体のテストを流してコミットする**

Run: `./vendor/bin/sail artisan test`
Expected: PASS（332件）

```bash
git add routes/api.php tests/Feature/PassportTest.php
git commit -m "#00172: feat:パスポートのAPIで、いちばん長い連続と節目のバッジをもらったかを返す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 節目のバッジの画像と、バッジ・一言を選ぶ部品

**Files:**
- Modify: `tools/spru-assets/crops.json`（`badges` に3つ）
- Generated: `frontend/public/spru/badges/streak-3.webp`・`streak-7.webp`・`streak-30.webp`、`frontend/src/components/spru/spru-assets.ts`
- Create: `frontend/src/components/quiz/streak-milestone.ts`
- Test: `frontend/src/components/quiz/streak-milestone.test.ts`

**Interfaces:**
- Produces: `BadgeKey` に `"streak-3" | "streak-7" | "streak-30"`。`streakMilestoneBadge(days: number): "streak-3" | "streak-7" | "streak-30" | null`、`streakMilestoneLine(days: number, first: boolean): string`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/quiz/streak-milestone.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { streakMilestoneBadge, streakMilestoneLine } from "./streak-milestone";

describe("連続プレイの節目のバッジ", () => {
  it("3日・7日・30日は、その日数の炎のバッジ", () => {
    expect(streakMilestoneBadge(3)).toBe("streak-3");
    expect(streakMilestoneBadge(7)).toBe("streak-7");
    expect(streakMilestoneBadge(30)).toBe("streak-30");
  });

  it("節目でない日数は、バッジなし", () => {
    expect(streakMilestoneBadge(0)).toBeNull();
    expect(streakMilestoneBadge(2)).toBeNull();
    expect(streakMilestoneBadge(14)).toBeNull();
  });
});

describe("節目のお祝いの一言", () => {
  it("初めては、バッジをもらったことを知らせる", () => {
    expect(streakMilestoneLine(3, true)).toBe("バッジをゲット！パスポートに入れたよ");
  });

  it("2回目からは、また続いたことをほめる", () => {
    expect(streakMilestoneLine(7, false)).toBe("また7日つづいたね！");
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/quiz/streak-milestone.test.ts`
Expected: FAIL（`Cannot find module './streak-milestone'`）

- [ ] **Step 3: バッジを切り抜く**

`tools/spru-assets/crops.json` の `badges` の最後（`"boss-battle"` の行）の後ろに足す（前の行の末尾に `,` を付ける）。

```json
    { "key": "streak-3", "source": "m11", "box": [226, 490, 372, 628], "scale": 0.85 },
    { "key": "streak-7", "source": "m11", "box": [408, 478, 564, 628], "scale": 0.85 },
    { "key": "streak-30", "source": "m11", "box": [600, 466, 784, 630], "scale": 0.85 }
```

Run（リポジトリ直下で、バックグラウンドで）: `python3 tools/spru-assets/extract.py ../../company/mascot/assets`
Expected: 最後に「…・バッジ 18・スタンプ 7 を書き出しました」。`git status --short` で、変わったのが `crops.json`・`spru-assets.ts` と新しい3つの webp だけ（ほかの画像は作り直しても同じ）

切り抜いた3枚を水色の背景に並べた確認用の画像を `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/streak-badges.png` に作って見る（枠や名前の文字が入っていない・炎が欠けていない）。見たら消す。

- [ ] **Step 4: 部品を書く**

`frontend/src/components/quiz/streak-milestone.ts`

```ts
// 連続プレイの節目(docs/design/2026-09-28-streak-milestones-design.md 4-2)

type StreakBadge = "streak-3" | "streak-7" | "streak-30";

const MILESTONE_BADGES: Record<number, StreakBadge> = {
  3: "streak-3",
  7: "streak-7",
  30: "streak-30",
};

/** 節目の日数から、mascot-11 の炎のバッジを選ぶ。節目でない日数は null */
export function streakMilestoneBadge(days: number): StreakBadge | null {
  return MILESTONE_BADGES[days] ?? null;
}

/** お祝いの一言。初めてはバッジをもらったこと、2回目からは続いたことをほめる */
export function streakMilestoneLine(days: number, first: boolean): string {
  return first ? "バッジをゲット！パスポートに入れたよ" : `また${days}日つづいたね！`;
}
```

- [ ] **Step 5: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/quiz/streak-milestone.test.ts`
Expected: PASS（4件）

- [ ] **Step 6: 全体を確かめてコミットする**

Run: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
Expected: Vitest PASS（192件）、型チェックとlintはエラーなし

```bash
git add tools/spru-assets/crops.json frontend/public/spru/badges/streak-3.webp frontend/public/spru/badges/streak-7.webp frontend/public/spru/badges/streak-30.webp frontend/src/components/spru/spru-assets.ts frontend/src/components/quiz/streak-milestone.ts frontend/src/components/quiz/streak-milestone.test.ts
git commit -m "#00173: feat:連続プレイの節目のバッジ(mascot-11の3日・7日・30日)を切り抜き、バッジとお祝いの一言を選ぶ部品を足す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: お祝いの画面と、クイズの中で出す順番

**Files:**
- Create: `frontend/src/components/quiz/streak-milestone-overlay.tsx`
- Modify: `frontend/src/components/quiz/quiz-session.tsx`

**Interfaces:**
- Consumes: 答えのAPIの `profile.streak_milestone`・`profile.streak_milestone_first`・`profile.streak_milestone_bonus_coin`（Task 1）、`streakMilestoneBadge`・`streakMilestoneLine`（Task 3）
- Produces: `StreakMilestoneOverlay({ days, first, bonusCoin, onContinue }: { days: number; first: boolean; bonusCoin: number; onContinue: () => void })`

この Task の計算部分は Task 3 でテスト済み。画面の流れは型チェック・lint と Task 6 のブラウザ確認で確かめる。

- [ ] **Step 1: お祝いの画面を書く**

`frontend/src/components/quiz/streak-milestone-overlay.tsx`

```tsx
"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { BadgeImage } from "@/components/app/badge-image";
import { SpruFigure } from "@/components/spru/spru-figure";

import { streakMilestoneBadge, streakMilestoneLine } from "./streak-milestone";

/** 連続プレイの節目(3日・7日・30日)の全画面のお祝い(設計書4-3)。見た目は LevelUpOverlay にそろえる */
export function StreakMilestoneOverlay({
  days,
  first,
  bonusCoin,
  onContinue,
}: {
  days: number;
  first: boolean;
  bonusCoin: number;
  onContinue: () => void;
}) {
  const badge = streakMilestoneBadge(days);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="streak-milestone-title"
        className="animate-pop-in flex w-full max-w-[340px] flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] px-5 pt-5 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        <div className="flex items-end gap-2">
          {badge && <BadgeImage badge={badge} size={120} className="animate-pop-in" />}
          <SpruFigure image="cheer" standHeight={72} />
        </div>
        <h2 id="streak-milestone-title" className="text-2xl font-black text-[#c2402c]">
          <AutoFurigana text={`${days}日連続プレイ！`} />
        </h2>
        <p className="text-sm font-bold text-[#6b5d45]">
          <AutoFurigana text={streakMilestoneLine(days, first)} />
        </p>
        {bonusCoin > 0 && (
          <p className="text-sm font-black text-[#7a5a0e]">ボーナス +{bonusCoin}Coin</p>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="mt-1 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
        >
          つづける
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: クイズで「お祝い待ち」を覚える**

`quiz-session.tsx` の import に足す（`./level-up-overlay` の並び）。

```tsx
import { StreakMilestoneOverlay } from "./streak-milestone-overlay";
```

`type StreakInfo = {...};` の下に足す。

```tsx
type StreakMilestone = { days: number; first: boolean; bonusCoin: number };
```

`const [levelUpOpen, setLevelUpOpen] = useState(false);` の下に足す。

```tsx
  // 連続プレイの節目に届いた答えのあと、「つぎへ」でお祝いを出すまで覚えておく(設計書4-4)
  const [streakMilestone, setStreakMilestone] = useState<StreakMilestone | null>(null);
  const [streakMilestoneOpen, setStreakMilestoneOpen] = useState(false);
```

答えを送る関数で、`setStreak(...);` の呼び出しのすぐ下に足す。

```tsx
      if (data.profile?.streak_milestone) {
        setStreakMilestone({
          days: data.profile.streak_milestone,
          first: Boolean(data.profile.streak_milestone_first),
          bonusCoin: data.profile.streak_milestone_bonus_coin ?? 0,
        });
      }
```

- [ ] **Step 3: 「つぎへ」の順番を直す**

`handleNext()` と `handleLevelUpContinue()` を次のものに置き換え、`handleMilestoneContinue()` を足す。

```tsx
  function handleNext() {
    // レベルが上がったときは、次の問題(最後なら結果画面)の前にお祝いを挟む
    if (levelUp && !levelUpOpen) {
      setLevelUpOpen(true);
      playSound("allCorrect");
      return;
    }
    if (openStreakMilestone()) return;
    advance();
  }

  // 連続プレイの節目に届いたときは、レベルアップのあとにお祝いを挟む。出したら true
  function openStreakMilestone(): boolean {
    if (!streakMilestone || streakMilestoneOpen) return false;
    setStreakMilestoneOpen(true);
    playSound("allCorrect");
    return true;
  }

  function handleLevelUpContinue() {
    setLevelUp(null);
    setLevelUpOpen(false);
    if (openStreakMilestone()) return;
    advance();
  }

  function handleMilestoneContinue() {
    setStreakMilestone(null);
    setStreakMilestoneOpen(false);
    advance();
  }
```

`resetRun()` の `setLevelUpOpen(false);` の下に足す。

```tsx
    setStreakMilestone(null);
    setStreakMilestoneOpen(false);
```

- [ ] **Step 4: お祝いの画面を出す**

いちばん下の `{levelUpOpen && levelUp && (<LevelUpOverlay ... />)}` のすぐ下（`</SkyPage>` の前）に足す。

```tsx
      {streakMilestoneOpen && streakMilestone && (
        <StreakMilestoneOverlay
          days={streakMilestone.days}
          first={streakMilestone.first}
          bonusCoin={streakMilestone.bonusCoin}
          onContinue={handleMilestoneContinue}
        />
      )}
```

- [ ] **Step 5: 答えのカードの「N日連続プレイ！」を、不正解でも出す**

答えのカードの正解の側（`lastCorrect ? (<>...</>)`）から、次のかたまりを取り除く。

```tsx
                {streak?.streak_extended_today && (
                  <p className="flex items-center gap-1 text-sm font-bold text-[#c2402c]">
                    <BadgeImage badge="streak" size={20} />
                    {streak.streak}日連続プレイ！
                    {streak.streak_milestone_bonus_coin > 0 && ` ボーナス+${streak.streak_milestone_bonus_coin}Coin`}
                  </p>
                )}
```

正解・不正解の出し分け（`{lastCorrect ? (...) : (...)}`）が閉じたすぐ後ろ、「次へ ▶」のボタンの前に、同じかたまりを置く。

```tsx
            {streak?.streak_extended_today && (
              <p className="flex items-center gap-1 text-sm font-bold text-[#c2402c]">
                <BadgeImage badge="streak" size={20} />
                {streak.streak}日連続プレイ！
                {streak.streak_milestone_bonus_coin > 0 && ` ボーナス+${streak.streak_milestone_bonus_coin}Coin`}
              </p>
            )}
```

- [ ] **Step 6: 確かめてコミットする**

Run: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
Expected: Vitest PASS（192件）、型チェックとlintはエラーなし

```bash
git add frontend/src/components/quiz/streak-milestone-overlay.tsx frontend/src/components/quiz/quiz-session.tsx
git commit -m "#00174: feat:連続プレイの節目に届いた日、つぎへのあとに全画面のお祝いを出し、連続の行を不正解でも出す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: パスポートに「連続プレイのバッジ」の欄を足す

**Files:**
- Modify: `frontend/src/app/passport/page.tsx`

**Interfaces:**
- Consumes: パスポートのAPIの `best_streak`・`streak_milestones`（Task 2）、`streakMilestoneBadge`（Task 3）

- [ ] **Step 1: 型と import を足す**

import に足す。

```tsx
import { streakMilestoneBadge } from "@/components/quiz/streak-milestone";
```

`type PassportData` を次のようにする。

```tsx
type PassportData = {
  countries: PassportCountry[];
  titles: string[];
  visited_count: number;
  best_streak: number;
  streak_milestones: { days: number; earned: boolean }[];
};
```

`const { countries, titles, visited_count: visitedCount } = data;` を次のようにする。

```tsx
  const {
    countries,
    titles,
    visited_count: visitedCount,
    best_streak: bestStreak,
    streak_milestones: streakMilestones,
  } = data;
```

- [ ] **Step 2: 欄を足す**

国スタンプの `</section>` と `{/* 称号 */}` の間に足す。

```tsx
          {/* 連続プレイのバッジ(設計書4-5)。もらったものはカラー、まだのものは白黒で薄く */}
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-[#6b5d45]">
              <BadgeImage badge="streak" size={24} />
              連続プレイのバッジ
            </h2>
            <div className="flex flex-wrap items-end gap-4">
              {streakMilestones.map(({ days, earned }) => {
                const badge = streakMilestoneBadge(days);
                return badge ? (
                  <BadgeImage
                    key={days}
                    badge={badge}
                    size={72}
                    alt={`${days}日連続のバッジ（${earned ? "もらった" : "まだ"}）`}
                    className={earned ? "" : "opacity-45 grayscale"}
                  />
                ) : null;
              })}
            </div>
            <p className="mt-3 text-sm font-bold text-[#6b5d45]">
              いちばん長い連続: {bestStreak}日
            </p>
          </section>
```

- [ ] **Step 3: 確かめてコミットする**

Run: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
Expected: Vitest PASS（192件）、型チェックとlintはエラーなし

```bash
git add frontend/src/app/passport/page.tsx
git commit -m "#00175: feat:パスポートに連続プレイのバッジの欄と、いちばん長い連続を出す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: ブラウザで確かめ、SPEC・TASKSを更新する

**Files:**
- Create（確認のあと消す）: `storage/app/private/streak-check.php`、`storage/app/private/streak-check-snapshot.json`（どちらも git に入らない）
- Modify: `SPEC.md`、`TASKS.md`
- Modify（追記のみ、git 管理外）: `/Users/katsuhiro.k1215/SmartSprouts/company/mascot/CLAUDE.md`

- [ ] **Step 1: 開発DBを記録・復元する道具を用意する**

`storage/app/private/streak-check.php`

```php
<?php
// 開発DBの「町テスト」(id 7)を、ブラウザ確認の前に記録し、確認のあとに元へ戻す。使い終わったら消す
$id = 7;
$path = storage_path('app/private/streak-check-snapshot.json');
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

Run: `./vendor/bin/sail artisan tinker --execute='$mode="save"; require storage_path("app/private/streak-check.php");'`
Expected: `saved`

- [ ] **Step 2: 3日の節目（初めて・不正解でも出る）を確かめる**

「きのうまで2日つづいた」状態にする。

Run: `./vendor/bin/sail artisan tinker --execute='App\Models\UserProfile::whereKey(7)->update(["current_streak" => 2, "best_streak" => 2, "last_played_date" => Illuminate\Support\Carbon::now("Asia/Tokyo")->subDay()->toDateString()]); echo App\Models\Stage::whereHas("questions")->value("id");'`
Expected: ステージの id が1つ出る

390px で `http://localhost:3000/quiz/{そのid}` を開き（ログインが切れていたら `test@example.com` / `password` で入り「町テスト」を選ぶ）、**わざと不正解**を選ぶ。

- 答えのカードに「3日連続プレイ！」の行が出る
- 「次へ ▶」で、お祝いの画面（3日の炎のバッジ・「3日連続プレイ！」・「バッジをゲット！パスポートに入れたよ」）が出る
- 「つづける」で次の問題に進み、次の答えのあとにはお祝いが出ない
- コンソールにエラーが無い

スクリーンショットを撮って見たら消す。

- [ ] **Step 3: 7日の節目（2回目・ボーナス・レベルアップと重なる）を確かめる**

Run: `./vendor/bin/sail artisan tinker --execute='$p = App\Models\UserProfile::find(7); $p->update(["current_streak" => 6, "best_streak" => 10, "last_played_date" => Illuminate\Support\Carbon::now("Asia/Tokyo")->subDay()->toDateString(), "xp" => App\Support\LevelCurve::totalXpFor($p->level + 1) - 1]); echo "ok";'`
Expected: `ok`

クイズを開き直して**正解**を選ぶ。

- 「次へ ▶」で、先にレベルアップのお祝い、「つづける」で次に7日のお祝い（「また7日つづいたね！」・「ボーナス +50Coin」）が出る
- 「つづける」で次の問題に進む

1280px でもお祝いの画面を1回見る。スクリーンショットは見たら消す。

- [ ] **Step 4: 最後の問題で節目に届いたとき・パスポートを確かめる**

クイズを開き直し、最後の問題の手前まで答えて進める。最後の問題に答える前に、Step 2 の tinker（`current_streak` 2・`best_streak` 2・`last_played_date` きのう）をもう一度流してから、最後の問題に答える。

- 「結果を見る ▶」で3日のお祝いが出て、「つづける」のあと結果画面に進む

`http://localhost:3000/passport` を開く（この時点で best_streak は10以上）。

- 「連続プレイのバッジ」の欄に、3つのバッジがカラーで並ぶ
- 「いちばん長い連続: 10日」（またはそれ以上）

tinker で `best_streak` を 4 にして開き直し、3日だけカラー・7日と30日が白黒で薄いことを見る。390px と 1280px で横にはみ出さないことも見る。スクリーンショットは見たら消す。

- [ ] **Step 5: 開発DBを元に戻し、道具を消す**

Run: `./vendor/bin/sail artisan tinker --execute='$mode="restore"; require storage_path("app/private/streak-check.php");'`
Expected: `restored`

Run: `./vendor/bin/sail artisan tinker --execute='$p = App\Models\UserProfile::find(7); echo $p->current_streak." ".$p->best_streak." ".$p->xp." ".$p->coins;'`
Expected: Step 1 の前と同じ値

`storage/app/private/streak-check.php` と `streak-check-snapshot.json` を消す。ブラウザを閉じる。

- [ ] **Step 6: SPEC・TASKS・マスコット部のメモを更新する**

`SPEC.md` の「✅ **ストリーク**（2026-07-31実装）…」の行の下に足す。

```markdown
- ✅（2026-09-28実装）**連続プレイの節目**: 3日・7日・30日に届いた日、答えのカードの「次へ」のあとに全画面でお祝いする（mascot-11 の炎のバッジ、正解・不正解のどちらでも）。初めては「バッジをゲット！」、途切れたあとの2回目からは「またN日つづいたね！」。7日ごとの50コインは今のまま。節目と「初めてか」はサーバーで決める（`UserProfile::STREAK_MILESTONES`）。もらったバッジはパスポートの「連続プレイのバッジ」に残る（いちばん長い連続から判定、途切れても消えない）。答えのカードの「N日連続プレイ！」は不正解でも出すようにした（`docs/design/2026-09-28-streak-milestones-design.md`）
```

`SPEC.md` の 4-4b（マイパスポート）の「国スタンプの絵」の行の下に足す。

```markdown
- ✅（2026-09-28実装）連続プレイのバッジ: 3日・7日・30日の炎のバッジを並べ、もらったものはカラー、まだのものは白黒で薄く出す。下に「いちばん長い連続: N日」。`GET /api/passport` が `best_streak` と `streak_milestones` を返す
```

`SPEC.md` の「2026-09-28時点で188件」を「2026-09-28時点で192件」にする。

`TASKS.md` の「バッジ素材の残り（mascot-11 の連続プレイの節目3日・7日・30日、相棒のなかよし度1〜3）を、その機能の画面を作るときに使う」を、次の2行にする。

```markdown
- [x] **連続プレイの節目（3日・7日・30日）のお祝いと、パスポートのバッジ**（2026-09-28。mascot-11 の炎のバッジ。設計書 `docs/design/2026-09-28-streak-milestones-design.md`、実装計画 `docs/design/2026-09-28-streak-milestones-plan.md`）
- [ ] バッジ素材の残り（mascot-11 の相棒のなかよし度1〜3、文字なしの炎）を、その機能の画面を作るときに使う
```

`/Users/katsuhiro.k1215/SmartSprouts/company/mascot/CLAUDE.md` の最後に1行足す（追記のみ）。

```markdown
  - 2026-09-28追記（連続プレイの節目）: mascot-11 の「連続プレイの節目」から、文字入りの炎（3日・7日・30日）を切り抜いて、節目のお祝いの画面とパスポートに使用中（`badges/streak-3`・`streak-7`・`streak-30`）。文字なしの炎は未使用
```

- [ ] **Step 7: 全体を確かめてコミットする**

Run: `./vendor/bin/sail artisan test && cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
Expected: バックエンド PASS（332件）、Vitest PASS（192件）、型チェックとlintはエラーなし

```bash
git add SPEC.md TASKS.md
git commit -m "#00176: docs:連続プレイの節目のお祝いとパスポートのバッジをSPEC/TASKSに反映する

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
