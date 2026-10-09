# 宇宙クイズの取り込み 実装計画

> 実行方法: ネイティブ（インラインで実装し、最後に自分で見直す）。Effort は Medium。
> 設計書: `docs/design/2026-10-09-space-quiz-design.md`

**ゴール:** `space:import` で、宇宙の問題60問を「宇宙」クイズ（初級・中級・上級）に取り込む。絵が無い問題は外す。何度流しても重複しない。

**構成:** `SpaceCatalog`（CSVを読んで検証）→ `SpaceQuizPlanner`（純粋な計画）→ `FlagQuizWriter::writeTree`（既存の書き込み）。コマンド `space:import [--dry-run]`。

## 全体の決まり

- ブランチ `feature/space-quiz`。コミットは「`#00548: type(用途): summary`」の形（設計書は #00547）。末尾に `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`。
- サーバーのテストは、全体を同時に2つ走らせない。
- 原稿（`company/...`）は変更しない。ただし `pictures.csv` に「キー」列だけ、Claudeが足す（設計書4章）。
- 日本語で書く。

## Review Focus

1. 絵が1つ欠けた問題だけ外れ、ほかの問題とステージは作られる。
2. CSVの不正（選択肢の重複・6文字超え・知らない絵の名前・難しさの誤り）は、何も書かずに止まる。
3. 何度流しても、問題・ステージ・選択肢が増えない。CSVを直して流すと、問題が直る。
4. 絵が増えて流し直したとき、ステージの区切りが変わっても、問題の重複や孤児が出ない（問題はキーで見つける。ステージは同じ番号を更新）。
5. 絵の選択肢の `image` が、`/space/{キー}.webp`。

## Task 1: SpaceCatalog（CSVの読み込みと検証）と キー列

**Files:** Create `app/Support/Space/SpaceCatalog.php`、`tests/Feature/SpaceCatalogTest.php`、`tools/space/sync.sh`。Modify `company/spra/spra-go/content/space/pictures.csv`（キー列）。

**Interfaces（Produces）:**
- `SpaceCatalog::load(string $dir): array{questions: list<array>, pictures: array<string, array{key: string, name: string}>, errors: list<string>}`
  - questions の1要素: `['level' => '初級', 'number' => int, 'theme' => string, 'kind' => 'text'|'picture', 'prompt' => string, 'correct' => string, 'wrong' => list<string>, 'explanation' => string]`
  - 検証（errors に「questions.csv 3行目: …」の形で入れる）: 難しさが初級・中級・上級、形が `4択`・`絵4択`、選択肢4つ・空なし・重複なし、全角6文字以内（`mb_strwidth` で12以下）、問題文が空でない、絵の問題の名前がすべて `pictures` にある、`pictures` のキーが英小文字・数字・`_` だけで重複なし。
- 手順: テスト（正常・各エラー）→ 失敗確認 → 実装 → 通過 → `tools/space/sync.sh`（`company/spra/spra-go/content/space/*.csv` を `database/data/space/` へコピー）→ `pictures.csv` にキー列を足す → 実際のCSVが `errors` なしで読めるテスト → コミット。

## Task 2: SpaceQuizPlanner（純粋な計画）

**Files:** Create `app/Support/Space/SpaceQuizPlanner.php`、`tests/Feature/SpaceQuizPlannerTest.php`。

**Interfaces:**
- Consumes: `SpaceCatalog::load` の questions・pictures。
- Produces: `SpaceQuizPlanner::plan(array $questions, array $pictures, array $availableImages): array{nodes: list<array>, skipped: list<string>}`
  - `$availableImages`: 絵が届いているキーの一覧（`list<string>`）。
  - 絵の問題は、4つの名前の絵がすべて `$availableImages` にあるときだけ入れる。外した問題のキー（`space:初級:7`）を `skipped` に入れる。
  - 難しさごとに、ステージの大きさ 8問（上級は6問）で `ceil(件数/大きさ)` 個に均等に区切る（前の組から1つずつ多く。国旗の `split` と同じ）。0件の級は作らない。最後のステージがボス（`boss => true`、称号: 初級 うちゅうたんけんたい・中級 うちゅうパイロット・上級 うちゅうはかせ）。ほかは `boss => false, title_reward => null`。
  - `nodes` は `[['name' => '宇宙たんけん', 'order' => 1, 'levels' => [['code', 'difficulty', 'stages' => [['number', 'boss', 'title_reward', 'questions' => [...]]]]]]]`（`FlagQuizWriter::writeTree` が受ける形）。
  - 問題: `['key' => 'space:初級:7', 'type' => 'multiple_choice', 'prompt', 'image' => null, 'choices' => [['label', 'correct', 'image' => '/space/mars.webp'|null]...], 'explanation' => ['summary' => ...]]`。選択肢の順は正解を先頭（書き込み側で並べ替えはしない。画面が混ぜる）。
- 手順: テスト（区切り 8・8・8 / 8・8・8 / 6・6、端数、ボスと称号、絵が欠けた問題が外れる、絵の選択肢に image が付く、文字の問題は image なし、キー）→ 失敗 → 実装 → 通過 → コミット。

## Task 3: `space:import` コマンド

**Files:** Create `app/Console/Commands/ImportSpaceCommand.php`、`tests/Feature/ImportSpaceTest.php`。

**Interfaces:** `space:import {--path=database/data/space} {--images=frontend/public/space} {--dry-run}`。`SpaceCatalog::load` → エラーがあれば止める（何も書かない）→ 絵のファイルの有無で `availableImages` を作る → `SpaceQuizPlanner::plan` → （dry-run でなければ）`FlagQuizWriter::writeTree('宇宙', $nodes)` → 結果を出す（コース・ステージ・問題・外した問題の数）。

- テスト（一時ディレクトリにCSVと絵のダミーを作る）: 取り込み後の件数・「宇宙」が `is_course_group`・ステージ数、再実行で増えない、CSVを直して流すと問題文が直る、絵が無い問題が外れ、絵を足して流し直すと増える（孤児なし）、不正なCSVで止まり何も書かない、`--dry-run` は書かない、選択肢に `meta.image`。
- 手順: テスト → 失敗 → 実装 → 通過 → 全体確認（`./vendor/bin/sail test` を1つだけ）→ 実際の原稿で `sync.sh` → `space:import --dry-run` → 本番相当の取り込み（開発DB）→ ブラウザ確認（ミニクイズに「宇宙」、初級ステージ1をスマホ幅で）。検証用のプロフィールは作って、確認後に消す → SPEC・TASKS を更新 → コミット。
