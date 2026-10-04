# ミニアプリの整理とスプルキャッチの改善 実装計画

> **実行する人へ:** 実行方法はネイティブ（サブエージェントは使わない決まりなので、インラインで1人が実装し、最後に自分で見直す）。テストを先に書き、失敗を見てから実装する。

**目標:** ミニアプリの引き出しに、動くものだけを出し（ミニゲーム／ミニクイズ）、スプルキャッチに説明と「タップで種を投げて先に答える」遊び方を足す。

**進め方:** サーバー（ミニクイズの一覧）→ ゲームの動き（種を投げる）→ 見た目の決まりと文 → 画面（ゲーム・選ぶ画面）→ 引き出し → ドキュメント。

**技術:** Laravel 13（Pest・MySQL・Sail）、Next.js 16・React 19・TypeScript、Vitest（画面の計算だけ。`environment: "node"`）。

**設計書:** `docs/design/2026-10-04-mini-app-tidy-design.md`

## 守ること（全タスク共通）

- 返答・ドキュメント・コミットは日本語。コミットは `#NNNNN: type:要約` と `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`。番号は **#00330 から**（計画の#00329の続き）。
- ブランチは `feature/mini-app-tidy`。mainへのマージは Owner に確認してから（`git merge --no-ff`）。pushはOwnerが行う（自動の許可判定で止められるため）。
- バックエンドのテストは `./vendor/bin/sail test`（`--parallel` なし）。結果のJSONで `"tool":"pest","result"` を探す。画面は `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`。
- `.env` は読まない・変えない・コミットしない。`migrate:fresh` は禁止。
- ブラウザ確認の画像は `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` の下だけに、**ファイル名を `.playwright-mcp/○○.png` のように、フォルダ名から書いて**保存し、見たら消す。確認用のログインは `test@example.com` / `password`。
- 子どもが読む文は `AutoFurigana` に通す。
- 並行して流れる待ち（`browser_wait_for` の並べ書き）は、並行して実行され、思ったより短くなる。時間が要る確認は、1回ずつ待つ。

## 見直しの観点（テストでは見にくい所を、最後に自分で確かめる）

1. 種を投げたあと、受け取る線に着いたときに、**もう一度答えが決まらない**か（1問に答えが2つ記録されない）
2. 投げた答えで、サーバーの採点（終えたときの採点し直し）が合うか（答えの並びが、受け取りのときと同じ形で送られる）
3. 幼児がまちがえて列をタップしたときの動き（答えが決まる）が、説明に書いてあるか
4. ミニクイズの一覧が、鍵の国のステージを数えず、問題のないステージも数えないか
5. 国旗・世界遺産が引き出しから消えても、各国のカード・学ぶタブからは、これまでどおり遊べるか

## 決めたこと（計画で確定）

- ゲームの画面は、毎フレーム描き直される（時間を進めるため）。タイマーを持つ部品（種の動き）は、親から渡される関数を ref に持って、タイマーを作り直さないようにする。

- ミニクイズの一覧は、プロフィールを選んでいないログイン済みのユーザーでも、200で返す（鍵の国は無いものとして数える。プロフィール未選択では、鍵の国の判定ができないため）。
- 種の飛ぶ動き（見た目）は、ゲームの状態には入れず、画面の中だけで持つ（答えには関係しないため）。出せなくても答えは決まる。
- 種を投げたときの、スプルの絵の切り替えは `spruPose(state)`（`catch-view.ts`）にまとめて、テストする。

## ファイルの全体像

**サーバー（新規）**
- `app/Support/MiniQuizzes.php`、`tests/Feature/MiniQuizzesTest.php`

**サーバー（変更）**
- `config/quiz.php`（`mini_quiz.min_stages`）、`routes/api.php`

**画面（新規）**
- `frontend/src/lib/mini-app.ts`（+test）

**画面（変更）**
- `frontend/src/components/games/catch/catch-engine.ts`（+test）、`catch-view.ts`（+test）、`catch-game.tsx`、`catch-select.tsx`
- `frontend/src/app/learn/page.tsx`

---

### タスク1: ミニクイズの一覧の窓口（#00330）

**ファイル**
- 新規: `app/Support/MiniQuizzes.php`、`tests/Feature/MiniQuizzesTest.php`
- 変更: `config/quiz.php`、`routes/api.php`

**渡すもの:** `MiniQuizzes::list(?UserProfile $profile): array`（`[{id, name, stage_count}]`）、`GET /api/mini-quizzes`、`config('quiz.mini_quiz.min_stages')`（初期値 3）。

- [ ] **手順1: 失敗するテストを書く**（`tests/Feature/MiniQuizzesTest.php`）

