# スプルキャッチ（英単語のミニゲーム）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「学ぶ」のミニアプリの引き出しから遊べる、1本目のミニゲーム「スプルキャッチ（英単語）」を作る。落ちてくる答えをスプルで受け取る遊びで、初級・中級・上級があり、最近まちがえた問題を先に出し、答えを覚え具合に残す。

**Architecture:** サーバーは `app/Support/CatchGame.php` が問題を選び（「英語を学ぶ」・鍵のない国・難しさ・選択肢の長さ）、遊んだ回を新しい表 `profile_game_plays` に残し、終えたときに採点し直して覚え具合・ごほうび（1日3回まで）を付ける。覚え具合には「最後の答えがまちがいだった日」（`wrong_on`）を足す。画面は、ゲームの動きを決める計算だけの部品（`catch-engine.ts`）と、見た目の計算（`catch-view.ts`）を作り、`/games/catch` のページで「選ぶ → 3・2・1 → ゲーム → 結果」を切り替える。

**Tech Stack:** Laravel 13（Pest）/ Next.js 16・React 19・TypeScript・Tailwind CSS（Vitest）/ Laravel Sail

**Spec:** `docs/design/2026-09-29-spru-catch-design.md`

**ブランチ:** `feature/spru-catch`（作成済み。設計書は #00271、この計画は #00272）。タスクのコミットは #00273 から順に。

## Global Constraints

- 返答・ドキュメント・コミットの要約は日本語。コミットは `git commit -q -m "#NNNNN: type:要約" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`
- Phaser・Three.js などのゲームの道具は入れない。新しいパッケージは足さない
- 数字（1回10問・復習は6問まで・ごほうび1日3回・難しさごとの列の数と落ちる時間と選択肢の長さとごほうび）は `config/games.php` だけに書く。列の数と落ちる時間は、始めるときの返事で画面に渡す
- 難しさ: 初級 2列・8000ミリ秒・`mb_strwidth` 16まで・正解1問で経験値3と学習ポイント3 / 中級 3列・6000・14・経験値4と学習ポイント3 / 上級 4列・4500・12・経験値5と学習ポイント3
- 点数: 正解10点、コンボが3以上になった正解はさらに5点。画面とサーバーで同じ決まり
- 成長の印: その回のいちばん長いコンボで 0〜2 種・3〜5 芽・6〜9 つぼみ・10 花。まちがえても戻らない
- HP・コイン・プロフィールのコンボ・毎日の連続・相棒のなかよし度・畑の水やりは、ゲームでは動かさない
- 旅の鍵: 鍵の国（まだ着いていない行き先）のステージの問題は出さない（今のルールと同じ）
- 画面の文は子ども向けのやさしい言い方。漢字にはふりがな（`AutoFurigana`）。ボタンの中の `AutoFurigana` は `<span>` で包む（ボタンは flex のため）
- 画面のテストは `frontend/` で `npx vitest run <ファイル>`、全部は `npm test`・`npm run typecheck`・`npm run lint`。サーバーのテストは リポジトリ直下で `./vendor/bin/sail test <ファイル>`（`--parallel` を付けない。結果は JSON の `"tool":"pest","result"` を見る）
- 開発用のデータベースは `migrate:fresh` しない。列・表の追加は `./vendor/bin/sail artisan migrate`。ブラウザで確かめたあとは、町テスト（プロフィール7）のデータを確認前の状態に戻す
- テストのファイルの中で作る関数は、ほかのテストのファイルと名前が重ならないようにする（Pest はすべてのファイルを1つの PHP で読むため）。今ある名前は `grep -hn "^function " tests/Feature/*.php tests/Pest.php` で見る
- Next.js 16 のクライアントのページで `params` を使うときは React の `use()` で受ける（今回の新しいページは `params` を使わない）

## Review Focus

1. 同じ回の「終える」が2回届く（ボタンの二度押し・通信のやり直し） → 2回目は409で、ごほうびも記録も二重にならない → Task 3 のテスト「終えた回をもう一度終えると409」
2. 始めたまま閉じた回（終えていない回）がある → 1日のごほうびの回数に数えない → Task 3 のテスト「終えていない回は…数えない」
3. 日付をまたいで遊ぶ（23:59 に始めて 0:01 に終える） → 終えた日の回として数える → Task 3 のテスト「日付をまたいで終えた回は…」
4. ブラウザのタブを離れて戻る・端末が重くて時間が飛ぶ → 一気に何問も進まない（1回に進める時間は100ミリ秒まで） → Task 4 のテスト「1回に進める時間は100ミリ秒まで」
5. ○×を見せている間や落ちきった直後にボタンを連打する → 判定は線に着いた瞬間の列で決まり、次の問題もその列から始まる → Task 4 のテスト「○×を見せている間は動かない」「次の問題へ。スプルは同じ列のまま」

---

## ファイルの構成

| ファイル | 役割 | タスク |
|---|---|---|
| `database/migrations/2026_09_29_000003_add_wrong_on_to_profile_question_memories_table.php`（新規） | 覚え具合に `wrong_on` を足す | 1 |
| `app/Models/ProfileQuestionMemory.php`・`app/Support/QuestionMemory.php` | `wrong_on` を書く・最近まちがえた問題と出す日が来た問題を、渡した問題の中から返す | 1 |
| `tests/Feature/QuestionMemoryRecordTest.php` | 1のテスト | 1 |
| `database/migrations/2026_09_29_000004_create_profile_game_plays_table.php`・`app/Models/ProfileGamePlay.php`（新規）・`app/Models/UserProfile.php` | 遊んだ回の表 | 2 |
| `config/games.php`・`app/Support/CatchGame.php`（新規）・`routes/api.php` | 使える問題・出す順・始めるAPI・選ぶ画面の API | 2 |
| `tests/Pest.php`・`tests/Feature/CatchGameStartTest.php`（新規） | 2のテスト | 2 |
| `app/Support/CatchGame.php`・`routes/api.php`・`tests/Feature/CatchGameFinishTest.php`（新規） | 終えるAPI（採点・点数・覚え具合・ごほうび・自己ベスト） | 3 |
| `frontend/src/components/games/game-question.ts`・`catch/catch-engine.ts`（＋テスト、新規） | 問題の形・ゲームの動き | 4 |
| `frontend/src/components/games/catch/catch-api.ts`・`catch-view.ts`（＋テスト）・`catch-select.tsx`・`catch-game.tsx`・`catch-result.tsx`・`frontend/src/app/games/catch/page.tsx`・`frontend/src/app/globals.css` | 画面 | 5 |
| `frontend/src/app/learn/page.tsx`・`frontend/src/app/play/[id]/page.tsx`・`SPEC.md`・`TASKS.md` | 入口・ドキュメント | 6 |

---

### Task 1: 覚え具合に「最後の答えがまちがいだった日」を足す

**Files:**
- Create: `database/migrations/2026_09_29_000003_add_wrong_on_to_profile_question_memories_table.php`
- Modify: `app/Models/ProfileQuestionMemory.php`・`app/Support/QuestionMemory.php`
- Test: `tests/Feature/QuestionMemoryRecordTest.php`

**Interfaces:**
- Produces: 列 `profile_question_memories.wrong_on`（date・null可）。`QuestionMemory::wrongIdsAmong(UserProfile $profile, array $questionIds, int $limit): array`（list<int>、まちがえた日の新しい順）・`QuestionMemory::dueIdsAmong(UserProfile $profile, array $questionIds, int $limit): array`（list<int>、出す日の古い順）。どちらも `$limit <= 0` か `$questionIds === []` なら `[]`

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/QuestionMemoryRecordTest.php` の最後に足す（ファイルの `beforeEach` で日本時間 2026-09-29 12:00 に固定済み）。

```php
it('まちがえると wrong_on にその日が付き、正解すると空に戻る(スプルキャッチ。設計書4-4)', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();

    QuestionMemory::record($profile, $question->id, false, '2026-09-27');
    expect(ProfileQuestionMemory::query()->sole()->wrong_on->toDateString())->toBe('2026-09-27');

    QuestionMemory::record($profile, $question->id, true, '2026-09-27'); // 出す日より前の正解でも空に戻る
    expect(ProfileQuestionMemory::query()->sole()->wrong_on)->toBeNull();
});

it('答えのAPIでまちがえると wrong_on が付き、正解すると空に戻る', function () {
    createActiveProfile();
    [$question, $correct, $wrong] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $wrong->id])->assertOk();
    expect(ProfileQuestionMemory::query()->sole()->wrong_on->toDateString())->toBe('2026-09-29');

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])->assertOk();
    expect(ProfileQuestionMemory::query()->sole()->wrong_on)->toBeNull();
});

it('最後にまちがえた問題を、まちがえた日の新しい順に、渡した問題の中から返す', function () {
    $profile = createActiveProfile();
    [$a] = createQuestionWithChoices();
    [$b] = createQuestionWithChoices();
    [$c] = createQuestionWithChoices();
    [$d] = createQuestionWithChoices();
    QuestionMemory::record($profile, $a->id, false, '2026-09-27');
    QuestionMemory::record($profile, $b->id, false, '2026-09-28');
    QuestionMemory::record($profile, $c->id, false, '2026-09-28');
    QuestionMemory::record($profile, $c->id, true, '2026-09-29'); // 正解したので外れる
    QuestionMemory::record($profile, $d->id, false, '2026-09-29'); // 渡さない問題

    expect(QuestionMemory::wrongIdsAmong($profile, [$a->id, $b->id, $c->id], 5))->toBe([$b->id, $a->id])
        ->and(QuestionMemory::wrongIdsAmong($profile, [$a->id, $b->id, $c->id], 1))->toBe([$b->id])
        ->and(QuestionMemory::wrongIdsAmong($profile, [$a->id], 0))->toBe([])
        ->and(QuestionMemory::wrongIdsAmong($profile, [], 5))->toBe([]);
});

it('出す日が来た問題を、渡した問題の中から、出す日の古い順に返す', function () {
    $profile = createActiveProfile();
    [$a] = createQuestionWithChoices();
    [$b] = createQuestionWithChoices();
    [$c] = createQuestionWithChoices();
    [$d] = createQuestionWithChoices();
    QuestionMemory::record($profile, $a->id, false, '2026-09-27'); // 出す日 9/28
    QuestionMemory::record($profile, $b->id, false, '2026-09-26'); // 出す日 9/27
    QuestionMemory::record($profile, $c->id, false, '2026-09-29'); // 出す日 9/30(まだ)
    QuestionMemory::record($profile, $d->id, false, '2026-09-20'); // 渡さない問題

    expect(QuestionMemory::dueIdsAmong($profile, [$a->id, $b->id, $c->id], 5))->toBe([$b->id, $a->id])
        ->and(QuestionMemory::dueIdsAmong($profile, [$a->id, $b->id], 0))->toBe([])
        ->and(QuestionMemory::dueIdsAmong($profile, [], 5))->toBe([]);
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/QuestionMemoryRecordTest.php`
Expected: 新しい4つが FAIL（`wrong_on` の列がない・`wrongIdsAmong` がない）

- [ ] **Step 3: 列を足すマイグレーションを書く**

`database/migrations/2026_09_29_000003_add_wrong_on_to_profile_question_memories_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 最後の答えがまちがいだった日(docs/design/2026-09-29-spru-catch-design.md 4-4)。
 * スプルキャッチで「最近まちがえた問題」を先に出すのに使う。今までの記録には入れない
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profile_question_memories', function (Blueprint $table) {
            // まちがえたらその日。正解すると null
            $table->date('wrong_on')->nullable()->after('last_answered_on');
            $table->index(['user_profile_id', 'wrong_on']);
        });
    }

    public function down(): void
    {
        Schema::table('profile_question_memories', function (Blueprint $table) {
            $table->dropIndex(['user_profile_id', 'wrong_on']);
            $table->dropColumn('wrong_on');
        });
    }
};
```

注: `2026_09_29_000002`（今までの記録から覚え具合を作る）は、答えの記録（台帳）が空の新しい環境では何もしないので、列の追加がそのあとでも壊れない。開発用のデータベースは 000002 を実行済み。

- [ ] **Step 4: モデルと覚え具合の計算を直す**

`app/Models/ProfileQuestionMemory.php` の `$fillable` と `casts()` に `wrong_on` を足す:

```php
    protected $fillable = ['user_profile_id', 'question_id', 'level', 'due_on', 'mastered_on', 'last_answered_on', 'wrong_on'];

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'due_on' => 'date',
            'mastered_on' => 'date',
            'last_answered_on' => 'date',
            'wrong_on' => 'date',
        ];
    }
```

`app/Support/QuestionMemory.php` の `apply()` で、`$memory->last_answered_on = $today;` の前に1行足す:

```php
        // 最後の答えがまちがいだった日(スプルキャッチ。docs/design/2026-09-29-spru-catch-design.md 4-4)
        $memory->wrong_on = $correct ? null : $today;
        $memory->last_answered_on = $today;
