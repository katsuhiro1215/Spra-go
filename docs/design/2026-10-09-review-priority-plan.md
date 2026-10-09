# 復習の出し方の優先順位 実装計画

> **実行する人へ:** `superpowers:executing-plans`（インライン）で、タスクの順に進める。手順は `- [ ]` で追う。

**目的:** 出す日が来た問題が溜まっても、最近まちがえた問題・苦手の語・あと1回で覚える問題が復習に入るようにする。

**方針:** 枠ごとの検索を `QuestionMemory::slotIds` に足し、`ReviewPicker`（新規）が毎日の復習とステージのおさらいの枠を組み立てる。「いちばん遅れている問題」は今の `QuestionMemory::dueIds` をそのまま使う。

**技術:** Laravel 12 / Pest / MySQL（`testing` DB。2つのテストを同時に走らせない）

**設計書:** `docs/design/2026-10-09-review-priority-design.md`

ブランチ: `feature/review-priority`（作成済み）

テストの実行（Sailのコンテナ内）:

```bash
docker exec spra-go-laravel.test-1 php artisan test --filter=ReviewPicker
docker exec spra-go-laravel.test-1 php artisan test          # 全体(同時に2つ走らせない)
```

## 全体の決まり（設計書3章より。全タスクに効く）

- 毎日の復習の枠: 最近まちがえた 3／苦手の語 2／あと1回で覚える 2／残りは「いちばん遅れている問題」
- 最近 = まちがえた日が7日以内。苦手の語は、最後に答えてから3日以上あけて出す（出す日が来ていれば、あけなくてもよい）。覚えた問題も含める
- 使われなかった枠は「いちばん遅れている問題」に回す。同じ問題を2回出さない
- 今までどおり出さない: 国旗キャッチ専用の問題（`meta.catch_only`）・鍵の国の問題・消された問題
- ステージのおさらい: 1問目 = 「最近まちがえた → 苦手の語 → あと1回」の順で最初に見つかったもの（国を先に）、残り（`stage_mix` − 1）= いちばん遅れている問題（国を先に）
- スプルキャッチ（`CatchGame`）と画面は変えない

## 確認しておくこと（設計書にあって、どのタスクのテストにもない入力）

1. 出す日が来た問題が1つもなく、苦手の語だけがあるとき → 毎日の復習は、その苦手の語を出す（`available: true`）。→ タスク3
2. 1つの問題が複数の枠に当てはまる（まちがえた＋苦手＋段階5）とき → 1回だけ入り、枠の数を食わない。→ タスク2
3. 設定の枠の合計が `limit` より大きいとき → 枠の順に切り詰める。→ タスク2
4. 今日まちがえた問題（出す日は明日）→ 今日は入らない。→ タスク1
5. 語のない問題（`meta.word_id` なし）が、苦手の枠で壊れない。→ タスク1

---

## タスク1: 設定と枠ごとの検索（`QuestionMemory::slotIds`）

**ファイル:**
- 変更: `config/review.php`
- 変更: `app/Support/QuestionMemory.php`（`dueQuery` を `baseQuery` と分ける・`narrow` を共通化・`slotIds` と `weakQuery` を足す）
- 新規: `tests/Feature/ReviewPickerTest.php`

**インターフェース:**
- 作るもの: `QuestionMemory::slotIds(UserProfile $profile, string $slot, int $limit, array $excludeIds = [], ?int $preferCountryId = null): array`（`list<int>`。`$slot` は `recent_wrong`・`weak`・`almost`）。設定 `config('review.priority')`

- [ ] **手順1: 設定を足す**

`config/review.php` の `'variants' => [...]` の後ろ（`];` の前）に足す:

```php
    /*
    | 出す順番の優先(docs/design/2026-10-09-review-priority-design.md 4-1)。
    | daily: 毎日の復習の枠(残りは「いちばん遅れている問題」)。stage: ステージのおさらいの先頭の1問が探す順。
    | recent_wrong_days: まちがえてから何日までを「最近」とするか。weak_gap_days: 苦手の語を、最後に答えてから何日あけて出すか
    */

    'priority' => [
        'daily' => ['recent_wrong' => 3, 'weak' => 2, 'almost' => 2],
        'stage' => ['recent_wrong', 'weak', 'almost'],
        'recent_wrong_days' => 7,
        'weak_gap_days' => 3,
    ],
```

