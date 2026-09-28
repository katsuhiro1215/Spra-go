# 出題のくり返し（おさらい） 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 問題ごとの覚え具合（段階1〜5・次に出る日・覚えた）を記録し、ボス以外のステージに出す日が来た問題を最大2問足し、相棒の復習を「出す日が来た問題を1日10問」に置き換え、パスポートに覚えた問題の数を出す。

**Architecture:** 新しい表 `profile_question_memories` と計算の入口 `App\Support\QuestionMemory` を作り、答えのAPIが記録する答えのたびに `record` を呼ぶ。出す問題の選び方は `dueIds` 1つにまとめ、ステージを遊ぶAPIと相棒の復習（`Review`）の両方が使う。今までの答えの記録からの引き継ぎはマイグレーションで1回だけ流す。画面は、足した問題に「おさらい」の札を付け、ステージの点数からは除く。

**Tech Stack:** Laravel 13（Sail）＋Pest、Next.js 16＋React 19＋TypeScript、Vitest

**Spec:** `docs/design/2026-09-29-spaced-review-design.md`

## Global Constraints

- ブランチは `feature/spaced-review`。コミットは `#NNNNN: type:要約`（日本語）、この計画のコミットは #00223、タスクは #00224 から。本文の最後に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`（`git commit -m "..." -m "Co-Authored-By: ..."`）
- 段階 → 次に出るまでの日数: 1→1、2→3、3→7、4→14、5→30（`config('review.intervals')`）
- 毎日の復習は最大10問（`config('review.daily_size')`）、ステージに足すのは最大2問（`config('review.stage_mix')`）、ボスには足さない
- 「その日」は `Garden::today()`（日本時間の日付）。次に出る日・覚えた日・最後に答えた日は日付（時刻なし）で持つ
- 答えたときの動き（設計書3-2）: 初めて答えた→段階1・次の日／出す日以降に正解→1つ上がる・その段階の日数だけ先／段階5で出す日以降に正解→覚えた（次に出る日なし）／まちがえた→いつでも段階1・次の日・覚えたも取り消す／出す日より前の正解・覚えた問題の正解→段階も次に出る日も変わらない
- 記録しない答え: 練習（`practice`）・体力0（`blocked`）・プロフィールなし
- 鍵の国（`Travel::lockedCountryIds`）の問題は出さない。国のない問題（`questions.country_id` が null）は鍵にならない
- バックエンドのテストは `./vendor/bin/sail test`（`--parallel` を付けない）。出力はJSONなので `"tool":"pest","result"` を見る
- 画面の文は `AutoFurigana` を通す
- 開発用のデータは壊さない（`migrate:fresh` はしない。`migrate` だけ）。ブラウザでの確認のあと、町テスト（id 7）の値が確認前と同じであることを確かめる

## Review Focus

1. **覚えた問題を、ステージのやり直しでまちがえたとき** → 段階1に戻り、覚えたが取り消される（Task 1のテスト「まちがえると、覚えた問題でも段階1に戻り、覚えたも取り消す」）
2. **同じ日に、同じ問題がステージのおさらいと相棒の復習の両方で出て、2回とも正解したとき** → 段階は1つだけ上がる（Task 1のテスト「同じ日に2回正解しても、段階は1つだけ上がる」）
3. **古い画面や書き換えで、ステージの問題の数より大きい点数が送られたとき** → 最高点は問題の数まで（Task 4のテスト「score が問題の数を超えても、最高点は問題の数まで」）
4. **今までの記録で、1回の正解が4行（体力・XP・コイン・ポイント）になっているとき** → 引き継ぎでは1回の答えとして数える（Task 2のテスト「1回の正解の4行は1回と数える」）
5. **国の進め方を変える前の記録に、まだ着いていない国の問題があるとき** → おさらいにも復習にも出ない（Task 1のテスト「鍵の国の問題は出さない」）

---

### Task 1: 覚え具合の表とルール

**Files:**
- Create: `database/migrations/2026_09_29_000001_create_profile_question_memories_table.php`
- Create: `app/Models/ProfileQuestionMemory.php`
- Create: `config/review.php`
- Create: `app/Support/QuestionMemory.php`
- Test: `tests/Feature/QuestionMemoryTest.php`

**Interfaces:**
- Produces:
  - 表 `profile_question_memories`（`user_profile_id`・`question_id`・`level`・`due_on`・`mastered_on`・`last_answered_on`）
  - `QuestionMemory::record(UserProfile $profile, int $questionId, bool $correct, ?string $today = null): void`
  - `QuestionMemory::dueIds(UserProfile $profile, int $limit, array $excludeIds = [], ?int $preferCountryId = null): list<int>`
  - `QuestionMemory::masteredCount(UserProfile $profile): int`
  - `config('review.intervals')`・`config('review.daily_size')`・`config('review.stage_mix')`

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/QuestionMemoryTest.php`:

```php
<?php

use App\Models\ProfileQuestionMemory;
use App\Models\Question;
use App\Models\UserProfile;
use App\Support\QuestionMemory;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 問題ごとの覚え具合(docs/design/2026-09-29-spaced-review-design.md 3章)
|--------------------------------------------------------------------------
|
| 段階1〜5。出す日以降に正解すると1つ上がり(間は 1→3→7→14→30日)、段階5で正解すると「覚えた」。
| まちがえるといつでも段階1・次の日。出す日より前の正解では変わらない。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-09-29 03:00:00', 'UTC')); // 日本時間 9/29 12:00
});

function memoryOf(UserProfile $profile, Question $question): ProfileQuestionMemory
{
    return ProfileQuestionMemory::query()
        ->where('user_profile_id', $profile->id)
        ->where('question_id', $question->id)
        ->sole();
}

/** 覚え具合を [段階, 次に出る日, 覚えた日] の形にする */
function memoryState(UserProfile $profile, Question $question): array
{
    $memory = memoryOf($profile, $question);

    return [$memory->level, $memory->due_on?->toDateString(), $memory->mastered_on?->toDateString()];
}

/** 出す日が来た問題を作る(9/20にまちがえた → 9/21から出す) */
function dueQuestionFor(UserProfile $profile, ?int $countryId = null): Question
{
    [$question] = createQuestionWithChoices();
    $question->update(['country_id' => $countryId]);
    QuestionMemory::record($profile, $question->id, false, '2026-09-20');

    return $question;
}

it('初めて答えたら、正解でも不正解でも段階1で、次の日に出す', function () {
    $profile = createActiveProfile();
    [$right] = createQuestionWithChoices();
    [$wrong] = createQuestionWithChoices();

    QuestionMemory::record($profile, $right->id, true);
    QuestionMemory::record($profile, $wrong->id, false);

    expect(memoryState($profile, $right))->toBe([1, '2026-09-30', null])
        ->and(memoryState($profile, $wrong))->toBe([1, '2026-09-30', null])
        ->and(memoryOf($profile, $right)->last_answered_on->toDateString())->toBe('2026-09-29');
});