```

`masteredCount()` の下に2つの関数を足す:

```php
    /**
     * 最後の答えがまちがいだった問題を、まちがえた日の新しい順に最大 $limit 個返す。$questionIds の中から選ぶ
     * (スプルキャッチ。docs/design/2026-09-29-spru-catch-design.md 4-2)
     *
     * @param  list<int>  $questionIds
     * @return list<int>
     */
    public static function wrongIdsAmong(UserProfile $profile, array $questionIds, int $limit): array
    {
        if ($limit <= 0 || $questionIds === []) {
            return [];
        }

        return ProfileQuestionMemory::query()
            ->where('user_profile_id', $profile->id)
            ->whereIn('question_id', $questionIds)
            ->whereNotNull('wrong_on')
            ->orderByDesc('wrong_on')
            ->orderByDesc('id')
            ->limit($limit)
            ->pluck('question_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * 出す日が来た問題を、出す日の古い順に最大 $limit 個返す。$questionIds の中から選ぶ(覚えた問題・鍵の国の問題は出さない)
     *
     * @param  list<int>  $questionIds
     * @return list<int>
     */
    public static function dueIdsAmong(UserProfile $profile, array $questionIds, int $limit): array
    {
        if ($limit <= 0 || $questionIds === []) {
            return [];
        }

        return self::dueQuery($profile)
            ->whereIn('profile_question_memories.question_id', $questionIds)
            ->orderBy('profile_question_memories.due_on')
            ->orderBy('profile_question_memories.id')
            ->limit($limit)
            ->pluck('profile_question_memories.question_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }
```

- [ ] **Step 5: テストが通るのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/QuestionMemoryRecordTest.php tests/Feature/QuestionMemoryTest.php tests/Feature/ReviewTest.php tests/Feature/StageReviewTest.php`
Expected: すべて PASS

- [ ] **Step 6: 開発用のデータベースに列を足す**

Run: `./vendor/bin/sail artisan migrate`
Expected: `2026_09_29_000003_add_wrong_on_to_profile_question_memories_table` が DONE

- [ ] **Step 7: コミット**

```bash
git add database/migrations/2026_09_29_000003_add_wrong_on_to_profile_question_memories_table.php app/Models/ProfileQuestionMemory.php app/Support/QuestionMemory.php tests/Feature/QuestionMemoryRecordTest.php
git commit -q -m "#00273: feat:覚え具合に最後の答えがまちがいだった日(wrong_on)を足し、最近まちがえた問題と出す日が来た問題を、渡した問題の中から返せるようにする" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 遊んだ回の表と、スプルキャッチを始めるAPI

**Files:**
- Create: `database/migrations/2026_09_29_000004_create_profile_game_plays_table.php`・`app/Models/ProfileGamePlay.php`・`config/games.php`・`app/Support/CatchGame.php`・`tests/Feature/CatchGameStartTest.php`
- Modify: `app/Models/UserProfile.php`・`routes/api.php`・`tests/Pest.php`

**Interfaces:**
- Consumes: Task 1 の `QuestionMemory::wrongIdsAmong`・`QuestionMemory::dueIdsAmong`
- Produces:
  - `ProfileGamePlay`（`question_ids` は array、`finished_at` は datetime、`played_on` は date、`rewarded` は bool）と `UserProfile::gamePlays(): HasMany`
  - `CatchGame::summary(UserProfile): array`・`CatchGame::start(UserProfile, string $difficulty): array`・`CatchGame::rewardedPlaysLeft(UserProfile): int`、private の `settings(string): array`（Task 3 でも使う）
  - `GET /api/games/catch` → `{ category_id: int|null, difficulties: [{ difficulty, lanes, available, best_score: int|null }], rewarded_plays_left }`
  - `POST /api/games/catch/plays`（`difficulty`）→ `{ play_id, difficulty, lanes, fall_ms, questions: [{ id, prompt, choices: [{ id, label }], correct_choice_id }] }`
  - テストの共通の関数（`tests/Pest.php`）: `createCatchStage(Country $country, string $difficulty = '初級', int $number = 1): Stage`・`createCatchQuestion(Stage $stage, array $labels = [...], string $type = 'multiple_choice'): Question`・`prepareCatchQuestions(UserProfile $profile, int $count, string $difficulty = '初級'): array`

- [ ] **Step 1: テストの共通の関数を足す**

`tests/Pest.php` の最後に足す（`Category`・`Country`・`Question`・`Quiz`・`Stage`・`UserProfile` はもう `use` されている）:

```php
/** スプルキャッチの問題の出どころ「英語を学ぶ」のステージ(docs/design/2026-09-29-spru-catch-design.md 4-1) */
function createCatchStage(Country $country, string $difficulty = '初級', int $number = 1): Stage
{
    $category = Category::query()->firstOrCreate(['name' => '英語を学ぶ'], ['is_language_mode' => true]);

    return Stage::create([
        'category_id' => $category->id,
        'country_id' => $country->id,
        'difficulty' => $difficulty,
        'stage_number' => $number,
    ]);
}

/** 問題を作ってステージに入れる。$labels の1つ目が正解 */
function createCatchQuestion(Stage $stage, array $labels = ['疲れた', '元気な', '眠い', '怒った'], string $type = 'multiple_choice'): Question
{
    $quiz = Quiz::create(['title' => 'スプルキャッチのテスト', 'difficulty' => $stage->difficulty]);
    $question = Question::create(['quiz_id' => $quiz->id, 'type' => $type, 'prompt' => '「tired」の意味は？']);
    foreach (array_values($labels) as $index => $label) {
        $question->choices()->create(['label' => $label, 'is_correct' => $index === 0, 'order' => $index + 1]);
    }
    $stage->questions()->attach($question->id, ['order' => $stage->questions()->count() + 1]);

    return $question;
}

/**
 * アメリカに着いたプロフィールに、その難しさのスプルキャッチの問題を $count 問(1以上)用意する
 *
 * @return list<Question>
 */
function prepareCatchQuestions(UserProfile $profile, int $count, string $difficulty = '初級'): array
{
    $stage = createCatchStage(createTravelCountry('us', 'アメリカ'), $difficulty);
    $profile->trips()->create(['destination' => 'us', 'arrived_at' => now()]);

    return array_map(fn () => createCatchQuestion($stage), range(1, $count));
}
```

- [ ] **Step 2: 失敗するテストを書く**

`tests/Feature/CatchGameStartTest.php`:

```php
<?php

use App\Models\Category;
use App\Models\ProfileGamePlay;
use App\Models\User;
use App\Support\QuestionMemory;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| スプルキャッチを始める(docs/design/2026-09-29-spru-catch-design.md 4章・6-3)
|--------------------------------------------------------------------------
|
| 「英語を学ぶ」の、選んだ難しさ・鍵のない国・4択・選択肢が短い問題を、
| 最近まちがえた問題と出す日が来た問題(あわせて6問まで)を先にして10問出す。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-09-29 03:00:00', 'UTC')); // 日本時間 9/29 12:00
});

it('難しさごとの列の数・使える問題の数・自己ベストと、今日のごほうびの残りを返す', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 2);
    $profile->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => [], 'finished_at' => now(), 'played_on' => '2026-09-29', 'score' => 50]);
    $profile->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => [], 'finished_at' => now(), 'played_on' => '2026-09-28', 'score' => 80]);

    $this->getJson('/api/games/catch')
        ->assertOk()
        ->assertJsonPath('category_id', Category::query()->where('name', '英語を学ぶ')->value('id'))
        ->assertJsonPath('difficulties.0', ['difficulty' => '初級', 'lanes' => 2, 'available' => 2, 'best_score' => 80])
        ->assertJsonPath('difficulties.1', ['difficulty' => '中級', 'lanes' => 3, 'available' => 0, 'best_score' => null])
        ->assertJsonPath('difficulties.2.lanes', 4)
        ->assertJsonPath('rewarded_plays_left', 2);
});

it('どの国にも着いていないと使える問題は0問で、始めると「アメリカかイギリスに着くと遊べるよ」', function () {
    createActiveProfile();
    createCatchQuestion(createCatchStage(createTravelCountry('us', 'アメリカ')));

    $this->getJson('/api/games/catch')->assertJsonPath('difficulties.0.available', 0);
    $this->postJson('/api/games/catch/plays', ['difficulty' => '初級'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'アメリカかイギリスに着くと遊べるよ');

    expect(ProfileGamePlay::query()->count())->toBe(0);
});

it('着いた国に、その難しさの問題がなければ「この難しさの問題はまだないよ」', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1, '初級');

    $this->postJson('/api/games/catch/plays', ['difficulty' => '上級'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'この難しさの問題はまだないよ');
});

it('選んだ難しさ・鍵のない国・4択・選択肢が短い・まちがいの選択肢が足りる問題だけを出す', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $gb = createTravelCountry('gb', 'イギリス');
    $profile->trips()->create(['destination' => 'us', 'arrived_at' => now()]);
    $stage = createCatchStage($us, '上級');
    $ok = createCatchQuestion($stage, ['who', 'which', 'whose', 'where']);
    createCatchQuestion(createCatchStage($us, '中級'));                                // ほかの難しさ
    createCatchQuestion(createCatchStage($gb, '上級'));                                // 鍵の国(イギリスにはまだ着いていない)
    createCatchQuestion($stage, ['A', 'B', 'C', 'D'], 'matching');                     // 4択でない
    createCatchQuestion($stage, ['几帳面な', '怠惰な', '気前の良い', '無関心な人たち']);       // 全角7文字は上級(6文字まで)に入らない
    createCatchQuestion($stage, ['who', 'which', 'whose']);                           // まちがいが2つで、4列に足りない

    $response = $this->postJson('/api/games/catch/plays', ['difficulty' => '上級'])->assertOk();

    expect(array_column($response->json('questions'), 'id'))->toBe([$ok->id]);
    $this->getJson('/api/games/catch')->assertJsonPath('difficulties.2.available', 1);
});

it('選択肢は列の数だけで、正解が1つ入り、correct_choice_id がその正解', function () {
    $profile = createActiveProfile();
    [$question] = prepareCatchQuestions($profile, 1, '中級');
    $correctId = $question->choices()->where('is_correct', true)->value('id');

    $response = $this->postJson('/api/games/catch/plays', ['difficulty' => '中級'])
        ->assertOk()
        ->assertJsonPath('difficulty', '中級')
        ->assertJsonPath('lanes', 3)
        ->assertJsonPath('fall_ms', 6000);

    $dealt = $response->json('questions.0');
    expect($dealt['prompt'])->toBe('「tired」の意味は？')
        ->and($dealt['correct_choice_id'])->toBe($correctId)
        ->and($dealt['choices'])->toHaveCount(3)
        ->and(array_column($dealt['choices'], 'id'))->toContain($correctId)
        ->and(array_keys($dealt['choices'][0]))->toBe(['id', 'label']);
});

it('始めると遊んだ回が1行でき、出した問題の順と同じ番号が残る', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 5);

    $response = $this->postJson('/api/games/catch/plays', ['difficulty' => '初級'])->assertOk();

    $play = ProfileGamePlay::query()->sole();
    expect($response->json('play_id'))->toBe($play->id)
        ->and([$play->user_profile_id, $play->game, $play->difficulty])->toBe([$profile->id, 'catch', '初級'])
        ->and($play->question_ids)->toBe(array_column($response->json('questions'), 'id'))
        ->and($play->finished_at)->toBeNull()
        ->and($play->played_on)->toBeNull();
});

it('1回は10問まで', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 12);

    expect($this->postJson('/api/games/catch/plays', ['difficulty' => '初級'])->json('questions'))->toHaveCount(10);
});

it('使える問題が10問より少なければ、ある分だけ出す', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 3);

    expect($this->postJson('/api/games/catch/plays', ['difficulty' => '初級'])->json('questions'))->toHaveCount(3);
});

it('最近まちがえた問題(新しい順)と出す日が来た問題(古い順)を、あわせて6問まで先に入れる', function () {
    $profile = createActiveProfile();
    $questions = prepareCatchQuestions($profile, 18);
    $wrong = array_slice($questions, 0, 5);
    $due = array_slice($questions, 5, 3);
    $fresh = array_slice($questions, 8);
    foreach ($wrong as $index => $question) {
        QuestionMemory::record($profile, $question->id, false, '2026-09-2'.(5 + $index)); // 9/25〜9/29 にまちがえた
    }
    foreach ($due as $index => $question) {
        // 9/18〜20 にまちがえ、次の日に正解 → 段階2・出す日 9/22〜24(来ている)。最後の答えは正解
        QuestionMemory::record($profile, $question->id, false, '2026-09-'.(18 + $index));
        QuestionMemory::record($profile, $question->id, true, '2026-09-'.(19 + $index));
    }
    $idsOf = fn (array $list) => array_map(fn ($question) => $question->id, $list);

    $ids = array_column($this->postJson('/api/games/catch/plays', ['difficulty' => '初級'])->json('questions'), 'id');

    expect($ids)->toHaveCount(10)
        ->and(array_intersect($idsOf($wrong), $ids))->toHaveCount(5)
        ->and(array_values(array_intersect($idsOf($due), $ids)))->toBe([$due[0]->id])
        ->and(array_intersect($idsOf($fresh), $ids))->toHaveCount(4);
});

it('遊んでいるプロフィールがなければ422、難しさが正しくなければ422', function () {
    $this->actingAs(User::factory()->create())->withHeader('Referer', 'http://localhost');
    $this->getJson('/api/games/catch')->assertStatus(422);
    $this->postJson('/api/games/catch/plays', ['difficulty' => '初級'])->assertStatus(422);

    createActiveProfile();
    $this->postJson('/api/games/catch/plays', ['difficulty' => '超級'])->assertStatus(422)->assertJsonValidationErrors('difficulty');
});
```

- [ ] **Step 3: テストが失敗するのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/CatchGameStartTest.php`
Expected: FAIL（`gamePlays` がない・`/api/games/catch` が 404）

- [ ] **Step 4: 表・モデル・設定を作る**

`database/migrations/2026_09_29_000004_create_profile_game_plays_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ミニゲームを遊んだ回(docs/design/2026-09-29-spru-catch-design.md 5-1)。始めたときに1行作り、終えたときに結果を書く
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_game_plays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            // ゲームの名前(catch など)
            $table->string('game');
            $table->string('difficulty');
            // 出した問題の番号(出した順)
            $table->json('question_ids');
            $table->timestamp('finished_at')->nullable();
            // 終えた日(日本時間)。1日のごほうびの回数を数える
            $table->date('played_on')->nullable();
            $table->unsignedTinyInteger('answered_count')->nullable();
            $table->unsignedTinyInteger('correct_count')->nullable();
            $table->unsignedSmallInteger('score')->nullable();
            $table->unsignedTinyInteger('best_combo')->nullable();
            $table->boolean('rewarded')->default(false);
            $table->timestamps();

            $table->index(['user_profile_id', 'game', 'played_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_game_plays');
    }
};
```

`app/Models/ProfileGamePlay.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** ミニゲームを遊んだ回(docs/design/2026-09-29-spru-catch-design.md 5-1) */
class ProfileGamePlay extends Model
{
    protected $fillable = [
        'game',
        'difficulty',
        'question_ids',
        'finished_at',
        'played_on',
        'answered_count',
        'correct_count',
        'score',
        'best_combo',
        'rewarded',
    ];

    protected function casts(): array
    {
        return [
            'question_ids' => 'array',
            'finished_at' => 'datetime',
            'played_on' => 'date',
            'answered_count' => 'integer',
            'correct_count' => 'integer',
            'score' => 'integer',
            'best_combo' => 'integer',
            'rewarded' => 'boolean',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }
}
```