- [ ] **手順2: 失敗するテストを書く**

`tests/Feature/ReviewPickerTest.php` を作る（このファイルのヘルパーは `picker` から始める名前にして、ほかのテストと名前がぶつからないようにする）:

```php
<?php

use App\Models\ProfileQuestionMemory;
use App\Models\ProfileWord;
use App\Models\Question;
use App\Models\UserProfile;
use App\Support\QuestionMemory;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 復習の出し方の優先順位(docs/design/2026-10-09-review-priority-design.md)
|--------------------------------------------------------------------------
|
| 枠: 最近まちがえた(7日以内)・苦手の語(出す日前でも3日あければ)・あと1回で覚える(段階5)。
| 残りは、出す日が古い順(いちばん遅れている問題)。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-09 03:00:00', 'UTC')); // 日本時間 10/09 12:00
});

/** 覚え具合の行を直接作る(段階・出す日などを自由に決める)。既定は「10/08が出す日・段階1」 */
function pickerMemory(UserProfile $profile, array $attributes = [], ?Question $question = null): Question
{
    $question ??= createQuestionWithChoices()[0];
    ProfileQuestionMemory::create($attributes + [
        'user_profile_id' => $profile->id,
        'question_id' => $question->id,
        'level' => 1,
        'due_on' => '2026-10-08',
        'mastered_on' => null,
        'last_answered_on' => '2026-10-07',
        'wrong_on' => null,
    ]);

    return $question;
}

/** 苦手にした語の問題を作る(meta.word_id つき)。$memory はその問題の覚え具合 */
function pickerWeak(UserProfile $profile, array $memory = [], string $status = 'weak'): Question
{
    [$question] = createQuestionWithChoices();
    $word = makeWord('picker'.uniqid());
    $question->update(['meta' => ['kind' => 'word', 'word' => $word->word, 'word_id' => $word->id]]);
    ProfileWord::create(['user_profile_id' => $profile->id, 'word_id' => $word->id, 'seen_at' => now(), 'status' => $status]);

    return pickerMemory($profile, $memory, $question);
}

it('最近まちがえた問題: 7日以内にまちがえて、出す日が来ているものを、新しい順に出す', function () {
    $profile = createActiveProfile();
    $older = pickerMemory($profile, ['wrong_on' => '2026-10-03', 'due_on' => '2026-10-04']);
    $newer = pickerMemory($profile, ['wrong_on' => '2026-10-08', 'due_on' => '2026-10-09']);
    pickerMemory($profile, ['wrong_on' => '2026-10-01', 'due_on' => '2026-10-02']); // 8日前: 最近ではない
    pickerMemory($profile, ['wrong_on' => '2026-10-09', 'due_on' => '2026-10-10']); // 今日まちがえた: 出す日は明日
    pickerMemory($profile); // まちがえていない

    expect(QuestionMemory::slotIds($profile, 'recent_wrong', 10))->toBe([$newer->id, $older->id]);
});

it('あと1回で覚える問題: 段階5で出す日が来ているものだけ。出す日が古い順', function () {
    $profile = createActiveProfile();
    $second = pickerMemory($profile, ['level' => 5, 'due_on' => '2026-10-07']);
    $first = pickerMemory($profile, ['level' => 5, 'due_on' => '2026-10-01']);
    pickerMemory($profile, ['level' => 4, 'due_on' => '2026-10-01']);
    pickerMemory($profile, ['level' => 5, 'due_on' => '2026-10-10']); // まだ

    expect(QuestionMemory::slotIds($profile, 'almost', 10))->toBe([$first->id, $second->id]);
});

it('苦手の語: 出す日が来ていれば出る。来ていなくても、最後に答えてから3日あいていれば出る(2日では出ない)', function () {
    $profile = createActiveProfile();
    $due = pickerWeak($profile, ['due_on' => '2026-10-08', 'last_answered_on' => '2026-10-08']);
    $gap3 = pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-14', 'last_answered_on' => '2026-10-06']);
    pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-14', 'last_answered_on' => '2026-10-07']); // 2日
    $mastered = pickerWeak($profile, ['level' => 5, 'due_on' => null, 'mastered_on' => '2026-09-01', 'last_answered_on' => '2026-09-01']);

    // 最後に答えた日が古い順
    expect(QuestionMemory::slotIds($profile, 'weak', 10))->toBe([$mastered->id, $gap3->id, $due->id]);
});

it('苦手の語: 苦手でない語・覚えたマークの語・語のない問題は、出す日が来ていなければ出ない。語のない問題でも壊れない', function () {
    $profile = createActiveProfile();
    pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-14', 'last_answered_on' => '2026-09-20'], 'learned');
    pickerMemory($profile, ['level' => 3, 'due_on' => '2026-10-14', 'last_answered_on' => '2026-09-20']); // 語のない問題

    expect(QuestionMemory::slotIds($profile, 'weak', 10))->toBe([]);
});

it('枠の共通の決まり: 除く問題・国旗キャッチ専用・鍵の国は出ない。国の優先は先に並ぶ。limit 0 は空', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $gb = createTravelCountry('gb', 'イギリス');
    $profile->trips()->create(['destination' => 'gb', 'arrived_at' => now()]);

    $base = ['wrong_on' => '2026-10-07', 'due_on' => '2026-10-08'];
    $other = pickerMemory($profile, $base + ['last_answered_on' => '2026-10-07']);
    $mine = pickerMemory($profile, $base);
    $mine->update(['country_id' => $gb->id]);
    $locked = pickerMemory($profile, $base);
    $locked->update(['country_id' => $us->id]);
    $catchOnly = pickerMemory($profile, $base);
    $catchOnly->update(['meta' => ['flag_key' => 'catch:test', 'catch_only' => true]]);
    $excluded = pickerMemory($profile, $base);

    $ids = QuestionMemory::slotIds($profile, 'recent_wrong', 10, [$excluded->id], $gb->id);

    expect($ids)->toBe([$mine->id, $other->id])
        ->and(QuestionMemory::slotIds($profile, 'recent_wrong', 0))->toBe([]);
});
```