it('出す日以降に正解すると1つ上がり、間は 3→7→14→30日。段階5で正解すると覚えた', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();

    QuestionMemory::record($profile, $question->id, true, '2026-09-01');
    expect(memoryState($profile, $question))->toBe([1, '2026-09-02', null]);

    QuestionMemory::record($profile, $question->id, true, '2026-09-02');
    expect(memoryState($profile, $question))->toBe([2, '2026-09-05', null]);

    QuestionMemory::record($profile, $question->id, true, '2026-09-06'); // 出す日より後でも上がる
    expect(memoryState($profile, $question))->toBe([3, '2026-09-13', null]);

    QuestionMemory::record($profile, $question->id, true, '2026-09-13');
    expect(memoryState($profile, $question))->toBe([4, '2026-09-27', null]);

    QuestionMemory::record($profile, $question->id, true, '2026-09-27');
    expect(memoryState($profile, $question))->toBe([5, '2026-10-27', null]);

    QuestionMemory::record($profile, $question->id, true, '2026-10-27');
    expect(memoryState($profile, $question))->toBe([5, null, '2026-10-27']);
});

it('出す日より前の正解では、段階も次に出る日も変わらない', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    QuestionMemory::record($profile, $question->id, true, '2026-09-28');

    QuestionMemory::record($profile, $question->id, true, '2026-09-28');

    expect(memoryState($profile, $question))->toBe([1, '2026-09-29', null]);
});

it('同じ日に2回正解しても、段階は1つだけ上がる(ステージのおさらいと相棒の復習の両方で出たとき)', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    QuestionMemory::record($profile, $question->id, true, '2026-09-28');

    QuestionMemory::record($profile, $question->id, true);
    QuestionMemory::record($profile, $question->id, true);

    expect(memoryState($profile, $question))->toBe([2, '2026-10-02', null]);
});

it('まちがえると、覚えた問題でも段階1に戻り、覚えたも取り消す', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    ProfileQuestionMemory::query()->create([
        'user_profile_id' => $profile->id, 'question_id' => $question->id,
        'level' => 5, 'due_on' => null, 'mastered_on' => '2026-09-01', 'last_answered_on' => '2026-09-01',
    ]);

    QuestionMemory::record($profile, $question->id, false);

    expect(memoryState($profile, $question))->toBe([1, '2026-09-30', null]);
});

it('覚えた問題に正解しても変わらない', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    ProfileQuestionMemory::query()->create([
        'user_profile_id' => $profile->id, 'question_id' => $question->id,
        'level' => 5, 'due_on' => null, 'mastered_on' => '2026-09-01', 'last_answered_on' => '2026-09-01',
    ]);

    QuestionMemory::record($profile, $question->id, true);

    expect(memoryState($profile, $question))->toBe([5, null, '2026-09-01']);
});

it('出す日が来た問題だけを、出す日が古い順に返す。まだの問題・覚えた問題・ほかのプロフィールの問題は出さない', function () {
    $profile = createActiveProfile();
    [$old] = createQuestionWithChoices();
    [$new] = createQuestionWithChoices();
    [$notYet] = createQuestionWithChoices();
    [$mastered] = createQuestionWithChoices();
    QuestionMemory::record($profile, $new->id, false, '2026-09-25');
    QuestionMemory::record($profile, $old->id, false, '2026-09-10');
    QuestionMemory::record($profile, $notYet->id, false); // 次に出るのは 9/30
    ProfileQuestionMemory::query()->create([
        'user_profile_id' => $profile->id, 'question_id' => $mastered->id,
        'level' => 5, 'due_on' => null, 'mastered_on' => '2026-09-01', 'last_answered_on' => '2026-09-01',
    ]);
    QuestionMemory::record(createFamilyMember($profile), $notYet->id, false, '2026-09-01');

    expect(QuestionMemory::dueIds($profile, 10))->toBe([$old->id, $new->id]);
});

it('数の上限と、除く問題が効く', function () {
    $profile = createActiveProfile();
    $a = dueQuestionFor($profile);
    $b = dueQuestionFor($profile);
    $c = dueQuestionFor($profile);

    expect(QuestionMemory::dueIds($profile, 2))->toBe([$a->id, $b->id])
        ->and(QuestionMemory::dueIds($profile, 10, [$a->id]))->toBe([$b->id, $c->id])
        ->and(QuestionMemory::dueIds($profile, 0))->toBe([]);
});

it('指定した国の問題を先に、そのあと出す日が古い順', function () {
    $profile = createActiveProfile();
    $japan = createTravelCountry('jp', '日本');
    [$other] = createQuestionWithChoices();
    [$mine] = createQuestionWithChoices();
    $mine->update(['country_id' => $japan->id]);
    QuestionMemory::record($profile, $other->id, false, '2026-09-10');
    QuestionMemory::record($profile, $mine->id, false, '2026-09-20');

    expect(QuestionMemory::dueIds($profile, 10, [], $japan->id))->toBe([$mine->id, $other->id]);
});

it('鍵の国の問題は出さない。国のない問題と、着いた国の問題は出す', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $gb = createTravelCountry('gb', 'イギリス');
    $profile->trips()->create(['destination' => 'gb', 'arrived_at' => now()]);
    $locked = dueQuestionFor($profile, $us->id);
    $visited = dueQuestionFor($profile, $gb->id);
    $noCountry = dueQuestionFor($profile);

    expect(QuestionMemory::dueIds($profile, 10))->toBe([$visited->id, $noCountry->id])
        ->and(QuestionMemory::dueIds($profile, 10))->not->toContain($locked->id);
});

it('覚えた問題の数を数える', function () {
    $profile = createActiveProfile();
    foreach ([null, '2026-09-01', '2026-09-02'] as $masteredOn) {
        [$question] = createQuestionWithChoices();
        ProfileQuestionMemory::query()->create([
            'user_profile_id' => $profile->id, 'question_id' => $question->id,
            'level' => 5, 'due_on' => $masteredOn ? null : '2026-10-01', 'mastered_on' => $masteredOn, 'last_answered_on' => '2026-09-01',
        ]);
    }

    expect(QuestionMemory::masteredCount($profile))->toBe(2);
});

