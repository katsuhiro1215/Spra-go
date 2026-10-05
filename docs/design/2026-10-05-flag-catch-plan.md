# 国旗キャッチ 実装計画

> **実行する人へ:** 実行方法はネイティブ（サブエージェントは使わない決まりなので、インラインで1人が実装し、最後に自分で見直す）。テストを先に書き、失敗を見てから実装する。

**目標:** 流れてくる国旗を受け取る、ミニゲーム「スプルキャッチ（こっき）」を足す。サーバーのゲームの部分は英語と共通にして、設定だけを分ける。

**進め方:** 計画（問題の作り方）→ 書き込み・おさらいへの除外 → サーバーのゲームの共通化・窓口・分析 → 画面の計算 → 画面（国旗のカード・共通ページ）→ ドキュメント → 登録とブラウザ確認。

**技術:** Laravel 13（Pest・MySQL・Sail）、Next.js 16・React 19・TypeScript、Vitest（画面の計算だけ。`environment: "node"`）。

**設計書:** `docs/design/2026-10-05-flag-catch-design.md`

## 守ること（全タスク共通）

- 返答・ドキュメント・コミットは日本語。コミットは `#NNNNN: type:要約` と `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`。番号は **#00352 から**（計画は#00351）。マージのコミットは #00358。
- ブランチは `feature/flag-catch`。mainへのマージは Owner に確認してから（`git merge --no-ff`）。pushはOwnerが行う。
- バックエンドのテストは `./vendor/bin/sail test`（`--parallel` なし）。結果のJSONで `"tool":"pest","result"` を探す。画面は `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`。
- `.env` は読まない・変えない・コミットしない。`migrate:fresh` は禁止。
- ブラウザ確認の画像は `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` の下だけに、**ファイル名を `.playwright-mcp/○○.png` のように、フォルダ名から書いて**保存し、見たら消す（その日の `page-*.yml`・`console-*.log` も）。確認用のログインは `test@example.com` / `password`（町テスト id 7）。普通のクリックが効かないときは、DOMの `click()` で押す。ログインが切れていたら、ログインし直す。
- 子どもが読む文は `AutoFurigana` に通す。
- 並行して流れる待ち（`browser_wait_for` の並べ書き）は、並行して実行され、思ったより短くなる。時間が要る確認は、1回ずつ待つ。
- 国旗クイズの計画のコード（`FlagQuizPlanner`・`FlagQuizWriter`）は、このタスクで一部を外から使えるように直す。**国旗クイズの動き（問題・ステージ）は変えない**（今のテストが通り続けること）。

## 見直しの観点（テストでは見にくい所を、最後に自分で確かめる）

1. 英語のスプルキャッチが、そのまま動く（窓口の返事の形・選択肢に `image` が付かない・画面の見た目・今のテストが全部通る）
2. 国旗キャッチの、1日3回のごほうび・自己ベスト・遊んだ回が、英語と別に数えられる。別のゲームの回は、終えられない（404）
3. 国旗キャッチ専用の問題が、ステージのおさらいと仲間の復習に出ない。国旗キャッチの中では、まちがえた国旗・復習の日が来た国旗が先に出る
4. 国旗のカードが、4列のスマホ幅（390px）で、はみ出さず、種の飛ぶ先がカードの真ん中に合う
5. Seederを再実行しても、国旗キャッチの問題・クイズが増えず、番号が変わらず、国旗クイズ（ステージ・問題）に触らない

## 決めたこと（計画で確定）

- ゲームの名前は、サーバーでは `catch`（今のまま）と `flag_catch`、窓口の道筋では `catch` と `flag-catch`。画面の設定の名前は `CatchMode`（`"catch" | "flag_catch"`）。
- 国旗キャッチの問題は、国ごとに、**難しさごとに1問**（`catch:{beginner|intermediate|advanced}:{国のkey}`）。問題文は「『日本』の国旗は？」。選択肢は国旗の絵（`question_choices.meta.image`）で、`label` は国名。`questions.meta.catch_only = true`。
- 選択肢の返事には、絵があるときだけ `image` を付ける（設計書は「ないときは null」と書いたが、英語の窓口の返事を変えないために、キーごと付けない。画面は、`image` が無い・空のどちらも文字として出す）。
- 国旗キャッチの設定は `config/games.php` の `flag_catch`。英語と同じ数字を持ち、問題の出どころに `quiz`（難しさごとのクイズの名前）を持つ。`max_label_width` は持たない。点数の決まり（`score()`）は、英語の `games.catch.score` を共通に使う。
- ごほうびの記録の理由は `game_{ゲーム}`（`game_catch`・`game_flag_catch`）。
- 答えのカードの国旗は、切り取らずに全体を見せる（`object-contain`）。

## ファイルの全体像

**サーバー（新規）**
- `app/Support/FlagQuiz/FlagCatchPlanner.php`
- `tests/Feature/{FlagCatchPlannerTest,FlagCatchWriterTest,CatchOnlyReviewTest,FlagCatchGameTest}.php`

**サーバー（変更）**
- `app/Support/FlagQuiz/{FlagQuizPlanner,FlagQuizWriter}.php`、`database/seeders/FlagQuizSeeder.php`、`app/Support/QuestionMemory.php`、`app/Support/CatchGame.php`、`config/games.php`、`routes/api.php`、`app/Support/Analytics.php`、`tests/Feature/AnalyticsQuestionsActivitiesTest.php`

**画面（新規）**
- `frontend/src/components/games/catch/catch-page.tsx`（今の `app/games/catch/page.tsx` の中身を移す）、`frontend/src/app/games/flag-catch/page.tsx`

**画面（変更）**
- `frontend/src/components/games/game-question.ts`、`frontend/src/components/games/catch/{catch-api,catch-view,catch-game,catch-select,catch-result}.ts(x)`（と、そのテスト）、`frontend/src/lib/mini-app.ts`（+test）、`frontend/src/app/games/catch/page.tsx`

---

### タスク1: 計画（国旗キャッチの問題の作り方）（#00352）

**ファイル**
- 新規: `app/Support/FlagQuiz/FlagCatchPlanner.php`、`tests/Feature/FlagCatchPlannerTest.php`
- 変更: `app/Support/FlagQuiz/FlagQuizPlanner.php`（`wrongCountries` を `public` にするだけ）

**渡すもの:** `FlagCatchPlanner::plan(array $catalog): array`。戻り値は、`list<array{code: 'beginner'|'intermediate'|'advanced', difficulty: '初級'|'中級'|'上級', title: string, questions: list<array{key: string, type: 'multiple_choice', prompt: string, image: null, choices: list<array{label: string, correct: bool, image: string}>}>}>`。`FlagQuizPlanner::wrongCountries(...)` が `public static`。

- [ ] **手順1: 失敗するテストを書く**（`tests/Feature/FlagCatchPlannerTest.php`。`flagTestCatalog()` は `tests/Pest.php` にある）

