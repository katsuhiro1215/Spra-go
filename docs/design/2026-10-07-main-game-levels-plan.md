# メインゲームの作り直し 実装計画

> 実行する人へ: 実行方法はネイティブ（サブエージェントは使わない。CEOがインラインで実装し、最後に自分で見直す）。各ステップは `- [ ]` で追う。テストを先に書き、失敗を見てから実装する（RED → GREEN）。

**目的:** 国レベル・言語コース・長いステージ（各級10ステージ）・歩くスプルのステージの道を作る。

**設計書:** `docs/design/2026-10-07-main-game-levels-design.md`（Owner合意済み。3章・9章が決定事項）

**技術:** Laravel 13（Pest・Sail）、Next.js 16（Vitest）。MySQL。

**ブランチ:** `feature/main-game-levels`。計画のコミットは #00476、タスクは #00477 から。Effort は実装中 Medium でよい（最後の見直しだけ Opus）。

## 全体の決まり

- テスト: サーバー `./vendor/bin/sail test`、画面 `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`。
- 開発DBは `migrate:fresh` を使わない（`migrate` と `db:seed`／各コマンドのみ）。ブラウザ確認でプロフィールを触ったら、確認後に元に戻す（確認前に、そのプロフィールのxp・coins・hp・points・level・streak・combo、台帳・覚え具合・遊んだ日・進み具合・称号の最大の番号を控える）。
- 新しい単漢字をふりがな辞書に足さない。コメントは理由が分かりにくい所に1行だけ。
- コミット: `#番号: type:要約`。末尾に `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`。
- 既存テストで、「1問でも終えればクリア・報酬が出る」前提のものは、タスク2で `score` を直す（下のタスク2に一覧の探し方がある）。

## 計画時の判断

1. **「国のコース」を決めるもの**: 国に結びついた `国旗 > {国名}` のカテゴリー（ルートは `config('courses.country_root')` ＝ `国旗`）を、その国の**メインの道**とする。世界遺産などの別カテゴリーは、今回はレベル・スタンプ・チケットの数に入れず、画面にも出さない（今も、同じ番号で並んで片方しか出ない不具合がある）。費用: 世界遺産の内容は、別の道を作るまで遊べない。
2. **コースの作り方は、インポートを変えず「並べ直しコマンド」**: `content:import` は今まで通り（国旗の4ステージ＋ボス）。そのあとに `php artisan course:build` が、国・言語ごとに、ステージを10に並べ直す（問題はプールとして全ステージにつなぐ）。理由: 元のJSONを全部書き換えずに済み、内容を足してもコマンドを再実行するだけで反映できる。費用: インポートのあとに、必ず `course:build` を実行する（README に書く）。
3. **近道の「正答率」は、ステージの記録（`best_score` ÷ 出した数）で数える**: 答えごとの記録は、級ごとに残していないため。条件は、前の級で遊んだステージの合計正答率が50%を超え、かつ3ステージ以上遊んでいること（1回のまぐれで開かないように。`config('quiz.shortcut')` で変える）。
4. **ステージクリアの報酬は、クリアしたときだけ出す**: 今は遊べば毎回出る。クリア率に届かなければ、報酬なし・やり直し。
5. **言語コースがまだない言語（フランス語など）は、言語のボタンを出さない**（ステージが1つもないため）。

## 変更するファイルの地図

| ファイル | 内容 |
|---|---|
| `config/world.php`・`routes/api.php`（答え） | HPの消費（正解0・不正解−1） |
| `config/quiz.php` | `clear_percent`・`shortcut` |
| `app/Models/Stage.php` | `isCleared`（率）・鍵の判定（近道） |
| `routes/api.php`（complete・stages・countries・passport） | クリア率・報酬・近道・言語・レベル |
| `app/Support/Travel.php` | チケット（メインの道のボスだけ） |
| `config/courses.php`（新） | 国のコースの既定値・メインの道のルート・言語の対応 |
| `database/data/country-courses.php`（新） | 国ごとのステージ数・問題数 |
| `app/Support/CoursePoolBuilder.php`・`app/Console/Commands/BuildCoursesCommand.php`（新） | 並べ直し |
| `app/Support/CourseLevels.php`（新） | 国レベル・言語レベル |
| `database/migrations/2026_10_08_000001_add_home_country_to_user_schemas_table.php`（新） | 母国 |
| `frontend/src/lib/stage-map.ts`・`components/app/stage-map.tsx`（新） | ステージの道 |
| `frontend/src/app/travel/[countryId]/**`・`passport/page.tsx`・`quiz/[stageId]/page.tsx` | 画面 |

