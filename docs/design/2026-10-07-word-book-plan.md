# 単語帳 — 実装計画

- 設計書: `docs/design/2026-10-07-word-book-design.md`（Owner合意済み: 出会った語だけ・入口は「学ぶ」画面・苦手/覚えたは手動マークのみ・重要度はレベルから・内容の前に画面を先に出す）
- ブランチ: `feature/word-book`。実行はインライン（サブエージェントなし）、最後に自分で見直す
- テスト: サーバーは `./vendor/bin/sail test`（Pest）、フロントは `cd frontend && npx vitest run`・`npx tsc --noEmit`・`npx eslint`。TDD（先に失敗するテストを書く）

## 設計書との差（実装での判断）

- **出会った語の持ち方**: 設計書4-2の `profile_words` に `seen_at`（出会った日時）を足す。答えたとき（`QuestionMemory::apply`。ステージ・ミニゲーム・おさらいのすべてが通る1か所）に、その問題の語の `profile_words` を作り、`seen_at` を入れる。「出会った語」＝ `seen_at` か `saved_at` が入っている語。これで、一覧の問い合わせが軽くなる（問題の `meta` を毎回たどらない）。今ある開発用の答えた記録は、さかのぼっては入らない（公開前）。
- 解いた直後のやり直し（`practice`）は記録しないので、語の出会いにも数えない。答えのAPIが返す `word_id` は、記録するときだけ付ける。

## タスク

### 1. テーブルとモデル（#00505）
- `words`・`profile_words` のマイグレーション、`App\Models\Word`・`ProfileWord`（`meanings`・`examples`・`synonyms` は array キャスト）
- テスト: 一意（`language+key`、`profile+word`）、プロフィール・語の削除で記録が消える

### 2. `english:import` が語を作る（#00506）
- `EnglishCourseImporter`: 単語の行から `words` を作る（1語1行。`key`＝小文字・`level`＝最小のレベル・`pos`・`cefr`〔列があれば〕・`meanings`＝`[{pos, ja:[日本語]}]`・`importance`＝レベルから）。問題の `meta.word_id` を付ける。再実行で増えない（`language+key` で更新）。`--fresh` は `words`（と `profile_words`）も消す
- 品詞の表示: 原稿の品詞（`noun`・`名詞` など）を、画面用の短い日本語（名・動・形・副…）に直す表を `config/words.php` に持つ
- テスト: 件数・再実行で増えない・`meta.word_id`・重要度の既定（60/100/101の境目）・`--fresh` で消える・記録（`profile_words`）は普通の再実行では消えない

### 3. 内容の原稿 `word-details` の取り込み（#00507）
- `words/word-details.csv`（設計書7章の列）を、同じコマンドが読む。なければ何もしない。`品詞別の意味`（`名詞:理由,根拠／動詞:…`）・`似た語`（`語:説明|語:説明`）を分解し、`ipa`・`usage`・`examples`（最大3つ）・`synonyms`（最大5つ）・`importance` を `words` に書く
- 形式の誤りは、取り込みを止めず、行番号つきで画面に出す。原稿にない語（見出し語が `words` にない）は飛ばして報告する
- `tools/english/sync.sh` が `word-details.csv` もコピーする
- テスト: 正しい行・空の列・形式の誤り・未知の語・再実行で同じ・重要度の上書き

### 4. 出会いの記録と、答えのAPIの `word_id`（#00508）
- `App\Support\Words::encounter(int $profileId, int $questionId)`: 問題の `meta.word_id` があれば `profile_words` を作り、`seen_at` を入れる（すでにあれば変えない）。`QuestionMemory::apply` から呼ぶ
- `routes/api.php` の答えのAPI（`questions.answer`）が、記録するときだけ、`word_id` を返す（`practice` は返さない）
- テスト: 答えると `seen_at` が入る・2度答えても `seen_at` は変わらない・語のない問題は何もしない・ミニゲームで答えても入る・`practice` は入らない・答えのAPIが `word_id` を返す

### 5. API（#00509）
- `App\Support\Words`（一覧・詳細・マーク）と、`routes/api.php` の3つ: `GET /api/words`（`filter`・`q`・`page`。50語、レベル順→綴り順）・`GET /api/words/{id}`・`PUT /api/words/{id}/mark`。いずれも `ActiveProfile::require`
- 出す範囲は出会った語だけ。未出会いの語の詳細は404。一覧の返しは「語・品詞・主な意味・重要度・自分の状態」、詳細は全項目（＋似た語のうち、自分が出会った語のIDを付ける。出会っていない語は `id: null`）
- マーク: `status`（`weak`／`learned`／null。どちらかを付けると、もう一方は外れる）と `saved`。出会っていない語にもマークはできない（404）。連打しても同じ結果
- テスト: 範囲（未出会い除外・保存した語は出る）・絞り込み（すべて／単語帳／苦手／覚えた）・検索（英語・日本語）・ページ・詳細の項目・似た語のID・マークの排他と連打・別のプロフィールの記録が見えない・未ログイン401・404

### 6. フロント（#00510）
- `lib/words.ts`（型・意味の行の組み立て・重要度の★・品詞の短い表示・次の語の選び方）と、そのテスト（Vitest）
- 詳細 `/words/[id]`: 設計書6-1の順。内容のない項目は見出しごと出さない。🔊は出さない。下の固定ボタン（苦手・覚えた・次へ）。「次へ」は、一覧の並び（`sessionStorage` に保持した語のIDの列）の次の語へ。ふりがな（`AutoFurigana`）を通す
- 一覧 `/words`: タブ（すべて／単語帳／苦手／覚えた）・検索・もっと見る（ページ送り）
- 入口: 「学ぶ」画面に「単語帳」ボタン
- 解説からのつながり: 答えのカードの解説に、`word_id` があれば「この単語を見る」リンク
- テスト: Vitest（上の純粋な関数）、tsc・eslint

### 7. 確認・文書・マージ（#00511）
- 開発DBで `english:import`（再実行。`--fresh` は使わない）→ 語3,500行。ブラウザ（375px）で、問題に答える → 解説の「この単語を見る」→ 詳細 → 苦手・覚えた・次へ → 一覧・絞り込み・検索。確認後、検証用プロフィールを元に戻す
- `SPEC.md`・`TASKS.md` を更新（単語帳。続き: 内容の原稿〔Codex〕・音声・苦手を出題に反映・他言語）
- 全テスト・Pint・tsc・eslint、最終の見直し、`main` へマージ（マージはOwnerの確認のあと）