it('問題が消されると、覚え具合も消える', function () {
    $profile = createActiveProfile();
    $question = dueQuestionFor($profile);

    $question->delete();

    expect(ProfileQuestionMemory::query()->count())->toBe(0)
        ->and(QuestionMemory::dueIds($profile, 10))->toBe([]);
});
```

- [ ] **Step 2: テストを流して失敗を確かめる**

Run: `./vendor/bin/sail test tests/Feature/QuestionMemoryTest.php | grep -o '"tool":"pest","result"[^}]*' | head -c 300`
Expected: `"result":"failed"`（`App\Models\ProfileQuestionMemory` がない）

- [ ] **Step 3: 表を作る**

`database/migrations/2026_09_29_000001_create_profile_question_memories_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 問題ごとの覚え具合(docs/design/2026-09-29-spaced-review-design.md 4-1)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_question_memories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            // 段階(1〜5)。出す日以降に正解すると1つ上がる
            $table->unsignedTinyInteger('level');
            // 次に出す日。覚えたら null
            $table->date('due_on')->nullable();
            $table->date('mastered_on')->nullable();
            $table->date('last_answered_on');
            $table->timestamps();

            $table->unique(['user_profile_id', 'question_id']);
            $table->index(['user_profile_id', 'due_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_question_memories');
    }
};
```

`app/Models/ProfileQuestionMemory.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** 問題ごとの覚え具合(docs/design/2026-09-29-spaced-review-design.md 4-1)。計算は App\Support\QuestionMemory */
class ProfileQuestionMemory extends Model
{
    protected $fillable = ['user_profile_id', 'question_id', 'level', 'due_on', 'mastered_on', 'last_answered_on'];

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'due_on' => 'date',
            'mastered_on' => 'date',
            'last_answered_on' => 'date',
        ];
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
```

- [ ] **Step 4: 設定を作る**

`config/review.php`:

```php
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | 出題のくり返し(おさらい)
    |--------------------------------------------------------------------------
    |
    | docs/design/2026-09-29-spaced-review-design.md 4-2。
    | 段階 → 次に出るまでの日数。段階5で出す日以降に正解すると「覚えた」になり、もう出さない。
    |
    */

    'intervals' => [1 => 1, 2 => 3, 3 => 7, 4 => 14, 5 => 30],

    // 相棒の復習(1日1回)で出す最大の問題数
    'daily_size' => 10,

    // ボス以外のステージに足す、出す日が来た前の問題の最大数
    'stage_mix' => 2,

];
```

- [ ] **Step 5: 計算を作る**

`app/Support/QuestionMemory.php`:

```php
<?php

namespace App\Support;

use App\Models\ProfileQuestionMemory;
use App\Models\UserProfile;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * 問題ごとの覚え具合(docs/design/2026-09-29-spaced-review-design.md 3章)。
 * 段階1〜5で、出す日以降に正解すると1つ上がり、段階5で正解すると「覚えた」。
 * まちがえるといつでも段階1・次の日。出す日より前の正解と、覚えた問題の正解では変わらない。
 */
class QuestionMemory
{
    public static function record(UserProfile $profile, int $questionId, bool $correct, ?string $today = null): void
    {
        self::apply($profile->id, $questionId, $correct, $today ?? Garden::today());
    }

    /**
     * 出す日が来た問題を、$preferCountryId の国の問題を先に、そのあと出す日が古い順に最大 $limit 個返す。
     * 覚えた問題・鍵の国の問題・$excludeIds は出さない
     *
     * @param  list<int>  $excludeIds
     * @return list<int>
     */
    public static function dueIds(UserProfile $profile, int $limit, array $excludeIds = [], ?int $preferCountryId = null): array
    {
        if ($limit <= 0) {
            return [];
        }

        return self::dueQuery($profile)
            ->when($excludeIds !== [], fn (Builder $query) => $query->whereNotIn('profile_question_memories.question_id', $excludeIds))
            ->when($preferCountryId !== null, fn (Builder $query) => $query->orderByRaw(
                'CASE WHEN questions.country_id = ? THEN 0 ELSE 1 END',
                [$preferCountryId],
            ))
            ->orderBy('profile_question_memories.due_on')
            ->orderBy('profile_question_memories.id')
            ->limit($limit)
            ->pluck('profile_question_memories.question_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    public static function masteredCount(UserProfile $profile): int
    {
        return ProfileQuestionMemory::query()
            ->where('user_profile_id', $profile->id)
            ->whereNotNull('mastered_on')
            ->count();
    }

    /** 出す日が来た問題(覚えていない・鍵の国の問題でない)。国のない問題は鍵にならない */
    private static function dueQuery(UserProfile $profile): Builder
    {
        $locked = Travel::lockedCountryIds($profile);

        return ProfileQuestionMemory::query()
            ->join('questions', 'questions.id', '=', 'profile_question_memories.question_id')
            ->where('profile_question_memories.user_profile_id', $profile->id)
            ->whereNull('profile_question_memories.mastered_on')
            ->where('profile_question_memories.due_on', '<=', Garden::today())
            ->when($locked !== [], fn (Builder $query) => $query->where(
                fn (Builder $inner) => $inner->whereNull('questions.country_id')->orWhereNotIn('questions.country_id', $locked),
            ));
    }

    private static function apply(int $profileId, int $questionId, bool $correct, string $today): void
    {
        $memory = ProfileQuestionMemory::query()->firstOrNew([
            'user_profile_id' => $profileId,
            'question_id' => $questionId,
        ]);

        if (! $memory->exists || ! $correct) {
            $memory->fill(['level' => 1, 'due_on' => self::daysAfter($today, 1), 'mastered_on' => null]);
        } elseif ($memory->mastered_on === null && $memory->due_on->toDateString() <= $today) {
            if ($memory->level >= 5) {
                $memory->fill(['due_on' => null, 'mastered_on' => $today]);
            } else {
                $level = $memory->level + 1;
                $memory->fill(['level' => $level, 'due_on' => self::daysAfter($today, config('review.intervals')[$level])]);
            }
        }

        $memory->last_answered_on = $today;
        $memory->save();
    }

    private static function daysAfter(string $date, int $days): string
    {
        return Carbon::parse($date)->addDays($days)->toDateString();
    }
}
```

- [ ] **Step 6: テストを流して通ることを確かめる**

Run: `./vendor/bin/sail test tests/Feature/QuestionMemoryTest.php | grep -o '"tool":"pest","result"[^}]*' | head -c 300`
Expected: `"result":"passed"`、12件

- [ ] **Step 7: 全体のテスト**

Run: `./vendor/bin/sail test | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`
Expected: `"result":"passed","tests":373,"passed":373`（361＋12）

- [ ] **Step 8: 開発用のデータベースに表を作る**

Run: `./vendor/bin/sail artisan migrate`
Expected: `2026_09_29_000001_create_profile_question_memories_table` が DONE（`migrate:fresh` は使わない）

- [ ] **Step 9: コミット**

```bash
git add database/migrations/2026_09_29_000001_create_profile_question_memories_table.php app/Models/ProfileQuestionMemory.php config/review.php app/Support/QuestionMemory.php tests/Feature/QuestionMemoryTest.php
git commit -m "#00224: feat:問題ごとの覚え具合(段階1〜5・次に出る日・覚えた)の表と計算を足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 答えるたびに記録し、今までの記録から引き継ぐ

**Files:**
- Modify: `routes/api.php`（`questions.answer`、`$economyResult = …;` の直後）
- Modify: `app/Support/QuestionMemory.php`（`rebuildFromLedger` を足す）
- Create: `database/migrations/2026_09_29_000002_rebuild_question_memories_from_ledger.php`
- Test: `tests/Feature/QuestionMemoryRecordTest.php`

**Interfaces:**
- Consumes: Task 1 の `QuestionMemory::record`・表
- Produces: `QuestionMemory::rebuildFromLedger(): void`

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/QuestionMemoryRecordTest.php`:

```php
<?php

use App\Models\ProfileQuestionMemory;
use App\Models\Question;
use App\Models\UserProfile;
use App\Support\QuestionMemory;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 答えたときの記録と、今までの記録からの引き継ぎ(docs/design/2026-09-29-spaced-review-design.md 3-3・3-5・4-4)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-09-29 03:00:00', 'UTC')); // 日本時間 9/29 12:00
});