---

## 段階1: ステージとクリアの仕組み

### タスク1（#00477）: HPの消費

**ファイル:** `config/world.php`、`routes/api.php`（答えの処理 `1325` 付近）。テスト `tests/Feature/AnswerHpTest.php`（新。なければ既存のHPのテストに足す）。

- [ ] **1. 失敗するテストを書く:** 正解でHPが減らない／不正解でHPが1減る／HPが0なら答えられない（今のまま）。
- [ ] **2. 失敗を確認 → 実装:** `config/world.php` に `'hp' => ['correct' => 0, 'wrong' => -1]` を足し、`['hp' => -1, ...]`（正解）を `config('world.hp.correct')`、`['hp' => -2]`（不正解）を `config('world.hp.wrong')` に。正解のとき `hp` が0なら `applyEconomy` に渡さない（台帳に0行を作らない。`applyEconomy` は0を飛ばす）。
- [ ] **3. 既存のHPに触れるテスト（`grep -rln "answer_wrong\|'hp'" tests`）を、新しい数に直す → 全体のテスト → コミット。**

### タスク2（#00478）: クリア率

**ファイル:** `config/quiz.php`、`routes/api.php`（`complete`）。テスト `tests/Feature/StageClearTest.php`（新）。既存テストの `score` の修正。

**設定:** `'clear_percent' => ['normal' => 60, 'boss' => 80]`。

**振る舞い:** `complete` は、`$passed = $score >= ceil($stage->playCount() * pct / 100)`。`profile_stage_progress` は、`attempts` と `best_score` を毎回更新し、`cleared_at` は `$passed` のときだけ付ける（すでに付いていれば消さない）。ステージクリアの報酬（コイン・ポイント）は `$passed` のときだけ（`reward_percent` はそのまま）。称号は、今まで通り `$score === playCount()`。返事に `cleared`（今回クリアしたか）・`required`（クリアに必要な正解数）を足す。

- [ ] **1. 失敗するテストを書く:** 10問の通常ステージで、5正解は未クリア（`cleared_at` なし・報酬なし・`best_score` は5）／6正解でクリア／ボス（10問）は7正解で未クリア・8正解でクリア／称号は全問正解のときだけ／未クリアのあとにクリアすると `cleared_at` が付く／一度クリアしたあとの低い点で `cleared_at` は消えない。
- [ ] **2. 失敗を確認 → 実装。**
- [ ] **3. 既存テストの修正:** `grep -rn "stages/.*complete" tests` で、`score` が小さい（`1` など）のに、クリアや報酬・チケット・称号・パスポートを確かめているテストを探し、`score` を満点（出す数）にする。`StageDrawTest`（報酬の割合のテスト）も、満点で投げる。
- [ ] **4. 全体のテスト → コミット。**

### タスク3（#00479）: 級の鍵と近道

**ファイル:** `app/Models/Stage.php`、`routes/api.php`（`/categories/{id}/stages`・`/countries/{id}`・`/regions/{id}` の3か所。`grep -rn isDifficultyLocked routes app`）、`config/quiz.php`。テスト `tests/Feature/DifficultyLockTest.php`（既存）に追記。

**設定:** `'shortcut' => ['percent' => 50, 'min_stages' => 3]`。

**振る舞い:** `Stage::isDifficultyLocked(Collection $stagesByDifficulty, string $difficulty, array $clearedStageIds, array $bestScores = [])`（新しい引数 `$bestScores`: ステージの番号 → `best_score`、遊んだことのあるステージだけ）。前の級のボスをクリア済みなら開く（今のまま）。そうでなくても、前の級で遊んだステージが `min_stages` 以上あり、その `best_score` の合計 ÷ `playCount()` の合計が `percent` を**超える**なら開く。呼び出し側3か所で `$bestScores`（`profile_stage_progress.best_score` のうち、遊んだもの）を渡す。