`app/Models/UserProfile.php` の `trips()` の下に足す:

```php
    /** ミニゲームを遊んだ回(docs/design/2026-09-29-spru-catch-design.md 5-1) */
    public function gamePlays(): HasMany
    {
        return $this->hasMany(ProfileGamePlay::class);
    }
```

`config/games.php`:

```php
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | スプルキャッチ(英単語のミニゲーム)
    |--------------------------------------------------------------------------
    |
    | docs/design/2026-09-29-spru-catch-design.md 3-3・6-1。
    | lanes は列の数(選択肢の数)、fall_ms は受け取る線まで落ちる時間、
    | max_label_width は選択肢の長さの上限(mb_strwidth。全角1文字が2)、reward は正解1問あたりのごほうび。
    |
    */

    'catch' => [
        'category' => '英語を学ぶ',
        'question_count' => 10,
        'review_max' => 6,
        'daily_rewarded_plays' => 3,
        'score' => ['correct' => 10, 'combo_bonus' => 5, 'combo_bonus_from' => 3],
        'difficulties' => [
            '初級' => ['lanes' => 2, 'fall_ms' => 8000, 'max_label_width' => 16, 'reward' => ['xp' => 3, 'point' => 3]],
            '中級' => ['lanes' => 3, 'fall_ms' => 6000, 'max_label_width' => 14, 'reward' => ['xp' => 4, 'point' => 3]],
            '上級' => ['lanes' => 4, 'fall_ms' => 4500, 'max_label_width' => 12, 'reward' => ['xp' => 5, 'point' => 3]],
        ],
        'messages' => [
            'locked' => 'アメリカかイギリスに着くと遊べるよ',
            'empty' => 'この難しさの問題はまだないよ',
        ],
    ],

];
```

- [ ] **Step 5: 計算（`CatchGame`）を書く**

`app/Support/CatchGame.php`:

```php
<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Question;
use App\Models\QuestionChoice;
use App\Models\UserProfile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * ミニゲーム1本目「スプルキャッチ(英単語)」(docs/design/2026-09-29-spru-catch-design.md 4〜6章)。
 * 「英語を学ぶ」の問題から、選んだ難しさ・鍵のない国・4択・選択肢が短い問題を選び、
 * 最近まちがえた問題と出す日が来た問題を先に出す。正解は始めるときに渡し、終えるときに採点し直す。
 */
class CatchGame
{
    public const GAME = 'catch';

    /** 難しさを選ぶ画面に出すもの(設計書6-3) */
    public static function summary(UserProfile $profile): array
    {
        $best = $profile->gamePlays()
            ->where('game', self::GAME)
            ->whereNotNull('finished_at')
            ->groupBy('difficulty')
            ->selectRaw('difficulty, MAX(score) AS best')
            ->pluck('best', 'difficulty');

        return [
            'category_id' => self::categoryId(),
            'difficulties' => collect(config('games.catch.difficulties'))
                ->map(fn (array $settings, string $difficulty) => [
                    'difficulty' => $difficulty,
                    'lanes' => $settings['lanes'],
                    'available' => self::pool($profile, $difficulty)->count(),
                    'best_score' => isset($best[$difficulty]) ? (int) $best[$difficulty] : null,
                ])
                ->values()
                ->all(),
            'rewarded_plays_left' => self::rewardedPlaysLeft($profile),
        ];
    }

    /** 回を始める。問題を選んで遊んだ回を1行作り、問題と正解と設定を返す(設計書4章・6-3) */
    public static function start(UserProfile $profile, string $difficulty): array
    {
        $settings = self::settings($difficulty);
        $pool = self::pool($profile, $difficulty);
        abort_if(
            $pool->isEmpty(),
            422,
            self::stageQuestionIds($profile, null) === [] ? config('games.catch.messages.locked') : config('games.catch.messages.empty'),
        );

        $ids = self::pick($profile, $pool->pluck('id')->all());
        $play = $profile->gamePlays()->create(['game' => self::GAME, 'difficulty' => $difficulty, 'question_ids' => $ids]);
        $byId = $pool->keyBy('id');

        return [
            'play_id' => $play->id,
            'difficulty' => $difficulty,
            'lanes' => $settings['lanes'],
            'fall_ms' => $settings['fall_ms'],
            'questions' => array_map(fn (int $id) => self::present($byId[$id], $settings['lanes']), $ids),
        ];
    }

    /** 今日のごほうびの残り回数。その日に終えた回を数える(終えていない回は数えない。設計書5-2) */
    public static function rewardedPlaysLeft(UserProfile $profile): int
    {
        $finishedToday = $profile->gamePlays()
            ->where('game', self::GAME)
            ->where('played_on', Garden::today())
            ->count();

        return max(0, config('games.catch.daily_rewarded_plays') - $finishedToday);
    }

    /** @return array{lanes: int, fall_ms: int, max_label_width: int, reward: array{xp: int, point: int}} */
    private static function settings(string $difficulty): array
    {
        return config('games.catch.difficulties')[$difficulty];
    }

    private static function categoryId(): ?int
    {
        $id = Category::query()->where('name', config('games.catch.category'))->value('id');

        return $id === null ? null : (int) $id;
    }

    /**
     * 「英語を学ぶ」の、鍵のない国のステージに入っている問題の番号。$difficulty が null なら全部の難しさ
     *
     * @return list<int>
     */
    private static function stageQuestionIds(UserProfile $profile, ?string $difficulty): array
    {
        $categoryId = self::categoryId();
        if ($categoryId === null) {
            return [];
        }
        $locked = Travel::lockedCountryIds($profile);

        return DB::table('stage_questions')
            ->join('stages', 'stages.id', '=', 'stage_questions.stage_id')
            ->where('stages.category_id', $categoryId)
            ->when($difficulty !== null, fn ($query) => $query->where('stages.difficulty', $difficulty))
            ->when($locked !== [], fn ($query) => $query->where(
                fn ($inner) => $inner->whereNull('stages.country_id')->orWhereNotIn('stages.country_id', $locked),
            ))
            ->distinct()
            ->pluck('stage_questions.question_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * 使える問題(設計書4-1)
     *
     * @return Collection<int, Question>
     */
    private static function pool(UserProfile $profile, string $difficulty): Collection
    {
        $settings = self::settings($difficulty);

        return Question::query()
            ->with('choices')
            ->whereIn('id', self::stageQuestionIds($profile, $difficulty))
            ->where('type', 'multiple_choice')
            ->orderBy('id')
            ->get(['id', 'prompt'])
            ->filter(fn (Question $question) => self::fits($question, $settings))
            ->values();
    }

    /** 正解が1つ、まちがいが「列の数−1」以上、選択肢がすべて長さの上限に収まる */
    private static function fits(Question $question, array $settings): bool
    {
        return $question->choices->where('is_correct', true)->count() === 1
            && $question->choices->where('is_correct', false)->count() >= $settings['lanes'] - 1
            && $question->choices->every(fn (QuestionChoice $choice) => mb_strwidth($choice->label) <= $settings['max_label_width']);
    }

    /**
     * 出す問題を選ぶ(設計書4-2)。最近まちがえた問題 → 出す日が来た問題(あわせて review_max まで) →
     * どちらでもない問題をランダムに。足りなければ、入りきらなかった復習の問題を足す。最後に順をまぜる
     *
     * @param  list<int>  $poolIds
     * @return list<int>
     */
    private static function pick(UserProfile $profile, array $poolIds): array
    {
        $reviewMax = config('games.catch.review_max');
        $wrong = QuestionMemory::wrongIdsAmong($profile, $poolIds, count($poolIds));
        $due = QuestionMemory::dueIdsAmong($profile, array_values(array_diff($poolIds, $wrong)), count($poolIds));
        $review = [...$wrong, ...$due];
        $fresh = collect($poolIds)->diff($review)->shuffle()->values()->all();

        return collect([...array_slice($review, 0, $reviewMax), ...$fresh, ...array_slice($review, $reviewMax)])
            ->take(config('games.catch.question_count'))
            ->shuffle()
            ->values()
            ->all();
    }

    /** 正解と、まちがいからランダムに「列の数−1」個をまぜて列の順にする(設計書4-3) */
    private static function present(Question $question, int $lanes): array
    {
        $correct = $question->choices->firstWhere('is_correct', true);
        $choices = $question->choices
            ->where('is_correct', false)
            ->shuffle()
            ->take($lanes - 1)
            ->push($correct)
            ->shuffle()
            ->values();

        return [
            'id' => $question->id,
            'prompt' => $question->prompt,
            'choices' => $choices->map(fn (QuestionChoice $choice) => ['id' => $choice->id, 'label' => $choice->label])->all(),
            'correct_choice_id' => $correct->id,
        ];
    }
}
```

- [ ] **Step 6: API を足す**

`routes/api.php` の `use App\Support\Bond;` の下に `use App\Support\CatchGame;` を足す。`review` のグループ（`Route::middleware(['auth:sanctum'])->prefix('review')…`）の閉じ `});` の下に足す:

```php
// ミニゲーム1本目「スプルキャッチ」(docs/design/2026-09-29-spru-catch-design.md 6-3)
Route::middleware(['auth:sanctum'])->prefix('games/catch')->name('games.catch.')->group(function () {
    Route::get('/', function (Request $request) {
        return CatchGame::summary(ActiveProfile::require($request));
    })->name('show');

    Route::post('/plays', function (Request $request) {
        $profile = ActiveProfile::require($request);
        $data = $request->validate([
            'difficulty' => ['required', 'string', Rule::in(array_keys(config('games.catch.difficulties')))],
        ]);

        return CatchGame::start($profile, $data['difficulty']);
    })->name('plays.store');
});
```

- [ ] **Step 7: テストが通るのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/CatchGameStartTest.php`
Expected: すべて PASS

- [ ] **Step 8: 開発用のデータベースに表を作る**

Run: `./vendor/bin/sail artisan migrate`
Expected: `2026_09_29_000004_create_profile_game_plays_table` が DONE

- [ ] **Step 9: コミット**

```bash
git add database/migrations/2026_09_29_000004_create_profile_game_plays_table.php app/Models/ProfileGamePlay.php app/Models/UserProfile.php config/games.php app/Support/CatchGame.php routes/api.php tests/Pest.php tests/Feature/CatchGameStartTest.php
git commit -q -m "#00274: feat:スプルキャッチの遊んだ回の表と、難しさを選ぶ画面・始めるAPIを作る(英語を学ぶ・鍵のない国・選択肢の長さで選び、最近まちがえた問題と復習の問題を6問まで先に出す)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: スプルキャッチを終えるAPI（採点・覚え具合・ごほうび・自己ベスト）

**Files:**
- Modify: `app/Support/CatchGame.php`・`routes/api.php`
- Create: `tests/Feature/CatchGameFinishTest.php`

**Interfaces:**
- Consumes: Task 2 の `ProfileGamePlay`・`CatchGame::rewardedPlaysLeft`・`CatchGame::settings`・`prepareCatchQuestions`、Task 1 の `wrong_on`
- Produces:
  - `CatchGame::score(array $results): array{score: int, best_combo: int}`（`$results` は list<bool>、答えた順）
  - `CatchGame::finish(ProfileGamePlay $play, array $answers): array`
  - `POST /api/games/catch/plays/{play}/finish`（`answers: [{ question_id, choice_id }]`）→ `{ answered_count, correct_count, score, best_combo, best_score, new_best, reward: {xp, point}|null, rewarded_plays_left, leveled_up, previous_level, level }`

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/CatchGameFinishTest.php`:

```php
<?php

use App\Models\ProfileGamePlay;
use App\Models\ProfileQuestionMemory;
use App\Support\CatchGame;
use App\Support\LevelCurve;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| スプルキャッチを終える(docs/design/2026-09-29-spru-catch-design.md 3-5・4-4・5章・6-3)
|--------------------------------------------------------------------------
|
| 終えるときにサーバーで採点し直し、点数・コンボを計算して、覚え具合に書き、
| その日の最初の3回だけ経験値と学習ポイントを出す。HP とコインは動かさない。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-09-29 03:00:00', 'UTC')); // 日本時間 9/29 12:00
});

/** 始めるAPIで回を始め、返事(問題と正解)を返す */
function startCatchPlay(string $difficulty = '初級'): array
{
    return test()->postJson('/api/games/catch/plays', ['difficulty' => $difficulty])->assertOk()->json();
}

/** 返事の問題の先頭から、$pattern(true=正解・false=まちがい)のとおりに答える形を作る */
function catchAnswers(array $play, array $pattern): array
{
    return array_map(function (array $question, bool $correct) {
        $choice = collect($question['choices'])->first(fn (array $c) => ($c['id'] === $question['correct_choice_id']) === $correct);

        return ['question_id' => $question['id'], 'choice_id' => $choice['id']];
    }, array_slice($play['questions'], 0, count($pattern)), $pattern);
}

function finishCatchUrl(array $play): string
{
    return "/api/games/catch/plays/{$play['play_id']}/finish";
}

it('採点し直して、正解の数・点数・いちばん長いコンボを返し、遊んだ回に残す', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 4);
    $play = startCatchPlay();

    $this->postJson(finishCatchUrl($play), ['answers' => catchAnswers($play, [true, true, true, false])])
        ->assertOk()
        ->assertJsonPath('answered_count', 4)
        ->assertJsonPath('correct_count', 3)
        ->assertJsonPath('score', 35)
        ->assertJsonPath('best_combo', 3);

    $row = ProfileGamePlay::query()->sole();
    expect([$row->played_on->toDateString(), $row->answered_count, $row->correct_count, $row->score, $row->best_combo])
        ->toBe(['2026-09-29', 4, 3, 35, 3])
        ->and($row->finished_at)->not->toBeNull();
});

it('点数の決まり(画面のテストと同じ例)', function () {
    expect(CatchGame::score([true, true, true, true, true, true, false, true, true, false]))->toBe(['score' => 100, 'best_combo' => 6])
        ->and(CatchGame::score(array_fill(0, 10, true)))->toBe(['score' => 140, 'best_combo' => 10])
        ->and(CatchGame::score([false, true, true, true]))->toBe(['score' => 35, 'best_combo' => 3])
        ->and(CatchGame::score([]))->toBe(['score' => 0, 'best_combo' => 0]);
});