/** 回答APIと同じ行(正解は体力・XP・コイン・ポイントの4行、不正解は体力の1行)を、指定した時刻で付ける */
function ledgerAnswer(UserProfile $profile, Question $question, bool $correct, string $utc): void
{
    $types = $correct ? ['hp' => -1, 'xp' => 10, 'coin' => 5, 'point' => 10] : ['hp' => -2];
    foreach ($types as $type => $delta) {
        $row = $profile->currencyLedger()->create([
            'type' => $type,
            'delta' => $delta,
            'reason' => $correct ? 'answer_correct' : 'answer_wrong',
            'question_id' => $question->id,
        ]);
        $row->forceFill(['created_at' => Carbon::parse($utc, 'UTC')])->save();
    }
}

it('答えのAPIで答えると、覚え具合が記録される', function () {
    $profile = createActiveProfile();
    [$question, , $wrong] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $wrong->id])->assertOk();

    $memory = ProfileQuestionMemory::query()->where('user_profile_id', $profile->id)->sole();
    expect([$memory->question_id, $memory->level, $memory->due_on->toDateString()])->toBe([$question->id, 1, '2026-09-30']);
});

it('練習(やり直し)の答えは記録しない', function () {
    createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])->assertOk();

    expect(ProfileQuestionMemory::query()->count())->toBe(0);
});

it('体力が0で答えられなかったときは記録しない', function () {
    $profile = createActiveProfile();
    $profile->update(['hp' => 0, 'hp_updated_at' => now()]);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])->assertStatus(409);

    expect(ProfileQuestionMemory::query()->count())->toBe(0);
});

it('今までの記録を古い順に読み直して、覚え具合を作る(日付は日本時間)', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    ledgerAnswer($profile, $question, false, '2026-09-20 01:00:00'); // 9/20 まちがえた → 段階1・9/21
    ledgerAnswer($profile, $question, true, '2026-09-20 16:00:00');  // 日本時間 9/21 正解 → 段階2・9/24
    ledgerAnswer($profile, $question, true, '2026-09-22 01:00:00');  // 9/22 出す日より前 → 変わらない

    QuestionMemory::rebuildFromLedger();

    $memory = ProfileQuestionMemory::query()->sole();
    expect([$memory->level, $memory->due_on->toDateString(), $memory->last_answered_on->toDateString()])
        ->toBe([2, '2026-09-24', '2026-09-22']);
});

it('1回の正解の4行は1回と数える', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    ledgerAnswer($profile, $question, true, '2026-09-20 01:00:00');

    QuestionMemory::rebuildFromLedger();

    expect(ProfileQuestionMemory::query()->sole()->level)->toBe(1);
});

it('プロフィールごとに作り、消された問題の記録は読み飛ばす', function () {
    $profile = createActiveProfile();
    $sibling = createFamilyMember($profile);
    [$kept] = createQuestionWithChoices();
    [$deleted] = createQuestionWithChoices();
    ledgerAnswer($profile, $kept, false, '2026-09-20 01:00:00');
    ledgerAnswer($sibling, $kept, true, '2026-09-20 01:00:00');
    ledgerAnswer($profile, $deleted, false, '2026-09-20 01:00:00');
    $deleted->delete(); // 記録の question_id は null になる(nullOnDelete)

    QuestionMemory::rebuildFromLedger();

    expect(ProfileQuestionMemory::query()->orderBy('user_profile_id')->pluck('user_profile_id')->all())
        ->toBe([$profile->id, $sibling->id]);
});
```

- [ ] **Step 2: テストを流して失敗を確かめる**

Run: `./vendor/bin/sail test tests/Feature/QuestionMemoryRecordTest.php | grep -o '"tool":"pest","result"[^}]*' | head -c 300`
Expected: `"result":"failed"`（答えのAPIが記録しない、`rebuildFromLedger` がない）

- [ ] **Step 3: 答えのAPIで記録する**

`routes/api.php` の `questions.answer` で、`$economyResult = $isCorrect ? … : $profile->applyEconomy(['hp' => -2], 'answer_wrong', $question);` の直後に足す:

```php

        // 問題ごとの覚え具合(docs/design/2026-09-29-spaced-review-design.md 4-4)
        QuestionMemory::record($profile, $question->id, $isCorrect);
```

ファイルの先頭の `use` の並びに `use App\Support\QuestionMemory;` を足す（アルファベット順の位置）。

- [ ] **Step 4: 引き継ぎを作る**

`app/Support/QuestionMemory.php` の `use` に `use App\Models\ProfileCurrencyLedger;` と `use App\Models\Question;` を足し、`masteredCount` の後ろに足す:

```php

    /**
     * 今までの答えの記録から覚え具合を作る(設計書3-5)。1回の答えには必ず体力の行が1つあるので、
     * 体力の行だけを古い順に読み直す(正解は体力・XP・コイン・ポイントの4行になるため)。消された問題の記録は読み飛ばす
     */
    public static function rebuildFromLedger(): void
    {
        $questionIds = Question::query()->pluck('id')->flip();

        ProfileCurrencyLedger::query()
            ->where('type', 'hp')
            ->whereIn('reason', ['answer_correct', 'answer_wrong'])
            ->whereNotNull('question_id')
            ->lazyById(500)
            ->each(function (ProfileCurrencyLedger $row) use ($questionIds) {
                if (! $questionIds->has($row->question_id)) {
                    return;
                }
                self::apply(
                    $row->user_profile_id,
                    $row->question_id,
                    $row->reason === 'answer_correct',
                    $row->created_at->timezone(Garden::TIMEZONE)->toDateString(),
                );
            });
    }
```

`database/migrations/2026_09_29_000002_rebuild_question_memories_from_ledger.php`:

```php
<?php

use App\Support\QuestionMemory;
use Illuminate\Database\Migrations\Migration;

/**
 * 今までの答えの記録から、問題ごとの覚え具合を作る(docs/design/2026-09-29-spaced-review-design.md 3-5)。
 * 表を消すと覚え具合も消えるので、戻すときは何もしない
 */