- [ ] **1. 失敗するテストを書く:** 前の級のボス未クリアでも、3ステージ以上・合計正答率51%で次の級が開く／50%ちょうどは開かない／2ステージだけでは開かない／ボスクリア済みなら、正答率が低くても開く（今のまま）／最高難易度の鍵（上級のボス）は変わらない。
- [ ] **2. 失敗を確認 → 実装 → 3か所の呼び出しを直す。**
- [ ] **3. 全体のテスト → コミット。**

### タスク4（#00480）: チケットの数え方

**ファイル:** `app/Support/Travel.php`（`context`）、`config/courses.php`（新。`country_root`）。テスト `tests/Feature/TravelTest.php` に追記。

**振る舞い:** `context` の `$bossCountries` は、初級・ボス・クリア済みのステージのうち、**メインの道のカテゴリー**（親が `config('courses.country_root')` の名前のカテゴリー）に属するものだけを数える。`cleared` の取得に `stages.category_id` を足し、カテゴリーの親を見る。

- [ ] **1. 失敗するテストを書く:** 国旗のカテゴリーの初級ボスを倒すとチケットが増える／英語（言語モード）や世界遺産の初級ボスだけでは増えない／メインの道の中級のボスだけでは増えない。
- [ ] **2. 失敗を確認 → 実装。**
- [ ] **3. `TravelTest`・`TravelLockTest`・`TravelActionsTest`・`createTravelCountry`（`tests/Pest.php`）の fixture が、国旗のカテゴリーを使っているか確かめ、必要なら直す → 全体のテスト → コミット。**

### タスク5（#00481）: 国のコース（並べ直し）

**ファイル:** 新規 `config/courses.php`（続き）、`database/data/country-courses.php`、`app/Support/CoursePoolBuilder.php`、`app/Console/Commands/BuildCoursesCommand.php`。テスト `tests/Feature/CoursePoolBuilderTest.php`。

**`config/courses.php`:**

```php
return [
    'country_root' => '国旗',
    'default' => [ // 級 => [ステージ数, 通常の出す数, ボスの出す数, 通常の報酬(%)]
        '初級' => ['stages' => 10, 'draw' => 10, 'boss' => 15],
        '中級' => ['stages' => 10, 'draw' => 15, 'boss' => 20],
        '上級' => ['stages' => 10, 'draw' => 20, 'boss' => 25],
    ],
    'normal_reward_percent' => 50,
    'boss_reward_percent' => 100,
];
```

`database/data/country-courses.php`: 国の `code`（小文字）→ 上の `default` と同じ形で、ある級だけ上書き。例（実際の数はOwnerと調整）: `'va' => ['初級' => ['stages' => 5, 'draw' => 10, 'boss' => 15]]`（中級・上級なし）。載っていない国は `default`。

**`CoursePoolBuilder::build(Country $country)`:** その国の、メインの道のカテゴリー（`country_root` の子のうち名前が国名）について、級ごとに:
1. 今あるステージの問題を集めて**プール**にする（重複なし。並びは、元のステージ番号・問題の順）。ボスの `title_reward` を控える。
2. 定義のステージ数 N のステージを作る（`stage_number` 1〜N。`updateOrCreate`）。1〜N-1 は通常（`question_count` = `draw`・`is_boss` 偽・`reward_percent` = `normal_reward_percent`）、N はボス（`question_count` = `boss`・`is_boss` 真・`title_reward` を控えた値・`reward_percent` = `boss_reward_percent`）。すべて `is_pool` 真。
3. プールの問題を、すべてのステージに `sync`（`order` はプールの順）。
4. N より大きい番号のステージと、定義にない級のステージは消す（公開前の作り直しのため）。プールが空の級は何もしない。
5. 何度実行しても、同じ結果になる。

**`BuildCoursesCommand`:** `php artisan course:build {code?}`（国のコード。なければ全国）。結果を「国・ステージ・プール」で表示する。

