# 復習の変化 実装計画

> 実行方法: ネイティブ（インラインで実装し、最後に自分で見直す）。Effort は Medium。
> 設計書: `docs/design/2026-10-09-review-variety-design.md`

## 全体の決まり

- ブランチ `feature/review-variety`。コミットは「`#00562: type(用途): summary`」の形（設計書・計画は #00561）。末尾に `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`。
- サーバーのテストは、全体を同時に2つ走らせない。既存の答えのテスト（4択・マッチング・並べ替え・仕分け）が通ることを毎回確かめる。

## Review Focus

1. 初めて会う単語・条件に合わない語（熟語・長い・短い）・英語以外は、スペルの形にならない。
2. 正解の綴りが、問題を取るAPIの返事に出ない。
3. 対象外の問題に `spelling` を送っても、答えにならない（422）。
4. 練習（やり直し）で、記録も一言も出ない。
5. 一言は、初めて・まちがい・練習では出ない。優先順が守られる。

## Task 1: 覚え具合の変化と一言（サーバー）

`QuestionMemory::record`/`apply` が、答える前後の状態を返す（`event`）。答えの窓口の返事に `memory`。テスト: `tests/Feature/MemoryEventTest.php`。

## Task 2: スペルの出し方と答え（サーバー）

`app/Support/QuizVariants.php`（出し方・綴りの条件・タイル）、`QuestionAnswerResolver::spelling`、答えの窓口、`GET /api/stages/{stage}`。設定は `config/review.php` の `variants.spelling`。テスト: `tests/Feature/SpellingVariantTest.php`。

## Task 3: 画面

`components/app/spelling-question.tsx`（タイルの入れ・もどし・けす・できた。判定の純粋な部品は `lib/spelling.ts` にしてテスト）、`quiz/types.ts`、`quiz-session.tsx`、一言の札（`memory-note.tsx` と `lib/memory-note.ts`）。ブラウザで確認。

## Task 4: 確認と文書

全体のテスト、ブラウザ確認、SPEC・TASKS。