- [ ] **手順3: 失敗を確かめる**

Run: `docker exec spra-go-laravel.test-1 php artisan test --filter=ReviewPicker`
Expected: FAIL（`Call to undefined method App\Support\QuestionMemory::slotIds()`）

- [ ] **手順4: `QuestionMemory` を直す**

`app/Support/QuestionMemory.php`:

1. 冒頭の `use` に足す: `use App\Models\ProfileWord;` と `use Illuminate\Support\Facades\DB;`
2. `dueIds` の中身を、共通の `narrow` を使う形に直す（動きは同じ）:

```php
        return self::narrow(self::dueQuery($profile), $excludeIds, $preferCountryId)
            ->orderBy('profile_question_memories.due_on')
            ->orderBy('profile_question_memories.id')
            ->limit($limit)
            ->pluck('profile_question_memories.question_id')
            ->map(fn ($id) => (int) $id)
            ->all();
```

（今の `->whereNull('questions.meta->catch_only')` から `->when($preferCountryId ...)` までの3つを `narrow` に移す。コメント「国旗キャッチ専用の問題は…」も `narrow` の中へ）

3. `dueIds` の後ろに `slotIds` を足す:

```php
    /**
     * 優先の枠(docs/design/2026-10-09-review-priority-design.md 4-2)で、問題を最大 $limit 個返す。
     * $slot: recent_wrong(7日以内にまちがえた・出す日が来た・新しい順) / weak(苦手の語・出す日が来たか、3日あいた・古い順) /
     * almost(段階5で出す日が来た・出す日が古い順)。覚えた問題・鍵の国・国旗キャッチ専用・$excludeIds は出さない(苦手の語は覚えた問題も出す)
     *
     * @param  list<int>  $excludeIds
     * @return list<int>
     */
    public static function slotIds(UserProfile $profile, string $slot, int $limit, array $excludeIds = [], ?int $preferCountryId = null): array
    {
        if ($limit <= 0) {
            return [];
        }

        $today = Garden::today();
        $config = config('review.priority');

        $query = match ($slot) {
            'recent_wrong' => self::dueQuery($profile)
                ->where('profile_question_memories.wrong_on', '>=', self::daysAfter($today, -$config['recent_wrong_days'])),
            'weak' => self::weakQuery($profile, $today, $config['weak_gap_days']),
            'almost' => self::dueQuery($profile)->where('profile_question_memories.level', '>=', 5),
        };
        self::narrow($query, $excludeIds, $preferCountryId);
        match ($slot) {
            'recent_wrong' => $query->orderByDesc('profile_question_memories.wrong_on'),
            'weak' => $query->orderBy('profile_question_memories.last_answered_on'),
            'almost' => $query->orderBy('profile_question_memories.due_on'),
        };

        return $query
            ->orderBy('profile_question_memories.id')
            ->limit($limit)
            ->pluck('profile_question_memories.question_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }
```