it('答えを問題ごとの覚え具合に書き、まちがえた問題には wrong_on が付く', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 2);
    $play = startCatchPlay();

    $this->postJson(finishCatchUrl($play), ['answers' => catchAnswers($play, [true, false])])->assertOk();

    $memories = ProfileQuestionMemory::query()->get()->keyBy('question_id');
    expect($memories)->toHaveCount(2)
        ->and($memories[$play['questions'][0]['id']]->wrong_on)->toBeNull()
        ->and($memories[$play['questions'][1]['id']]->wrong_on->toDateString())->toBe('2026-09-29');
});

it('ごほうび: 正解の数×1問あたりの経験値と学習ポイントを出し、HPとコインは変わらない', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 3, '中級');
    $before = $profile->fresh();
    $play = startCatchPlay('中級');

    $this->postJson(finishCatchUrl($play), ['answers' => catchAnswers($play, [true, true, false])])
        ->assertOk()
        ->assertJsonPath('reward', ['xp' => 8, 'point' => 6])
        ->assertJsonPath('rewarded_plays_left', 2);

    $after = $profile->fresh();
    expect([$after->xp - $before->xp, $after->points - $before->points, $after->hp, $after->coins])
        ->toBe([8, 6, $before->hp, $before->coins])
        ->and($profile->currencyLedger()->where('reason', 'game_catch')->pluck('delta', 'type')->all())
        ->toEqual(['xp' => 8, 'point' => 6]);
});

it('ごほうびは1日3回まで。4回目は出ず、日付が変わるとまた出る', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1);
    $finish = function () {
        $play = startCatchPlay();

        return $this->postJson(finishCatchUrl($play), ['answers' => catchAnswers($play, [true])])->assertOk();
    };

    foreach ([2, 1, 0] as $left) {
        $finish()->assertJsonPath('reward', ['xp' => 3, 'point' => 3])->assertJsonPath('rewarded_plays_left', $left);
    }
    $finish()->assertJsonPath('reward', null)->assertJsonPath('rewarded_plays_left', 0);

    $this->travelTo(Carbon::parse('2026-09-29 15:30:00', 'UTC')); // 日本時間 9/30 0:30
    $finish()->assertJsonPath('reward', ['xp' => 3, 'point' => 3])->assertJsonPath('rewarded_plays_left', 2);
});

it('正解が0でも1回と数え、ごほうびの記録は付けない', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1);
    $play = startCatchPlay();

    $this->postJson(finishCatchUrl($play), ['answers' => catchAnswers($play, [false])])
        ->assertOk()
        ->assertJsonPath('reward', null)
        ->assertJsonPath('rewarded_plays_left', 2);

    expect($profile->currencyLedger()->where('reason', 'game_catch')->count())->toBe(0);
});

it('答えが0個でも終えられる', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1);
    $play = startCatchPlay();

    $this->postJson(finishCatchUrl($play), ['answers' => []])
        ->assertOk()
        ->assertJsonPath('answered_count', 0)
        ->assertJsonPath('score', 0);
});

it('終えていない回は、1日のごほうびの回数に数えない', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1);
    startCatchPlay();
    startCatchPlay();
    startCatchPlay();

    $this->getJson('/api/games/catch')->assertJsonPath('rewarded_plays_left', 3);
});

it('日付をまたいで終えた回は、終えた日の回として数える', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1);
    $this->travelTo(Carbon::parse('2026-09-29 14:59:00', 'UTC')); // 日本時間 9/29 23:59
    $play = startCatchPlay();

    $this->travelTo(Carbon::parse('2026-09-29 15:01:00', 'UTC')); // 日本時間 9/30 0:01
    $this->postJson(finishCatchUrl($play), ['answers' => catchAnswers($play, [true])])->assertOk();

    expect(ProfileGamePlay::query()->sole()->played_on->toDateString())->toBe('2026-09-30');
    $this->getJson('/api/games/catch')->assertJsonPath('rewarded_plays_left', 2);
});

it('自己ベスト: 初めての回と超えた回は new_best。下回った回は前のベストのまま', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 3);

    $first = startCatchPlay();
    $this->postJson(finishCatchUrl($first), ['answers' => catchAnswers($first, [true, true, true])])
        ->assertJsonPath('score', 35)->assertJsonPath('best_score', 35)->assertJsonPath('new_best', true);

    $second = startCatchPlay();
    $this->postJson(finishCatchUrl($second), ['answers' => catchAnswers($second, [true, false, false])])
        ->assertJsonPath('score', 10)->assertJsonPath('best_score', 35)->assertJsonPath('new_best', false);
});

it('終えた回をもう一度終えると409(ごほうびも記録も二重にならない)。ほかのプロフィールの回は404', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1);
    $play = startCatchPlay();
    $answers = catchAnswers($play, [true]);

    $this->postJson(finishCatchUrl($play), ['answers' => $answers])->assertOk();
    $this->postJson(finishCatchUrl($play), ['answers' => $answers])->assertStatus(409);

    expect($profile->currencyLedger()->where('reason', 'game_catch')->count())->toBe(2) // 1回ぶん(経験値と学習ポイントの2行)
        ->and(ProfileGamePlay::query()->sole()->answered_count)->toBe(1);

    $other = createFamilyMember($profile)->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => []]);
    $this->postJson("/api/games/catch/plays/{$other->id}/finish", ['answers' => []])->assertNotFound();
});

it('出していない問題・同じ問題を2回・ほかの問題の選択肢・ない選択肢・多すぎる答えは422で、何も残さない', function () {
    $profile = createActiveProfile();
    $questions = prepareCatchQuestions($profile, 3);
    config(['games.catch.question_count' => 2]);
    $play = startCatchPlay();
    $dealt = array_column($play['questions'], 'id');
    $notDealt = collect($questions)->first(fn ($question) => ! in_array($question->id, $dealt, true));
    $notDealtAnswer = ['question_id' => $notDealt->id, 'choice_id' => $notDealt->choices()->value('id')];
    [$a, $b] = catchAnswers($play, [true, true]);

    foreach ([
        [$notDealtAnswer],                                                    // 出していない問題
        [$a, $a],                                                             // 同じ問題を2回
        [['question_id' => $a['question_id'], 'choice_id' => $b['choice_id']]], // ほかの問題の選択肢
        [['question_id' => $a['question_id'], 'choice_id' => 999999]],         // ない選択肢
        [$a, $b, $notDealtAnswer],                                            // 出した問題の数より多い
    ] as $answers) {
        $this->postJson(finishCatchUrl($play), ['answers' => $answers])->assertStatus(422);
    }
    $this->postJson(finishCatchUrl($play), [])->assertStatus(422)->assertJsonValidationErrors('answers');

    expect(ProfileGamePlay::query()->sole()->finished_at)->toBeNull()
        ->and(ProfileQuestionMemory::query()->count())->toBe(0);
});

it('レベルが上がったら leveled_up と、終える前のレベルを返す', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1);
    $profile->update(['xp' => LevelCurve::totalXpFor(2) - 1]);
    $play = startCatchPlay();

    $this->postJson(finishCatchUrl($play), ['answers' => catchAnswers($play, [true])])
        ->assertOk()
        ->assertJsonPath('leveled_up', true)
        ->assertJsonPath('previous_level', 1)
        ->assertJsonPath('level', 2);
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/CatchGameFinishTest.php`
Expected: FAIL（`CatchGame::score` がない・終えるAPIが 404）

- [ ] **Step 3: 採点・点数・ごほうびを書く**

`app/Support/CatchGame.php` の先頭の `use` に `use App\Models\ProfileGamePlay;` を足し、`rewardedPlaysLeft()` の下に足す:

```php
    /**
     * 回を終える(設計書4-4・5章・6-3)。答えを採点し直して覚え具合に書き、その日の最初の3回ならごほうびを出す。
     * 呼ぶ側で、終えていない回をロックしてから呼ぶ
     *
     * @param  list<array{question_id: int|string, choice_id: int|string}>  $answers  答えた順
     */
    public static function finish(ProfileGamePlay $play, array $answers): array
    {
        $dealt = array_map('intval', $play->question_ids);
        $questionIds = array_map(fn (array $answer) => (int) $answer['question_id'], $answers);
        abort_if(
            count($answers) > count($dealt)
            || count(array_unique($questionIds)) !== count($questionIds)
            || array_diff($questionIds, $dealt) !== [],
            422,
            '答えが正しくありません。',
        );

        $choices = QuestionChoice::query()
            ->whereIn('id', array_map(fn (array $answer) => (int) $answer['choice_id'], $answers))
            ->get(['id', 'question_id', 'is_correct'])
            ->keyBy('id');
        $results = array_map(function (array $answer) use ($choices) {
            $choice = $choices->get((int) $answer['choice_id']);
            abort_if(! $choice || (int) $choice->question_id !== (int) $answer['question_id'], 422, '答えが正しくありません。');

            return ['question_id' => (int) $choice->question_id, 'correct' => $choice->is_correct];
        }, $answers);

        $profile = UserProfile::query()->whereKey($play->user_profile_id)->lockForUpdate()->firstOrFail();
        $today = Garden::today();
        foreach ($results as $result) {
            QuestionMemory::record($profile, $result['question_id'], $result['correct'], $today);
        }

        $flags = array_column($results, 'correct');
        ['score' => $score, 'best_combo' => $bestCombo] = self::score($flags);
        $correctCount = count(array_filter($flags));
        $previousBest = (int) $profile->gamePlays()
            ->where('game', self::GAME)
            ->where('difficulty', $play->difficulty)
            ->whereNotNull('finished_at')
            ->max('score');
        $left = self::rewardedPlaysLeft($profile);
        $previousLevel = $profile->level;
        $reward = null;
        $leveledUp = false;

        if ($left > 0 && $correctCount > 0) {
            $per = self::settings($play->difficulty)['reward'];
            $reward = ['xp' => $correctCount * $per['xp'], 'point' => $correctCount * $per['point']];
            $leveledUp = $profile->applyEconomy($reward, 'game_catch')['leveled_up'];
        }

        $play->fill([
            'finished_at' => now(),
            'played_on' => $today,
            'answered_count' => count($results),
            'correct_count' => $correctCount,
            'score' => $score,
            'best_combo' => $bestCombo,
            'rewarded' => $reward !== null,
        ])->save();

        return [
            'answered_count' => count($results),
            'correct_count' => $correctCount,
            'score' => $score,
            'best_combo' => $bestCombo,
            'best_score' => max($previousBest, $score),
            'new_best' => $score > $previousBest,
            'reward' => $reward,
            'rewarded_plays_left' => max(0, $left - 1),
            'leveled_up' => $leveledUp,
            'previous_level' => $previousLevel,
            'level' => $profile->level,
        ];
    }

    /**
     * 答えの並び(正解か)から、点数といちばん長いコンボ(設計書3-5)。画面の scoreOf と同じ決まり
     *
     * @param  list<bool>  $results
     * @return array{score: int, best_combo: int}
     */
    public static function score(array $results): array
    {
        $rules = config('games.catch.score');
        $score = 0;
        $combo = 0;
        $best = 0;

        foreach ($results as $correct) {
            if (! $correct) {
                $combo = 0;

                continue;
            }
            $combo++;
            $best = max($best, $combo);
            $score += $rules['correct'] + ($combo >= $rules['combo_bonus_from'] ? $rules['combo_bonus'] : 0);
        }

        return ['score' => $score, 'best_combo' => $best];
    }