- [ ] **1. 失敗するテストを書く:** 国旗の4ステージ（10問）＋ボス（20問）の元データから、初級が10ステージ（9つが通常 `question_count` 10・`reward_percent` 50、1つがボス 15・100）になる／全ステージにプール（60問）がつながる／ボスの称号が残る／2回実行しても増えない／定義で5ステージの国は5になる／余ったステージが消える／プールが空の級は作らない／ボスは1つだけで最後の番号。
- [ ] **2. 失敗を確認 → 実装。**
- [ ] **3. 開発DBで `php artisan course:build` を実行し、日本・アメリカ・フランスのステージの数・プールの数を確かめる。**
- [ ] **4. `docs/content/README.md` に、「`content:import` のあとに `course:build`」を書く → 全体のテスト → コミット。**

---

## 段階2: レベルとパスポート

### タスク6（#00482）: 国レベル・言語レベル・母国・スタンプ

**ファイル:** 新規 `app/Support/CourseLevels.php`、マイグレーション `2026_10_08_000001_add_home_country_to_user_schemas_table.php`、`routes/api.php`（passport）、`app/Models/UserSchema.php`。テスト `tests/Feature/CourseLevelsTest.php`・`tests/Feature/PassportTest.php`。

**マイグレーション:** `user_schemas.home_country` 文字列（既定 `'jp'`）。

**`CourseLevels`:**
- `forCountries(UserProfile $profile): list<array{code, name, level, max}>`: 国ごとに、メインの道のステージの数（`max`）と、`cleared_at` のあるステージの数（`level`）。ステージのない国は出さない。
- `forLanguages(UserProfile $profile, string $homeCountry): list<array{key, name, level, max}>`: `config('courses.languages')`（言語のキー → 名前・言語のカテゴリー名）の各言語について、言語のカテゴリーの国に結びつかないステージ（`country_id` null）の数と、クリア数。母国の言語（`config('courses.country_language')` で、母国の国の言語）は除く。ステージのない言語は出さない。

**passport:** 返事に `country_levels`・`language_levels` を足す。スタンプ（`stamp_tier`）は、**メインの道のステージだけ**を対象に、級の順に判定し、前の級を満たしたときだけ次の級を見る（銅なしの金が付かない）。

- [ ] **1. 失敗するテストを書く:** 国レベルは、メインの道のクリア数（別のカテゴリーのクリアは数えない・同じステージを繰り返しても1）／`max` は全ステージ数／言語レベルは国に結びつかないステージだけ／母国が日本のとき日本語は出ない／母国を `us` に変えると英語が出ない／ステージのない国・言語は出ない／パスポートの返事に両方が付く／スタンプは、初級を全部クリアで銅・中級まで全部で銀・上級まで全部で金、英語・世界遺産のステージは数えない／銅なしで金が付かない。
- [ ] **2. 失敗を確認 → 実装**（`config/courses.php` に `languages`・`country_language` を足す: `languages` は `en` ＝ 名前「英語」・カテゴリー「英語を学ぶ」、`fr` ＝「フランス語」・「フランス語を学ぶ」。`country_language` は `us`・`gb` → `en`、`fr` → `fr`、`jp` → `ja`（`languages` に `ja` はなく、母国の除外にだけ使う））。
- [ ] **3. 既存の `PassportTest` の、スタンプの前提を直す → 全体のテスト → コミット。**

---

## 段階3: 言語コース

### タスク7（#00483）: 言語のコース（国に結びつけない）

**ファイル:** `app/Support/CoursePoolBuilder.php`（言語の並べ直しを足す）、`app/Console/Commands/BuildCoursesCommand.php`、`routes/api.php`（`/countries`・`/countries/{id}`）。テスト `tests/Feature/LanguageCourseTest.php`。

**言語の並べ直し:** `config('courses.languages')` の各言語について、言語のカテゴリー（`is_language_mode`）の、**国に結びついたステージの問題をすべて集め**（アメリカ・イギリスの英語を合わせる。`prompt` と正解が同じ問題は1つにまとめる）、級ごとに、国に結びつかない（`country_id` null）10ステージのプールとして書く（ステージ数・出す数・ボスの数は `default`）。もとの国に結びついた言語のステージは消す。言語のコースの称号（`title_reward`）は、ボスの元の値を残す（なければ「英語はかせ」のように、言語名＋「はかせ」）。