return new class extends Migration
{
    public function up(): void
    {
        QuestionMemory::rebuildFromLedger();
    }

    public function down(): void {}
};
```

- [ ] **Step 5: テストを流して通ることを確かめる**

Run: `./vendor/bin/sail test tests/Feature/QuestionMemoryRecordTest.php | grep -o '"tool":"pest","result"[^}]*' | head -c 300`
Expected: `"result":"passed"`、6件

- [ ] **Step 6: 全体のテスト**

Run: `./vendor/bin/sail test | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`
Expected: `"result":"passed","tests":379,"passed":379`

- [ ] **Step 7: 開発用のデータベースで引き継ぎを流す**

Run: `./vendor/bin/sail artisan migrate && ./vendor/bin/sail artisan tinker --execute="echo App\Models\ProfileQuestionMemory::count().' / '.App\Models\ProfileQuestionMemory::where('user_profile_id',7)->count();"`
Expected: 引き継ぎのマイグレーションが DONE。覚え具合の行ができている（町テストの行もある）

- [ ] **Step 8: コミット**

```bash
git add routes/api.php app/Support/QuestionMemory.php database/migrations/2026_09_29_000002_rebuild_question_memories_from_ledger.php tests/Feature/QuestionMemoryRecordTest.php
git commit -m "#00225: feat:答えるたびに覚え具合を記録し、今までの答えの記録から覚え具合を作る" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 相棒の復習を「出す日が来た問題を1日10問」にする

**Files:**
- Modify: `app/Support/Review.php`（`questionIds` を `QuestionMemory::dueIds` に置き換え、`review_size` を `review.daily_size` に）
- Modify: `config/companions.php`（`review_size` を消す）
- Modify: `tests/Feature/ReviewTest.php`（前のルールのテストを直す）

**Interfaces:**
- Consumes: Task 1 の `QuestionMemory::dueIds`・`config('review.daily_size')`
- Produces: `Review::questionIds(UserProfile $profile, ?int $limit = null): list<int>`（`$limit` を省くと `review.daily_size`）

- [ ] **Step 1: 失敗するテストに直す**

`tests/Feature/ReviewTest.php`:

先頭の説明を「出す日が来た問題(まちがえた問題も正解したことのある問題も)を、出す日が古い順に最大10問出す(docs/design/2026-09-29-spaced-review-design.md 4-7)。1日1回(日本時間)で、やりきると相棒のなかよし度が5上がる。」に直す。`use App\Support\QuestionMemory;` を足す。

`recordReviewAnswer` 関数を消し、代わりに足す:

```php
/** 出す日が来た問題にする(9/20にまちがえた → 9/21から出す)。$daysAgo で出す日の古さを変える */
function makeDue(UserProfile $profile, Question $question, int $daysAgo = 9): void
{
    QuestionMemory::record($profile, $question->id, false, now('Asia/Tokyo')->subDays($daysAgo)->toDateString());
}
```

最初の5つのテスト（「まちがえて、その後に…」から「消された問題は出ない」まで）を次に置き換える:

```php
it('出す日が来た問題が出る。正解したことのある問題も、出す日が来れば出る', function () {
    $profile = createActiveProfile();
    [$wrongOnce] = createQuestionWithChoices();
    [$rightBefore] = createQuestionWithChoices();
    [$notYet] = createQuestionWithChoices();
    makeDue($profile, $wrongOnce, 5);
    QuestionMemory::record($profile, $rightBefore->id, true, now('Asia/Tokyo')->subDays(4)->toDateString());
    QuestionMemory::record($profile, $notYet->id, false);

    expect(Review::questionIds($profile))->toBe([$wrongOnce->id, $rightBefore->id]);
});

it('やり直しの回答は、復習に出る問題を変えない', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();
    makeDue($profile, $question);

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])->assertOk();

    expect(Review::questionIds($profile))->toBe([$question->id]);
});

it('出す日が古い順に、最大10問', function () {
    $profile = createActiveProfile();
    $questions = collect(range(1, 11))->map(fn () => createQuestionWithChoices()[0]);
    $questions->each(fn (Question $question, int $i) => makeDue($profile, $question, 20 - $i));

    expect(Review::questionIds($profile))->toBe($questions->take(10)->pluck('id')->all());
});

it('消された問題は出ない', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    makeDue($profile, $question);
    $question->delete();

    expect(Review::questionIds($profile))->toBe([]);
});
```

残りのテストの `recordReviewAnswer($profile, $question, false);` をすべて `makeDue($profile, $question);` に置き換える。「やりきると今日の記録が付き…」のテストは `travelTo` の後に `makeDue` を呼ぶ順のまま（`makeDue` は今の日付から数える）。

- [ ] **Step 2: テストを流して失敗を確かめる**

Run: `./vendor/bin/sail test tests/Feature/ReviewTest.php | grep -o '"tool":"pest","result"[^}]*' | head -c 400`
Expected: `"result":"failed"`（今の `Review` は答えの記録の「まちがえたまま」を見ているので、`makeDue` だけでは出ない・正解したことのある問題が出ない・最大5問）

- [ ] **Step 3: `Review` を置き換える**

`app/Support/Review.php`:

- 先頭の説明を「仲間からの復習(docs/design/2026-09-27-spru-wave-c-design.md 3-5)。出す問題は、問題ごとの覚え具合で出す日が来た問題(docs/design/2026-09-29-spaced-review-design.md 4-7)。」に直す
- `use App\Models\ProfileCurrencyLedger;` を消す
- `private const ANSWER_REASONS = …;` を消す
- `questionIds` を次に置き換える:

```php
    /** @return list<int> 出す日が古い順。$limit を省くと config('review.daily_size') */
    public static function questionIds(UserProfile $profile, ?int $limit = null): array
    {
        return QuestionMemory::dueIds($profile, $limit ?? config('review.daily_size'));
    }
```

- `state()` と `questions()` の `config('companions.review_size')` を `config('review.daily_size')` にする

`config/companions.php` の `'review_size' => 5,` の行と、その直前のコメントのうち `review_size` を説明している部分を消す（`review_bonus` の説明は残す）。

- [ ] **Step 4: テストを流して通ることを確かめる**

Run: `./vendor/bin/sail test tests/Feature/ReviewTest.php | grep -o '"tool":"pest","result"[^}]*' | head -c 300`
Expected: `"result":"passed"`、13件

- [ ] **Step 5: 全体のテスト**

Run: `./vendor/bin/sail test | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`
Expected: `"result":"passed","tests":378,"passed":378`（ReviewTest は14件→13件）。`review_size` を使っているほかのテスト（おつかいなど）が落ちたら、`review.daily_size` に直す

- [ ] **Step 6: コミット**