```

- [ ] **Step 4: 終えるAPIを足す**

`routes/api.php` の先頭の `use` に `use App\Models\ProfileGamePlay;` を足す（`use App\Models\ProfileStageProgress;` の上）。Task 2 で作った `games/catch` のグループの中、`plays.store` の下に足す:

```php
    Route::post('/plays/{play}/finish', function (Request $request, ProfileGamePlay $play) {
        $profile = ActiveProfile::require($request);
        abort_unless($play->user_profile_id === $profile->id && $play->game === CatchGame::GAME, 404);
        $data = $request->validate([
            'answers' => ['present', 'array'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.choice_id' => ['required', 'integer'],
        ]);

        return DB::transaction(function () use ($play, $data) {
            $locked = ProfileGamePlay::query()->whereKey($play->id)->lockForUpdate()->firstOrFail();
            abort_if($locked->finished_at !== null, 409, 'この回はもう終わっています。');

            return CatchGame::finish($locked, $data['answers']);
        });
    })->name('plays.finish');
```

- [ ] **Step 5: テストが通るのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/CatchGameFinishTest.php tests/Feature/CatchGameStartTest.php`
Expected: すべて PASS

- [ ] **Step 6: サーバーのテストを全部流す**

Run: `./vendor/bin/sail test`
Expected: すべて PASS（今の402件＋この計画で足した分）

- [ ] **Step 7: コミット**

```bash
git add app/Support/CatchGame.php routes/api.php tests/Feature/CatchGameFinishTest.php
git commit -q -m "#00275: feat:スプルキャッチを終えるAPIを作る(採点し直して点数とコンボを出し、覚え具合に書き、ごほうびは1日3回まで・HPとコインは動かさない)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 問題の形とゲームの動き（画面の計算）

**Files:**
- Create: `frontend/src/components/games/game-question.ts`・`game-question.test.ts`・`frontend/src/components/games/catch/catch-engine.ts`・`catch-engine.test.ts`

**Interfaces:**
- Produces:
  - `GameChoice = { id: number; label: string }`・`GameQuestion = { id: number; prompt: string; choices: GameChoice[]; correctChoiceId: number }`・`splitPrompt(prompt: string): { focus: string; rest: string }`
  - `CatchSettings = { lanes: number; fallMs: number }`・`CatchPhase = "falling" | "feedback" | "done"`・`CatchAnswer = { questionId: number; choiceId: number; correct: boolean }`・`GrowthStage = "seed" | "sprout" | "bud" | "flower"`・`CatchState`（下のコード）
  - `CATCH_HEARTS = 3`・`FEEDBACK_MS = { correct: 800, wrong: 1600 }`・`MAX_STEP_MS = 100`
  - `startLane(lanes)`・`createCatchGame(questions, settings)`・`moveTo(state, lane)`・`moveBy(state, step)`・`tick(state, dtMs)`・`scoreOf(results: boolean[]): { score: number; bestCombo: number }`・`growthStage(bestCombo)`・`isPerfect(state)`・`answersOf(state): { question_id: number; choice_id: number }[]`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/games/game-question.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { splitPrompt } from "./game-question";

describe("問題文の分け方", () => {
  it("「」で始まる文は、「」の中を大きく見せる所にし、残りを小さく見せる所にする", () => {
    expect(splitPrompt("「Hello」の意味は？")).toEqual({ focus: "Hello", rest: "の意味は？" });
  });

  it("文法の文も同じ分け方にする", () => {
    expect(splitPrompt("「The man ___ is my uncle.」空欄に入る最も適切な関係代名詞は？")).toEqual({
      focus: "The man ___ is my uncle.",
      rest: "空欄に入る最も適切な関係代名詞は？",
    });
  });

  it("「」で始まらない文は、そのまま大きく見せる", () => {
    expect(splitPrompt("7を表す英単語は？")).toEqual({ focus: "7を表す英単語は？", rest: "" });
  });
});
```

`frontend/src/components/games/catch/catch-engine.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { GameQuestion } from "@/components/games/game-question";

import {
  CATCH_HEARTS,
  FEEDBACK_MS,
  answersOf,
  createCatchGame,
  growthStage,
  isPerfect,
  moveBy,
  moveTo,
  scoreOf,
  startLane,
  tick,
  type CatchState,
} from "./catch-engine";

/** 問題を作る。選択肢の番号は 問題の番号×10＋列 */
function question(id: number, labels: string[], correctLane = 0): GameQuestion {
  const choices = labels.map((label, lane) => ({ id: id * 10 + lane, label }));
  return { id, prompt: `「word${id}」の意味は？`, choices, correctChoiceId: choices[correctLane].id };
}

const SETTINGS = { lanes: 2, fallMs: 1000 };

function fallToLine(state: CatchState): CatchState {
  let next = state;
  while (next.phase === "falling") next = tick(next, 100);
  return next;
}

function endFeedback(state: CatchState): CatchState {
  let next = state;
  while (next.phase === "feedback") next = tick(next, 100);
  return next;
}

/** 正解の列に動いて受け取り、○×を見せ終わるまで進める */
function answer(state: CatchState, correct: boolean): CatchState {
  const current = state.questions[state.index];
  const correctLane = current.choices.findIndex((c) => c.id === current.correctChoiceId);
  const lane = correct ? correctLane : current.choices.findIndex((c) => c.id !== current.correctChoiceId);
  return endFeedback(fallToLine(moveTo(state, lane)));
}

describe("始まり", () => {
  it("スプルは真ん中の列(偶数なら真ん中の左)から始まる", () => {
    expect([startLane(2), startLane(3), startLane(4)]).toEqual([0, 1, 1]);
  });

  it("ハート3つ・0点・1問目が落ち始めた状態で始まる", () => {
    const state = createCatchGame([question(1, ["a", "b", "c"])], { lanes: 3, fallMs: 1000 });
    expect([state.lane, state.hearts, state.score, state.index, state.phase, state.progress]).toEqual([1, CATCH_HEARTS, 0, 0, "falling", 0]);
  });

  it("問題がなければ最初から終わり", () => {
    expect(createCatchGame([], SETTINGS).phase).toBe("done");
  });
});

describe("動かす", () => {
  it("1列ずつ動き、端より外には行かない", () => {
    let state = createCatchGame([question(1, ["a", "b", "c", "d"])], { lanes: 4, fallMs: 1000 });
    state = moveBy(state, 1);
    state = moveBy(state, 1);
    state = moveBy(state, 1);
    expect(state.lane).toBe(3);
    state = moveBy(moveBy(moveBy(moveBy(state, -1), -1), -1), -1);
    expect(state.lane).toBe(0);
  });

  it("列を直接選べる。範囲の外は端に止まる", () => {
    const state = createCatchGame([question(1, ["a", "b", "c"])], { lanes: 3, fallMs: 1000 });
    expect(moveTo(state, 2).lane).toBe(2);
    expect(moveTo(state, 9).lane).toBe(2);
    expect(moveTo(state, -1).lane).toBe(0);
  });

  it("○×を見せている間は動かない", () => {
    const caught = fallToLine(createCatchGame([question(1, ["a", "b"]), question(2, ["c", "d"])], SETTINGS));
    expect(caught.phase).toBe("feedback");
    expect(moveBy(caught, 1).lane).toBe(caught.lane);
    expect(moveTo(caught, 1).lane).toBe(caught.lane);
  });
});

describe("受け取る", () => {
  it("時間が進むと落ち、受け取る線で立っている列の言葉を受け取る", () => {
    let state = createCatchGame([question(1, ["a", "b"], 1)], SETTINGS);
    state = tick(state, 100);
    expect(state.progress).toBeCloseTo(0.1);
    state = fallToLine(moveBy(state, 1));
    expect([state.phase, state.caughtLane, state.answers]).toEqual(["feedback", 1, [{ questionId: 1, choiceId: 11, correct: true }]]);
  });

  it("正解は +10点・コンボ+1・○を0.8秒見せる", () => {
    const state = fallToLine(createCatchGame([question(1, ["a", "b"], 0)], SETTINGS));
    expect([state.lastCorrect, state.score, state.combo, state.hearts, state.feedbackMs]).toEqual([true, 10, 1, 3, FEEDBACK_MS.correct]);
  });

  it("まちがいはハート−1・コンボ0・×を1.6秒見せる", () => {
    const state = fallToLine(createCatchGame([question(1, ["a", "b"], 1)], SETTINGS));
    expect([state.lastCorrect, state.score, state.combo, state.hearts, state.feedbackMs]).toEqual([false, 0, 0, 2, FEEDBACK_MS.wrong]);
  });

  it("○×のあと次の問題へ。スプルは同じ列のまま", () => {
    let state = createCatchGame([question(1, ["a", "b"], 1), question(2, ["c", "d"])], SETTINGS);
    state = endFeedback(fallToLine(moveBy(state, 1)));
    expect([state.index, state.phase, state.progress, state.lane, state.caughtLane]).toEqual([1, "falling", 0, 1, null]);
  });

  it("コンボが3以上の正解は、さらに5点", () => {
    let state = createCatchGame([1, 2, 3].map((id) => question(id, ["a", "b"])), SETTINGS);
    state = answer(answer(answer(state, true), true), true);
    expect([state.score, state.combo, state.bestCombo]).toEqual([35, 3, 3]);
  });

  it("ハートが0になったら、×を見せたあと終わる", () => {
    let state = createCatchGame([1, 2, 3, 4].map((id) => question(id, ["a", "b"])), SETTINGS);
    state = answer(answer(state, false), false);
    state = fallToLine(moveTo(state, 1));
    expect([state.phase, state.hearts]).toEqual(["feedback", 0]);
    expect(endFeedback(state).phase).toBe("done");
  });

  it("最後の問題のあとは終わる", () => {
    const state = answer(createCatchGame([question(1, ["a", "b"])], SETTINGS), true);
    expect([state.phase, state.answers.length]).toEqual(["done", 1]);
  });
});

describe("時間", () => {
  it("1回に進める時間は100ミリ秒まで(タブを離れていたあとに一気に進まない)", () => {
    const state = tick(createCatchGame([question(1, ["a", "b"])], SETTINGS), 60000);
    expect([state.phase, state.progress]).toEqual(["falling", 0.1]);
  });

  it("マイナスの時間では進まない", () => {
    const state = tick(createCatchGame([question(1, ["a", "b"])], SETTINGS), -500);
    expect(state.progress).toBe(0);
  });
});

describe("点数の決まり(サーバーの CatchGame::score と同じ例)", () => {
  it("正解6→まちがい→正解2→まちがいで100点・いちばん長いコンボ6", () => {
    expect(scoreOf([true, true, true, true, true, true, false, true, true, false])).toEqual({ score: 100, bestCombo: 6 });
  });

  it("10問全部正解で140点", () => {
    expect(scoreOf(Array(10).fill(true))).toEqual({ score: 140, bestCombo: 10 });
  });

  it("まちがい→正解3で35点。答えがなければ0点", () => {
    expect(scoreOf([false, true, true, true])).toEqual({ score: 35, bestCombo: 3 });
    expect(scoreOf([])).toEqual({ score: 0, bestCombo: 0 });
  });
});

describe("成長の印", () => {
  it("いちばん長いコンボで 種→芽→つぼみ→花", () => {
    expect([0, 2, 3, 5, 6, 9, 10].map(growthStage)).toEqual(["seed", "seed", "sprout", "sprout", "bud", "bud", "flower"]);
  });
});

describe("終わり", () => {
  it("全問正解かどうか", () => {
    const questions = [question(1, ["a", "b"]), question(2, ["c", "d"])];
    expect(isPerfect(answer(answer(createCatchGame(questions, SETTINGS), true), true))).toBe(true);
    expect(isPerfect(answer(answer(createCatchGame(questions, SETTINGS), true), false))).toBe(false);
    expect(isPerfect(answer(createCatchGame(questions, SETTINGS), true))).toBe(false); // まだ途中
  });

  it("終わるときに送る答えは、答えた順の問題と選択肢の番号", () => {
    const state = answer(answer(createCatchGame([question(1, ["a", "b"]), question(2, ["c", "d"])], SETTINGS), true), false);
    expect(answersOf(state)).toEqual([
      { question_id: 1, choice_id: 10 },
      { question_id: 2, choice_id: 21 },
    ]);
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/games`
Expected: FAIL（`./game-question`・`./catch-engine` が見つからない）

- [ ] **Step 3: 問題の形を書く**

`frontend/src/components/games/game-question.ts`:

```ts
/**
 * ミニゲームで使う問題の形(docs/design/2026-09-29-spru-catch-design.md 8章)。
 * 1本目のスプルキャッチのほか、2本目以降のゲームも同じ形で受け取る
 */
export type GameChoice = { id: number; label: string };

export type GameQuestion = {
  id: number;
  prompt: string;
  choices: GameChoice[];
  correctChoiceId: number;
};

/** 問題文を、大きく見せる所(「」の中)と小さく見せる所(残り)に分ける。「」で始まらなければ全部を大きく(設計書3-6) */
export function splitPrompt(prompt: string): { focus: string; rest: string } {
  const match = prompt.match(/^「(.+?)」([\s\S]*)$/);
  if (!match) return { focus: prompt, rest: "" };
  return { focus: match[1], rest: match[2] };
}
```

- [ ] **Step 4: ゲームの動きを書く**

`frontend/src/components/games/catch/catch-engine.ts`:

```ts
import type { GameQuestion } from "@/components/games/game-question";

/**
 * スプルキャッチのゲームの動き(docs/design/2026-09-29-spru-catch-design.md 3章・8章)。
 * 1問ごとに選択肢が横一列で落ち、受け取る線に着いたとき、スプルが立っている列の言葉を受け取る。
 * 画面はこの状態を描くだけにし、時間を進める・動かすのはここの関数だけで行う
 */
export type CatchSettings = { lanes: number; fallMs: number };
export type CatchPhase = "falling" | "feedback" | "done";
export type CatchAnswer = { questionId: number; choiceId: number; correct: boolean };
export type GrowthStage = "seed" | "sprout" | "bud" | "flower";

export type CatchState = {
  questions: GameQuestion[];
  settings: CatchSettings;
  /** 今の問題 */
  index: number;
  /** スプルが立っている列(0が左) */
  lane: number;
  /** 0(上)〜1(受け取る線) */
  progress: number;
  phase: CatchPhase;
  /** ○×を見せている残りの時間 */
  feedbackMs: number;
  caughtLane: number | null;
  lastCorrect: boolean | null;
  score: number;
  combo: number;
  bestCombo: number;
  hearts: number;
  answers: CatchAnswer[];
};

export const CATCH_HEARTS = 3;
export const FEEDBACK_MS = { correct: 800, wrong: 1600 };
/** 1回に進める時間の上限。タブを離れていたあとなどに一気に進まないように */
export const MAX_STEP_MS = 100;
/** 点数の決まり。サーバーの config/games.php の catch.score と同じ */
const SCORE_RULES = { correct: 10, comboBonus: 5, comboBonusFrom: 3 };

/** 1問目のスプルの列。真ん中(偶数なら真ん中の左) */
export function startLane(lanes: number): number {
  return Math.floor((lanes - 1) / 2);
}

export function createCatchGame(questions: GameQuestion[], settings: CatchSettings): CatchState {
  return {
    questions,
    settings,
    index: 0,
    lane: startLane(settings.lanes),
    progress: 0,
    phase: questions.length === 0 ? "done" : "falling",
    feedbackMs: 0,
    caughtLane: null,
    lastCorrect: null,
    score: 0,
    combo: 0,
    bestCombo: 0,
    hearts: CATCH_HEARTS,
    answers: [],
  };
}

/** 列を選んで動く。落ちている間だけ。端より外には行かない */
export function moveTo(state: CatchState, lane: number): CatchState {
  if (state.phase !== "falling") return state;
  const next = Math.min(state.settings.lanes - 1, Math.max(0, lane));
  return next === state.lane ? state : { ...state, lane: next };
}

export function moveBy(state: CatchState, step: -1 | 1): CatchState {
  return moveTo(state, state.lane + step);
}

/** 時間を進める。受け取る線に着いたら判定し、○×を見せたあと次の問題か終わりに移る */
export function tick(state: CatchState, dtMs: number): CatchState {
  const dt = Math.min(Math.max(dtMs, 0), MAX_STEP_MS);
  if (dt === 0) return state;

  if (state.phase === "falling") {
    const progress = state.progress + dt / state.settings.fallMs;
    return progress >= 1 ? catchAtLine(state) : { ...state, progress };
  }
  if (state.phase === "feedback") {
    const feedbackMs = state.feedbackMs - dt;
    return feedbackMs > 0 ? { ...state, feedbackMs } : advance(state);
  }
  return state;
}

function pointsFor(correct: boolean, combo: number): number {
  if (!correct) return 0;
  return SCORE_RULES.correct + (combo >= SCORE_RULES.comboBonusFrom ? SCORE_RULES.comboBonus : 0);
}

function catchAtLine(state: CatchState): CatchState {
  const question = state.questions[state.index];
  const choice = question.choices[state.lane];
  const correct = choice.id === question.correctChoiceId;
  const combo = correct ? state.combo + 1 : 0;

  return {
    ...state,
    progress: 1,
    phase: "feedback",
    feedbackMs: correct ? FEEDBACK_MS.correct : FEEDBACK_MS.wrong,
    caughtLane: state.lane,
    lastCorrect: correct,
    score: state.score + pointsFor(correct, combo),
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    hearts: correct ? state.hearts : state.hearts - 1,
    answers: [...state.answers, { questionId: question.id, choiceId: choice.id, correct }],
  };
}

function advance(state: CatchState): CatchState {
  const nextIndex = state.index + 1;
  if (state.hearts <= 0 || nextIndex >= state.questions.length) {
    return { ...state, phase: "done", feedbackMs: 0 };
  }
  return { ...state, index: nextIndex, progress: 0, phase: "falling", feedbackMs: 0, caughtLane: null, lastCorrect: null };
}

/** 答えの並び(正解か)から、点数といちばん長いコンボ。サーバーの CatchGame::score と同じ決まり */
export function scoreOf(results: boolean[]): { score: number; bestCombo: number } {
  let score = 0;
  let combo = 0;
  let bestCombo = 0;
  for (const correct of results) {
    combo = correct ? combo + 1 : 0;
    bestCombo = Math.max(bestCombo, combo);
    score += pointsFor(correct, combo);
  }
  return { score, bestCombo };
}

/** その回のいちばん長いコンボから、成長の印(設計書3-4) */
export function growthStage(bestCombo: number): GrowthStage {
  if (bestCombo >= 10) return "flower";
  if (bestCombo >= 6) return "bud";
  if (bestCombo >= 3) return "sprout";
  return "seed";
}

/** 全部の問題に答えて、全部正解だったか */
export function isPerfect(state: CatchState): boolean {
  return (
    state.phase === "done" &&
    state.questions.length > 0 &&
    state.answers.length === state.questions.length &&
    state.answers.every((answer) => answer.correct)
  );
}

/** 終えるAPIに送る答え(答えた順) */
export function answersOf(state: CatchState): { question_id: number; choice_id: number }[] {
  return state.answers.map((answer) => ({ question_id: answer.questionId, choice_id: answer.choiceId }));
}
```

- [ ] **Step 5: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/games`
Expected: すべて PASS

- [ ] **Step 6: コミット**

```bash
git add frontend/src/components/games/game-question.ts frontend/src/components/games/game-question.test.ts frontend/src/components/games/catch/catch-engine.ts frontend/src/components/games/catch/catch-engine.test.ts
git commit -q -m "#00276: feat:ミニゲームの問題の形と、スプルキャッチのゲームの動き(落ちる・動く・受け取る・点数・コンボ・ハート・成長の印)を作る" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: スプルキャッチの画面（選ぶ・ゲーム・結果）

**Files:**
- Create: `frontend/src/components/games/catch/catch-api.ts`・`catch-api.test.ts`・`catch-view.ts`・`catch-view.test.ts`・`catch-select.tsx`・`catch-game.tsx`・`catch-result.tsx`・`frontend/src/app/games/catch/page.tsx`
- Modify: `frontend/src/app/globals.css`

**Interfaces:**
- Consumes: Task 4 のすべて。Task 2・3 の API の返事の形
- Produces:
  - `CatchDifficulty`・`CatchSummary`・`CatchStart`・`CatchFinish`・`toGameQuestions(start: CatchStart): GameQuestion[]`（`catch-api.ts`）
  - `CATCH_LOCKED_MESSAGE`・`rewardLeftText(left)`・`laneLabel(lanes)`・`laneTextClass(lanes)`・`focusSizeClass(focus)`・`CardLook`・`cardLook(state, lane)`・`growthImage(stage)`・`missedWords(state)`・`rewardLines(reward)`（`catch-view.ts`）
  - `CatchSelect`・`CatchGame`・`CatchResult` の部品と、ページ `/games/catch`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/games/catch/catch-api.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { toGameQuestions } from "./catch-api";

describe("始めるAPIの返事を問題の形にする", () => {
  it("correct_choice_id を correctChoiceId にする", () => {
    const questions = toGameQuestions({
      play_id: 1,
      difficulty: "初級",
      lanes: 2,
      fall_ms: 8000,
      questions: [{ id: 5, prompt: "「red」の意味は？", choices: [{ id: 50, label: "赤" }, { id: 51, label: "青" }], correct_choice_id: 50 }],
    });
    expect(questions).toEqual([{ id: 5, prompt: "「red」の意味は？", choices: [{ id: 50, label: "赤" }, { id: 51, label: "青" }], correctChoiceId: 50 }]);
  });
});
```

`frontend/src/components/games/catch/catch-view.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { GameQuestion } from "@/components/games/game-question";
import { GARDEN_IMAGES, SPRU_BLOOM } from "@/components/spru/spru-assets";

import { createCatchGame, tick, type CatchState } from "./catch-engine";
import {
  cardLook,
  focusSizeClass,
  growthImage,
  laneLabel,
  laneTextClass,
  missedWords,
  rewardLeftText,
  rewardLines,
} from "./catch-view";

function question(id: number, labels: string[], correctLane = 0, prompt = `「word${id}」の意味は？`): GameQuestion {
  const choices = labels.map((label, lane) => ({ id: id * 10 + lane, label }));
  return { id, prompt, choices, correctChoiceId: choices[correctLane].id };
}

function caughtAt(state: CatchState): CatchState {
  let next = state;
  while (next.phase === "falling") next = tick(next, 100);
  return next;
}

describe("文", () => {
  it("今日のごほうびの残り", () => {
    expect(rewardLeftText(2)).toBe("今日のごほうび あと2回");
    expect(rewardLeftText(0)).toBe("今日のごほうびはおしまい。練習はいつでもできるよ");
  });

  it("列の数", () => {
    expect(laneLabel(3)).toBe("3択");
  });

  it("ごほうびの行。ない回は空", () => {
    expect(rewardLines({ xp: 24, point: 18 })).toEqual(["経験値 +24", "学習ポイント +18"]);
    expect(rewardLines(null)).toEqual([]);
  });
});

describe("文字の大きさ", () => {
  it("大きく見せる所は、短いほど大きい", () => {
    expect(focusSizeClass("Hello")).toBe("text-4xl");
    expect(focusSizeClass("a".repeat(10))).toBe("text-4xl");
    expect(focusSizeClass("a".repeat(11))).toBe("text-2xl");
    expect(focusSizeClass("a".repeat(20))).toBe("text-2xl");
    expect(focusSizeClass("a".repeat(21))).toBe("text-lg");
  });

  it("落ちてくる言葉は、列が多いほど小さい", () => {
    expect([laneTextClass(2), laneTextClass(3), laneTextClass(4)]).toEqual(["text-xl", "text-lg", "text-base"]);
  });
});

describe("落ちてくる言葉のカードの見た目", () => {
  const settings = { lanes: 3, fallMs: 1000 };

  it("落ちている間は、どれもふつう", () => {
    const state = createCatchGame([question(1, ["a", "b", "c"])], settings);
    expect([0, 1, 2].map((lane) => cardLook(state, lane))).toEqual(["normal", "normal", "normal"]);
  });

  it("正解を受け取ったら、その列ははずみ、ほかはうすくなる", () => {
    const state = caughtAt(createCatchGame([question(1, ["a", "b", "c"], 1)], settings));
    expect([0, 1, 2].map((lane) => cardLook(state, lane))).toEqual(["faded", "caught-correct", "faded"]);
  });

  it("まちがいを受け取ったら、その列はゆれ、正解の列を光らせる", () => {
    const state = caughtAt(createCatchGame([question(1, ["a", "b", "c"], 2)], settings));
    expect([0, 1, 2].map((lane) => cardLook(state, lane))).toEqual(["faded", "caught-wrong", "answer"]);
  });
});

describe("成長の印の絵", () => {
  it("種・芽は畑の絵、つぼみ・花はスプルの頭の絵", () => {
    expect(growthImage("seed")).toBe(GARDEN_IMAGES.seed);
    expect(growthImage("sprout")).toBe(GARDEN_IMAGES.sprout);
    expect(growthImage("bud")).toBe(SPRU_BLOOM.bud);
    expect(growthImage("flower")).toBe(SPRU_BLOOM.flower);
  });
});

describe("まちがえた言葉", () => {
  it("まちがえた問題の「」の中と、正解の言葉を、答えた順に出す", () => {
    let state = createCatchGame(
      [question(1, ["赤", "青"], 1, "「blue」の意味は？"), question(2, ["seven", "six"], 0, "7を表す英単語は？")],
      { lanes: 2, fallMs: 1000 },
    );
    state = caughtAt(state); // 1問目: 左(赤)を受け取る → まちがい
    while (state.phase === "feedback") state = tick(state, 100);
    state = caughtAt(state); // 2問目: 左(seven)を受け取る → 正解
    expect(missedWords(state)).toEqual([{ focus: "blue", answer: "青" }]);
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/games/catch`
Expected: FAIL（`./catch-api`・`./catch-view` が見つからない）

- [ ] **Step 3: API の形と見た目の計算を書く**

`frontend/src/components/games/catch/catch-api.ts`:

```ts
import type { GameChoice, GameQuestion } from "@/components/games/game-question";

/** スプルキャッチのAPIの返事の形(docs/design/2026-09-29-spru-catch-design.md 6-3) */
export type CatchDifficulty = "初級" | "中級" | "上級";

export type CatchSummary = {
  category_id: number | null;
  difficulties: { difficulty: CatchDifficulty; lanes: number; available: number; best_score: number | null }[];
  rewarded_plays_left: number;
};

export type CatchStart = {
  play_id: number;
  difficulty: CatchDifficulty;
  lanes: number;
  fall_ms: number;
  questions: { id: number; prompt: string; choices: GameChoice[]; correct_choice_id: number }[];
};

export type CatchFinish = {
  answered_count: number;
  correct_count: number;
  score: number;
  best_combo: number;
  best_score: number;
  new_best: boolean;
  reward: { xp: number; point: number } | null;
  rewarded_plays_left: number;
  leveled_up: boolean;
  previous_level: number;
  level: number;
};

export function toGameQuestions(start: CatchStart): GameQuestion[] {
  return start.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    choices: question.choices,
    correctChoiceId: question.correct_choice_id,
  }));
}
```

`frontend/src/components/games/catch/catch-view.ts`:

```ts
import { splitPrompt } from "@/components/games/game-question";
import { GARDEN_IMAGES, SPRU_BLOOM, type SpruImage } from "@/components/spru/spru-assets";

import type { CatchState, GrowthStage } from "./catch-engine";

/** スプルキャッチの見た目の計算(docs/design/2026-09-29-spru-catch-design.md 7章) */
export const CATCH_LOCKED_MESSAGE = "アメリカかイギリスに着くと遊べるよ";

export function rewardLeftText(left: number): string {
  return left > 0 ? `今日のごほうび あと${left}回` : "今日のごほうびはおしまい。練習はいつでもできるよ";
}

export function laneLabel(lanes: number): string {
  return `${lanes}択`;
}

export function rewardLines(reward: { xp: number; point: number } | null): string[] {
  return reward ? [`経験値 +${reward.xp}`, `学習ポイント +${reward.point}`] : [];
}

/** 問題文の大きく見せる所の文字の大きさ。長いほど小さく */
export function focusSizeClass(focus: string): string {
  const length = [...focus].length;
  if (length <= 10) return "text-4xl";
  if (length <= 20) return "text-2xl";
  return "text-lg";
}

/** 落ちてくる言葉の文字の大きさ。列が多いほど小さく */
export function laneTextClass(lanes: number): string {
  if (lanes <= 2) return "text-xl";
  if (lanes === 3) return "text-lg";
  return "text-base";
}

export type CardLook = "normal" | "caught-correct" | "caught-wrong" | "answer" | "faded";

/** ○×を見せている間の、列ごとのカードの見た目 */
export function cardLook(state: CatchState, lane: number): CardLook {
  if (state.phase !== "feedback") return "normal";
  if (lane === state.caughtLane) return state.lastCorrect ? "caught-correct" : "caught-wrong";
  const question = state.questions[state.index];
  if (!state.lastCorrect && question.choices[lane]?.id === question.correctChoiceId) return "answer";
  return "faded";
}

export function growthImage(stage: GrowthStage): SpruImage {
  const images: Record<GrowthStage, SpruImage> = {
    seed: GARDEN_IMAGES.seed,
    sprout: GARDEN_IMAGES.sprout,
    bud: SPRU_BLOOM.bud,
    flower: SPRU_BLOOM.flower,
  };
  return images[stage];
}

/** まちがえた問題の「」の中と正解の言葉(答えた順) */
export function missedWords(state: CatchState): { focus: string; answer: string }[] {
  return state.answers
    .filter((answer) => !answer.correct)
    .map((answer) => {
      const question = state.questions.find((q) => q.id === answer.questionId);
      if (!question) return { focus: "", answer: "" };
      return {
        focus: splitPrompt(question.prompt).focus,
        answer: question.choices.find((choice) => choice.id === question.correctChoiceId)?.label ?? "",
      };
    });
}
```

- [ ] **Step 4: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/games`
Expected: すべて PASS

- [ ] **Step 5: まちがえた言葉がゆれる動きを CSS に足す**

`frontend/src/app/globals.css` の `.animate-pop-in { … }` の閉じ `}` のすぐ下に足す:

```css

  /* スプルキャッチでまちがえた言葉がゆれる(docs/design/2026-09-29-spru-catch-design.md 3-2) */
  @keyframes catch-shake {
    0%,
    100% {
      transform: translateX(0);
    }
    20% {
      transform: translateX(-6px);
    }
    40% {
      transform: translateX(6px);
    }
    60% {
      transform: translateX(-4px);
    }
    80% {
      transform: translateX(4px);
    }
  }
  .animate-catch-shake {
    animation: catch-shake 0.4s ease-in-out both;
  }
```

同じファイルの、動きを減らす設定（`animation: none !important;` の前のセレクタの一覧）の `.animate-pop-in,` の下に `.animate-catch-shake,` を足す。

- [ ] **Step 6: 難しさを選ぶ画面を書く**

`frontend/src/components/games/catch/catch-select.tsx`:

```tsx
"use client";

import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { Furigana } from "@/components/app/furigana";
import { SkyText, SkyTitle } from "@/components/app/sky-page";
import { SpruFigure } from "@/components/spru/spru-figure";
import { DIFFICULTY_READINGS } from "@/lib/difficulty";

import type { CatchDifficulty, CatchSummary } from "./catch-api";
import { CATCH_LOCKED_MESSAGE, laneLabel, rewardLeftText } from "./catch-view";

/** 難しさを選ぶ画面(docs/design/2026-09-29-spru-catch-design.md 7-2) */
export function CatchSelect({
  summary,
  starting,
  error,
  onStart,
}: {
  summary: CatchSummary;
  starting: boolean;
  error: string | null;
  onStart: (difficulty: CatchDifficulty) => void;
}) {
  const allEmpty = summary.difficulties.every((d) => d.available === 0);

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-5 px-6 py-10 pb-24 text-center">
      <SpruFigure image="cheer" standHeight={110} alt="スプル" eager />
      <SkyTitle className="text-3xl">スプルキャッチ</SkyTitle>
      <SkyText className="text-sm">
        <AutoFurigana text="落ちてくる答えを、スプルでキャッチしよう" />
      </SkyText>

      {allEmpty ? (
        <div className="flex w-full flex-col items-center gap-4 rounded-3xl bg-[#fffaf0] p-6 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
          <p className="text-base font-bold">
            <AutoFurigana text={CATCH_LOCKED_MESSAGE} />
          </p>
          <Link href="/trip">
            <AppButton variant="primary">せかいへ</AppButton>
          </Link>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3">
          {summary.difficulties.map((d) => (
            <AppButton
              key={d.difficulty}
              variant={d.available > 0 ? "default" : "locked"}
              size="lg"
              disabled={d.available === 0 || starting}
              onClick={() => onStart(d.difficulty)}
              className="flex w-full items-center justify-between px-6"
            >
              <span className="flex items-center gap-2">
                <Furigana text={d.difficulty} reading={DIFFICULTY_READINGS[d.difficulty] ?? ""} />
                <span className="text-xs opacity-80">{laneLabel(d.lanes)}</span>
              </span>
              <span className="text-xs opacity-80">
                {d.available === 0 ? "準備中" : d.best_score !== null ? `ベスト ${d.best_score}点` : "はじめて"}
              </span>
            </AppButton>
          ))}
        </div>
      )}

      <p className="text-sm font-bold text-[#3b3226]">
        <AutoFurigana text={rewardLeftText(summary.rewarded_plays_left)} />
      </p>
      {error && (
        <p role="alert" className="text-sm font-bold text-[#c9573b]">
          <AutoFurigana text={error} />
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 7: ゲームの画面を書く**

`frontend/src/components/games/catch/catch-game.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { splitPrompt, type GameQuestion } from "@/components/games/game-question";
import { OUTING_IMAGES, SPRU_IMAGES, type SpruImage } from "@/components/spru/spru-assets";
import { cn } from "@/lib/utils";

import {
  CATCH_HEARTS,
  createCatchGame,
  growthStage,
  moveBy,
  moveTo,
  tick,
  type CatchSettings,
  type CatchState,
} from "./catch-engine";
import { cardLook, focusSizeClass, growthImage, laneTextClass, type CardLook } from "./catch-view";

/** 落ちてくる言葉のカードの高さ・上のすきま・スプルの高さ(px)。受け取る線はスプルの頭 */
const CARD_PX = 64;
const ROW_TOP_PX = 8;
const SPRU_PX = 96;
const FALL_OFFSET_PX = ROW_TOP_PX + CARD_PX + SPRU_PX;
const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 700;

const CARD_CLASS: Record<CardLook, string> = {
  normal: "bg-[#fffaf0]",
  "caught-correct": "animate-pop-in bg-[#dff5d3] ring-4 ring-[#5bb33e]",
  "caught-wrong": "animate-catch-shake bg-[#ffd9cc] ring-4 ring-[#f28b6d]",
  answer: "bg-[#dff5d3] ring-4 ring-[#5bb33e]",
  faded: "bg-[#fffaf0] opacity-40",
};

function spruImage(state: CatchState): SpruImage {
  if (state.phase !== "feedback") return OUTING_IMAGES.back;
  return state.lastCorrect ? SPRU_IMAGES.cheer : SPRU_IMAGES.sad;
}

/** スプルキャッチのゲームの画面(docs/design/2026-09-29-spru-catch-design.md 7-3・7-5) */
export function CatchGame({
  questions,
  settings,
  onFinish,
  onQuit,
}: {
  questions: GameQuestion[];
  settings: CatchSettings;
  onFinish: (state: CatchState) => void;
  onQuit: () => void;
}) {
  const { play: playSound } = useSound();
  const [state, setState] = useState(() => createCatchGame(questions, settings));
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const pausedRef = useRef(true);
  const finishedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = countdown > 0 || confirmQuit;
  }, [countdown, confirmQuit]);

  // 3・2・1
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), COUNTDOWN_STEP_MS);
    return () => clearTimeout(timer);
  }, [countdown]);

  // 時間を進める。タブを離れると requestAnimationFrame が止まるので、戻ったときは時計を合わせ直す
  useEffect(() => {
    let frame = 0;
    let last: number | null = null;
    const loop = (now: number) => {
      if (last !== null && !pausedRef.current) {
        const dt = now - last;
        setState((current) => tick(current, dt));
      }
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const resetClock = () => {
      last = null;
    };
    document.addEventListener("visibilitychange", resetClock);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", resetClock);
    };
  }, []);

  // キーボードの ← →
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (pausedRef.current) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setState((current) => moveBy(current, -1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setState((current) => moveBy(current, 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 受け取ったときの音
  const lastAnswer = state.answers.at(-1);
  useEffect(() => {
    if (!lastAnswer) return;
    playSound(lastAnswer.correct ? "correct" : "incorrect");
  }, [lastAnswer, playSound]);

  // 終わり
  useEffect(() => {
    if (state.phase !== "done" || finishedRef.current) return;
    finishedRef.current = true;
    onFinish(state);
  }, [state, onFinish]);

  const move = (lane: number) => {
    if (pausedRef.current) return;
    setState((current) => moveTo(current, lane));
  };
  const step = (direction: -1 | 1) => {
    if (pausedRef.current) return;
    setState((current) => moveBy(current, direction));
  };

  const question = state.questions[Math.min(state.index, state.questions.length - 1)];
  const { focus, rest } = splitPrompt(question.prompt);
  const lanes = state.settings.lanes;
  const laneWidth = 100 / lanes;
  const spru = spruImage(state);
  const growth = growthImage(growthStage(state.bestCombo));

  return (
    <div className="fixed inset-0 z-40 flex justify-center bg-[#8fd4e9]">
      <div className="flex h-full w-full max-w-md flex-col px-3 pt-3 pb-4">
        <div className="flex items-center justify-between gap-2 text-[#3b3226]">
          <AppButton variant="default" size="sm" onClick={() => setConfirmQuit(true)}>
            やめる
          </AppButton>
          <span className="rounded-full bg-white/85 px-3 py-1 text-sm font-black">
            {state.index + 1}/{state.questions.length}
          </span>
          <span className="rounded-full bg-white/85 px-3 py-1 text-sm font-black">{state.score}点</span>
          <span aria-label={`ハート${state.hearts}つ`} className="rounded-full bg-white/85 px-3 py-1 text-sm">
            {Array.from({ length: CATCH_HEARTS }, (_, i) => (
              <span key={i} aria-hidden className={i < state.hearts ? "text-[#e0457b]" : "text-[#e0457b] opacity-25"}>
                ♥
              </span>
            ))}
          </span>
        </div>

        <div className="mt-3 rounded-3xl bg-[#fffaf0] px-4 py-3 text-center text-[#3b3226] shadow-[0_6px_16px_rgba(40,70,90,0.16)]">
          <p className={cn("font-black break-words", focusSizeClass(focus))}>
            <AutoFurigana text={focus} />
          </p>
          {rest && (
            <p className="mt-1 text-sm font-bold text-[#6b5d45]">
              <AutoFurigana text={rest} />
            </p>
          )}
        </div>
        <p className="h-6 text-center text-sm font-black text-[#c98f12]" aria-live="polite">
          {state.combo >= 2 ? `${state.combo}コンボ！` : ""}
        </p>

        <div className="relative flex-1 overflow-hidden rounded-3xl bg-gradient-to-b from-[#bfe6f5] via-[#d9f0c8] to-[#9fd67f]">
          <div className="absolute inset-0 flex">
            {Array.from({ length: lanes }, (_, lane) => (
              <button
                key={lane}
                type="button"
                aria-label={`${lane + 1}列目へ動く`}
                onClick={() => move(lane)}
                className={cn("h-full flex-1", lane > 0 && "border-l-2 border-dashed border-white/70")}
              />
            ))}
          </div>

          <Image
            src={growth.src}
            alt=""
            width={Math.round((40 * growth.width) / growth.height)}
            height={40}
            className="pointer-events-none absolute top-2 right-2 h-10 w-auto"
          />

          <div
            className="pointer-events-none absolute inset-0"
            style={{ transform: `translateY(calc(${state.progress * 100}% - ${state.progress * FALL_OFFSET_PX}px))` }}
          >
            <div className="flex gap-2 px-2" style={{ paddingTop: ROW_TOP_PX }}>
              {question.choices.map((choice, lane) => (
                <div
                  key={choice.id}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-2xl px-1 text-center font-black break-words text-[#3b3226] shadow-[0_4px_10px_rgba(40,70,90,0.18)] [word-break:auto-phrase]",
                    laneTextClass(lanes),
                    CARD_CLASS[cardLook(state, lane)],
                  )}
                  style={{ height: CARD_PX }}
                >
                  <AutoFurigana text={choice.label} />
                </div>
              ))}
            </div>
          </div>

          <div
            className="pointer-events-none absolute bottom-0 flex justify-center transition-[left] duration-150"
            style={{ left: `${state.lane * laneWidth}%`, width: `${laneWidth}%`, height: SPRU_PX }}
          >
            <Image
              src={spru.src}
              alt="スプル"
              width={Math.round((SPRU_PX * spru.width) / spru.height)}
              height={SPRU_PX}
              className="h-full w-auto"
              loading="eager"
            />
          </div>

          {countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/30">
              <p key={countdown} className="animate-pop-in text-8xl font-black text-white drop-shadow-[0_4px_8px_rgba(40,70,90,0.4)]">
                {countdown}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <AppButton variant="default" aria-label="左に動く" onClick={() => step(-1)} className="h-16 text-2xl">
            ◀
          </AppButton>
          <AppButton variant="default" aria-label="右に動く" onClick={() => step(1)} className="h-16 text-2xl">
            ▶
          </AppButton>
        </div>
      </div>

      {confirmQuit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(38,48,28,0.45)] px-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="catch-quit-title"
            className="flex w-full max-w-[320px] flex-col items-center gap-4 rounded-3xl bg-[#fffaf0] p-6 text-center text-[#3b3226]"
          >
            <p id="catch-quit-title" className="text-base font-black">
              <AutoFurigana text="やめる？ここまでの答えは残らないよ" />
            </p>
            <div className="grid w-full grid-cols-2 gap-3">
              <AppButton variant="default" onClick={onQuit}>
                やめる
              </AppButton>
              <AppButton variant="primary" onClick={() => setConfirmQuit(false)}>
                つづける
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: 結果の画面を書く**

`frontend/src/components/games/catch/catch-result.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { LevelUpOverlay } from "@/components/quiz/level-up-overlay";
import { SpruFigure } from "@/components/spru/spru-figure";
import type { ShopListItem } from "@/components/world/types";
import { apiFetch } from "@/lib/api";

import type { CatchFinish } from "./catch-api";
import { isPerfect, type CatchState } from "./catch-engine";
import { missedWords, rewardLines } from "./catch-view";

/** 結果の画面(docs/design/2026-09-29-spru-catch-design.md 7-4) */
export function CatchResult({
  result,
  state,
  starting,
  onRetry,
  onChangeDifficulty,
}: {
  result: CatchFinish;
  state: CatchState;
  starting: boolean;
  onRetry: () => void;
  onChangeDifficulty: () => void;
}) {
  const { play: playSound } = useSound();
  const perfect = isPerfect(state);
  const missed = missedWords(state);
  const lines = rewardLines(result.reward);
  const [levelUpOpen, setLevelUpOpen] = useState(result.leveled_up);
  const [shopItems, setShopItems] = useState<ShopListItem[]>([]);

  useEffect(() => {
    if (perfect) playSound("allCorrect");
  }, [perfect, playSound]);

  useEffect(() => {
    if (!result.leveled_up) return;
    // レベルアップの画面で「新しく買えるようになったアイテム」を見せるため
    apiFetch("/api/shop")
      .then(async (res) => {
        if (res.ok) setShopItems(await res.json());
      })
      .catch(() => {});
  }, [result.leveled_up]);

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-6 py-10 pb-24 text-center">
      <div className="flex w-full flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] p-6 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
        <SpruFigure image="happy" bloom={perfect ? "flower" : null} standHeight={110} alt="喜ぶスプル" />
        {result.new_best && (
          <p className="animate-pop-in rounded-full bg-[#f2b632] px-3 py-1 text-sm font-black">
            <AutoFurigana text="新記録！" />
          </p>
        )}
        <p className="text-4xl font-black">{result.score}点</p>
        <p className="text-sm font-bold">
          <AutoFurigana text={`正解 ${result.correct_count}/${state.questions.length}　いちばん長いコンボ ${result.best_combo}`} />
        </p>
        <p className="text-xs text-[#6b5d45]">
          <AutoFurigana text={`自己ベスト ${result.best_score}点`} />
        </p>
        {lines.length > 0 ? (
          <div className="text-sm font-black text-[#2e6b1c]">
            {lines.map((line) => (
              <p key={line}>
                <AutoFurigana text={line} />
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold text-[#6b5d45]">
            <AutoFurigana text="今日のごほうびはおしまい。練習になったね" />
          </p>
        )}
      </div>

      {missed.length > 0 && (
        <div className="w-full rounded-3xl bg-[#fffaf0] p-5 text-left text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.12)]">
          <h2 className="text-sm font-black">
            <AutoFurigana text="まちがえた言葉" />
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {missed.map((word, index) => (
              <li key={index} className="flex flex-wrap gap-x-2">
                <span className="font-bold">
                  <AutoFurigana text={word.focus} />
                </span>
                <span aria-hidden>→</span>
                <span>
                  <AutoFurigana text={word.answer} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex w-full flex-col gap-3">
        <AppButton variant="secondary" size="lg" disabled={starting} onClick={onRetry} className="w-full">
          <span>
            <AutoFurigana text="もう一回" />
          </span>
        </AppButton>
        <AppButton variant="default" size="lg" onClick={onChangeDifficulty} className="w-full">
          <span>
            <AutoFurigana text="難しさを変える" />
          </span>
        </AppButton>
        <Link href="/learn">
          <AppButton variant="ghost" className="w-full">
            <span>
              <AutoFurigana text="学ぶにもどる" />
            </span>
          </AppButton>
        </Link>
      </div>

      {levelUpOpen && (
        <LevelUpOverlay
          level={result.level}
          unlocked={shopItems.filter(
            (item) => item.type === "decoration" && item.min_level > result.previous_level && item.min_level <= result.level,
          )}
          onContinue={() => setLevelUpOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 9: ページを書く**

`frontend/src/app/games/catch/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { SkyPage } from "@/components/app/sky-page";
import { SpruLoading } from "@/components/app/spru-loading";
import {
  toGameQuestions,
  type CatchDifficulty,
  type CatchFinish,
  type CatchStart,
  type CatchSummary,
} from "@/components/games/catch/catch-api";
import { answersOf, type CatchState } from "@/components/games/catch/catch-engine";
import { CatchGame } from "@/components/games/catch/catch-game";
import { CatchResult } from "@/components/games/catch/catch-result";
import { CatchSelect } from "@/components/games/catch/catch-select";
import { apiFetch } from "@/lib/api";

type Phase =
  | { kind: "select" }
  | { kind: "playing"; start: CatchStart }
  | { kind: "finishing" }
  | { kind: "result"; start: CatchStart; state: CatchState; result: CatchFinish };

/** ミニゲーム1本目「スプルキャッチ」。選ぶ → 3・2・1 → ゲーム → 結果(docs/design/2026-09-29-spru-catch-design.md 7章) */
export default function CatchPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<CatchSummary | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "select" });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    const res = await apiFetch("/api/games/catch");
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    if (res.status === 422) {
      router.replace("/profiles");
      return;
    }
    if (res.ok) setSummary(await res.json());
  }, [router]);

  useEffect(() => {
    loadSummary().catch(() => setError("通信エラーが発生しました。"));
  }, [loadSummary]);

  async function start(difficulty: CatchDifficulty) {
    setStarting(true);
    setError(null);
    try {
      const res = await apiFetch("/api/games/catch/plays", { method: "POST", body: JSON.stringify({ difficulty }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "始められませんでした。");
        setPhase({ kind: "select" });
        return;
      }
      setPhase({ kind: "playing", start: data });
    } catch {
      setError("通信エラーが発生しました。");
      setPhase({ kind: "select" });
    } finally {
      setStarting(false);
    }
  }

  async function finish(started: CatchStart, state: CatchState) {
    setPhase({ kind: "finishing" });
    try {
      const res = await apiFetch(`/api/games/catch/plays/${started.play_id}/finish`, {
        method: "POST",
        body: JSON.stringify({ answers: answersOf(state) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "記録できませんでした。");
        setPhase({ kind: "select" });
        return;
      }
      setPhase({ kind: "result", start: started, state, result: data });
    } catch {
      setError("通信エラーが発生しました。記録できませんでした。");
      setPhase({ kind: "select" });
    }
    loadSummary().catch(() => {});
  }

  function backToSelect() {
    setError(null);
    setPhase({ kind: "select" });
    loadSummary().catch(() => {});
  }

  if (phase.kind === "playing") {
    const started = phase.start;
    return (
      <CatchGame
        key={started.play_id}
        questions={toGameQuestions(started)}
        settings={{ lanes: started.lanes, fallMs: started.fall_ms }}
        onFinish={(state) => finish(started, state)}
        onQuit={backToSelect}
      />
    );
  }

  return (
    <SkyPage>
      <AppHeader />
      {phase.kind === "finishing" ? (
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <SpruLoading />
        </div>
      ) : phase.kind === "result" ? (
        <CatchResult
          result={phase.result}
          state={phase.state}
          starting={starting}
          onRetry={() => start(phase.start.difficulty)}
          onChangeDifficulty={backToSelect}
        />
      ) : summary ? (
        <CatchSelect summary={summary} starting={starting} error={error} onStart={start} />
      ) : (
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 text-center">
          {error ? (
            <p role="alert" className="text-sm font-bold text-[#c9573b]">
              <AutoFurigana text={error} />
            </p>
          ) : (
            <SpruLoading />
          )}
        </div>
      )}
      <BottomNav />
    </SkyPage>
  );
}
```

- [ ] **Step 10: 画面のテスト・型・lint を流す**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: すべて PASS・エラーなし。lint が React のフックの決まり（`react-hooks/...`）で指摘したら、指摘された所だけを直す（直し方と理由は台帳に Ruling として残す）

- [ ] **Step 11: コミット**

```bash
git add frontend/src/components/games/catch frontend/src/app/games/catch/page.tsx frontend/src/app/globals.css
git commit -q -m "#00277: feat:スプルキャッチの画面(難しさを選ぶ・3・2・1・落ちてくる答えをスプルで受け取る・結果とまちがえた言葉・レベルアップ)を作る" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 入口・ドキュメント・ブラウザでの確認

**Files:**
- Modify: `frontend/src/app/learn/page.tsx`・`frontend/src/app/play/[id]/page.tsx`・`SPEC.md`・`TASKS.md`

**Interfaces:**
- Consumes: Task 2 の `GET /api/games/catch` の `category_id`、Task 5 のページ `/games/catch`

- [ ] **Step 1: 学ぶタブのミニアプリの引き出しに「ゲーム」の段を足す**

`frontend/src/app/learn/page.tsx` の引き出しの中、見出し「ミニアプリ」と ✕ のボタンの `<div className="flex items-center justify-between">…</div>` の閉じの下、`{!categories ? (` の上に足す:

```tsx
            {/* ミニゲーム(docs/design/2026-09-29-spru-catch-design.md 7-1) */}
            <h3 className="text-xs font-black text-[#6b5d45]">ゲーム</h3>
            <Link href="/games/catch" onClick={() => setMiniAppOpen(false)}>
              <AppButton variant="warning" size="sm" className="w-full shadow">
                スプルキャッチ
              </AppButton>
            </Link>
            <h3 className="text-xs font-black text-[#6b5d45]">クイズ</h3>
```

- [ ] **Step 2: 「英語を学ぶ」の画面にボタンを足す**

`frontend/src/app/play/[id]/page.tsx`:

1. 先頭の import に `import Link from "next/link";` を足す（`import { useRouter } from "next/navigation";` の上）
2. `const [stageIntro, setStageIntro] = useState<StageIntro | null>(null);` の下に足す:

```tsx
  // スプルキャッチの問題の出どころ(「英語を学ぶ」)のカテゴリー。この画面がそれなら、ゲームのボタンを出す
  const [catchCategoryId, setCatchCategoryId] = useState<number | null>(null);
```

3. 最初の `useEffect` の中、`apiFetch(\`/api/categories/${id}/stages\`)…` の下に足す:

```tsx
    apiFetch("/api/games/catch")
      .then(async (res) => {
        if (res.ok) setCatchCategoryId((await res.json()).category_id);
      })
      .catch(() => {});
```

4. 「スタート」の `<AppButton variant="secondary" … onClick={handleStart} …>スタート</AppButton>` の下（`</>` の上）に足す:

```tsx
            {catchCategoryId !== null && category?.id === catchCategoryId && (
              <Link href="/games/catch">
                <AppButton variant="warning" size="lg" className="w-full">
                  スプルキャッチで遊ぶ
                </AppButton>
              </Link>
            )}
```

- [ ] **Step 3: 画面のテスト・型・lint を流す**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: すべて PASS・エラーなし

- [ ] **Step 4: SPEC と TASKS を直す**

`SPEC.md` の `### 4-4b. マイパスポート…` の節の終わり（次の `### 4-5. ショップ` の上）に足す:

```markdown
### 4-4c. ミニゲーム（2026-09-29追加）

学んだことの復習につながるミニゲーム。まず2本作り、あとから足す（1本目: スプルキャッチ、2本目: うちゅう旅行〔未着手〕）。設計は `docs/design/2026-09-29-spru-catch-design.md`。

- ✅ **スプルキャッチ（英単語）**: 学ぶタブの「ミニアプリ」の引き出しと「英語を学ぶ」の画面から遊ぶ（`/games/catch`）。1問ごとに選択肢が横一列で落ちてくるので、スプルを左右に動かして正解の列で受け取る。1回10問・ハート3つ
  - 難しさ: 初級 2列・8秒 / 中級 3列・6秒 / 上級 4列・4.5秒。出す問題は「英語を学ぶ」のその難しさのステージの問題（鍵の国の問題は出さない。選択肢が短い4択だけ）
  - 出す順: 最近まちがえた問題（覚え具合の `wrong_on`）と出す日が来た問題を、あわせて6問まで先に出す。答えは問題ごとの覚え具合に残す
  - 点数: 正解10点、コンボ3以上の正解は+5点。連続正解で画面のすみの印が 種→芽→つぼみ→花 と育つ
  - 記録とごほうび: 遊んだ回は `profile_game_plays`。ごほうびは1日の最初の3回まで、正解の数に応じて経験値と学習ポイント（コインは出さない）。HP は使わない
  - 数字は `config/games.php`
```

`TASKS.md` の `### ミニアプリのスコープ整理（2026-09-24追加、Owner方針）` の節の終わり（次の `### コンテンツジャンル拡大: 世界遺産(2026-09-24着手)` の上）に足す:

```markdown
### ミニゲーム（2026-09-29追加、Owner方針）

ミニゲームは「ただの息抜き」ではなく復習につなげる。一気に作らず、まず2本作って、メインの仕事の合間に1本ずつ足す（元の相談: `company/spra/mascot/docs/mini-app.md`）。

- [x] **ミニゲーム1本目：スプルキャッチ（英単語）**（2026-09-29）: 落ちてくる答えをスプルで受け取る。初級・中級・上級、最近まちがえた問題を先に出す、ごほうびは1日3回まで（`docs/design/2026-09-29-spru-catch-design.md`）
- [ ] **ミニゲーム2本目：うちゅう旅行（宇宙の問題づくりを含む）**: ロケットのスプルが地球→月→火星…と進み、隕石をよけて星を集め、答えの門をくぐる。宇宙の問題（惑星・月・太陽、子ども向け50問くらい）を事実を確かめて作ってから
- [ ] **スプルキャッチの背景の絵**: Ownerが縦長の背景を用意したら、仮のグラデーションから差し替える（`public/spru/games/catch-bg.webp` の予定）
```

- [ ] **Step 5: ブラウザで確かめる**

1. 確認の前に、町テスト（プロフィール7）の状態を控える（スクラッチパッドに書き出す）:

```bash
./vendor/bin/sail artisan tinker --execute='
$p = App\Models\UserProfile::find(7);
echo json_encode([
  "profile" => $p->only(["xp","coins","hp","points","level"]),
  "ledger_max" => App\Models\ProfileCurrencyLedger::max("id"),
  "memories" => App\Models\ProfileQuestionMemory::where("user_profile_id",7)->get()->toArray(),
  "trips" => $p->trips()->pluck("destination"),
]);' > /private/tmp/claude-501/-Users-katsuhiro-k1215-SmartSprouts/7b866672-2217-4954-898a-6df8d903cf68/scratchpad/catch-baseline.json
```

2. 町テストがアメリカに着いていなければ、確認のあいだだけ着いた記録を足す（`trips()->create(['destination' => 'us', 'arrived_at' => now()])`）
3. Playwright で `test@example.com` / `password` でログインし、町テストを選ぶ。スマホの幅（390×844）で次を確かめる。スクリーンショットは `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` にだけ置き、見終わったら消す
   - 学ぶタブ → 右端の ◀ → 引き出しの「ゲーム」の段に「スプルキャッチ」がある
   - 「英語を学ぶ」の画面に「スプルキャッチで遊ぶ」がある。ほかのカテゴリーの画面にはない
   - 難しさを選ぶ画面: 初級「2択」・中級「3択」・上級「4択」、使える問題が0の難しさは押せない、「今日のごほうび あと3回」
   - 初級・中級・上級を1回ずつ遊ぶ。3・2・1 のあと落ち始める、◀▶・列のタップ・キーボードの ← → で動く、正解・まちがいの見た目と音、ハートが減る、落ちる速さ・文字の大きさ・ボタンの押しやすさ
   - 結果: 点数・正解の数・コンボ・ごほうび・まちがえた言葉。「もう一回」「難しさを変える」
   - まちがえた問題が、次の回に先に出る（結果の「まちがえた言葉」が次の回に入っている）
   - 4回目の結果が「今日のごほうびはおしまい。練習になったね」
   - 「やめる」→「やめる？ここまでの答えは残らないよ」→ やめると選ぶ画面に戻る
4. 確認のあと、控えた状態に戻す: 町テストの `profile_game_plays` を消す、`ledger_max` より大きい台帳の行を消す、プロフィールの xp・coins・hp・points・level を控えた値に戻す、覚え具合を控えた行に戻す（確認中に増えた行は消し、変わった行は控えた値で上書きする）、足したアメリカの記録を消す

- [ ] **Step 6: サーバーと画面のテストを全部流す**

Run: `./vendor/bin/sail test` と `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: すべて PASS

- [ ] **Step 7: コミット**

```bash
git add frontend/src/app/learn/page.tsx "frontend/src/app/play/[id]/page.tsx" SPEC.md TASKS.md
git commit -q -m "#00278: feat:学ぶタブのミニアプリの引き出しと英語を学ぶの画面からスプルキャッチを始められるようにし、SPEC・TASKSにミニゲームを書く" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