**API:**
- `/api/countries` の各国に `language`（`{key, name}` または null）を足す。その国の言語（`country_language`）のコースにステージがあり、かつ母国の言語でないときだけ。
- `/api/countries/{id}` に `language_groups`（言語のコースの級ごとのグループ。`groups` と同じ形・`locked` を含む）を足す。ステージは国に結びつかないので、鍵（`abortIfLocked`）は国の鍵だけで見る。

- [ ] **1. 失敗するテストを書く:** アメリカとイギリスの英語が、国に結びつかない1つのコースになる（問題が重複しない）／アメリカの `/countries/{id}` の `language_groups` と、イギリスのものが同じステージ番号を指す／英語のステージをアメリカから遊んでクリアすると、イギリスから見ても同じステージがクリア済み／`language` はステージのある言語だけ（フランス語は、ステージがないので null）／母国の言語は null／2回実行しても増えない。
- [ ] **2. 失敗を確認 → 実装。**
- [ ] **3. 開発DBで `php artisan course:build` を再実行し、英語のコースを確かめる → 全体のテスト → コミット。**

---

## 段階4: ステージの道

### タスク8（#00484）: 道の配置と歩くスプル

**ファイル:** 新規 `frontend/src/lib/stage-map.ts`・`frontend/src/lib/stage-map.test.ts`・`frontend/src/components/app/stage-map.tsx`。

**`stage-map.ts`（画面を描かない部分）:**
- `stageMapLayout(count: number, width: number, rowHeight = 96): { points: {x: number; y: number}[]; height: number }`: 上から下へ、S字に曲がる道の上のステージの位置（0番目が下、最後がボスで上）。奇数・偶数の行で左右に振る。
- `walkerTarget(stages): number | null`: スプルが立つステージの位置（最後にクリアしたステージ。1つもクリアしていなければ最初のステージ。全部クリアしていれば最後）。
- `isReducedMotion()` は既存の `lib/motion` を使う。

**`StageMap`（部品）:** props は `StagePath` と同じ（`stages`・`selectedId`・`onSelect`）に、`roadSrc`（国の道の絵。なければ共通の道）を足す。道の絵を、曲がる道として敷く（SVGの `pattern` か CSS の `background`）。周りは地面の絵。ステージの印は `stage-node.ts` の絵（鍵・開いた・クリア済み・ボス）を使う。スプルは `outing/walk.webp` を、`walkerTarget` の位置に立たせる。クリアしたあとは、前の位置から次の位置へ、CSSの `transition` で動かす（`prefers-reduced-motion` のときは動かさずに置く）。タップで `onSelect`。キーボードで操作でき、`aria-label` は `StagePath` と同じ文言。

- [ ] **1. 失敗するテストを書く（Vitest）:** `stageMapLayout` — 10個で、位置が10個・上へ向かって `y` が減る・`x` が幅の中・最後がいちばん上／1個でも動く／0個で空。`walkerTarget` — 全部未クリアは0番目、3つクリアで3番目（次に遊ぶ）、全部クリアは最後。
- [ ] **2. 失敗を確認 → 実装 → 部品を作る。**
- [ ] **3. `tsc`・lint・全体のテスト → コミット。**

### タスク9（#00485）: 国の画面・結果の画面

**ファイル:** `frontend/src/app/travel/[countryId]/page.tsx`・`.../start/page.tsx`・`frontend/src/app/quiz/[stageId]/page.tsx`・`frontend/src/components/travel/road.ts`。テスト `frontend/src/components/travel/travel.test.ts` ほか。

- 国の画面: `StagePath` を `StageMap` に変える。`roadSrc` は、その国の道の絵（`roadArt(国のキー)`。日本・素材のない国は共通の道）。級のタブは3つのまま。道のメインの道は、`groups`（国旗）だけを出す（世界遺産などを出さない）。言語モード（`?mode=language`）は、`language_groups` を使う。進み具合（「レベル◯／最大◯」）を、画面の上に出す。
- `start` 画面: 言語のボタンの名前を、`language.name`（「英語を学ぶ」→「{言語}を学ぶ」）にする。`language` が null なら出さない。国のボタンは「{国名}を学ぶ」。
- 結果の画面（`quiz/[stageId]`）: `complete` の返事の `cleared` が偽のとき、「あと◯問！ もういちど やってみよう」（`required` を使う）を出し、「もういちど」ボタンを主にする。報酬は出さない。クリアのときは今まで通り。ふりがなは `AutoFurigana`。