```php
<?php

use App\Models\Category;
use App\Models\Stage;
use App\Models\User;

/*
|--------------------------------------------------------------------------
| ミニクイズの一覧(docs/design/2026-10-04-mini-app-tidy-design.md 3章)
|--------------------------------------------------------------------------
*/

/** ステージを $stages 個持つカテゴリーを作る。$questions が偽なら、ステージに問題を入れない */
function miniQuizCategory(string $name, int $stages, array $options = []): Category
{
    $category = Category::create([
        'name' => $name,
        'parent_id' => $options['parent'] ?? null,
        'order' => $options['order'] ?? 0,
    ]);

    for ($number = 1; $number <= $stages; $number++) {
        $stage = Stage::create([
            'category_id' => $category->id,
            'country_id' => $options['country'] ?? null,
            'difficulty' => '初級',
            'stage_number' => $number,
        ]);

        if ($options['questions'] ?? true) {
            [$question] = createQuestionWithChoices();
            $stage->questions()->attach($question->id, ['order' => 1]);
        }
    }

    return $category;
}

it('問題のあるステージが3つ以上ある大もとのカテゴリーだけを、ステージの数つきで返す', function () {
    createActiveProfile();
    $enough = miniQuizCategory('英語を学ぶ', 3);
    miniQuizCategory('国旗', 2);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([
        ['id' => $enough->id, 'name' => '英語を学ぶ', 'stage_count' => 3],
    ]);
});

it('子のカテゴリーは出さない(大もとのカテゴリーのステージだけを数える)', function () {
    createActiveProfile();
    $parent = Category::create(['name' => '世界遺産']);
    miniQuizCategory('日本', 5, ['parent' => $parent->id]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([]);
});

it('問題のないステージは数えない', function () {
    createActiveProfile();
    miniQuizCategory('からっぽ', 5, ['questions' => false]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([]);
});

it('鍵の国のステージは数えない。着いたら数える', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    miniQuizCategory('アメリカのクイズ', 3, ['country' => $us->id]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([]);

    $profile->trips()->create(['destination' => 'us', 'arrived_at' => now()]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertJsonCount(1)->assertJsonPath('0.name', 'アメリカのクイズ');
});

it('カテゴリーの順番(order)で返す', function () {
    createActiveProfile();
    miniQuizCategory('あと', 3, ['order' => 2]);
    miniQuizCategory('さき', 3, ['order' => 1]);

    expect(collect($this->getJson('/api/mini-quizzes')->assertOk()->json())->pluck('name')->all())->toBe(['さき', 'あと']);
});

it('ステージの数のしきい値は、設定で変えられる', function () {
    createActiveProfile();
    miniQuizCategory('ひとつだけ', 1);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([]);

    config(['quiz.mini_quiz.min_stages' => 1]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertJsonCount(1);
});

it('プロフィールを選んでいないログイン済みのユーザーにも、一覧を返す', function () {
    miniQuizCategory('英語を学ぶ', 3);
    $this->actingAs(User::factory()->create())->withHeader('Referer', 'http://localhost');

    $this->getJson('/api/mini-quizzes')->assertOk()->assertJsonCount(1);
});

it('ログインしていないと401', function () {
    $this->getJson('/api/mini-quizzes')->assertStatus(401);
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/MiniQuizzesTest.php`
期待: 失敗（ルートがない）。

- [ ] **手順3: 設定・係・ルートを作る**

`config/quiz.php` の `'difficulties' => [...]` の下に足す:

```php
    /*
    |--------------------------------------------------------------------------
    | ミニアプリのミニクイズ(docs/design/2026-10-04-mini-app-tidy-design.md 3章)
    |--------------------------------------------------------------------------
    |
    | 引き出しに出すのは、問題のあるステージが min_stages 以上ある、大もとのカテゴリー。
    | 少なすぎて動いていないカテゴリーが、並ばないようにする。
    |
    */

    'mini_quiz' => [
        'min_stages' => 3,
    ],
```

`app/Support/MiniQuizzes.php`:

```php
<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Stage;
use App\Models\UserProfile;

/**
 * ミニアプリのミニクイズの一覧(docs/design/2026-10-04-mini-app-tidy-design.md 3章)。
 * 大もとのカテゴリー(parent_id が空)のうち、自分のステージで問題があるものが config('quiz.mini_quiz.min_stages') 以上あるものだけ。
 * 鍵の国のステージは数えない(ステージ一覧の窓口と同じ決まり)
 */
class MiniQuizzes
{
    /** @return list<array{id: int, name: string, stage_count: int}> */
    public static function list(?UserProfile $profile): array
    {
        $locked = Travel::lockedCountryIds($profile);

        $counts = Stage::query()
            ->whereHas('questions')
            ->when($locked !== [], fn ($query) => $query->where(
                fn ($query) => $query->whereNull('country_id')->orWhereNotIn('country_id', $locked),
            ))
            ->groupBy('category_id')
            ->selectRaw('category_id, count(*) as total')
            ->pluck('total', 'category_id');

        $min = (int) config('quiz.mini_quiz.min_stages');

        return Category::query()
            ->whereNull('parent_id')
            ->orderBy('order')
            ->orderBy('id')
            ->get()
            ->filter(fn (Category $category) => (int) ($counts[$category->id] ?? 0) >= $min)
            ->map(fn (Category $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'stage_count' => (int) $counts[$category->id],
            ])
            ->values()
            ->all();
    }
}
```