```php
<?php

use App\Support\FlagQuiz\FlagCatalog;
use App\Support\FlagQuiz\FlagCatchPlanner;

/*
|--------------------------------------------------------------------------
| 国旗キャッチの問題の計画(docs/design/2026-10-05-flag-catch-design.md 4章)
|--------------------------------------------------------------------------
*/

function flagCatchLevel(array $plan, string $code): array
{
    return collect($plan)->firstWhere('code', $code);
}

function flagCatchWrongNames(array $question): array
{
    return collect($question['choices'])->where('correct', false)->pluck('label')->all();
}

it('難しさごとに、知名度で絞った国を、1か国1問で作る。クイズの名前は「国旗キャッチ ○級」', function () {
    $plan = FlagCatchPlanner::plan(flagTestCatalog());

    expect(collect($plan)->pluck('code')->all())->toBe(['beginner', 'intermediate', 'advanced']);
    expect(collect($plan)->pluck('difficulty')->all())->toBe(['初級', '中級', '上級']);
    expect(collect($plan)->pluck('title')->all())->toBe(['国旗キャッチ 初級', '国旗キャッチ 中級', '国旗キャッチ 上級']);
    // 小さな一覧: 知名度1が6か国、知名度1・2が16か国、全部で22か国
    expect(collect($plan)->map(fn ($level) => count($level['questions']))->all())->toBe([6, 16, 22]);
});

it('問題は、「国名」の国旗は？。選択肢は国旗の絵つきで、正解が1つ、まちがいが3つ以上。キーは重ならない', function () {
    $plan = FlagCatchPlanner::plan(flagTestCatalog());
    $questions = collect($plan)->flatMap(fn ($level) => $level['questions']);

    expect($questions->pluck('key')->unique()->count())->toBe($questions->count());
    expect(flagCatchLevel($plan, 'beginner')['questions'][0]['key'])->toBe('catch:beginner:A1');

    foreach ($questions as $question) {
        expect($question['type'])->toBe('multiple_choice');
        expect($question['image'])->toBeNull();
        expect($question['prompt'])->toMatch('/^「.+」の国旗は？$/');
        expect(collect($question['choices'])->where('correct', true))->toHaveCount(1);
        expect(count($question['choices']))->toBeGreaterThanOrEqual(4);
        expect(collect($question['choices'])->every(fn ($choice) => str_starts_with($choice['image'], '/flag/')))->toBeTrue();
        expect(collect($question['choices'])->pluck('label')->unique()->count())->toBe(count($question['choices']));
    }
});

it('正解の国名が問題文に入り、正解の選択肢の国名と同じ', function () {
    $question = flagCatchLevel(FlagCatchPlanner::plan(flagTestCatalog()), 'beginner')['questions'][0];
    $correct = collect($question['choices'])->firstWhere('correct', true);

    expect($question['prompt'])->toBe("「{$correct['label']}」の国旗は？");
    expect($correct['image'])->toBe('/flag/A1.svg');
});

it('初級・中級のまちがいは、その難しさの国の中から。上級のまちがいは似ている国から', function () {
    $plan = FlagCatchPlanner::plan(flagTestCatalog());
    $catalog = flagTestCatalog();
    $tier1 = collect($catalog)->where('tier', 1)->pluck('name')->all();
    $tier12 = collect($catalog)->where('tier', '<=', 2)->pluck('name')->all();

    foreach (flagCatchLevel($plan, 'beginner')['questions'] as $question) {
        expect(array_diff(flagCatchWrongNames($question), $tier1))->toBe([]);
    }
    foreach (flagCatchLevel($plan, 'intermediate')['questions'] as $question) {
        expect(array_diff(flagCatchWrongNames($question), $tier12))->toBe([]);
    }

    $first = flagCatchLevel($plan, 'advanced')['questions'][0]; // A1。似ている国は A2・E1
    expect(flagCatchWrongNames($first))->toContain('あじあ2', 'よーろっぱ1');
    expect(count(flagCatchWrongNames($first)))->toBeGreaterThanOrEqual(3);
});

it('同じ一覧からは、いつも同じ計画ができる', function () {
    expect(FlagCatchPlanner::plan(flagTestCatalog()))->toBe(FlagCatchPlanner::plan(flagTestCatalog()));
});

it('本物の一覧では、知名度1・知名度1と2・全部の国の数だけ問題ができる', function () {
    $catalog = FlagCatalog::all();
    $plan = FlagCatchPlanner::plan($catalog);

    expect(collect($plan)->map(fn ($level) => count($level['questions']))->all())->toBe([
        collect($catalog)->where('tier', '<=', 1)->count(),
        collect($catalog)->where('tier', '<=', 2)->count(),
        count($catalog),
    ]);
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/FlagCatchPlannerTest.php`
期待: 失敗（クラスがない）。

- [ ] **手順3: 実装する**

`app/Support/FlagQuiz/FlagQuizPlanner.php` の `private static function wrongCountries(` を `public static function wrongCountries(` に変える（この関数だけ。ほかは変えない）。

`app/Support/FlagQuiz/FlagCatchPlanner.php`:

```php
<?php

namespace App\Support\FlagQuiz;

/**
 * 国旗キャッチの問題の計画(docs/design/2026-10-05-flag-catch-design.md 4章)。
 * 国の一覧から、難しさごとに、知名度で絞った国を1か国1問で作る純粋な計算。データベースには触らない。
 * 問題は「『国名』の国旗は？」、選択肢は国旗の絵。まちがいの選び方は、国旗クイズと同じ(FlagQuizPlanner::wrongCountries)
 */
class FlagCatchPlanner
{
    public const QUIZ_PREFIX = '国旗キャッチ';

    /** code => 難しさと、出す国の知名度の上限(初級は知名度1、中級は1・2、上級は全部) */
    public const LEVELS = [
        'beginner' => ['difficulty' => '初級', 'max_tier' => 1],
        'intermediate' => ['difficulty' => '中級', 'max_tier' => 2],
        'advanced' => ['difficulty' => '上級', 'max_tier' => 3],
    ];

    /**
     * @param  array<string, array{key: string, name: string, continent: string, tier: int, similar: list<string>}>  $catalog
     */
    public static function plan(array $catalog): array
    {
        $all = array_values($catalog);
        $levels = [];

        foreach (self::LEVELS as $code => $level) {
            $countries = array_values(array_filter($all, fn (array $country) => $country['tier'] <= $level['max_tier']));

            $questions = array_map(function (array $country) use ($code, $countries, $all, $catalog) {
                $key = "catch:{$code}:{$country['key']}";
                $wrong = FlagQuizPlanner::wrongCountries($country, $code, $countries, $all, $catalog, $key);

                return [
                    'key' => $key,
                    'type' => 'multiple_choice',
                    'prompt' => "「{$country['name']}」の国旗は？",
                    'image' => null,
                    'choices' => array_map(
                        fn (array $other, bool $correct) => ['label' => $other['name'], 'correct' => $correct, 'image' => "/flag/{$other['key']}.svg"],
                        array_merge([$country], $wrong),
                        array_merge([true], array_fill(0, count($wrong), false)),
                    ),
                ];
            }, $countries);

            $levels[] = [
                'code' => $code,
                'difficulty' => $level['difficulty'],
                'title' => self::QUIZ_PREFIX.' '.$level['difficulty'],
                'questions' => $questions,
            ];
        }

        return $levels;
    }
}
```

- [ ] **手順4: 通す。バックエンド全体も通す**

実行: `./vendor/bin/sail test tests/Feature/FlagCatchPlannerTest.php`、続けて `./vendor/bin/sail test`
期待: すべて通る（国旗クイズの今のテストも通る）。

- [ ] **手順5: コミット**

```bash
git add app/Support/FlagQuiz/FlagQuizPlanner.php app/Support/FlagQuiz/FlagCatchPlanner.php tests/Feature/FlagCatchPlannerTest.php
git commit -m "#00352: feat:国旗キャッチの問題の計画(難しさごとに知名度で絞った国を、国旗の選択肢つきで作る)を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク2: 書き込み・Seeder・おさらいへの除外（#00353）

**ファイル**
- 新規: `tests/Feature/FlagCatchWriterTest.php`、`tests/Feature/CatchOnlyReviewTest.php`
- 変更: `app/Support/FlagQuiz/FlagQuizWriter.php`、`database/seeders/FlagQuizSeeder.php`、`app/Support/QuestionMemory.php`

**渡すもの:** `FlagQuizWriter::writeCatch(array $plan): array{quizzes: int, questions: int}`（何度実行しても重複しない。ステージは作らない）。問題の `meta` は `{flag_key, catch_only: true}`。`QuestionMemory::dueIds` が、`catch_only` の問題を返さない（`dueIdsAmong` は返す）。

- [ ] **手順1: 失敗するテストを書く**

`tests/Feature/FlagCatchWriterTest.php`:

```php
<?php

use App\Models\Category;
use App\Models\Question;
use App\Models\QuestionChoice;
use App\Models\Quiz;
use App\Models\Stage;
use App\Support\FlagQuiz\FlagCatchPlanner;
use App\Support\FlagQuiz\FlagQuizPlanner;
use App\Support\FlagQuiz\FlagQuizWriter;

/*
|--------------------------------------------------------------------------
| 国旗キャッチの問題の書き込み(docs/design/2026-10-05-flag-catch-design.md 4-2)
|--------------------------------------------------------------------------
*/