```bash
git add app/Support/Review.php config/companions.php tests/Feature/ReviewTest.php
git commit -m "#00226: feat:相棒の復習を、出す日が来た問題(正解したことのある問題も)を1日10問出す形にする" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: ステージにおさらいを混ぜ、クリアの点数を問題の数までにする

**Files:**
- Modify: `routes/api.php`（`stages.play`・`stages.complete`）
- Test: `tests/Feature/StageReviewTest.php`

**Interfaces:**
- Consumes: Task 1 の `QuestionMemory::dueIds`・`config('review.stage_mix')`
- Produces: `GET /api/stages/{stage}` の各問題の `review: bool`

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/StageReviewTest.php`:

```php
<?php

use App\Models\Category;
use App\Models\Question;
use App\Models\Stage;
use App\Models\UserProfile;
use App\Support\QuestionMemory;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| ステージのおさらい(docs/design/2026-09-29-spaced-review-design.md 4-5・4-6)
|--------------------------------------------------------------------------
|
| ボス以外のステージに、出す日が来た前の問題を最大2問足し、review を付ける。ボスには足さない。
| クリアの点数はステージの問題だけで数え、問題の数を超えない。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-09-29 03:00:00', 'UTC')); // 日本時間 9/29 12:00
});

/** @return array{0: Stage, 1: \Illuminate\Support\Collection<int, Question>} */
function stageWithOwnQuestions(int $count, bool $boss = false): array
{
    $category = Category::create(['name' => 'おさらいのカテゴリ'.uniqid()]);
    $stage = Stage::create([
        'category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => 1,
        'is_boss' => $boss, 'question_count' => $count,
    ]);
    $questions = collect(range(1, $count))->map(function (int $i) use ($stage) {
        [$question] = createQuestionWithChoices();
        $stage->questions()->attach($question->id, ['order' => $i]);

        return $question;
    });

    return [$stage, $questions];
}

/** 出す日が来た前の問題を作る(9/20にまちがえた → 9/21から出す) */
function previousDueQuestion(UserProfile $profile): Question
{
    [$question] = createQuestionWithChoices();
    QuestionMemory::record($profile, $question->id, false, '2026-09-20');

    return $question;
}

it('ボス以外のステージに、出す日が来た前の問題が最大2問足され、review が付く', function () {
    $profile = createActiveProfile();
    [$stage, $own] = stageWithOwnQuestions(3);
    $previous = collect(range(1, 3))->map(fn () => previousDueQuestion($profile));

    $questions = collect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions'));

    expect($questions)->toHaveCount(5)
        ->and($questions->where('review', true)->pluck('id')->sort()->values()->all())->toBe($previous->take(2)->pluck('id')->all())
        ->and($questions->where('review', false)->pluck('id')->sort()->values()->all())->toBe($own->pluck('id')->all());
});

it('ボスのステージには足さない', function () {
    $profile = createActiveProfile();
    [$stage] = stageWithOwnQuestions(3, boss: true);
    previousDueQuestion($profile);

    $questions = collect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions'));

    expect($questions)->toHaveCount(3)
        ->and($questions->pluck('review')->unique()->all())->toBe([false]);
});

it('ステージ自身の問題は、出す日が来ていても足さない(同じ問題が2回出ない)', function () {
    $profile = createActiveProfile();
    [$stage, $own] = stageWithOwnQuestions(2);
    QuestionMemory::record($profile, $own[0]->id, false, '2026-09-20');

    $questions = collect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions'));

    expect($questions)->toHaveCount(2)
        ->and($questions->pluck('id')->duplicates()->all())->toBe([]);
});

it('出す日が来た問題がなければ足さない', function () {
    $profile = createActiveProfile();
    [$stage] = stageWithOwnQuestions(2);
    [$later] = createQuestionWithChoices();
    QuestionMemory::record($profile, $later->id, false); // 次に出るのは 9/30

    expect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions'))->toHaveCount(2);
});

it('足した問題も、正解の手がかりを隠して出す', function () {
    $profile = createActiveProfile();
    [$stage] = stageWithOwnQuestions(1);
    previousDueQuestion($profile);

    $review = collect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions'))->firstWhere('review', true);

    collect($review['choices'])->each(fn (array $choice) => expect($choice)->not->toHaveKey('is_correct'));
});

it('score が問題の数を超えても、最高点は問題の数まで', function () {
    createActiveProfile();
    [$stage] = stageWithOwnQuestions(3);

    $this->postJson("/api/stages/{$stage->id}/complete", ['score' => 5])->assertOk()
        ->assertJsonPath('progress.best_score', 3);
});
```

- [ ] **Step 2: テストを流して失敗を確かめる**

Run: `./vendor/bin/sail test tests/Feature/StageReviewTest.php | grep -o '"tool":"pest","result"[^}]*' | head -c 400`
Expected: `"result":"failed"`（足されない・`review` がない・最高点が5）

- [ ] **Step 3: ステージを遊ぶAPIに足す**

`routes/api.php` の `stages.play` を次に置き換える:

```php
Route::middleware(['auth:sanctum'])->get('/stages/{stage}', function (Request $request, Stage $stage) {
    $profile = ActiveProfile::find($request);
    Travel::abortIfLocked($profile, $stage->country_id);
    $questions = $stage->questions()
        ->with(['choices', 'country'])
        ->get(['questions.id', 'questions.type', 'questions.prompt', 'questions.country_id', 'questions.meta']);

    abort_if($questions->isEmpty(), 404);

    // おさらい(docs/design/2026-09-29-spaced-review-design.md 4-5)。ボス以外に、出す日が来た前の問題を足す
    $reviewIds = $profile && ! $stage->is_boss
        ? QuestionMemory::dueIds($profile, config('review.stage_mix'), $questions->pluck('id')->all(), $stage->country_id)
        : [];
    $reviews = $reviewIds === []
        ? collect()
        : Question::query()->with(['choices', 'country'])->whereIn('id', $reviewIds)->get(['id', 'type', 'prompt', 'country_id', 'meta']);
    $questions->each(fn (Question $question) => $question->setAttribute('review', false));
    $reviews->each(fn (Question $question) => $question->setAttribute('review', true));
    $questions = $questions->concat($reviews)->shuffle()->values();

    PlayableQuestion::present($questions);

    return [
        'id' => $stage->id,
        'category' => $stage->category,
        'difficulty' => $stage->difficulty,
        'stage_number' => $stage->stage_number,
        'is_boss' => $stage->is_boss,
        'title_reward' => $stage->title_reward,
        'questions' => $questions,
    ];
})->name('stages.play');
```

（`Question` がまだ `use` されていなければ、ファイルの先頭に `use App\Models\Question;` を足す）

- [ ] **Step 4: クリアの点数を問題の数までにする**

`routes/api.php` の `stages.complete` で、`$data = $request->validate([...]);` の後ろ（`$profileId = …` の前）に足す:

```php
    // 点数はステージの問題だけの正解数(おさらいの問題は数えない)。念のため問題の数までに抑える(設計書4-6)
    $score = min($data['score'], $stage->questions()->count());
```