4. `dueQuery` を、`baseQuery` と `dueQuery` に分け、`weakQuery` と `narrow` を足す（今の `dueQuery` の位置）:

```php
    /** 覚え具合の行と問題を結んだもの(鍵の国の問題でない。国のない問題は鍵にならない) */
    private static function baseQuery(UserProfile $profile): Builder
    {
        $locked = Travel::lockedCountryIds($profile);

        return ProfileQuestionMemory::query()
            ->join('questions', 'questions.id', '=', 'profile_question_memories.question_id')
            ->where('profile_question_memories.user_profile_id', $profile->id)
            ->when($locked !== [], fn (Builder $query) => $query->where(
                fn (Builder $inner) => $inner->whereNull('questions.country_id')->orWhereNotIn('questions.country_id', $locked),
            ));
    }

    /** 出す日が来た問題(覚えていない・鍵の国の問題でない)。国のない問題は鍵にならない */
    private static function dueQuery(UserProfile $profile): Builder
    {
        return self::baseQuery($profile)
            ->whereNull('profile_question_memories.mastered_on')
            ->where('profile_question_memories.due_on', '<=', Garden::today());
    }

    /** 苦手にした語(profile_words.status = weak)の問題で、出す日が来たもの、または最後に答えてから $gapDays 日以上あいたもの(覚えた問題も含む) */
    private static function weakQuery(UserProfile $profile, string $today, int $gapDays): Builder
    {
        $weakWordIds = ProfileWord::query()
            ->where('user_profile_id', $profile->id)
            ->where('status', ProfileWord::WEAK)
            ->select('word_id');

        return self::baseQuery($profile)
            ->whereIn(DB::raw('CAST(JSON_UNQUOTE(JSON_EXTRACT(questions.meta, "$.word_id")) AS UNSIGNED)'), $weakWordIds)
            ->where(fn (Builder $inner) => $inner
                ->where(fn (Builder $due) => $due
                    ->whereNull('profile_question_memories.mastered_on')
                    ->where('profile_question_memories.due_on', '<=', $today))
                ->orWhere('profile_question_memories.last_answered_on', '<=', self::daysAfter($today, -$gapDays)));
    }

    /**
     * 出す問題の共通の絞り込み: 国旗キャッチ専用の問題は、ステージのおさらいと仲間の復習には出さない(国旗キャッチの中は dueIdsAmong)。
     * $excludeIds は出さない。$preferCountryId の国の問題を先に並べる(並べ替えの先頭に足す)
     *
     * @param  list<int>  $excludeIds
     */
    private static function narrow(Builder $query, array $excludeIds, ?int $preferCountryId): Builder
    {
        return $query
            ->whereNull('questions.meta->catch_only')
            ->when($excludeIds !== [], fn (Builder $inner) => $inner->whereNotIn('profile_question_memories.question_id', $excludeIds))
            ->when($preferCountryId !== null, fn (Builder $inner) => $inner->orderByRaw(
                'CASE WHEN questions.country_id = ? THEN 0 ELSE 1 END',
                [$preferCountryId],
            ));
    }
```

- [ ] **手順5: 通ることを確かめる**

Run: `docker exec spra-go-laravel.test-1 php artisan test --filter="ReviewPicker|QuestionMemory|CatchOnlyReview|StageReview|ReviewTest"`
Expected: PASS（今の `dueIds` の動きは変わらないので、既存のテストも通る）。
`whereIn(DB::raw(...), $weakWordIds)` が通らないときは、`whereRaw('CAST(JSON_UNQUOTE(JSON_EXTRACT(questions.meta, "$.word_id")) AS UNSIGNED) IN (SELECT word_id FROM profile_words WHERE user_profile_id = ? AND status = ?)', [$profile->id, ProfileWord::WEAK])` にする。

