# うちゅう旅行 実装計画

> 実行方法: ネイティブ（インラインで実装し、最後に自分で見直す）。Effort は Medium。
> 設計書: `docs/design/2026-10-09-space-trip-design.md`

**ゴール:** ミニゲーム「うちゅう旅行」を、サーバー（スプルキャッチと共通の仕組み＋星・到着する星）と画面（新しい動き `space-engine.ts` と画面）で作る。絵は仮のSVG。

## 全体の決まり

- ブランチ `feature/space-trip`。コミットは「`#00555: type(用途): summary`」の形（設計書は #00554）。末尾に `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`。
- サーバーのテストは、全体を同時に2つ走らせない。英語・国旗のキャッチのテストが変わらず通ることを、毎回確かめる。
- 日本語で書く。

## Review Focus

1. 星を送らない／英語・国旗では、点数が今までと同じ（星は省略可）。
2. 星が範囲外（負・4以上・文字）なら422。答えの数と星の数が合わない配列は使わない（星は答えの1つずつに付ける）。
3. 宇宙の問題は、ステージが「宇宙」の子カテゴリー（宇宙たんけん）にあるので、親の下の子も含めて探す。
4. 隕石は、どの段にも必ず空いている列がある（lanes=2でも）。同じ種で同じ並び。
5. 隕石にぶつかると、その問題の星がゼロになり、ハートは減らない。

## Task 1: サーバー

**Files:** `database/migrations/…add_stars_to_profile_game_plays_table.php`、`app/Models/ProfileGamePlay.php`、`config/games.php`、`app/Support/CatchGame.php`、`routes/api.php`、`tests/Feature/SpaceTripGameTest.php`。

- `profile_game_plays.stars`（unsignedSmallInteger・空でもよい）。
- `config('games.space_trip')`: `category`（宇宙）・`question_count` 10・`review_max` 6・`daily_rewarded_plays` 3・難しさ（lanes・fall_ms・`obstacle_rows`・`reward`）・`destinations`（正解の換算数の区切り）・`messages.empty`。
- `CatchGame`: `SPACE_GAME = 'space_trip'`。問題を探すカテゴリーを、ゲームごとの `category` から決め、その子も含める。`start` が `obstacle_rows` を返す（あれば）。`score($results, $stars = [])`。`finish($play, $answers)` が各答えの `stars`（省略可・0〜3）を受け、`stars` を記録し、`space_trip` なら `destination` を返す。
- ルート: `space-trip => SPACE_GAME` を登録。`answers.*.stars` は `nullable|integer|min:0|max:3`。
- テスト: 設定・問題の取り出し（子カテゴリーも）・点数（星あり／なし）・星の範囲外は422・記録の `stars`・到着する星（0〜2月 … 10冥王星、10問未満の換算）・ごほうび・英語と国旗が変わらない。

## Task 2: `space-engine.ts`（純粋な動き）

**Files:** `frontend/src/components/games/space/space-engine.ts`、`space-engine.test.ts`。

- 状態・`createSpaceGame(questions, settings, seed)`・`moveTo`/`moveBy`・`tick`・`answersOf`（`stars` つき）・`scoreOf(results, stars)`・`layoutFor(seed, index, lanes, rows)`（隕石・星の置き方。純粋）。
- テスト: 置き方（同じ種で同じ並び・どの段にも空きの列がある・星は隕石と重ならない）、当たり判定（隕石でその問題の星がゼロ・ハートは減らない）、星を集める、門で判定・ハート・コンボ、点数（星込み）、終わり。

## Task 3: 画面

**Files:** `frontend/src/components/games/space/space-api.ts`・`space-game.tsx`・`space-result.tsx`・`space-view.ts`、`frontend/src/app/games/space-trip/page.tsx`、`frontend/src/components/games/catch/catch-view.ts`（モード）、`ミニゲームの一覧（MINI_GAMES）`。

- 選ぶ画面は `CatchSelect` を、モード `space_trip` で共通に使う。ゲーム・結果は新しく作る（仮のSVG）。結果に到着する星の名前（絵は宇宙の絵が届いたら）。
- テスト: `space-view.ts`（文言・到着する星の名前）。ブラウザで確認（スマホ幅）。

## Task 4: 確認と文書

- 全体のテスト（サーバー1つだけ・フロント）、ブラウザ確認、SPEC・TASKS の更新、コミット。