it('難しさごとにクイズを作り、問題(国旗の絵つきの選択肢)を書く。ステージ・カテゴリーは作らない', function () {
    $result = FlagQuizWriter::writeCatch(FlagCatchPlanner::plan(flagTestCatalog()));

    expect($result)->toBe(['quizzes' => 3, 'questions' => 44]);
    expect(Quiz::pluck('title')->sort()->values()->all())->toBe(['国旗キャッチ 上級', '国旗キャッチ 中級', '国旗キャッチ 初級']);
    expect(Question::count())->toBe(44);
    expect(Stage::count())->toBe(0);
    expect(Category::count())->toBe(0);

    $question = Question::where('meta->flag_key', 'catch:beginner:A1')->firstOrFail();
    expect($question->type)->toBe('multiple_choice');
    expect($question->prompt)->toBe('「あじあ1」の国旗は？');
    expect($question->meta)->toBe(['flag_key' => 'catch:beginner:A1', 'catch_only' => true]);
    expect($question->country_id)->toBeNull();
    expect($question->choices->where('is_correct', true))->toHaveCount(1);
    expect($question->choices->every(fn (QuestionChoice $choice) => str_starts_with($choice->meta['image'] ?? '', '/flag/')))->toBeTrue();
    expect($question->quiz->title)->toBe('国旗キャッチ 初級');
});

it('何度書いても、クイズ・問題・選択肢が増えず、番号も変わらない', function () {
    $plan = FlagCatchPlanner::plan(flagTestCatalog());
    FlagQuizWriter::writeCatch($plan);

    $counts = [Quiz::count(), Question::count(), QuestionChoice::count()];
    $ids = Question::orderBy('id')->pluck('id')->all();
    $choiceIds = QuestionChoice::orderBy('id')->pluck('id')->all();

    FlagQuizWriter::writeCatch($plan);

    expect([Quiz::count(), Question::count(), QuestionChoice::count()])->toBe($counts);
    expect(Question::orderBy('id')->pluck('id')->all())->toBe($ids);
    expect(QuestionChoice::orderBy('id')->pluck('id')->all())->toBe($choiceIds);
});

it('国名を直して書き直すと、問題の文と選択肢が直り、問題の番号は保たれる', function () {
    FlagQuizWriter::writeCatch(FlagCatchPlanner::plan(flagTestCatalog()));
    $questionIds = Question::orderBy('id')->pluck('id')->all();

    $catalog = flagTestCatalog();
    $catalog['A1']['name'] = 'なおした国';
    FlagQuizWriter::writeCatch(FlagCatchPlanner::plan($catalog));

    expect(Question::orderBy('id')->pluck('id')->all())->toBe($questionIds);
    expect(Question::where('meta->flag_key', 'catch:beginner:A1')->first()->prompt)->toBe('「なおした国」の国旗は？');
    expect(QuestionChoice::where('label', 'あじあ1')->exists())->toBeFalse();
});

it('国旗クイズ(ステージの問題)と一緒に書いても、お互いに触らない', function () {
    FlagQuizWriter::write(FlagQuizPlanner::plan(flagTestCatalog()));
    $quizQuestions = Question::whereNotNull('meta->flag_key')->count();
    $stages = Stage::count();

    FlagQuizWriter::writeCatch(FlagCatchPlanner::plan(flagTestCatalog()));

    expect(Question::whereNull('meta->catch_only')->count())->toBe($quizQuestions);
    expect(Question::where('meta->catch_only', true)->count())->toBe(44);
    expect(Stage::count())->toBe($stages);
});
```

`tests/Feature/CatchOnlyReviewTest.php`:

```php
<?php

use App\Models\Question;
use App\Models\Quiz;
use App\Support\QuestionMemory;

/*
|--------------------------------------------------------------------------
| 国旗キャッチ専用の問題は、おさらいと仲間の復習に出さない(docs/design/2026-10-05-flag-catch-design.md 4-3)
|--------------------------------------------------------------------------
*/

function catchOnlyQuestion(bool $catchOnly): Question
{
    $quiz = Quiz::create(['title' => 'テスト', 'difficulty' => '初級']);

    return Question::create([
        'quiz_id' => $quiz->id,
        'prompt' => 'テスト問題',
        'meta' => $catchOnly ? ['flag_key' => 'catch:test', 'catch_only' => true] : null,
    ]);
}