- [ ] **手順6: コミット**

```bash
git add config/review.php app/Support/QuestionMemory.php tests/Feature/ReviewPickerTest.php
git commit -m "feat(復習): 優先の枠ごとの検索(最近まちがえた・苦手の語・あと1回)を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## タスク2: 枠を組み立てる（`ReviewPicker`）

**ファイル:**
- 新規: `app/Support/ReviewPicker.php`
- 変更: `tests/Feature/ReviewPickerTest.php`（末尾に足す）

**インターフェース:**
- 使うもの: タスク1の `QuestionMemory::slotIds(...)`、既存の `QuestionMemory::dueIds(UserProfile, int $limit, array $excludeIds = [], ?int $preferCountryId = null)`
- 作るもの: `ReviewPicker::daily(UserProfile $profile, ?int $limit = null): array`（`list<int>`）、`ReviewPicker::stage(UserProfile $profile, array $excludeIds, ?int $countryId): array`（`list<int>`）

- [ ] **手順1: 失敗するテストを書く**

`tests/Feature/ReviewPickerTest.php` の末尾に足す（`use App\Support\ReviewPicker;` を冒頭の `use` に足す）:

```php
/** いちばん遅れている問題(まちがえていない・段階1・出す日が古い)を $count 個作る。出す日は 9/01 から1日ずつ後ろへ */
function pickerOverdue(UserProfile $profile, int $count): array
{
    return collect(range(1, $count))->map(fn (int $i) => pickerMemory($profile, [
        'due_on' => Carbon::parse('2026-09-01')->addDays($i)->toDateString(),
        'last_answered_on' => '2026-08-31',
    ]))->pluck('id')->all();
}

it('毎日の復習: 出す日が来た古い問題が山のようにあっても、最近まちがえた問題が先に入る(最大3問)。残りは古い順', function () {
    $profile = createActiveProfile();
    $overdue = pickerOverdue($profile, 20);
    $wrong = collect(range(1, 4))->map(fn (int $i) => pickerMemory($profile, [
        'wrong_on' => Carbon::parse('2026-10-04')->addDays($i)->toDateString(), 'due_on' => '2026-10-08',
    ])->id)->all(); // wrong_on 10/05〜10/08

    $ids = ReviewPicker::daily($profile);

    // 新しい順の上位3問(10/08, 10/07, 10/06)。4問目は古い順の山に回り、出す日が10/08なので入らない
    expect($ids)->toHaveCount(10)
        ->and(array_slice($ids, 0, 3))->toBe([$wrong[3], $wrong[2], $wrong[1]])
        ->and(array_slice($ids, 3))->toBe(array_slice($overdue, 0, 7));
});