`routes/api.php`（`/categories` の近く。`use App\Support\MiniQuizzes;` を use の並びに足す）:

```php
// ミニアプリの引き出しに出すミニクイズ(docs/design/2026-10-04-mini-app-tidy-design.md 3章)
Route::middleware(['auth:sanctum'])->get('/mini-quizzes', fn (Request $request) => MiniQuizzes::list(ActiveProfile::find($request)))
    ->name('mini-quizzes.index');
```

- [ ] **手順4: 通す**

実行: `./vendor/bin/sail test tests/Feature/MiniQuizzesTest.php`
期待: すべて通る。

- [ ] **手順5: コミット**

```bash
git add config/quiz.php app/Support/MiniQuizzes.php routes/api.php tests/Feature/MiniQuizzesTest.php
git commit -m "#00330: feat:ミニアプリに出すミニクイズの一覧(問題のあるステージが3つ以上の大もとのカテゴリー)の窓口を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク2: 種を投げて答える（ゲームの動き）（#00331）

**ファイル**
- 変更: `frontend/src/components/games/catch/catch-engine.ts`、`catch-engine.test.ts`

**渡すもの:** `throwAt(state: CatchState, lane: number): CatchState`、`CatchState.lastVia: "line" | "throw" | null`、`THROW_POSE_MS`（300）。

- [ ] **手順1: 失敗するテストを書く**（`catch-engine.test.ts` の import に `throwAt`・`THROW_POSE_MS` を足し、末尾に追記）

```ts
describe("種を投げて答える", () => {
  const two = [question(1, ["正", "誤"]), question(2, ["正", "誤"])];

  it("落ちている間にタップした列の言葉で、すぐ答えが決まる(正解は点数とコンボが増える)", () => {
    const state = throwAt(createCatchGame(two, SETTINGS), 0);

    expect(state.phase).toBe("feedback");
    expect(state.lastCorrect).toBe(true);
    expect([state.score, state.combo, state.bestCombo, state.hearts]).toEqual([10, 1, 1, CATCH_HEARTS]);
    expect(state.caughtLane).toBe(0);
    expect(state.lastVia).toBe("throw");
    expect(state.answers).toEqual([{ questionId: 1, choiceId: 10, correct: true }]);
  });

  it("まちがいは、点数なし・コンボが戻る・ハートが1つ減る", () => {
    const state = throwAt(createCatchGame(two, SETTINGS), 1);

    expect([state.lastCorrect, state.score, state.combo, state.hearts]).toEqual([false, 0, 0, CATCH_HEARTS - 1]);
    expect(state.answers).toEqual([{ questionId: 1, choiceId: 11, correct: false }]);
  });

  it("言葉の高さは、投げた瞬間のまま止まる。スプルの列は動かない", () => {
    let state = createCatchGame(two, SETTINGS);
    state = tick(state, 100); // 0.1 落ちる
    const thrown = throwAt(state, 1);

    expect(thrown.progress).toBe(state.progress);
    expect(thrown.lane).toBe(state.lane);
  });

  it("○×を見せたあと、次の問題へ進み、スプルは同じ列から始まる。投げた答えは1つだけ記録される", () => {
    const next = endFeedback(throwAt(createCatchGame(two, SETTINGS), 0));

    expect(next.index).toBe(1);
    expect(next.phase).toBe("falling");
    expect(next.lastVia).toBeNull();
    expect(next.answers).toHaveLength(1);
  });

  it("投げたあとは、受け取る線に着いても、もう一度は決まらない", () => {
    let state = throwAt(createCatchGame(two, SETTINGS), 0);
    for (let i = 0; i < 20; i++) state = tick(state, 100); // 余裕を持って進める(○×のあと、2問目が落ち始める)

    expect(state.answers.filter((a) => a.questionId === 1)).toHaveLength(1);
  });

  it("受け取る線で決まったときは、lastVia が line", () => {
    const state = fallToLine(createCatchGame(two, SETTINGS));

    expect(state.lastVia).toBe("line");
  });

  it("落ちていない間(○×を見せている・終わった)・範囲外の列・小数の列は、何も起きない", () => {
    const feedback = throwAt(createCatchGame(two, SETTINGS), 0);
    expect(throwAt(feedback, 1)).toBe(feedback);

    const falling = createCatchGame(two, SETTINGS);
    expect(throwAt(falling, -1)).toBe(falling);
    expect(throwAt(falling, 2)).toBe(falling);
    expect(throwAt(falling, 0.5)).toBe(falling);

    const done = createCatchGame([], SETTINGS);
    expect(throwAt(done, 0)).toBe(done);
  });

  it("最後の問題や、ハートが0になった投げ方でも、○×のあとに終わる", () => {
    const last = endFeedback(throwAt(createCatchGame([question(1, ["正", "誤"])], SETTINGS), 0));
    expect(last.phase).toBe("done");

    let state = createCatchGame([1, 2, 3, 4].map((id) => question(id, ["正", "誤"])), SETTINGS);
    for (let i = 0; i < 3; i++) state = endFeedback(throwAt(state, 1)); // 3回まちがえる
    expect([state.hearts, state.phase]).toEqual([0, "done"]);
  });

  it("投げて答えた並びの点数は、受け取りで答えたときの採点と同じ(サーバーの採点し直しと合う)", () => {
    let state = createCatchGame([1, 2, 3].map((id) => question(id, ["正", "誤"])), SETTINGS);
    state = endFeedback(throwAt(state, 0));
    state = endFeedback(throwAt(state, 0));
    state = endFeedback(throwAt(state, 1));

    expect(scoreOf(state.answers.map((a) => a.correct))).toEqual({ score: state.score, bestCombo: state.bestCombo });
  });

  it("投げたあとの、スプルの投げる絵の時間は 300ms", () => {
    expect(THROW_POSE_MS).toBe(300);
  });
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `cd frontend && npx vitest run src/components/games/catch/catch-engine.test.ts`
期待: 失敗（`throwAt` がない）。

- [ ] **手順3: 実装する**（`catch-engine.ts`）

`CatchState` に項目を足す（`lastCorrect` の下）:

```ts
  /** 最後の答えの決まり方。線(受け取る線で決まった)か、投げた(タップで決めた)か。見た目にだけ使う */
  lastVia: CatchVia | null;
```

型と定数を足す（`GrowthStage` の下あたり）:

```ts
export type CatchVia = "line" | "throw";

/** 種を投げたあと、スプルが投げる絵でいる時間(ミリ秒) */
export const THROW_POSE_MS = 300;
```

`createCatchGame` の返す値に `lastVia: null,` を足し、`catchAtLine` を `settle` にまとめて、`throwAt` を足す:

```ts
/** 答えを決める(受け取る線でも、投げたときでも同じ決まり)。progress は、決まった高さ */
function settle(state: CatchState, lane: number, progress: number, via: CatchVia): CatchState {
  const question = state.questions[state.index];
  const choice = question.choices[lane];
  const correct = choice.id === question.correctChoiceId;
  const combo = correct ? state.combo + 1 : 0;

  return {
    ...state,
    progress,
    phase: "feedback",
    feedbackMs: correct ? FEEDBACK_MS.correct : FEEDBACK_MS.wrong,
    caughtLane: lane,
    lastCorrect: correct,
    lastVia: via,
    score: state.score + pointsFor(correct, combo),
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    hearts: correct ? state.hearts : state.hearts - 1,
    answers: [...state.answers, { questionId: question.id, choiceId: choice.id, correct }],
  };
}

function catchAtLine(state: CatchState): CatchState {
  return settle(state, state.lane, 1, "line");
}

/**
 * 落ちている言葉をタップして、スプルが種を投げて答える(docs/design/2026-10-04-mini-app-tidy-design.md 4-1)。
 * 落ちている間だけ。どの高さでも投げられ、言葉はその高さで止まる。スプルの列は動かさない
 */
export function throwAt(state: CatchState, lane: number): CatchState {
  if (state.phase !== "falling" || !Number.isInteger(lane) || lane < 0 || lane >= state.settings.lanes) return state;
  return settle(state, lane, state.progress, "throw");
}
```

`advance` の、次の問題へ進むときの返す値に `lastVia: null,` を足す（`lastCorrect: null,` の隣）。

- [ ] **手順4: 通す。画面全体のテストも通す**

実行: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
期待: すべて通る（`CatchState` に項目が増えるので、`catch-view.test.ts` などで状態を直接作っている所があれば、`lastVia: null` を足す）。

- [ ] **手順5: コミット**

```bash
git add frontend/src/components/games/catch/catch-engine.ts frontend/src/components/games/catch/catch-engine.test.ts
git commit -m "#00331: feat:スプルキャッチで、落ちている言葉をタップして種を投げて、先に答えられるようにする(ゲームの動き)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク3: スプルの絵の決まり・説明の文・ゲームの一覧（#00332）

**ファイル**
- 新規: `frontend/src/lib/mini-app.ts`、`frontend/src/lib/mini-app.test.ts`
- 変更: `frontend/src/components/games/catch/catch-view.ts`、`catch-view.test.ts`

**渡すもの（`catch-view.ts`）:** `spruPose(state): "back" | "throw" | "cheer" | "sad"`、`CATCH_TITLE`（"スプルキャッチ（えいたんご）"）、`CATCH_HOW_TO`（3つの手順の文）、`CATCH_TAP_HINT`（"答えをタップ！"）、`CATCH_MOVE_HINT`（"◀▶でスプルを動かしても取れるよ"）。**（`lib/mini-app.ts`）:** `MINI_GAMES`（`{ key, title, description, href }` の一覧）、`type MiniQuiz = { id: number; name: string; stage_count: number }`、`MINI_QUIZ_EMPTY`（"ミニクイズは、じゅんびちゅうだよ"）。

- [ ] **手順1: 失敗するテストを書く**

`catch-view.test.ts` に追記（import に `spruPose`・`CATCH_TITLE`・`CATCH_HOW_TO`・`CATCH_TAP_HINT`・`CATCH_MOVE_HINT` を足す。状態を作る補助は、そのファイルの既存のものを使う。無ければ `createCatchGame` と `throwAt`・`tick` で作る）:

```ts
describe("spruPose", () => {
  const questions = [1, 2].map((id) => ({
    id,
    prompt: `「w${id}」の意味は？`,
    choices: [
      { id: id * 10, label: "正" },
      { id: id * 10 + 1, label: "誤" },
    ],
    correctChoiceId: id * 10,
  }));
  const settings = { lanes: 2, fallMs: 1000 };

  it("落ちている間は、後ろ姿(back)", () => {
    expect(spruPose(createCatchGame(questions, settings))).toBe("back");
  });

  it("種を投げた直後の300msは、投げる絵(throw)。そのあとは、正解なら cheer・まちがいなら sad", () => {
    const right = throwAt(createCatchGame(questions, settings), 0);
    expect(spruPose(right)).toBe("throw"); // 800ms 残り(正解の○×は800ms)
    expect(spruPose(tick(right, 100))).toBe("throw"); // 700ms 残り
    expect(spruPose(tick(tick(right, 100), 100))).toBe("throw"); // 600ms 残り
    expect(spruPose(tick(tick(tick(right, 100), 100), 100))).toBe("cheer"); // 500ms 残り(300ms たったので、喜びに変わる)

    const wrong = throwAt(createCatchGame(questions, settings), 1);
    expect(spruPose(wrong)).toBe("throw");
    let later = wrong;
    for (let i = 0; i < 4; i++) later = tick(later, 100); // 1600 → 1200ms 残り
    expect(spruPose(later)).toBe("sad");
  });

  it("受け取る線で決まったときは、投げる絵にならず、すぐ cheer か sad", () => {
    let state = createCatchGame(questions, settings);
    while (state.phase === "falling") state = tick(state, 100);

    expect(spruPose(state)).toBe(state.lastCorrect ? "cheer" : "sad");
  });
});

describe("説明の文", () => {
  it("名前は「スプルキャッチ（えいたんご）」、あそびかたは3つの手順、ヒントは2つ", () => {
    expect(CATCH_TITLE).toBe("スプルキャッチ（えいたんご）");
    expect(CATCH_HOW_TO).toHaveLength(3);
    expect(CATCH_HOW_TO.every((line) => line.length > 0)).toBe(true);
    expect(CATCH_TAP_HINT).toBe("答えをタップ！");
    expect(CATCH_MOVE_HINT).toContain("◀▶");
  });
});
```

`lib/mini-app.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { MINI_GAMES, MINI_QUIZ_EMPTY } from "./mini-app";

describe("ミニゲームの一覧", () => {
  it("スプルキャッチ（えいたんご）が入っていて、名前・説明・行き先がある", () => {
    const catchGame = MINI_GAMES.find((game) => game.key === "catch");

    expect(catchGame).toMatchObject({ title: "スプルキャッチ（えいたんご）", href: "/games/catch" });
    expect(catchGame?.description).toContain("英語");
  });

  it("どのゲームも、名前・説明があり、行き先は /games/ で始まり、重ならない", () => {
    for (const game of MINI_GAMES) {
      expect(game.title.length).toBeGreaterThan(0);
      expect(game.description.length).toBeGreaterThan(0);
      expect(game.href.startsWith("/games/")).toBe(true);
    }
    expect(new Set(MINI_GAMES.map((game) => game.key)).size).toBe(MINI_GAMES.length);
    expect(new Set(MINI_GAMES.map((game) => game.href)).size).toBe(MINI_GAMES.length);
  });

  it("ミニクイズが無いときの文", () => {
    expect(MINI_QUIZ_EMPTY).toBe("ミニクイズは、じゅんびちゅうだよ");
  });
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `cd frontend && npx vitest run src/components/games/catch/catch-view.test.ts src/lib/mini-app.test.ts`
期待: 失敗。

- [ ] **手順3: 実装する**

`catch-view.ts` に足す（import に `FEEDBACK_MS`・`THROW_POSE_MS` を `./catch-engine` から足す）:

```ts
export const CATCH_TITLE = "スプルキャッチ（えいたんご）";

/** 難しさを選ぶ画面の「あそびかた」(docs/design/2026-10-04-mini-app-tidy-design.md 4-3) */
export const CATCH_HOW_TO = [
  "問題が上に出るよ",
  "答えの言葉をタップ！スプルが種を投げてキャッチするよ",
  "10問やってみよう。ハートは3つ",
] as const;

export const CATCH_TAP_HINT = "答えをタップ！";
export const CATCH_MOVE_HINT = "◀▶でスプルを動かしても取れるよ";

export type SpruPose = "back" | "throw" | "cheer" | "sad";

/** スプルの絵の決まり。落ちている間は後ろ姿。種を投げた直後の少しの間は投げる絵。そのあとは正解なら喜び・まちがいならがっかり */
export function spruPose(state: CatchState): SpruPose {
  if (state.phase !== "feedback") return "back";
  if (state.lastVia === "throw") {
    const total = state.lastCorrect ? FEEDBACK_MS.correct : FEEDBACK_MS.wrong;
    if (state.feedbackMs > total - THROW_POSE_MS) return "throw";
  }
  return state.lastCorrect ? "cheer" : "sad";
}
```

`lib/mini-app.ts`:

```ts
// ミニアプリの引き出しの中身(docs/design/2026-10-04-mini-app-tidy-design.md 5章)。画面を描かない部分だけをここに置く

/** ミニゲームの一覧。ゲームを増やすときは、ここに1行足す */
export const MINI_GAMES = [
  {
    key: "catch",
    title: "スプルキャッチ（えいたんご）",
    description: "落ちてくる英語の答えを、スプルがキャッチ！",
    href: "/games/catch",
  },
] as const;

/** GET /api/mini-quizzes の1件 */
export type MiniQuiz = { id: number; name: string; stage_count: number };

export const MINI_QUIZ_EMPTY = "ミニクイズは、じゅんびちゅうだよ";
```

- [ ] **手順4: 通す**

実行: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
期待: すべて通る。

- [ ] **手順5: コミット**

```bash
git add frontend/src/lib/mini-app.ts frontend/src/lib/mini-app.test.ts frontend/src/components/games/catch/catch-view.ts frontend/src/components/games/catch/catch-view.test.ts
git commit -m "#00332: feat:スプルの絵の決まり(種を投げる絵)と、あそびかたの文・ミニゲームの一覧を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク4: ゲームと選ぶ画面（タップで種を投げる・説明）（#00333）

**ファイル**
- 変更: `frontend/src/components/games/catch/catch-game.tsx`、`catch-select.tsx`

**使うもの:** タスク2・3の `throwAt`・`spruPose`・`CATCH_*`。この画面は見た目と動きの確認が中心なので、新しいテストは足さない（計算は、タスク2・3でテスト済み）。

- [ ] **手順1: ゲームの画面を直す**（`catch-game.tsx`）

1. import に `throwAt`（`./catch-engine`）、`spruPose`・`CATCH_TAP_HINT`・`CATCH_MOVE_HINT`（`./catch-view`）、`GROWTH_IMAGES`（`@/components/spru/spru-assets`）を足す。`moveTo` は使わなくなるので、import から外す。
2. `spruImage(state)` を、`spruPose` を使う形に置き換える:

```tsx
const POSE_IMAGE: Record<SpruPose, SpruImage> = {
  back: OUTING_IMAGES.back,
  throw: SPRU_IMAGES["sow-fly"],
  cheer: SPRU_IMAGES.cheer,
  sad: SPRU_IMAGES.sad,
};
```

（`SpruPose` 型を `./catch-view` から import）。`const spru = POSE_IMAGE[spruPose(state)];` にする。
3. 種の動き（見た目だけ）を足す。

```tsx
type SeedFlight = { key: number; from: { x: number; y: number }; to: { x: number; y: number } };
```

`CatchGame` の中に:

```tsx
  const arenaRef = useRef<HTMLDivElement>(null);
  const spruRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef(state);
  const seedKey = useRef(0);
  const [seed, setSeed] = useState<SeedFlight | null>(null);

  useEffect(() => {
    latestRef.current = state;
  }, [state]);

  /** 落ちている言葉をタップして、スプルが種を投げて答える。種の動きは見た目だけで、出せなくても答えは決まる */
  const throwSeed = (lane: number) => {
    if (pausedRef.current || latestRef.current.phase !== "falling") return;

    const arena = arenaRef.current?.getBoundingClientRect();
    const card = arenaRef.current?.querySelector<HTMLElement>(`[data-lane="${lane}"]`)?.getBoundingClientRect();
    const spruBox = spruRef.current?.getBoundingClientRect();
    if (arena && card && spruBox) {
      setSeed({
        key: ++seedKey.current,
        from: { x: spruBox.left - arena.left + spruBox.width / 2, y: spruBox.top - arena.top },
        to: { x: card.left - arena.left + card.width / 2, y: card.top - arena.top + card.height / 2 },
      });
    }
    setState((current) => throwAt(current, lane));
  };
```

4. 見えない列のボタンを、「その列の言葉で答える」に変える（`move` 関数と、`aria-label={`${lane + 1}列目へ動く`}` を置き換え）:

```tsx
              <button
                key={lane}
                type="button"
                aria-label={`${lane + 1}列目の言葉で答える`}
                onClick={() => throwSeed(lane)}
                className={cn("h-full flex-1", lane > 0 && "border-l-2 border-dashed border-white/70")}
              />
```

5. 場の外側の `div`（`relative flex-1 overflow-hidden ...`）に `ref={arenaRef}` を付け、言葉のカードに `data-lane={lane}` を付ける。スプルの `div`（`pointer-events-none absolute bottom-0 ...`）に `ref={spruRef}` を付ける。
6. 場の中（スプルの `div` のあと）に、種の動きを足す:

```tsx
          {seed && <SeedFlightView key={seed.key} flight={seed} onDone={() => setSeed(null)} />}
```

ファイルの下（`CatchGame` の外）に部品を足す:

```tsx
const SEED_PX = 28;
const SEED_MS = 280;

/**
 * スプルから言葉へ飛ぶ種。動きだけの部品(見た目のみ)。ゲームの画面は毎フレーム描き直されるので、
 * 終わったときの呼び出しは ref に持ち、タイマーを作り直さない
 */
function SeedFlightView({ flight, onDone }: { flight: SeedFlight; onDone: () => void }) {
  const [go, setGo] = useState(false);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => setGo(true));
    const done = setTimeout(() => doneRef.current(), SEED_MS + 120);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(done);
    };
  }, []);

  const point = go ? flight.to : flight.from;
  const image = GROWTH_IMAGES["spru/seed"];

  return (
    <Image
      src={image.src}
      alt=""
      width={SEED_PX}
      height={Math.round((SEED_PX * image.height) / image.width)}
      className="pointer-events-none absolute z-10"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${point.x - SEED_PX / 2}px, ${point.y - SEED_PX / 2}px)`,
        transition: `transform ${SEED_MS}ms ease-out`,
      }}
    />
  );
}
```

7. 3・2・1の画面に、数字の下へ `CATCH_TAP_HINT` を出す:

```tsx
              <p className="mt-2 rounded-full bg-white/80 px-4 py-1 text-base font-black text-[#3b3226]">
                <AutoFurigana text={CATCH_TAP_HINT} />
              </p>
```

（カウントダウンの `<p key={countdown} ...>` を `div` で包み、縦に並べる。）
8. ◀▶ボタンの上に、小さく `CATCH_MOVE_HINT` を出す:

```tsx
        <p className="mt-2 text-center text-xs font-bold text-[#3b3226]/80">
          <AutoFurigana text={CATCH_MOVE_HINT} />
        </p>
```

- [ ] **手順2: 選ぶ画面を直す**（`catch-select.tsx`）

見出しを `CATCH_TITLE` にし、`AutoFurigana` の説明文のすぐ下に、あそびかたの枠を足す:

```tsx
      <ol className="flex w-full flex-col gap-2 rounded-3xl bg-[#fffaf0] p-4 text-left text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
        <li className="text-sm font-black">
          <AutoFurigana text="あそびかた" />
        </li>
        {CATCH_HOW_TO.map((line, index) => (
          <li key={line} className="flex gap-2 text-sm font-bold">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5bb33e] text-xs font-black text-white">{index + 1}</span>
            <span>
              <AutoFurigana text={line} />
            </span>
          </li>
        ))}
      </ol>
```

import に `CATCH_HOW_TO`・`CATCH_TITLE` を `./catch-view` から足す。

- [ ] **手順3: 通す**

実行: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
期待: すべて通る。

- [ ] **手順4: コミット**

```bash
git add frontend/src/components/games/catch/catch-game.tsx frontend/src/components/games/catch/catch-select.tsx
git commit -m "#00333: feat:スプルキャッチで、言葉をタップして種を投げて答えられるようにし、あそびかたとヒントを足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク5: ミニアプリの引き出し（#00334）

**ファイル**
- 変更: `frontend/src/app/learn/page.tsx`

**使うもの:** タスク1の `GET /api/mini-quizzes`、タスク3の `MINI_GAMES`・`MiniQuiz`・`MINI_QUIZ_EMPTY`。

- [ ] **手順1: 直す**

1. `Category` 型と `categories` の state、`Promise.all` の中の `apiFetch("/api/categories")`、`rootCategories` を、次に置き換える:
   - `const [miniQuizzes, setMiniQuizzes] = useState<MiniQuiz[] | null>(null);`
   - 国の取得と並べて `apiFetch("/api/mini-quizzes")`（失敗したら `setMiniQuizzes([])`）
   - `tileVariants` はそのまま使う。
2. 引き出しの中身を、次の形にする:
   - 見出し「ミニゲーム」→ `MINI_GAMES` を、名前と1行の説明つきのボタンで並べる（`Link` → `href`、`AppButton variant="warning"`、名前は `AutoFurigana`、説明は小さい字）
   - 見出し「ミニクイズ」→ `miniQuizzes` が `null` なら「読み込み中...」、空なら `MINI_QUIZ_EMPTY`、あれば今までのタイル（`/play/{id}`、`name`）を並べる
3. 使わなくなった import・型を消す。

- [ ] **手順2: 通す**

実行: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
期待: すべて通る。

- [ ] **手順3: コミット**

```bash
git add frontend/src/app/learn/page.tsx
git commit -m "#00334: feat:ミニアプリの引き出しを、ミニゲーム(説明つき)とミニクイズ(動くものだけ)に整理する" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク6: ドキュメント（#00335）

**ファイル**
- 変更: `SPEC.md`、`TASKS.md`

- [ ] **手順1:** `SPEC.md` の 4-4c（ミニゲーム）に、ミニアプリの引き出し（ミニゲームの一覧・ミニクイズの出す条件〈問題のあるステージが3つ以上・大もとのカテゴリー・鍵の国は数えない・`GET /api/mini-quizzes`・`config('quiz.mini_quiz.min_stages')`〉）と、スプルキャッチの種を投げる遊び方（タップ＝答えを決める・◀▶で動かして受け取る遊び方も残る・点数などは変わらない）、説明（あそびかた・ヒント）を書く。
- [ ] **手順2:** `TASKS.md` の「Ownerの改善案（2026-10-04）」の ①② を完了にする（設計書・計画書へのリンクと日付）。③④は残す。「公開後に随時」に、このとき見つけた小さな点があれば足す。
- [ ] **手順3:** コミット

```bash
git add SPEC.md TASKS.md
git commit -m "#00335: docs:SPEC・TASKSにミニアプリの整理とスプルキャッチの改善を書く" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## ブラウザでの確認（全タスクのあと）

Sail（`./vendor/bin/sail up -d`）と、開発サーバー（`cd frontend && npm run dev -- -p 3000`）を立てておく。

1. **引き出し**: `/learn` を開いて、右端の ◀ から引き出しを開く。「ミニゲーム」に、スプルキャッチ（えいたんご）が、名前と説明つきで出る。「ミニクイズ」には、「英語を学ぶ」だけが並び、「国旗」「世界遺産」などは出ない。
2. **あそびかた**: ミニゲームを押すと、難しさを選ぶ画面の上に、あそびかたの3つの手順が出る。
3. **遊ぶ**: スプルキャッチが遊べるプロフィール（アメリカかイギリスに着いたプロフィール。町テスト id 7 は旅の記録が無いので、確認用に旅の行を足し、確認のあとで消す）で、
   - 3・2・1の画面に「答えをタップ！」が出る
   - 落ちている言葉をタップすると、スプルが種を投げる絵になり、種が言葉へ飛び、すぐ○×が出て、次の問題へ進む
   - ◀▶ボタンでスプルを動かして、受け取る線で受け取る遊び方も動く
   - 10問を終えると、結果が出て、点数・ごほうびがサーバーの採点と合う（結果の画面の点数と、遊んだ回の記録）
4. 画像は `.playwright-mcp/` の下だけに、フォルダ名から書いて保存し、見たら消す。

## 確認のあとに戻すもの（開発データベース）

町テスト（id 7）の基準（xp 20・coins 60・hp 20・points 95・level 1・best_streak 2・current_streak 2・last_played_date 2026-09-27・combo 3・best_combo 5・last_review_on null・reviews_completed 0・台帳の最大 668・trips 0・plays 0）に戻す。スプルキャッチで遊ぶと、台帳・経験値・ポイント・遊んだ回が増えるので、遊ぶ確認の前に、これらの値を控えておくか、遊ぶ確認は町テスト以外のプロフィールで行う（町テスト以外は、基準を決めていない）。町テストで遊んだ場合は、確認のあとに、遊んだ回・台帳の増えた行・旅の行・値を、基準へ戻す（元に戻す前に、差を見て、Ownerに伝える）。

## 最後に

- 全タスクのあと、サーバーとフロントのテストを全部通し、`feature/mini-app-tidy` の差分を**自分で見直す**（サブエージェントは使わない。見直しは作者本人が行うため、独立した目の見直しより弱い。マージの前に、Owner に伝える）。
- 見直しで出たCritical・Importantは1回だけ直す（直す前に、失敗するテストを書く）。軽いものは「あとで直す小さなこと」として最後の報告に書く。
- mainへのマージは、Owner に確認してから行う。pushはOwnerが行う。
