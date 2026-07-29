# コンテンツ制作パイプライン

企画部門「コンテンツ制作担当」がリサーチして作成したクイズ原稿を、開発部門が実データに取り込むまでの流れ。

## 全体の流れ

1. **コンテンツ制作担当がリサーチ・原稿作成**: ネット上の情報を調査し、対象国のクイズ原稿を下記JSON形式で作成する。出力先は `docs/content/drafts/`。
2. **CEOレビュー**: 事実誤りや不適切な内容がないか確認する。
3. **開発部門が取り込み**: `php artisan content:import docs/content/drafts/{ファイル名}.json` を実行し、Stage/Question/Choiceとして登録する。

まず `--dry-run` オプションで形式チェックのみ行い、問題なければ本取り込みする運用を推奨する。

```bash
php artisan content:import docs/content/drafts/jp_beginner.json --dry-run
php artisan content:import docs/content/drafts/jp_beginner.json
```

コマンドは選択肢が4件でない、正解が1件でない、国コードが存在しない、などの形式的な誤りを検知して取り込み前に止める（`tests/Feature/ImportContentCommandTest.php`参照）。同じ原稿を再実行しても質問は重複しない（prompt文言で既存判定）。

## JSON原稿の形式

```json
{
  "country_name": "日本",
  "country_code": "JP",
  "difficulty": "初級",
  "stages": [
    {
      "stage_number": 1,
      "theme_key": "flag_to_country",
      "is_boss": false,
      "title_reward": null,
      "questions": [
        {
          "prompt": "この国旗はどこの国？",
          "choices": [
            {"label": "日本", "is_correct": true},
            {"label": "中国", "is_correct": false},
            {"label": "韓国", "is_correct": false},
            {"label": "タイ", "is_correct": false}
          ]
        }
      ]
    }
  ]
}
```

- `theme_key` は `question_themes` テーブルに存在するキーのみ使用可（`flag_to_country` / `country_to_flag` / `geography` / `capital` / `language`）
- `choices` は必ず4件、`is_correct: true` は必ず1件
- `is_boss: true` のステージには `title_reward`（称号名）が必須

## 現状の対象範囲（MVP、`docs/MVPRequirements.md`参照）

日本・アメリカ合衆国・イギリス・フランスの4ヶ国、初級のみ。1ヶ国あたりStage1〜4が通常10問、Stage5がボス（20問・称号付与）。

## 既知の注意事項

- 開発環境のDB（`SpraGo`）は `countries` テーブルの一部カラム（`three_code` / `name_en` / `country_code`）がマイグレーションファイルとずれており実テーブルに存在しない状態。既存国（jp/us/fr）はこの3カラムなしで登録されている。**イギリス（GB）は開発DBに未登録**のため、`gb_beginner.json` を取り込む前に `Country::create(['code' => 'GB', 'name' => 'イギリス'])` 相当の登録が必要（`CountrySeeder`の該当行を使うか、Ownerダッシュボードから追加する）。このスキーマ不整合自体は本タスクのスコープ外の別問題として認識している。
