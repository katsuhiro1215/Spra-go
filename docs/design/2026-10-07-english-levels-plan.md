# 英語コースの作り直し（3,500語・150レベル）— 実装計画

- 設計書: `docs/design/2026-10-07-english-levels-design.md`（Owner合意済み: 向きの割合の当てはめ・復習30%・`--fresh` での入れ替え）
- ブランチ: `feature/english-levels`。実行はインライン（サブエージェントなし）、最後に自分で見直す
- テスト: `./vendor/bin/sail test`（Pest）。TDD（先に失敗するテストを書く）

## 方針

- 内容の原稿は `company/spra/spra-go/content/english/` にある。コンテナから見えないので、`tools/english/sync.sh` で `database/data/english/{words,sentences}/` にコピーする。
- 英語コースは `english:import` が直接作る（国のコースの `course:build` では並べ直さない）。ステージは級ごとに10個、プールは級の全問。範囲の絞り込みは、`meta.level` と設定から `StageDraw` が行う（テーブルは変えない）。
- 既存の言語コース（フランス語など）と他のコースの抽選は変えない。`meta.level` のない問題は、今まで通りに出す。

## タスク

### 1. 設定と `course:build` の英語除外（#00498）
- `config/courses.php`: `languages.en.levels = true`、`language_levels`（初級[1,60]・中級[61,100]・上級[101,150]）、`direction_share`（上限レベル => 英語→日本語%: 10=>100, 20=>80, 30=>60, 100=>50, 150=>40）、`review_share = 30`
- `CoursePoolBuilder::buildLanguages`: `levels` が true の言語は飛ばす
- テスト: 英語が並べ直されないこと（既存のテストに追加）

### 2. 原稿の取り込み `english:import`（#00499）
- `tools/english/sync.sh`（原稿→`database/data/english/`）
- `app/Support/Language/EnglishCourseImporter.php`: CSV読み込み（BOMあり・なし）、問題の作成（CSVの向きはそのまま、反対向きは同じレベル・同じ品詞から自動作成、幼児は英語→日本語のみ）、`meta`（kind・level・direction・word）、解説、級ごとの問題集・10ステージ（ボスの称号は元のボスから引き継ぐ）、再実行で増えない
- `app/Console/Commands/ImportEnglishCommand.php`: `english:import {--fresh} {--force} {--path=}`。古い英語コースがあるのに `--fresh` がないときはエラー
- テスト（`tests/Feature/EnglishImportTest.php`）: 件数・meta・解説・反対向きの選択肢（4つ・重複なし・同じ訳の語なし・再実行で同じ）・幼児の向き・再実行で増えない・`--fresh`・古いコースがあるときのエラー

### 3. `StageDraw`: レベルの範囲・復習・向き（#00500）
- `StageDraw::levelRange(Stage): ?array`（ステージ1〜9は級のレベルを9つに分ける。余りは前のステージから1つずつ。ボスは null）
- `pickLanguage`: 単語は語ごとに向きを割合で決めて1問にまとめる。ボス以外は、範囲内と前の範囲（復習。出す数の `review_share`%まで）から選び、足りなければ範囲内の別の種類・復習・範囲より後ろを除いた全体で埋める。`meta.level` のない問題だけのプールは、今まで通り
- テスト（`tests/Feature/EnglishLevelDrawTest.php`）: 範囲の計算・ステージ1はレベル範囲内だけ・ステージ2は復習が前の範囲から・ボスは級全体・同じ語が2回出ない・向きの割合（幼児100%／統計）・文章の割合が範囲内でも保たれる・答えたことのある問題を優先

### 4. 入れ替えと確認（#00501）
- ミニゲーム（`CatchGame`）が新しい問題で動くことを確認（変更が必要なら直す）
- 開発DBで `english:import --fresh`。件数の確認
- ブラウザ（375px）でステージ1・5・ボスを確認。確認後、検証用プロフィールを元に戻す
- `SPEC.md`・`TASKS.md` を更新

### 5. 見直し・マージ（#00502）
- 全テスト・`tsc`・`eslint`（フロントを触ったとき）・Pint、最終の見直し、`main` へマージ
