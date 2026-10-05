# 問題の「解説」（段階1）— 実装計画

> **実行方法:** ネイティブ（サブエージェントは使わず、インラインで実装し、最後に自分で見直す）。

**Goal:** 問題に「解説」（要約・例文・使いどころ・似た語）を持たせる入れものと、答えのカードの表示を作り、都道府県クイズの全問に解説を付ける。
**Spec:** `docs/design/2026-10-06-question-explanation-design.md`
ブランチ: `feature/question-explanation`。設計書 #00447、この計画 #00448、実装は #00449 から。

## Global Constraints
- マイグレーションは追加のみ（`migrate:fresh` は使わない）。開発データベースは、確認のあと、プロフィール7を元の状態に戻す（Owner の id 2 には触らない）
- 解説は、答える前には、どの問題の取得にも出さない（`$hidden`）
- 解説のない問題は、今のまま。国旗クイズ・既存の問題のテストが、そのまま通る
- 都道府県クイズは、同じ表からいつも同じ計画。問題の選択肢・順番は変えない
- 説明に出る漢字は辞書で読める。難読地名の漢字は辞書に入れない
- 文は、子ども向けの話し言葉（「〜だよ」）。ドキュメントは日本語
- テスト: `./vendor/bin/sail test`（`--parallel` なし）、`cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`

## Review Focus
- 問題の取得（ステージ・おさらい・キャッチなど）に `explanation` が出ない（答えを見る前に、解説から答えが分からない）
- 解説なしの問題で、答えのカードが今と同じ（空の枠・余白が出ない）
- 難読地名で、解説の文の中の問われた漢字に、ふりがなが付かない（読みは、ひらがなで書いてある）
- 書き込みを2回実行しても、問題の数が増えず、解説が直る
- スマホの幅で、解説が長くてもカードが画面からはみ出さず、「次へ」が押せる

## Task 1: 入れもの・書き込み・答えのAPI（先にテスト）
**Files:** `database/migrations/2026_10_06_000001_add_explanation_to_questions_table.php`、`app/Models/Question.php`、`app/Support/QuestionExplanation.php`、`app/Support/FlagQuiz/FlagQuizWriter.php`、`routes/api.php`、`tests/Feature/QuestionExplanationTest.php`
- [ ] 先にテスト（RED）: `normalize`（知らないキーを捨てる・前後の空白・空の項目を捨てる・`related` は `term` のあるものだけ・なにも残らなければ null）、書き込み（`FlagQuizWriter::write` の計画に `explanation` があれば書かれる・なければ null・2回で増えない・直る）、答えのAPI（解説が返る・なければ null・練習でも返る）、問題の取得（ステージの出題とおさらいに `explanation` が出ない）。**Expected:** 失敗
- [ ] マイグレーション、モデル（`fillable`・`array`・`$hidden`）、`QuestionExplanation::normalize`、`FlagQuizWriter::question`（`explanation` を `normalize` して書く）、答えのAPI（返事に `explanation`）。**Expected:** 通る
- [ ] `sail artisan migrate`（追加のみ）
- [ ] コミット `#00449: feat:問題に解説(explanation)の入れものを足し、答えのAPIだけが返す`

## Task 2: 答えのカードの解説（先にテスト）
**Files:** `frontend/src/components/quiz/types.ts`、`frontend/src/components/quiz/answer-explanation.tsx`・`.test.tsx`、`frontend/src/components/quiz/quiz-session.tsx`
- [ ] 先にテスト（RED）: `AnswerExplanation`（要約が出る・詳細がなければボタンなし・「くわしく見る」で例文・使いどころ・似た語が出る・空なら何も出さない）。**Expected:** 失敗
- [ ] 型 `QuestionExplanation`、部品、`quiz-session.tsx`（返事の `explanation` を持ち、答えのカードに出す。次の問題・やり直しで消す）。**Expected:** 通る
- [ ] コミット `#00450: feat:答えのカードに解説(要約・くわしく見る)を出す`

## Task 3: 都道府県クイズの解説（先にテスト）
**Files:** `app/Support/Prefecture/PrefectureQuizPlanner.php`、`tests/Feature/PrefectureQuizPlannerTest.php`、`tests/Feature/PrefectureFuriganaTest.php`
- [ ] 先にテスト（RED）: 計画の全問に `explanation.summary` がある／名物・名所・お祭り・県庁所在地（名前がちがう県の注意）・地方・となり・はめ込み・難読地名（読みと `note`、`note` なしなら読みだけ）の文／同じ表から同じ計画／ふりがな（解説の文の漢字が辞書で読める。難読地名の漢字は、のぞく）。**Expected:** 失敗
- [ ] 各形に解説を足す（`choiceQuestion` に任意の引数）。足りない漢字は `tools/furigana/prefecture-explanation-words.json` に足し、`python3 tools/furigana/merge_words.py`。**Expected:** 通る
- [ ] コミット `#00451: feat:都道府県クイズの全問に解説(県庁所在地・地方・となり・名物など)を付ける`

## Task 4: 難読地名の説明141語（先にテスト）
**Files:** `database/data/prefectures.php`、`tests/Feature/PrefectureCatalogTest.php`、`tools/furigana/prefecture-explanation-words.json`、`frontend/src/lib/furigana-dictionary.json`
- [ ] 先にテスト（RED）: 難読地名141語すべてに、空でない `note` がある。**Expected:** 失敗
- [ ] 47県の `hard` に `note` を足す（確かな事実だけ。1〜2文）。ふりがなのテストが教える足りない語を辞書に足す。**Expected:** 通る
- [ ] コミット `#00452: feat:難読地名141語に、その地名の説明(note)を足す`

## Task 5: 確認・ドキュメント・マージの確認
- [ ] `sail artisan db:seed --class=PrefectureQuizSeeder`（追加のみ。解説が入る）
- [ ] ブラウザ（スマホ幅）: 都道府県クイズで、正解・不正解の両方で要約が出る。難読地名で読みと説明が出る。解説なしの問題（国旗クイズ）が今のまま。確認のあと、プロフィール7を元に戻し、スクリーンショットを消す
- [ ] `SPEC.md`・`TASKS.md`（段階1を完了、段階2・3、141語の `note` のOwnerの確認）、全体のテスト、自分で見直す（Ownerに見直しの結果を伝える）、Ownerに報告してマージの確認