it('出す日が来た問題のうち、国旗キャッチ専用の問題は、復習(dueIds)に出ない。国旗キャッチの中(dueIdsAmong)では出る', function () {
    $profile = createActiveProfile();
    $catchOnly = catchOnlyQuestion(true);
    $normal = catchOnlyQuestion(false);

    foreach ([$catchOnly, $normal] as $question) {
        QuestionMemory::record($profile, $question->id, true, '2026-09-01'); // 出す日は、とっくに来ている
    }

    expect(QuestionMemory::dueIds($profile, 10))->toBe([$normal->id]);
    expect(QuestionMemory::dueIdsAmong($profile, [$catchOnly->id, $normal->id], 10))->toContain($catchOnly->id, $normal->id);
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/FlagCatchWriterTest.php tests/Feature/CatchOnlyReviewTest.php`
期待: 失敗（`writeCatch` がない・除外していない）。

- [ ] **手順3: 実装する**

`app/Support/FlagQuiz/FlagQuizWriter.php`:

1. `write` の最初の `$existing = Question::query()->whereNotNull('meta->flag_key')->get()->keyBy(...)->all();`（コメント付きの2行）を、`$existing = self::existingQuestions();` に置き換える。
2. `writeCatch` と `existingQuestions` を足す（`write` の下）:

```php
    /**
     * 国旗キャッチ専用の問題(ステージには入れない)を書く(docs/design/2026-10-05-flag-catch-design.md 4-2)。
     * 何度実行しても重複しない
     *
     * @return array{quizzes: int, questions: int}
     */
    public static function writeCatch(array $plan): array
    {
        return DB::transaction(function () use ($plan) {
            $existing = self::existingQuestions();
            $questions = 0;

            foreach ($plan as $level) {
                $quiz = Quiz::firstOrCreate(['title' => $level['title']], ['difficulty' => $level['difficulty'], 'is_published' => true]);

                foreach ($level['questions'] as $index => $spec) {
                    self::question($quiz, $spec + ['catch_only' => true], $index + 1, $existing);
                    $questions++;
                }
            }

            return ['quizzes' => count($plan), 'questions' => $questions];
        });
    }

    /** 問題は、meta.flag_key で見つける。1問ごとに探すと遅いので、最初に全部読んでおく @return array<string, Question> */
    private static function existingQuestions(): array
    {
        return Question::query()->whereNotNull('meta->flag_key')->get()->keyBy(fn (Question $question) => $question->meta['flag_key'])->all();
    }
```

3. `questionMeta` の、最後の `return array_filter([...])` を、次に置き換える:

```php
        $meta = ['flag_key' => $spec['key']];
        if (($spec['image'] ?? null) !== null) {
            $meta['image'] = $spec['image'];
        }
        if ($spec['catch_only'] ?? false) {
            $meta['catch_only'] = true;
        }

        return $meta;
```

`database/seeders/FlagQuizSeeder.php` の `run()` を、次にする（`use App\Support\FlagQuiz\FlagCatchPlanner;` を足す）:

```php
    public function run(): void
    {
        $catalog = FlagCatalog::all();
        $quiz = FlagQuizWriter::write(FlagQuizPlanner::plan($catalog));
        $catch = FlagQuizWriter::writeCatch(FlagCatchPlanner::plan($catalog));

        $this->command?->info("国旗クイズ: コース{$quiz['courses']}・ステージ{$quiz['stages']}・問題{$quiz['questions']}");
        $this->command?->info("国旗キャッチ: クイズ{$catch['quizzes']}・問題{$catch['questions']}");
    }
```

`app/Support/QuestionMemory.php` の `dueIds` の、`return self::dueQuery($profile)` の次の行（`->when($excludeIds !== [] ...`）の前に、1行足す:

```php
            // 国旗キャッチ専用の問題は、ステージのおさらいと仲間の復習には出さない(国旗キャッチの中は dueIdsAmong)
            ->whereNull('questions.meta->catch_only')
```

- [ ] **手順4: 通す。バックエンド全体も通す**

実行: `./vendor/bin/sail test tests/Feature/FlagCatchWriterTest.php tests/Feature/CatchOnlyReviewTest.php`、続けて `./vendor/bin/sail test`
期待: すべて通る（今の `FlagQuizWriterTest` の、Seederの本物の一覧のテストも通る）。

- [ ] **手順5: コミット**

```bash
git add app/Support/FlagQuiz/FlagQuizWriter.php database/seeders/FlagQuizSeeder.php app/Support/QuestionMemory.php tests/Feature/FlagCatchWriterTest.php tests/Feature/CatchOnlyReviewTest.php
git commit -m "#00353: feat:国旗キャッチの問題をデータベースに書き(Seeder)、国旗キャッチ専用の問題をおさらい・仲間の復習から除く" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク3: サーバーのゲームの共通化・窓口・分析（#00354）

**ファイル**
- 新規: `tests/Feature/FlagCatchGameTest.php`
- 変更: `app/Support/CatchGame.php`、`config/games.php`、`routes/api.php`、`app/Support/Analytics.php`、`tests/Feature/AnalyticsQuestionsActivitiesTest.php`

**渡すもの:** `CatchGame::summary/start/rewardedPlaysLeft` が、最後の引数 `string $game = self::GAME`（`catch`）を受け取る。`finish` は、回の `game` で決める。`CatchGame::FLAG_GAME = 'flag_catch'`。窓口 `GET /api/games/flag-catch`・`POST /api/games/flag-catch/plays`・`POST /api/games/flag-catch/plays/{play}/finish`。選択肢の返事に、絵があるときだけ `image`。分析の `activities` に `flag_catch` の行。

- [ ] **手順1: 失敗するテストを書く**

`tests/Feature/FlagCatchGameTest.php`:

```php
<?php

use App\Models\ProfileGamePlay;
use App\Support\FlagQuiz\FlagCatchPlanner;
use App\Support\FlagQuiz\FlagQuizWriter;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| 国旗キャッチ(docs/design/2026-10-05-flag-catch-design.md 2〜5章)
|--------------------------------------------------------------------------
|
| 小さな一覧(flagTestCatalog)で、初級6・中級16・上級22問を登録して確かめる。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-05 03:00:00', 'UTC')); // 日本時間 10/5 12:00
});

function prepareFlagCatch(): void
{
    FlagQuizWriter::writeCatch(FlagCatchPlanner::plan(flagTestCatalog()));
}

/** 始めて、全部の問題に答える($allCorrect が偽なら、全部まちがい) @return array{0: array, 1: list<array{question_id: int, choice_id: int}>} */
function startFlagCatch($test, string $difficulty = '初級', bool $allCorrect = true): array
{
    $start = $test->postJson('/api/games/flag-catch/plays', ['difficulty' => $difficulty])->assertOk()->json();
    $answers = collect($start['questions'])->map(fn (array $question) => [
        'question_id' => $question['id'],
        'choice_id' => $allCorrect
            ? $question['correct_choice_id']
            : collect($question['choices'])->firstWhere('id', '!=', $question['correct_choice_id'])['id'],
    ])->all();

    return [$start, $answers];
}

it('難しさごとの列の数・使える問題の数・自己ベストと、今日のごほうびの残りを、英語とは別に返す。鍵は関係ない', function () {
    $profile = createActiveProfile(); // どの国にも着いていない
    prepareFlagCatch();
    $profile->gamePlays()->create(['game' => 'flag_catch', 'difficulty' => '初級', 'question_ids' => [], 'finished_at' => now(), 'played_on' => '2026-10-05', 'score' => 70]);
    $profile->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => [], 'finished_at' => now(), 'played_on' => '2026-10-05', 'score' => 140]);

    $this->getJson('/api/games/flag-catch')
        ->assertOk()
        ->assertJsonPath('category_id', null)
        ->assertJsonPath('difficulties.0', ['difficulty' => '初級', 'lanes' => 2, 'available' => 6, 'best_score' => 70])
        ->assertJsonPath('difficulties.1', ['difficulty' => '中級', 'lanes' => 3, 'available' => 16, 'best_score' => null])
        ->assertJsonPath('difficulties.2', ['difficulty' => '上級', 'lanes' => 4, 'available' => 22, 'best_score' => null])
        ->assertJsonPath('rewarded_plays_left', 2);

    $this->getJson('/api/games/catch')->assertOk()->assertJsonPath('rewarded_plays_left', 2); // 英語は英語の1回を数える
});

it('始めると、列の数の選択肢(国旗の絵つき)と正解のidを返し、遊んだ回が flag_catch で残る', function () {
    createActiveProfile();
    prepareFlagCatch();

    $response = $this->postJson('/api/games/flag-catch/plays', ['difficulty' => '中級'])
        ->assertOk()
        ->assertJsonPath('lanes', 3)
        ->assertJsonPath('fall_ms', 6000)
        ->assertJsonCount(10, 'questions');

    foreach ($response->json('questions') as $question) {
        expect($question['prompt'])->toMatch('/^「.+」の国旗は？$/');
        expect($question['choices'])->toHaveCount(3);
        expect(collect($question['choices'])->pluck('id'))->toContain($question['correct_choice_id']);
        foreach ($question['choices'] as $choice) {
            expect($choice['image'])->toStartWith('/flag/');
        }
    }

    $play = ProfileGamePlay::query()->firstOrFail();
    expect([$play->game, $play->difficulty])->toBe(['flag_catch', '中級']);
    expect($play->question_ids)->toBe(collect($response->json('questions'))->pluck('id')->all());
});

it('使える問題が10問より少なければ、ある分だけ出す(初級は6問)。問題がなければ422', function () {
    createActiveProfile();

    $this->postJson('/api/games/flag-catch/plays', ['difficulty' => '初級'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'この難しさの問題はまだないよ');

    prepareFlagCatch();
    $this->postJson('/api/games/flag-catch/plays', ['difficulty' => '初級'])->assertOk()->assertJsonCount(6, 'questions');
});

it('国旗キャッチ専用でない問題(英語など)は出さない', function () {
    $profile = createActiveProfile();
    prepareFlagCatch();
    prepareCatchQuestions($profile, 3); // 英語の問題

    $ids = collect($this->postJson('/api/games/flag-catch/plays', ['difficulty' => '初級'])->assertOk()->json('questions'))->pluck('id');

    expect(\App\Models\Question::whereIn('id', $ids)->whereNull('meta->catch_only')->count())->toBe(0);
});

it('採点し直して、正解の数・点数を返し、ごほうびは国旗キャッチ専用の理由で記録する。覚え具合にも書く', function () {
    $profile = createActiveProfile();
    prepareFlagCatch();
    [$start, $answers] = startFlagCatch($this, '初級');

    $this->postJson("/api/games/flag-catch/plays/{$start['play_id']}/finish", ['answers' => $answers])
        ->assertOk()
        ->assertJsonPath('correct_count', 6)
        ->assertJsonPath('score', 80) // 10×6 + 5×4(コンボ3以上の正解)
        ->assertJsonPath('best_combo', 6)
        ->assertJsonPath('new_best', true)
        ->assertJsonPath('reward', ['xp' => 18, 'point' => 18])
        ->assertJsonPath('rewarded_plays_left', 2);

    expect(DB::table('profile_currency_ledger')->where('user_profile_id', $profile->id)->where('reason', 'game_flag_catch')->count())->toBe(2);
    expect(DB::table('profile_currency_ledger')->where('reason', 'game_catch')->count())->toBe(0);
    expect(DB::table('profile_question_memories')->where('user_profile_id', $profile->id)->count())->toBe(6);
});

it('ごほうびは1日3回まで。国旗キャッチの回数は、英語の回数に影響しない', function () {
    createActiveProfile();
    prepareFlagCatch();

    foreach ([true, true, true, true] as $_) {
        [$start, $answers] = startFlagCatch($this, '初級');
        $last = $this->postJson("/api/games/flag-catch/plays/{$start['play_id']}/finish", ['answers' => $answers])->assertOk();
    }

    expect($last->json('reward'))->toBeNull(); // 4回目
    $this->getJson('/api/games/flag-catch')->assertJsonPath('rewarded_plays_left', 0);
    $this->getJson('/api/games/catch')->assertJsonPath('rewarded_plays_left', 3);
});

it('自己ベストは、ゲームごとに別。英語のベストは国旗キャッチに出ない', function () {
    $profile = createActiveProfile();
    prepareFlagCatch();
    $profile->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => [], 'finished_at' => now(), 'played_on' => '2026-10-04', 'score' => 140]);
    [$start, $answers] = startFlagCatch($this, '初級');

    $this->postJson("/api/games/flag-catch/plays/{$start['play_id']}/finish", ['answers' => $answers])
        ->assertOk()
        ->assertJsonPath('new_best', true)
        ->assertJsonPath('best_score', 80);
});

it('別のゲームの回は終えられない(404)', function () {
    $profile = createActiveProfile();
    $english = $profile->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => []]);
    $flag = $profile->gamePlays()->create(['game' => 'flag_catch', 'difficulty' => '初級', 'question_ids' => []]);

    $this->postJson("/api/games/flag-catch/plays/{$english->id}/finish", ['answers' => []])->assertStatus(404);
    $this->postJson("/api/games/catch/plays/{$flag->id}/finish", ['answers' => []])->assertStatus(404);
    $this->postJson("/api/games/flag-catch/plays/{$flag->id}/finish", ['answers' => []])->assertOk();
});

it('難しさが正しくなければ422', function () {
    createActiveProfile();

    $this->postJson('/api/games/flag-catch/plays', ['difficulty' => '超級'])->assertStatus(422);
    $this->postJson('/api/games/flag-catch/plays', [])->assertStatus(422);
});

it('国旗キャッチの窓口は、ログインしていないと401', function () {
    $this->getJson('/api/games/flag-catch')->assertStatus(401);
});
```

`tests/Feature/AnalyticsQuestionsActivitiesTest.php` の、`'game' => 'catch', ... 'finished_at' => null ... // 終えていない` の行の次に足す:

```php
    $a->gamePlays()->create(['game' => 'flag_catch', 'difficulty' => '初級', 'question_ids' => [1], 'finished_at' => '2026-10-15 03:00:00', 'played_on' => '2026-10-15', 'answered_count' => 1, 'correct_count' => 1, 'score' => 1, 'best_combo' => 1]);
```

同じテストの、`->and($activities['catch'])->toMatchArray(['players' => 1, 'count' => 1])` の次に足す:

```php
        ->and($activities['flag_catch'])->toMatchArray(['players' => 1, 'count' => 1])
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/FlagCatchGameTest.php tests/Feature/AnalyticsQuestionsActivitiesTest.php`
期待: 失敗（窓口がない・設定がない・行がない）。

- [ ] **手順3: 実装する**

`config/games.php` の `'catch' => [...]` の下（同じ配列の中）に足す:

```php
    /*
    |--------------------------------------------------------------------------
    | スプルキャッチ(こっき)(国旗のミニゲーム)
    |--------------------------------------------------------------------------
    |
    | docs/design/2026-10-05-flag-catch-design.md 2・5章。英語のスプルキャッチと同じ遊び方。
    | quiz は、難しさごとの問題の出どころ(国旗キャッチ専用のクイズの名前。FlagCatchPlanner が作る)。
    | 点数の決まり(score)は、英語の games.catch.score を共通に使う。選択肢の長さの上限(max_label_width)は持たない。
    |
    */

    'flag_catch' => [
        'question_count' => 10,
        'review_max' => 6,
        'daily_rewarded_plays' => 3,
        'difficulties' => [
            '初級' => ['lanes' => 2, 'fall_ms' => 8000, 'quiz' => '国旗キャッチ 初級', 'reward' => ['xp' => 3, 'point' => 3]],
            '中級' => ['lanes' => 3, 'fall_ms' => 6000, 'quiz' => '国旗キャッチ 中級', 'reward' => ['xp' => 4, 'point' => 3]],
            '上級' => ['lanes' => 4, 'fall_ms' => 4500, 'quiz' => '国旗キャッチ 上級', 'reward' => ['xp' => 5, 'point' => 3]],
        ],
        'messages' => [
            'empty' => 'この難しさの問題はまだないよ',
        ],
    ],
```

`app/Support/CatchGame.php` を、次の内容に**置き換える**（`use App\Models\Quiz;` を足し、ゲームの名前を引数で受ける形。英語の動きは変えない）:

```php
<?php

namespace App\Support;

use App\Models\Category;
use App\Models\ProfileGamePlay;
use App\Models\Question;
use App\Models\QuestionChoice;
use App\Models\Quiz;
use App\Models\UserProfile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * ミニゲーム「スプルキャッチ」(docs/design/2026-09-29-spru-catch-design.md 4〜6章)と、その国旗版「スプルキャッチ(こっき)」
 * (docs/design/2026-10-05-flag-catch-design.md 5章)。ゲームの名前(catch・flag_catch)を引数で受け、設定は config('games.{ゲーム}') から読む。
 * 英語(catch)は「英語を学ぶ」の問題から、選んだ難しさ・鍵のない国・4択・選択肢が短い問題を選ぶ。
 * 国旗(flag_catch)は、難しさごとの国旗キャッチ専用のクイズの問題から選ぶ。
 * どちらも、最近まちがえた問題と出す日が来た問題を先に出す。正解は始めるときに渡し、終えるときに採点し直す。
 */
class CatchGame
{
    public const GAME = 'catch';

    public const FLAG_GAME = 'flag_catch';

    /** 難しさを選ぶ画面に出すもの(設計書6-3) */
    public static function summary(UserProfile $profile, string $game = self::GAME): array
    {
        $best = $profile->gamePlays()
            ->where('game', $game)
            ->whereNotNull('finished_at')
            ->groupBy('difficulty')
            ->selectRaw('difficulty, MAX(score) AS best')
            ->pluck('best', 'difficulty');

        return [
            'category_id' => $game === self::GAME ? self::categoryId() : null,
            'difficulties' => collect(config("games.{$game}.difficulties"))
                ->map(fn (array $settings, string $difficulty) => [
                    'difficulty' => $difficulty,
                    'lanes' => $settings['lanes'],
                    'available' => self::pool($profile, $difficulty, $game)->count(),
                    'best_score' => isset($best[$difficulty]) ? (int) $best[$difficulty] : null,
                ])
                ->values()
                ->all(),
            'rewarded_plays_left' => self::rewardedPlaysLeft($profile, $game),
        ];
    }

    /** 回を始める。問題を選んで遊んだ回を1行作り、問題と正解と設定を返す(設計書4章・6-3) */
    public static function start(UserProfile $profile, string $difficulty, string $game = self::GAME): array
    {
        $settings = self::settings($difficulty, $game);
        $pool = self::pool($profile, $difficulty, $game);
        abort_if($pool->isEmpty(), 422, self::emptyMessage($profile, $game));

        $ids = self::pick($profile, $pool->pluck('id')->all(), $game);
        $play = $profile->gamePlays()->create(['game' => $game, 'difficulty' => $difficulty, 'question_ids' => $ids]);
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
    public static function rewardedPlaysLeft(UserProfile $profile, string $game = self::GAME): int
    {
        $finishedToday = $profile->gamePlays()
            ->where('game', $game)
            ->where('played_on', Garden::today())
            ->count();

        return max(0, config("games.{$game}.daily_rewarded_plays") - $finishedToday);
    }

    /**
     * 回を終える(設計書4-4・5章・6-3)。答えを採点し直して覚え具合に書き、その日の最初の3回ならごほうびを出す。
     * ゲームの名前は、回の game から決める。呼ぶ側で、終えていない回をロックしてから呼ぶ
     *
     * @param  list<array{question_id: int|string, choice_id: int|string}>  $answers  答えた順
     */
    public static function finish(ProfileGamePlay $play, array $answers): array
    {
        $game = $play->game;
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
            ->where('game', $game)
            ->where('difficulty', $play->difficulty)
            ->whereNotNull('finished_at')
            ->max('score');
        $left = self::rewardedPlaysLeft($profile, $game);
        $previousLevel = $profile->level;
        $reward = null;
        $leveledUp = false;

        if ($left > 0 && $correctCount > 0) {
            $per = self::settings($play->difficulty, $game)['reward'];
            $reward = ['xp' => $correctCount * $per['xp'], 'point' => $correctCount * $per['point']];
            $leveledUp = $profile->applyEconomy($reward, "game_{$game}")['leveled_up'];
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
     * 答えの並び(正解か)から、点数といちばん長いコンボ(設計書3-5)。画面の scoreOf と同じ決まり。
     * 点数の決まりは、英語と国旗で共通(games.catch.score)
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

    /** @return array{lanes: int, fall_ms: int, max_label_width?: int, quiz?: string, reward: array{xp: int, point: int}} */
    private static function settings(string $difficulty, string $game): array
    {
        return config("games.{$game}.difficulties")[$difficulty];
    }

    private static function categoryId(): ?int
    {
        $id = Category::query()->where('name', config('games.catch.category'))->value('id');

        return $id === null ? null : (int) $id;
    }

    /** 使える問題が0のときの文。英語は、どの国にも着いていなければ「着くと遊べるよ」、国旗は「まだないよ」 */
    private static function emptyMessage(UserProfile $profile, string $game): string
    {
        if ($game === self::GAME && self::stageQuestionIds($profile, null) === []) {
            return config('games.catch.messages.locked');
        }

        return config("games.{$game}.messages.empty");
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
     * 国旗キャッチ専用のクイズの問題の番号
     *
     * @return list<int>
     */
    private static function quizQuestionIds(string $title): array
    {
        return Question::query()
            ->whereIn('quiz_id', Quiz::query()->where('title', $title)->pluck('id'))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * 使える問題(設計書4-1)
     *
     * @return Collection<int, Question>
     */
    private static function pool(UserProfile $profile, string $difficulty, string $game): Collection
    {
        $settings = self::settings($difficulty, $game);
        $ids = isset($settings['quiz'])
            ? self::quizQuestionIds($settings['quiz'])
            : self::stageQuestionIds($profile, $difficulty);

        return Question::query()
            ->with('choices')
            ->whereIn('id', $ids)
            ->where('type', 'multiple_choice')
            ->orderBy('id')
            ->get(['id', 'prompt'])
            ->filter(fn (Question $question) => self::fits($question, $settings))
            ->values();
    }

    /** 正解が1つ、まちがいが「列の数−1」以上、(上限があれば)選択肢がすべて長さの上限に収まる */
    private static function fits(Question $question, array $settings): bool
    {
        return $question->choices->where('is_correct', true)->count() === 1
            && $question->choices->where('is_correct', false)->count() >= $settings['lanes'] - 1
            && (! isset($settings['max_label_width'])
                || $question->choices->every(fn (QuestionChoice $choice) => mb_strwidth($choice->label) <= $settings['max_label_width']));
    }

    /**
     * 出す問題を選ぶ(設計書4-2)。最近まちがえた問題 → 出す日が来た問題(あわせて review_max まで) →
     * どちらでもない問題をランダムに。足りなければ、入りきらなかった復習の問題を足す。最後に順をまぜる
     *
     * @param  list<int>  $poolIds
     * @return list<int>
     */
    private static function pick(UserProfile $profile, array $poolIds, string $game): array
    {
        $reviewMax = config("games.{$game}.review_max");
        $wrong = QuestionMemory::wrongIdsAmong($profile, $poolIds, count($poolIds));
        $due = QuestionMemory::dueIdsAmong($profile, array_values(array_diff($poolIds, $wrong)), count($poolIds));
        $review = [...$wrong, ...$due];
        $fresh = collect($poolIds)->diff($review)->shuffle()->values()->all();

        return collect([...array_slice($review, 0, $reviewMax), ...$fresh, ...array_slice($review, $reviewMax)])
            ->take(config("games.{$game}.question_count"))
            ->shuffle()
            ->values()
            ->all();
    }

    /** 正解と、まちがいからランダムに「列の数−1」個をまぜて列の順にする(設計書4-3)。国旗の絵があれば image を付ける */
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
            'choices' => $choices->map(function (QuestionChoice $choice) {
                $image = $choice->meta['image'] ?? null;

                return ['id' => $choice->id, 'label' => $choice->label] + ($image !== null ? ['image' => $image] : []);
            })->all(),
            'correct_choice_id' => $correct->id,
        ];
    }
}
```

`routes/api.php` の、スプルキャッチの窓口の `Route::middleware(['auth:sanctum'])->prefix('games/catch')->name('games.catch.')->group(function () { ... });` のブロック全体を、次に置き換える（コメント行 `// ミニゲーム1本目「スプルキャッチ」...` は残して、国旗版の説明を足す）:

```php
// ミニゲーム「スプルキャッチ」(docs/design/2026-09-29-spru-catch-design.md 6-3)と、国旗版「スプルキャッチ(こっき)」
// (docs/design/2026-10-05-flag-catch-design.md 5章)。同じ処理を、ゲームの名前だけ変えて登録する
foreach (['catch' => CatchGame::GAME, 'flag-catch' => CatchGame::FLAG_GAME] as $path => $game) {
    Route::middleware(['auth:sanctum'])->prefix("games/{$path}")->name("games.{$path}.")->group(function () use ($game) {
        Route::get('/', function (Request $request) use ($game) {
            return CatchGame::summary(ActiveProfile::require($request), $game);
        })->name('show');

        Route::post('/plays', function (Request $request) use ($game) {
            $profile = ActiveProfile::require($request);
            $data = $request->validate([
                'difficulty' => ['required', 'string', Rule::in(array_keys(config("games.{$game}.difficulties")))],
            ]);

            return CatchGame::start($profile, $data['difficulty'], $game);
        })->name('plays.store');

        Route::post('/plays/{play}/finish', function (Request $request, ProfileGamePlay $play) use ($game) {
            $profile = ActiveProfile::require($request);
            abort_unless($play->user_profile_id === $profile->id && $play->game === $game, 404);
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
    });
}
```

`app/Support/Analytics.php` の `activities` に、`$catch = ...;` の次の行に足す:

```php
        $flagCatch = $between(DB::table('profile_game_plays')->where('game', 'flag_catch')->whereNotNull('finished_at'), 'played_on');
```

返す配列の、`$row('catch', 'スプルキャッチ', $catch, 'user_profile_id'),` の次の行に足す:

```php
            $row('flag_catch', 'スプルキャッチ(こっき)', $flagCatch, 'user_profile_id'),
```

- [ ] **手順4: 通す。バックエンド全体も通す**

実行: `./vendor/bin/sail test tests/Feature/FlagCatchGameTest.php tests/Feature/AnalyticsQuestionsActivitiesTest.php`、続けて `./vendor/bin/sail test`
期待: すべて通る。**英語のスプルキャッチのテスト（`CatchGameStartTest`・`CatchGameFinishTest`）と、分析のAPIのテストが、変えずに通ること**。落ちたら、テストを直さず、実装の側を直す（返事の形を変えていないはず）。

- [ ] **手順5: コミット**

```bash
git add app/Support/CatchGame.php config/games.php routes/api.php app/Support/Analytics.php tests/Feature/FlagCatchGameTest.php tests/Feature/AnalyticsQuestionsActivitiesTest.php
git commit -m "#00354: feat:スプルキャッチのサーバーの部分をゲーム名で共通にし、国旗キャッチ(こっき)の窓口・設定・分析の行を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク4: 画面の計算（ゲームの種類・まちがえた国旗）（#00355）

**ファイル**
- 変更: `frontend/src/components/games/game-question.ts`、`frontend/src/components/games/catch/catch-api.ts`、`catch-view.ts`、`catch-view.test.ts`、`catch-api.test.ts`、`frontend/src/lib/mini-app.ts`、`frontend/src/lib/mini-app.test.ts`

**渡すもの:** `GameChoice.image?: string | null`、`type CatchMode = "catch" | "flag_catch"`、`CATCH_MODES`（`{ title, intro, howTo, apiPath, missedHeading, emptyMessage, emptyLink }`）、`missedWords` の戻りに `answerImage?: string`、`MINI_GAMES` に `flag-catch`。

- [ ] **手順1: 失敗するテストを書く**

`catch-view.test.ts` に追記（import に `CATCH_MODES` を足す）:

```ts
describe("ゲームの種類ごとの設定(CATCH_MODES)", () => {
  it("英語は今までの名前・あそびかた・窓口。国旗は、こっきの名前・国旗向けのあそびかた・窓口", () => {
    expect(CATCH_MODES.catch).toMatchObject({ title: "スプルキャッチ（えいたんご）", apiPath: "/api/games/catch", emptyLink: true });
    expect(CATCH_MODES.catch.howTo).toBe(CATCH_HOW_TO);

    expect(CATCH_MODES.flag_catch).toMatchObject({
      title: "スプルキャッチ（こっき）",
      apiPath: "/api/games/flag-catch",
      missedHeading: "まちがえた国旗",
      emptyLink: false,
    });
    expect(CATCH_MODES.flag_catch.howTo).toHaveLength(3);
    expect(CATCH_MODES.flag_catch.howTo.every((line) => line.length > 0)).toBe(true);
  });
});

describe("まちがえた言葉(国旗の絵)", () => {
  it("正しい選択肢に国旗の絵があれば、answerImage に入る。なければ入らない", () => {
    const flagQuestion = {
      id: 1,
      prompt: "「日本」の国旗は？",
      choices: [
        { id: 10, label: "日本", image: "/flag/Japan.svg" },
        { id: 11, label: "韓国", image: "/flag/Korea-South.svg" },
      ],
      correctChoiceId: 10,
    };
    let state = createCatchGame([flagQuestion], { lanes: 2, fallMs: 1000 });
    state = throwAt(state, 1); // まちがえる

    expect(missedWords(state)).toEqual([{ focus: "日本", answer: "日本", answerImage: "/flag/Japan.svg" }]);
  });
});
```

`catch-api.test.ts` に追記:

```ts
it("選択肢の国旗の絵(image)を、そのまま問題に渡す", () => {
  const questions = toGameQuestions({
    play_id: 1,
    difficulty: "初級",
    lanes: 2,
    fall_ms: 8000,
    questions: [
      {
        id: 5,
        prompt: "「日本」の国旗は？",
        choices: [
          { id: 1, label: "日本", image: "/flag/Japan.svg" },
          { id: 2, label: "韓国", image: "/flag/Korea-South.svg" },
        ],
        correct_choice_id: 1,
      },
    ],
  });

  expect(questions[0].choices[0].image).toBe("/flag/Japan.svg");
});
```

`lib/mini-app.test.ts` に追記:

```ts
  it("スプルキャッチ（こっき）が入っていて、画面の設定の名前と同じ", () => {
    const flagCatch = MINI_GAMES.find((game) => game.key === "flag-catch");

    expect(flagCatch).toMatchObject({ title: CATCH_MODES.flag_catch.title, href: "/games/flag-catch" });
    expect(flagCatch?.description).toContain("国旗");
    expect(MINI_GAMES.find((game) => game.key === "catch")?.title).toBe(CATCH_MODES.catch.title);
  });
```

（`mini-app.test.ts` の先頭に `import { CATCH_MODES } from "@/components/games/catch/catch-view";` を足す。既存の「どのゲームも…重ならない」のテストが、2つめのゲームでも通ること。）

- [ ] **手順2: 失敗を確かめる**

実行: `cd frontend && npx vitest run src/components/games/catch src/lib/mini-app.test.ts`
期待: 失敗。

- [ ] **手順3: 実装する**

`game-question.ts`: `export type GameChoice = { id: number; label: string };` を、次にする:

```ts
export type GameChoice = { id: number; label: string; image?: string | null };
```

`catch-api.ts`: 変更なし（`GameChoice` を使っているので、`image` が通る。`CatchSummary.category_id` は `number | null` のまま）。

`catch-view.ts`: `CATCH_MOVE_HINT` の定義の下（`SpruPose` の型の前）に足す:

```ts
export type CatchMode = "catch" | "flag_catch";

/** ゲームの種類ごとの設定(docs/design/2026-10-05-flag-catch-design.md 6章)。英語は今までの文のまま */
export const CATCH_MODES: Record<
  CatchMode,
  {
    title: string;
    intro: string;
    howTo: readonly string[];
    apiPath: string;
    missedHeading: string;
    emptyMessage: string;
    /** 遊べないときに「せかいへ」のボタンを出すか(英語は旅の鍵があるので出す) */
    emptyLink: boolean;
  }
> = {
  catch: {
    title: CATCH_TITLE,
    intro: "落ちてくる答えを、スプルでキャッチしよう",
    howTo: CATCH_HOW_TO,
    apiPath: "/api/games/catch",
    missedHeading: "まちがえた言葉",
    emptyMessage: CATCH_LOCKED_MESSAGE,
    emptyLink: true,
  },
  flag_catch: {
    title: "スプルキャッチ（こっき）",
    intro: "流れてくる国旗を、スプルでキャッチしよう",
    howTo: ["「国名」の国旗が上に出るよ", "流れてくる国旗をタップ！スプルが種を投げてキャッチするよ", "10問やってみよう。ハートは3つ"],
    apiPath: "/api/games/flag-catch",
    missedHeading: "まちがえた国旗",
    emptyMessage: "国旗の問題はじゅんびちゅうだよ",
    emptyLink: false,
  },
};
```

`missedWords` を、次にする:

```ts
/** まちがえた問題の「」の中と正解の言葉(答えた順)。正解の選択肢に国旗の絵があれば、answerImage に入れる */
export function missedWords(state: CatchState): { focus: string; answer: string; answerImage?: string }[] {
  return state.answers
    .filter((answer) => !answer.correct)
    .map((answer) => {
      const question = state.questions.find((q) => q.id === answer.questionId);
      if (!question) return { focus: "", answer: "" };
      const correct = question.choices.find((choice) => choice.id === question.correctChoiceId);
      return {
        focus: splitPrompt(question.prompt).focus,
        answer: correct?.label ?? "",
        answerImage: correct?.image ?? undefined,
      };
    });
}
```

`lib/mini-app.ts` の `MINI_GAMES` の最後に1行足す:

```ts
  {
    key: "flag-catch",
    title: "スプルキャッチ（こっき）",
    description: "流れてくる国旗を、スプルがキャッチ！",
    href: "/games/flag-catch",
  },
```

- [ ] **手順4: 通す**

実行: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
期待: すべて通る。

- [ ] **手順5: コミット**

```bash
git add frontend/src/components/games/game-question.ts frontend/src/components/games/catch/catch-view.ts frontend/src/components/games/catch/catch-view.test.ts frontend/src/components/games/catch/catch-api.test.ts frontend/src/lib/mini-app.ts frontend/src/lib/mini-app.test.ts
git commit -m "#00355: feat:国旗キャッチの画面の設定(ゲームの種類・まちがえた国旗の絵)と、ミニゲームの一覧の1行を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク5: 画面（国旗のカード・共通ページ）（#00356）

**ファイル**
- 新規: `frontend/src/components/games/catch/catch-page.tsx`（`git mv` で、今の `app/games/catch/page.tsx` から移す）、`frontend/src/app/games/flag-catch/page.tsx`
- 変更: `frontend/src/app/games/catch/page.tsx`（新しく作り直す）、`catch-game.tsx`、`catch-select.tsx`、`catch-result.tsx`

**使うもの:** タスク4の `CATCH_MODES`・`CatchMode`・`answerImage`・`GameChoice.image`。この画面は見た目と動きの確認が中心なので、新しいテストは足さない（計算はタスク4でテスト済み）。

- [ ] **手順1: ページの中身を共通の部品に移す**

```bash
git mv frontend/src/app/games/catch/page.tsx frontend/src/components/games/catch/catch-page.tsx
```

`catch-page.tsx` を、次のとおり直す:

1. import: `import { CatchResult } from "@/components/games/catch/catch-result";` などの `@/components/games/catch/` の絶対パスは、そのままでよい。`import { CATCH_MODES, type CatchMode } from "@/components/games/catch/catch-view";` を足す。
2. `fetchSummary` を、窓口の道筋を受け取る形に: `async function fetchSummary(apiPath: string): Promise<...> {` と `const res = await apiFetch(apiPath);`。
3. `export default function CatchPage() {` を `export function CatchPageView({ mode }: { mode: CatchMode }) {` にし、先頭の `const router = useRouter();` の次の行に `const config = CATCH_MODES[mode];` を足す。
4. 呼び出しを変える:
   - `fetchSummary()` の3か所を `fetchSummary(config.apiPath)` に。最初の `useEffect` の依存は `[applySummary, config.apiPath]` に。
   - `apiFetch("/api/games/catch/plays", ...)` を ``apiFetch(`${config.apiPath}/plays`, ...)`` に。
   - ``apiFetch(`/api/games/catch/plays/${started.play_id}/finish`, ...)`` を ``apiFetch(`${config.apiPath}/plays/${started.play_id}/finish`, ...)`` に。
5. `<CatchSelect summary={summary} ... />` に `mode={mode}` を、`<CatchResult ... />` に `mode={mode}` を足す。
6. 先頭のコメント（`/** ミニゲーム1本目「スプルキャッチ」...`）に、「国旗版も、種類（mode）を変えて同じ部品で動かす」を足す。

`frontend/src/app/games/catch/page.tsx`（新しく作る）:

```tsx
import { CatchPageView } from "@/components/games/catch/catch-page";

/** ミニゲーム「スプルキャッチ（えいたんご）」(docs/design/2026-09-29-spru-catch-design.md 7章) */
export default function CatchPage() {
  return <CatchPageView mode="catch" />;
}
```

`frontend/src/app/games/flag-catch/page.tsx`:

```tsx
import { CatchPageView } from "@/components/games/catch/catch-page";

/** ミニゲーム「スプルキャッチ（こっき）」(docs/design/2026-10-05-flag-catch-design.md 6章) */
export default function FlagCatchPage() {
  return <CatchPageView mode="flag_catch" />;
}
```

- [ ] **手順2: 流れるカードに国旗の絵を出す**（`catch-game.tsx`）

言葉のカードの中の `<AutoFurigana text={choice.label} />`（1か所）を、次にする:

```tsx
                  {choice.image ? (
                    <span className="relative block h-12 w-full">
                      <Image src={choice.image} alt={choice.label} fill sizes="96px" className="object-contain" />
                    </span>
                  ) : (
                    <AutoFurigana text={choice.label} />
                  )}
```

（カードは高さ 64px・横は列の数で割った幅。国旗は、縦12・横いっぱいの枠に、切り取らず全体を入れる。`Image` は、すでに import されている。）

- [ ] **手順3: 選ぶ画面を、ゲームの種類で出し分ける**（`catch-select.tsx`）

1. props に `mode: CatchMode` を足し、import に `CATCH_MODES, type CatchMode` を `./catch-view` から足す（`CATCH_HOW_TO`・`CATCH_LOCKED_MESSAGE`・`CATCH_TITLE` の import は、使わなくなったら外す）。
2. 関数の先頭に `const config = CATCH_MODES[mode];` を足し、次を置き換える:
   - `{CATCH_TITLE}` → `{config.title}`
   - `<AutoFurigana text="落ちてくる答えを、スプルでキャッチしよう" />` → `<AutoFurigana text={config.intro} />`
   - `{CATCH_HOW_TO.map(` → `{config.howTo.map(`
   - `<AutoFurigana text={CATCH_LOCKED_MESSAGE} />` → `<AutoFurigana text={config.emptyMessage} />`
   - 「せかいへ」のボタン（`<Link href="/trip">...</Link>`）を `{config.emptyLink && (...)}` で包む。

- [ ] **手順4: 結果の画面に、まちがえた国旗の絵を出す**（`catch-result.tsx`）

1. props に `mode: CatchMode` を足し、import に `import Image from "next/image";` と、`CATCH_MODES, type CatchMode`（`./catch-view`）を足す。
2. 「まちがえた言葉」の見出し（`<AutoFurigana text="まちがえた言葉" />`）を `<AutoFurigana text={CATCH_MODES[mode].missedHeading} />` に。
3. 正解の言葉の表示（`<span><AutoFurigana text={word.answer} /></span>`）を、次にする:

```tsx
                {word.answerImage ? (
                  <span className="relative block aspect-[3/2] w-16 overflow-hidden rounded-sm border border-[#e8dfcf] bg-white">
                    <Image src={word.answerImage} alt={word.answer} fill sizes="64px" className="object-contain" />
                  </span>
                ) : (
                  <span>
                    <AutoFurigana text={word.answer} />
                  </span>
                )}
```

- [ ] **手順5: 通す**

実行: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
期待: すべて通る。

- [ ] **手順6: コミット**

```bash
git add frontend/src/components/games/catch frontend/src/app/games
git commit -m "#00356: feat:国旗キャッチの画面(流れる国旗のカード・選ぶ画面の出し分け・まちがえた国旗・共通ページ)を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク6: ドキュメント（#00357）

**ファイル**
- 変更: `SPEC.md`、`TASKS.md`

- [ ] **手順1:** `SPEC.md` の 4-4c に、国旗キャッチ（`/games/flag-catch`・国旗が流れる形・難しさごとの国〔初級は知名度1、中級は1・2、上級は全部＋似た国旗〕・専用の問題〔`FlagCatchPlanner`・`FlagQuizSeeder`・`meta.catch_only`〕・ごほうびは英語とは別に1日3回・サーバーは英語と共通の `CatchGame`・おさらいに出ない・レアな種の条件は英語のみ・分析の行）を書く。実装の状況（✅）は、ブラウザ確認のあとに付ける。
- [ ] **手順2:** `TASKS.md` の「Ownerの改善案（2026-10-04）」の ④ を完了にする（設計書・計画書へのリンクと日付）。「公開後に随時」に、このとき見つけた小さな点があれば足す。
- [ ] **手順3:** コミット

```bash
git add SPEC.md TASKS.md
git commit -m "#00357: docs:SPEC・TASKSに国旗キャッチを書く" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## 登録とブラウザでの確認（全タスクのあと）

Sail（`./vendor/bin/sail up -d`）と、開発サーバー（`cd frontend && npm run dev -- -p 3000`）が立っていることを確かめる。

1. **登録:** `./vendor/bin/sail artisan db:seed --class=FlagQuizSeeder`（足すだけ）。「国旗キャッチ: クイズ3・問題○」の出力を確かめる（国旗クイズの数は、これまでと同じ）。もう一度実行して、数が増えないことを確かめる。
2. **ミニゲームの一覧:** 町テスト（id 7）で `/learn` の引き出しを開く。ミニゲームに「スプルキャッチ（えいたんご）」と「スプルキャッチ（こっき）」の2つが、名前と説明つきで出る。
3. **選ぶ画面:** 「スプルキャッチ（こっき）」を押すと、国旗向けのあそびかたの3つの手順が出る。3つの難しさとも「はじめて」で選べる（鍵なし）。
4. **遊ぶ:** 初級で始める。3・2・1に「答えをタップ！」。上に「『日本』の国旗は？」が出て、国旗の絵が2つ流れる。国旗をタップすると、種が飛んで答えが決まる。◀▶で動かして受け取る遊び方も動く。まちがえると、正しい国旗が光る。中級（3列）・上級（4列・似た国旗）も、列の数と国旗の見え方を確かめる。10問を終えて、結果が出る（点数・ごほうび・まちがえた国旗の絵）。
5. **英語:** `/games/catch`（英語）も開いて、これまでどおり動くことを確かめる（選ぶ画面・遊べないときの文）。
6. **スマホ幅:** 幅390pxで、上級の4列が、はみ出さず、国旗が見えて、種の飛ぶ先が合うか。
7. 画像は `.playwright-mcp/` の下だけに、フォルダ名から書いて保存し、見たら消す。

## 確認のあとに戻すもの（開発データベース）

国旗キャッチの問題（クイズ3つ・問題約340）は、中身のデータなので**残す**。町テスト（id 7）の、遊んで増えた分（経験値・ポイント・HP・台帳・遊んだ回・問題の覚え具合・お使い・遊んだ時間など）を、基準（xp 20・coins 60・hp 20・points 95・level 1・bloom_base_level 1・best_streak 2・current_streak 2・last_played_date 2026-09-27・last_correct_on null・combo 3・best_combo 5・last_review_on null・reviews_completed 0・台帳の最大 668・memories 2・trips 0・plays 0・world_items 4・お使いの最大 57・レアな種なし・ステージの進み具合はステージ3のみ）に戻す。Ownerのプロフィール（id 2）には触らない。戻す前に、増えた行を見て、Ownerに伝える。確認のために旅の行などを足したときは、消す。

## 最後に

- 全タスクのあと、サーバーとフロントのテストを全部通し、`feature/flag-catch` の差分を**自分で見直す**（サブエージェントは使わない。見直しは作者本人が行うため、独立した目の見直しより弱い。マージの前に、Owner に伝える）。
- 見直しで出たCritical・Importantは1回だけ直す（直す前に、失敗するテストを書く）。軽いものは「あとで直す小さなこと」として最後の報告に書く。
- mainへのマージは、Owner に確認してから行う（マージのコミットは #00358）。pushはOwnerが行う。