it('毎日の復習: 各枠が上限まで入り、「いちばん遅れている問題」が3問残る。同じ問題は2回入らない', function () {
    $profile = createActiveProfile();
    $overdue = pickerOverdue($profile, 6);
    $wrong = collect(range(1, 5))->map(fn () => pickerMemory($profile, ['wrong_on' => '2026-10-07', 'due_on' => '2026-10-08'])->id)->all();
    $weak = collect(range(1, 5))->map(fn () => pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-20', 'last_answered_on' => '2026-10-01'])->id)->all();
    $almost = collect(range(1, 5))->map(fn () => pickerMemory($profile, ['level' => 5, 'due_on' => '2026-10-08'])->id)->all();
    // まちがえた＋苦手＋段階5の問題は、1回だけ入る
    $triple = pickerWeak($profile, ['level' => 5, 'wrong_on' => '2026-10-08', 'due_on' => '2026-10-08', 'last_answered_on' => '2026-10-08']);

    $ids = ReviewPicker::daily($profile);

    expect($ids)->toHaveCount(10)
        ->and(array_unique($ids))->toHaveCount(10)
        ->and(count(array_intersect($ids, [...$wrong, $triple->id])))->toBeGreaterThanOrEqual(3)
        ->and(count(array_intersect($ids, $weak)))->toBe(2)
        ->and(count(array_intersect($ids, $almost)))->toBeGreaterThanOrEqual(2)
        ->and(array_slice($ids, 7))->toBe(array_slice($overdue, 0, 3)); // 古い順の最後の3問(山の先頭)
});

it('毎日の復習: 使われなかった枠は古い順で埋まる。出す日が来た問題が少ないときは、今までと同じ古い順', function () {
    $profile = createActiveProfile();
    $overdue = pickerOverdue($profile, 4);

    expect(ReviewPicker::daily($profile))->toBe($overdue);
});

it('毎日の復習: 出す日が来た問題がなく、苦手の語だけがあるときも、その語を出す。枠の合計より小さい limit は、枠の順に切り詰める', function () {
    $profile = createActiveProfile();
    $weak = pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-20', 'last_answered_on' => '2026-10-01']);

    expect(ReviewPicker::daily($profile))->toBe([$weak->id]);

    $wrong = collect(range(1, 3))->map(fn () => pickerMemory($profile, ['wrong_on' => '2026-10-07', 'due_on' => '2026-10-08'])->id)->all();

    expect(ReviewPicker::daily($profile, 2))->toHaveCount(2)
        ->and(array_diff(ReviewPicker::daily($profile, 2), $wrong))->toBe([]);
});

it('ステージのおさらい: 先頭の1問は最近まちがえた問題(その国を先に)。残りは古い順。ステージ自身の問題は除く', function () {
    $profile = createActiveProfile();
    $gb = createTravelCountry('gb', 'イギリス');
    $profile->trips()->create(['destination' => 'gb', 'arrived_at' => now()]);
    $overdue = pickerOverdue($profile, 3);
    $otherWrong = pickerMemory($profile, ['wrong_on' => '2026-10-08', 'due_on' => '2026-10-09']);
    $mineWrong = pickerMemory($profile, ['wrong_on' => '2026-10-06', 'due_on' => '2026-10-07']);
    $mineWrong->update(['country_id' => $gb->id]);
    $stageOwn = pickerMemory($profile, ['wrong_on' => '2026-10-08', 'due_on' => '2026-10-09']);

    $ids = ReviewPicker::stage($profile, [$stageOwn->id], $gb->id);

    // 先頭 = その国のまちがえた問題(国を先に)。2問目 = 古い順(ステージの問題と先頭の問題は除く)
    expect($ids)->toBe([$mineWrong->id, $overdue[0]]);
    expect(ReviewPicker::stage($profile, [$stageOwn->id], null)[0])->toBe($otherWrong->id);
});

it('ステージのおさらい: まちがえた問題がなければ、苦手の語 → あと1回の順。何もなければ空', function () {
    $profile = createActiveProfile();

    expect(ReviewPicker::stage($profile, [], null))->toBe([]);

    $almost = pickerMemory($profile, ['level' => 5, 'due_on' => '2026-10-01']);
    $weak = pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-20', 'last_answered_on' => '2026-10-01']);

    // 先頭は苦手の語(まちがえた問題がないので)。2問目はいちばん遅れている問題(段階5の問題。出す日が来ている)
    expect(ReviewPicker::stage($profile, [], null))->toBe([$weak->id, $almost->id]);
});
```

- [ ] **手順2: 失敗を確かめる**

Run: `docker exec spra-go-laravel.test-1 php artisan test --filter=ReviewPicker`
Expected: FAIL（`Class "App\Support\ReviewPicker" not found`）

- [ ] **手順3: `ReviewPicker` を作る**

`app/Support/ReviewPicker.php`:

```php
<?php

namespace App\Support;

use App\Models\UserProfile;

/**
 * 復習に出す問題の選び方(docs/design/2026-10-09-review-priority-design.md 4-2)。
 * 種類ごとの枠(最近まちがえた・苦手の語・あと1回で覚える)から先に選び、残りを「いちばん遅れている問題」(出す日が古い順)で埋める。
 */
class ReviewPicker
{
    /**
     * 毎日の復習の問題。枠の順に選び(枠の合計が $limit より大きいときは切り詰める)、残りを出す日が古い順で埋める
     *
     * @return list<int>
     */
    public static function daily(UserProfile $profile, ?int $limit = null): array
    {
        $limit ??= config('review.daily_size');
        $chosen = [];

        foreach (config('review.priority.daily') as $slot => $cap) {
            $chosen = [...$chosen, ...QuestionMemory::slotIds($profile, $slot, min($cap, $limit - count($chosen)), $chosen)];
        }

        return [...$chosen, ...QuestionMemory::dueIds($profile, $limit - count($chosen), $chosen)];
    }

    /**
     * ステージのおさらいの問題(`review.stage_mix` 問)。先頭の1問は優先の枠から(国を先に)、残りは出す日が古い順(国を先に)
     *
     * @param  list<int>  $excludeIds  ステージ自身の問題
     * @return list<int>
     */
    public static function stage(UserProfile $profile, array $excludeIds, ?int $countryId): array
    {
        $first = [];
        foreach (config('review.priority.stage') as $slot) {
            $first = QuestionMemory::slotIds($profile, $slot, 1, $excludeIds, $countryId);
            if ($first !== []) {
                break;
            }
        }

        return [
            ...$first,
            ...QuestionMemory::dueIds($profile, config('review.stage_mix') - count($first), [...$excludeIds, ...$first], $countryId),
        ];
    }
}
```

- [ ] **手順4: 通ることを確かめる**

Run: `docker exec spra-go-laravel.test-1 php artisan test --filter=ReviewPicker`
Expected: PASS（全部）。落ちたら、テストの数え方（10/08の出す日・wrong_on の並び）と実装のどちらが違うかを見て直す。テストの期待を合わせるだけで通さない。

- [ ] **手順5: コミット**

```bash
git add app/Support/ReviewPicker.php tests/Feature/ReviewPickerTest.php
git commit -m "feat(復習): 枠を組み立てるReviewPickerを足す(毎日の復習・ステージのおさらい)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## タスク3: 呼び出し側を差し替える

**ファイル:**
- 変更: `app/Support/Review.php:18`（`questionIds`）
- 変更: `routes/api.php:1252` 付近（ステージのおさらい）
- 変更: `tests/Feature/ReviewPickerTest.php`（末尾に足す）。必要なら既存のテスト（`ReviewTest`・`StageReviewTest`）

**インターフェース:**
- 使うもの: `ReviewPicker::daily(UserProfile, ?int $limit)`、`ReviewPicker::stage(UserProfile, array $excludeIds, ?int $countryId)`

- [ ] **手順1: 失敗するテストを書く**

`tests/Feature/ReviewPickerTest.php` の末尾に足す（`use App\Models\Category;`・`use App\Models\Stage;`・`use App\Support\Review;` を `use` に足す）:

```php
it('仲間からの復習(Review): 山があっても、昨日まちがえた問題が入る。苦手の語だけでも「復習できる」', function () {
    $profile = createActiveProfile();
    pickerOverdue($profile, 12);
    QuestionMemory::record($profile, ($yesterday = createQuestionWithChoices()[0])->id, false, '2026-10-08');

    expect(Review::questionIds($profile))->toContain($yesterday->id)
        ->and(Review::questionIds($profile))->toHaveCount(10);
});

it('町のAPIの復習: 出す日が来た問題がなく、苦手の語だけがあっても available になる', function () {
    $profile = createActiveProfile();
    pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-20', 'last_answered_on' => '2026-10-01']);

    $this->getJson('/api/world')->assertOk()
        ->assertJsonPath('review.available', true)
        ->assertJsonPath('review.count', 1);
});

it('ステージのおさらい: 山があっても、昨日まちがえた問題が review として入る', function () {
    $profile = createActiveProfile();
    $category = Category::create(['name' => '優先のカテゴリ'.uniqid()]);
    $stage = Stage::create(['category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => 1, 'is_boss' => false, 'question_count' => 1]);
    [$own] = createQuestionWithChoices();
    $stage->questions()->attach($own->id, ['order' => 1]);
    $overdue = pickerOverdue($profile, 5);
    QuestionMemory::record($profile, ($yesterday = createQuestionWithChoices()[0])->id, false, '2026-10-08');

    $questions = collect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions'));

    expect($questions->where('review', true)->pluck('id')->sort()->values()->all())
        ->toBe(collect([$yesterday->id, $overdue[0]])->sort()->values()->all());
});
```

- [ ] **手順2: 失敗を確かめる**

Run: `docker exec spra-go-laravel.test-1 php artisan test --filter=ReviewPicker`
Expected: 新しい3つが FAIL（まだ古い順だけで選んでいるため。昨日まちがえた問題が入らない／苦手の語だけでは `available` が false）

- [ ] **手順3: 差し替える**

`app/Support/Review.php` の `questionIds`:

```php
    /** @return list<int> 優先の枠 → 出す日が古い順(docs/design/2026-10-09-review-priority-design.md)。$limit を省くと config('review.daily_size') */
    public static function questionIds(UserProfile $profile, ?int $limit = null): array
    {
        return ReviewPicker::daily($profile, $limit);
    }
```

`routes/api.php`（ステージのおさらいの1252行付近）:

```php
    $reviewIds = $profile && ! $stage->is_boss
        ? ReviewPicker::stage($profile, $questions->pluck('id')->all(), $stage->country_id)
        : [];
```

`routes/api.php` の冒頭の `use` に `App\Support\ReviewPicker` を足す（`QuestionMemory` がまだ別の場所〔1075行・1407行〕で使われているので、`use` は消さない）。

- [ ] **手順4: 全体のテストを通す**

Run: `docker exec spra-go-laravel.test-1 php artisan test`（同時に2つ走らせない）
Expected: PASS。落ちた既存のテストがあれば、設計書の新しい挙動に合わせて直す（理由をテスト名か一言に残す）。挙動と無関係な落ち方は、原因を調べてから直す。

- [ ] **手順5: コミット**

```bash
git add app/Support/Review.php routes/api.php tests/Feature/ReviewPickerTest.php
git commit -m "feat(復習): 毎日の復習とステージのおさらいを優先の枠で選ぶ" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## タスク4: 確認とドキュメント

**ファイル:**
- 変更: `SPEC.md`（291行付近のおさらいの項目に追記）、`TASKS.md`（170〜171行付近、81行付近）、`docs/design/2026-10-09-review-priority-design.md`（ステータス）
- 一時: `storage/probe.php`（確認後に消す）

- [ ] **手順1: 開発用DBで確認する**

検証用のプロフィールを作り（確認後に消す）、tinker で次を作る: 出す日が来た古い問題30問・昨日まちがえた問題3問・苦手の語2つ（出す日はまだ）。`App\Support\ReviewPicker::daily($profile)` の戻りで、次を確かめる:
- 10問で、昨日まちがえた3問と苦手の語2つが入っている
- 残りは出す日が古い順
- `GET /api/world` の `review.count` が10

確認が終わったら、検証用のプロフィールと一時ファイルを消す（`storage/probe.php`）。

- [ ] **手順2: ドキュメントを直す**

- `SPEC.md` 291行付近（出題のくり返し）の末尾に足す: 「（2026-10-09）復習の出し方に優先の枠を足した。毎日の復習10問は 最近まちがえた3／単語帳で苦手にした語2（出す日前でも3日あければ）／あと1回で覚える2／残りは出す日が古い順。ステージのおさらいの1問目は優先の枠から。`app/Support/ReviewPicker.php`、`docs/design/2026-10-09-review-priority-design.md`」
- `TASKS.md`: 171行の④（復習の滞留対策）と、81行の③（苦手を出題で優先する）を、完了の取り消し線にして、2026-10-09完了・設計書へのリンクを書く。171行の「今学んでいる国／言語」「回答時間」は、残りの作業として残す
- 設計書のステータスを「実装済み（2026-10-09）」に直す

- [ ] **手順3: 自分で見直す（最終）**

ブランチ全体の差分（`git diff main...HEAD`）を、設計書と照らして読む。見る点: 枠の順序・上限、苦手の語の条件（出す日前の3日あき）、`dueIds` の動きが変わっていないこと、スプルキャッチに影響がないこと、`config('review.stage_mix')` が1のときに壊れないこと。見つけたものは、失敗するテストを先に書いてから直す。

- [ ] **手順4: 全体のテストとコミット**

Run: `docker exec spra-go-laravel.test-1 php artisan test`
Expected: PASS

```bash
git add SPEC.md TASKS.md docs/design/2026-10-09-review-priority-design.md
git commit -m "docs(復習): 復習の優先順位を仕様とタスクに反映する" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

マージはOwnerの確認後（Ownerの合図を待つ）。