- [ ] **1. 失敗するテストを書く:** 国の道の絵を選ぶ関数（素材のある国は国の絵、日本・ない国は共通の道）／結果の文（あと何問か）を作る関数。
- [ ] **2. 失敗を確認 → 実装。**
- [ ] **3. `tsc`・lint・全体のテスト → コミット。**

### タスク10（#00486）: パスポートの画面

**ファイル:** `frontend/src/app/passport/page.tsx`・`frontend/src/lib/course-levels.ts`（新）・`course-levels.test.ts`（新）。

- 「国レベル」「言語レベル」の2つの表を、「日本のバッジ」の上に出す。1行は「国名（旗） Lv.30 / 最大 30」と、横の細い進み具合の棒。どちらも、0のときは「まだ」。母国の言語は返事に出ない。
- 純粋な関数 `levelText(level, max)`（「Lv.30 / 30」）と `levelRatio`（0〜1）。

- [ ] **1. 失敗するテストを書く（Vitest）:** `levelText`・`levelRatio`（0割・最大0）。
- [ ] **2. 失敗を確認 → 実装 → `tsc`・lint・全体のテスト → コミット。**

---

## 仕上げ

### タスク11（#00487）: ブラウザ確認・ドキュメント

- [ ] **1. 開発DBで `php artisan course:build` を実行 → ブラウザ（スマホ幅375px）で確認:** ① 日本のコースが10ステージの道で出る。② スプルが最初のステージに立つ。③ 初級の1ステージを、6問以上正解でクリア → スプルが次へ歩く（動きを減らす設定では動かない）。④ 5問以下ではクリアにならず、「あと◯問！」が出る。⑤ 不正解でだけHPが減る。⑥ アメリカ（着いた国にしておく）の言語ボタンが「英語を学ぶ」で、英語のコースが出る。フランスの言語ボタンは出ない。⑦ パスポートに国レベル・言語レベルが出て、日本語は出ない。⑧ コンソールにエラーなし。確認後、プロフィールを元に戻す。
- [ ] **2. `SPEC.md`（4-2・4-4・4-4a・4-4b・HP・クリア率）と `TASKS.md`（完了と、次の作業: 日本・アメリカ・フランスの問題を増やす〔国と言語〕・小さな国の定義・日本の道の絵）を更新する。**
- [ ] **3. 全体のテスト → コミット。**

## 最後の見直し

`git diff main..HEAD` を全体で読み、次を確認する: クリア率の端（ちょうど60%・80%・出す数が1のとき）、近道が1回のまぐれで開かないこと、チケットが国旗の初級ボスだけで増えること、並べ直しコマンドが再実行で変わらないこと、言語コースが国に結びつかないこと、母国の言語がパスポートに出ないこと、`migrate:fresh` を使っていないこと。直した点は別のコミットにして報告する。自分で見直した結果であり、別の目の確認ではないことを最後の報告に書く。

## この計画に入っていないこと（あとで）

- 日本・アメリカ・フランスの**問題を増やす**（国のプール 初級60・中級80・上級100以上、フランス語のコース）。Codex・Claudeで下書きし、Ownerが確認する。
- 小さな国のコース定義の実際の数、残りの国（イギリス・韓国・インドネシアなど）への展開。
- 日本の道の絵（Ownerが用意）。
- 世界遺産などの別の道。
- 母国を選ぶ画面・外国人向け。

## 設計書との対応

| 設計書 | タスク |
|---|---|
| 3章 HP・クリア率・近道 | 1・2・3 |
| 4-1 コース・4-7 データ | 5・7 |
| 4-2 級・ステージ・問題 | 5 |
| 4-3 クリアの条件 | 2 |
| 4-4 進級 | 3・4 |
| 4-5 レベル | 6 |
| 4-6 画面 | 8・9・10 |
| 7章 テスト | 各タスク・11 |