同じ関数の中の `$data['score']` を2か所とも `$score` にする（`best_score` の計算と、ボスの称号の全問正解の判定）。

- [ ] **Step 5: テストを流して通ることを確かめる**

Run: `./vendor/bin/sail test tests/Feature/StageReviewTest.php tests/Feature/StagePlayTest.php | grep -o '"tool":"pest","result"[^}]*' | head -c 300`
Expected: `"result":"passed"`、7件

- [ ] **Step 6: 全体のテスト**

Run: `./vendor/bin/sail test | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`
Expected: `"result":"passed","tests":384,"passed":384`

- [ ] **Step 7: コミット**

```bash
git add routes/api.php tests/Feature/StageReviewTest.php
git commit -m "#00227: feat:ボス以外のステージに出す日が来た前の問題を2問まで足し、クリアの点数を問題の数までにする" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 画面（おさらいの札・点数・文言・パスポート）

**Files:**
- Create: `frontend/src/components/quiz/score.ts`
- Test: `frontend/src/components/quiz/score.test.ts`
- Modify: `frontend/src/components/quiz/types.ts`（`review?: boolean`）
- Modify: `frontend/src/components/quiz/quiz-session.tsx`（札・ステージの点数）
- Modify: `frontend/src/components/world/companions.ts:50-52`・`frontend/src/components/world/companions.test.ts`
- Modify: `frontend/src/components/world/errands.ts:35`・`frontend/src/components/world/errands.test.ts:47`
- Modify: `routes/api.php`（`passport` に `mastered_count`）・`tests/Feature/QuestionMemoryTest.php`
- Modify: `frontend/src/app/passport/page.tsx`

**Interfaces:**
- Consumes: Task 4 の `review`、Task 1 の `QuestionMemory::masteredCount`
- Produces: `countsTowardScore(question: { review?: boolean }): boolean`、`GET /api/passport` の `mastered_count: int`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/quiz/score.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { countsTowardScore } from "./score";

describe("ステージの点数に入る問題", () => {
  it("おさらいの問題は数えない。ふつうの問題は数える", () => {
    expect(countsTowardScore({ review: true })).toBe(false);
    expect(countsTowardScore({ review: false })).toBe(true);
    expect(countsTowardScore({})).toBe(true);
  });
});
```

`frontend/src/components/world/errands.test.ts` の47行目の期待を `"おさらいの問題を解いてみよう"` にする。

`frontend/src/components/world/companions.test.ts` の import に `reviewInvite` を足し（なければ `import { … reviewInvite … } from "./companions";` の並びに入れる）、最後に足す:

```ts
describe("スプルの復習カードの誘い", () => {
  it("おさらいの問題の数を添える", () => {
    expect(reviewInvite(3)).toBe("おさらいの問題、いっしょにやってみよう！（3問）");
  });
});
```

`tests/Feature/QuestionMemoryTest.php` の最後に足す:

```php
it('パスポートに覚えた問題の数が出る', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    ProfileQuestionMemory::query()->create([
        'user_profile_id' => $profile->id, 'question_id' => $question->id,
        'level' => 5, 'due_on' => null, 'mastered_on' => '2026-09-01', 'last_answered_on' => '2026-09-01',
    ]);

    $this->getJson('/api/passport')->assertOk()->assertJsonPath('mastered_count', 1);
});
```

- [ ] **Step 2: テストを流して失敗を確かめる**

Run: `cd frontend && npx vitest run src/components/quiz/score.test.ts src/components/world/errands.test.ts src/components/world/companions.test.ts 2>&1 | grep -E "FAIL|×|Tests " | head; cd .. && ./vendor/bin/sail test tests/Feature/QuestionMemoryTest.php | grep -o '"tool":"pest","result"[^}]*' | head -c 200`
Expected: 画面は FAIL（`./score` がない・文言が前のまま）、サーバーは `"result":"failed"`（`mastered_count` がない）

- [ ] **Step 3: 点数に入る問題の関数と型**

`frontend/src/components/quiz/score.ts`:

```ts
/** ステージの点数に入る問題か(docs/design/2026-09-29-spaced-review-design.md 5-1)。足したおさらいの問題は数えない */
export function countsTowardScore(question: { review?: boolean }): boolean {
  return !question.review;
}
```

`frontend/src/components/quiz/types.ts` の `QuizQuestion` の `meta` の後ろに足す:

```ts
  /** ステージに足した、出す日が来た前の問題(おさらい)。ステージの点数には入れない */
  review?: boolean;
```

- [ ] **Step 4: クイズの画面に札と点数**

`frontend/src/components/quiz/quiz-session.tsx`:

import に足す（`./retry` の import の次）:

```tsx
import { countsTowardScore } from "./score";
```

`const [score, setScore] = useState(0);` の次の行に足す:

```tsx
  // ステージの点数(おさらいの問題を除いた正解数)。最後に onFinish に渡す
  const [stageScore, setStageScore] = useState(0);
```

`if (data.correct) setScore((prev) => prev + 1);` の次の行に足す:

```tsx
      if (data.correct && countsTowardScore(question)) setStageScore((prev) => prev + 1);
```

やり直し・もう一度で点数を0に戻している `setScore(0);` の次の行に足す:

```tsx
    setStageScore(0);
```

最後まで答えたときの `setFinishNote(await onFinish(score).catch(() => null));` を `setFinishNote(await onFinish(stageScore).catch(() => null));` にし、その `useEffect` の依存の配列に `stageScore` を足す（`[round, currentIndex, completionSubmitted, score, stageScore, mode, playSound, onFinish]`）。

問題番号の行を次に置き換える（`・ 問題 {currentIndex + 1} / {round.length}` の `<span>` の後ろに札を足す）:

```tsx
              <span>
                ・ 問題 {currentIndex + 1} / {round.length}
              </span>
              {question.review && !practice && (
                <span className="rounded-full bg-[#2b6fa3] px-2 py-0.5 text-[10px] font-black text-white">
                  <AutoFurigana text="おさらい" />
                </span>
              )}
```

`QuizSession` の説明（`/** 問題を出して答えを送り、…`）の最後の行の後ろに「ステージに足したおさらいの問題には札を付け、onFinish に渡す点数には入れない(設計書 2026-09-29-spaced-review 5-1)」を足す。

- [ ] **Step 5: 文言**

`frontend/src/components/world/companions.ts` の `reviewInvite` の中身を:

```ts
  return `おさらいの問題、いっしょにやってみよう！（${count}問）`;
```

`frontend/src/components/world/errands.ts` の `case "review":` の返す文を:

```ts
      return "おさらいの問題を解いてみよう";
```

- [ ] **Step 6: パスポート**

`routes/api.php` の `passport` の最後の `return [` の前に足す:

```php
    $activeProfile = ActiveProfile::find($request);
```

同じ `return [...]` の `'trips' => ($profile = ActiveProfile::find($request)) ? Travel::trips($profile) : [],` を次の2行（コメント付き）に置き換える:

