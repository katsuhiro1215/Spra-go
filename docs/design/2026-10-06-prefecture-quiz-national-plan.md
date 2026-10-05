# 都道府県クイズ「全国」（段階3）— 実装計画

> **実行方法:** ネイティブ（サブエージェントは使わず、インラインで実装し、最後に自分で見直す）。

**Goal:** 都道府県クイズに「全国」（47県を混ぜた3級。各級に複数のステージ＋ボス、3級とも称号）を足す。
**Spec:** `docs/design/2026-10-06-prefecture-quiz-national-design.md`
ブランチ: `feature/prefecture-national`（設計書 #00440 はコミット済み）。この計画 #00441、実装は #00442 から。

## Global Constraints
- 県のコース・地方まるごとの問題は変えない（今のテストが、そのまま通る）
- 全国は、47県すべてが `isReady` のときだけ出す。称号は3級のボスに付ける（バッジの絵はなし）
- 同じ表からは、いつも同じ計画。同じ問いは、1ステージに2回出ない
- テスト: `./vendor/bin/sail test`（`--parallel` なし）、`cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
- 開発データベースは追加のみ。確認のあと、プロフィール7を元の状態に戻す（Owner の id 2 には触らない）

## Review Focus
- 国旗クイズ・県のコース・地方まるごとが、変わらない（件数・名前・称号）
- 初級に、tier 3 の県が出ない。中級・上級は、47県すべてが、どこかのステージでアンカーになる
- ステージの鍵（1つ目だけ開く）とボスで次の級が開く
- 全国の称号が、県のバッジとして扱われない（`title_badge` が null）

## Task 1: データ表に tier（先にテスト）
**Files:** `database/data/prefectures.php`、`app/Support/Prefecture/PrefectureCatalog.php`、`tests/Feature/PrefectureCatalogTest.php`
- [ ] 先にテスト（RED）: 47県すべてに `tier` が1〜3、数が 14・16・17。**Expected:** 失敗
- [ ] 47行に `tier` を足す（設計書6章）。`all()` に既定の `tier`（3）。**Expected:** 通る
- [ ] コミット `#00442: feat:県のデータ表に知名度(tier)を足す`

## Task 2: 全国の計画（先にテスト）
**Files:** `app/Support/Prefecture/PrefectureQuizPlanner.php`、`tests/Feature/PrefectureQuizPlannerTest.php`
- [ ] 先にテスト（RED）: 全国用の表（23県、tier 6・8・9）で、全国のコースが最後に出る／47県そろっていなければ出ない／3級・ステージの数（初級 2+ボス、中級・上級 3+ボス）／各ステージ10問／称号は3級のボスだけ／初級のアンカーは tier ≤ 2／中級・上級は全県がアンカーになる／はめ込みが3・8問目／上級に難読地名が4問／同じ問いが1ステージに2回出ない／正解が1つ／同じ表から同じ計画。**Expected:** 失敗
- [ ] `nationalLevels`・`nationalForm`・`anchors` の `round` の初期値を足す **Expected:** 通る
- [ ] コミット `#00443: feat:都道府県クイズの全国(3級・複数ステージ＋ボス・3級とも称号)の計画を足す`

## Task 3: 書き込み・窓口・画面の札
**Files:** `tests/Feature/PrefectureQuizWriterTest.php`、`frontend/src/lib/prefecture-quiz.ts`・`.test.ts`、`frontend/src/components/quiz/course-select.tsx`
- [ ] 先にテスト（RED）: 書き込み（直下のコース `全国`・ステージの数・称号・二重実行で増えない）、コースの窓口（`group` が偽・`title` が「全国はかせ」）、`title_badge` が null、画面の `courseNote`。**Expected:** 失敗
- [ ] `courseNote`（「世界ぜんぶ」「全国」は「ちょうむずかしい」）と、カードへの反映 **Expected:** 通る
- [ ] コミット `#00444: feat:全国のカードに「ちょうむずかしい」の札を出す(書き込み・窓口のテストも)`

## Task 4: 確認・ドキュメント・マージの確認
- [ ] 辞書（Pest のふりがなのテストが、足りない語を教える。`tools/furigana/prefecture-national-words.json`）、`db:seed --class=PrefectureQuizSeeder`
- [ ] ブラウザ: 都道府県クイズに全国が出る・ステージの鍵・称号。確認のあと、プロフィール7を元に戻す
- [ ] `SPEC.md`・`TASKS.md`、全体のテスト、自分で見直す、Ownerに報告してマージの確認
