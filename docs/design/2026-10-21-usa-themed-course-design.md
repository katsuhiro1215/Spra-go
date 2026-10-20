# アメリカのコースを、分野ごとのステージにする — 設計書

- 作成日: 2026-10-21
- ステータス: **実装済み（開発環境で確認。本番への反映は、Ownerが手順書どおりに行う）**
- 元: 日本のコース（`2026-10-21-japan-themed-course-design.md`）と同じ型。次に選ばれそうな国のため、先に進めた（Owner決定）

## 1. 決めたこと

- アメリカのメインの道は、級（初級・中級・上級）ごとに、**8つの分野（1分野＝1ステージ）＋ボスの9ステージ**。ステージの出す数・やさしい順の並び・ボス・テーマの名前の出し方は、日本と同じ。

| ステージ | 分野 | 原稿のフォルダ（`company/spra/spra-go/content/usa/`） |
|---|---|---|
| 1 | アメリカ英語とマナー | `01-language-manners` |
| 2 | アメリカの基本情報 | `02-basics` |
| 3 | 州と州都 | `03-states-capitals` |
| 4 | 祝日・行事・くらし・スポーツ | `04-holidays-life` |
| 5 | 食べ物・名物 | `05-food` |
| 6 | 観光地・都市・文化 | `06-sightseeing-culture` |
| 7 | 自然・国立公園 | `07-nature-parks` |
| 8 | 歴史・産業・科学 | `08-history-industry` |
| 9（ボス） | アメリカのまとめ（称号「アメリカはかせ」） | 全分野から |

- 原稿はCodexが作った726問（各分野90問、03のみ96問）を、Claudeが確認して**726問すべて採用**（修正4問。`content/usa/REVIEW.md`）。画像つき34問は、ChatGPTで作った画像を `frontend/public/quiz/us/`（640×640のWebP、約2.6MB）に入れた。
- 前からあったアメリカの問題（国旗・首都・言語・世界遺産のアメリカ分など）は、新しい8分野に同じ内容があるので、ステージから外す（問題そのものは消さない）。日本の「legacy」にあたるものは、アメリカにはない（`legacy_stages` は空）。

## 2. 仕組み（日本のものを、国ごとの設定にした）

- `app/Support/JapanCourse.php` → **`ThemedCourse`**、`config/japan_course.php` → **`config/themed_courses.php`**。国コードごとに、分野の名前・「前からあった問題」の行き先・ボスの名前と称号を持つ（`jp` と `us`）。国が `themed_courses.countries` にあれば、`CoursePoolBuilder` が `ThemedCourse` で作る。
- 原稿の取り込み: `tools/content/build_us_fields.py` が、各分野の `final/questions.csv` から `docs/content/drafts/us_fields_{beginner,intermediate,advanced}.json` を作る。分野 N はステージ番号 20+N に入り、`course:build` が、分野ごとのステージ1〜8に並べ直して、ボスを足す。問題は `key`（`US05-B-001` など）で見分ける。
- `production:bootstrap` は、`docs/content/drafts/*.json` を全部取り込むので、`us_fields_*` も自動で入る。

## 3. 進み具合について（Ownerへ）

日本のときと同じで、**アメリカのステージの、いままでのクリアの記録と、抽選の記録は、反映の最初の1回だけ消える**（ステージの意味が変わるため）。消えるのは、アメリカのメインの道のステージのクリア・最高点・やった回数だけ。ほかの国・英語・世界遺産・レベル・コイン・学習ポイント・町は、そのまま。アメリカに着いたあとの、おみやげ・スタンプも残る。

## 4. 本番への反映の手順

1. `git push`（main）。
2. サーバー: `cd ~/Spra-go && git pull --ff-only && scripts/deploy.sh --no-pull`。
3. サーバーのコンテナで `production:bootstrap`（原稿の取り込み → 外す問題 → コースの並べ直し の順に、まとめて行う。何度流しても同じ）。または `content:import docs/content/drafts/us_fields_beginner.json`（中級・上級も）→ `course:build us`。
4. 確認: アメリカの道に、ステージ1〜9とテーマの名前が出る／ステージ5に食べ物の画像の問題が出る／ボスがある。

## 5. 確認した内容（開発環境）

- 取り込み: 3級とも、ステージ8件・問題242件。並べ直し: 各級ステージ9（分野8＋ボス）・プール合計1,452。
- 画面（Playwright）: アメリカの道に、ステージ1〜9とテーマの名前。ステージ1が遊べる。ステージ5で、画像つきの問題が出る。国旗は出ない（`no_flag`）。
- Pest `ThemedCourseTest` に、アメリカの並べ直し（前からあった問題が分野に入らない）を足した。

## 6. 残り

- 州の地図の問題（地図データから作る。日本の都道府県の地図と同じ）。別の仕事。
- インドネシア・フランス・韓国・イギリス: 同じ型で、原稿ができたら足す（`config/themed_courses.php` に1か国ぶん足して、`build_xx_fields.py` を作る）。