```php
        'trips' => $activeProfile ? Travel::trips($activeProfile) : [],
        // 覚えた問題の数(docs/design/2026-09-29-spaced-review-design.md 4-8)
        'mastered_count' => $activeProfile ? QuestionMemory::masteredCount($activeProfile) : 0,
```

`frontend/src/app/passport/page.tsx`:

- `PassportData` の `trips` の後ろに `mastered_count: number;` を足す
- `const { … trips, } = data;` に `mastered_count: masteredCount,` を足す
- サマリーの `<SummaryBadge label="旅した国" value={`${trips.length}`} />` の次の行に足す:

```tsx
          <SummaryBadge label="覚えた問題" value={`${masteredCount}`} />
```

- [ ] **Step 7: テストを流して通ることを確かめる**

Run: `cd frontend && npm test 2>&1 | grep -E "Tests |FAIL" && npm run typecheck && npm run lint; cd .. && ./vendor/bin/sail test | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`
Expected: 画面 `Tests 249 passed (249)`（247＋score 1＋companions 1）、型とlintのエラーなし。サーバー `"result":"passed","tests":385,"passed":385`

- [ ] **Step 8: コミット**

```bash
git add frontend/src/components/quiz/score.ts frontend/src/components/quiz/score.test.ts frontend/src/components/quiz/types.ts frontend/src/components/quiz/quiz-session.tsx frontend/src/components/world/companions.ts frontend/src/components/world/companions.test.ts frontend/src/components/world/errands.ts frontend/src/components/world/errands.test.ts frontend/src/app/passport/page.tsx routes/api.php tests/Feature/QuestionMemoryTest.php
git commit -m "#00228: feat:おさらいの問題に札を付けてステージの点数から除き、復習の文言とパスポートの覚えた問題の数を足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: ブラウザでの確認とドキュメント

**Files:**
- Modify: `SPEC.md`（1章の③の行・クイズ・仲間からの復習・6章のテスト数）
- Modify: `TASKS.md`（開発部門にタスクを足す）

**Interfaces:**
- Consumes: Task 1〜5 のすべて

- [ ] **Step 1: 確認の前の値を控える**

Run:
```bash
./vendor/bin/sail artisan tinker --execute="echo json_encode(App\Models\UserProfile::find(7)->only(['current_streak','best_streak','last_played_date','xp','coins','hp','points','avatar','level','last_review_on'])).PHP_EOL; echo json_encode(App\Models\ProfileErrand::where('user_profile_id',7)->pluck('id')).PHP_EOL; echo App\Models\ProfileQuestionMemory::where('user_profile_id',7)->count().PHP_EOL; echo App\Models\ProfileCurrencyLedger::where('user_profile_id',7)->max('id').PHP_EOL;"
```
（出力をワークスペースに保存しておく）

- [ ] **Step 2: ブラウザで確かめる**

開発用サーバー（`frontend` で `npm run dev -- -p 3000`、止まっていれば起動する）に `test@example.com` / `password` でログインし、町テストで確かめる。確認の間だけ、町テストの覚え具合の行のうち、ボス以外のステージの問題でない行を2〜3行、`due_on` を今日にする（元の値を控えて、確認後に戻す）。

- `/learn` からボス以外のステージを開く → 問題番号の横に「おさらい」の札の付いた問題が出る（最大2問）。答えは送らず、確かめたら画面を閉じる（答えると記録と経済の値が変わるため）
- 町の相棒（またはスプル）の復習の誘いの文が「おさらいの問題、いっしょにやってみよう！（N問）」になっている。`/review` を開いて問題の数が10問以下で出ることを確かめ、答えずに閉じる
- `/passport` に「覚えた問題」の札が出る
- 幅390pxと1280pxで、札とパスポートの並びが崩れない

スクリーンショットは `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` にだけ置き、見たら消す。

- [ ] **Step 3: 開発用のデータを戻して確かめる**

`due_on` を変えた行を元の値に戻し、Step 1 と同じコマンドの出力が同じであることを確かめる（台帳の最大のidが増えていなければ、答えを送っていない）。

- [ ] **Step 4: SPEC.md を直す**

`SPEC.md` 1章の「③復習を混ぜた出題（「今日のレッスン」。C回の「仲間からの復習」で代わりにした）」を「③復習を混ぜた出題（2026-09-29、おさらい: 問題ごとの覚え具合でステージと仲間からの復習に出す。`docs/design/2026-09-29-spaced-review-design.md`）」に直す。

仲間からの復習の項目（「仲間からの復習」「review」で探す）の後ろに1行足す:

```markdown
- ✅（2026-09-29）**出題のくり返し（おさらい）**: 問題ごとの覚え具合（段階1〜5）を `profile_question_memories` に記録する。出す日以降に正解すると段階が上がり、次に出るまでの間が 1→3→7→14→30日と広がる。段階5で正解すると「覚えた」になり、もう出さない。まちがえるといつでも段階1・次の日。ボス以外のステージには、出す日が来た前の問題を最大2問足す（「おさらい」の札。ステージの点数には入れない）。仲間からの復習は、出す日が来た問題（正解したことのある問題も）を1日10問まで出す（前は「まちがえたままの問題を5問」）。鍵の国の問題は出さない。パスポートに「覚えた問題」の数。今までの答えの記録から最初の覚え具合を作った（`app/Support/QuestionMemory.php`、`config/review.php`、`docs/design/2026-09-29-spaced-review-design.md`）
```

6章のテスト数（「2026-09-28時点で361件」「2026-09-28時点で247件」）を「2026-09-29時点で385件」「2026-09-29時点で249件」にする（違っていたら実際の件数）。

- [ ] **Step 5: TASKS.md を直す**

開発部門の「町のアイテムのカテゴリ分けと画像への差し替え」の項目（段階1〜3と画像の依頼の行を含む）の後ろに足す:

```markdown
- [x] **出題のくり返し（おさらい）**（2026-09-29 Owner承認・実装。設計書 `docs/design/2026-09-29-spaced-review-design.md`、実装計画 `docs/design/2026-09-29-spaced-review-plan.md`）: 問題ごとの覚え具合（段階1〜5、1→3→7→14→30日、段階5で正解すると覚えた）。ボス以外のステージに出す日が来た問題を最大2問足す。仲間からの復習は出す日が来た問題を1日10問まで。パスポートに覚えた問題の数
```

- [ ] **Step 6: 全体のテスト**

Run: `./vendor/bin/sail test | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*' && cd frontend && npm test 2>&1 | grep -E "Tests " && npm run typecheck && npm run lint`
Expected: サーバー `"result":"passed","tests":385,"passed":385`、画面 `Tests 249 passed (249)`、型とlintのエラーなし

- [ ] **Step 7: コミット**

```bash
git add SPEC.md TASKS.md
git commit -m "#00229: docs:出題のくり返し(おさらい)をSPEC/TASKSに反映する" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
