# 国旗クイズ 実装計画

> **実行する人へ:** 実行方法はネイティブ（サブエージェントは使わない決まりなので、インラインで1人が実装し、最後に自分で見直す）。テストを先に書き、失敗を見てから実装する。

**目標:** ミニクイズに「国旗クイズ」（大陸ごとのコース・初級〜上級・はめ込み）を足す。

**進め方:** 国の一覧 → 計画（純粋な計算）→ データベースへの書き込み（Seeder）→ 一覧・コースの窓口 → 画面の計算 → 画面（選択肢の国旗・はめ込み）→ コース選択 → ドキュメント → 登録とブラウザ確認。

**技術:** Laravel 13（Pest・MySQL・Sail）、Next.js 16・React 19・TypeScript、Vitest（画面の計算だけ。`environment: "node"`）。

**設計書:** `docs/design/2026-10-05-flag-quiz-design.md`

## 守ること（全タスク共通）

- 返答・ドキュメント・コミットは日本語。コミットは `#NNNNN: type:要約` と `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`。番号は **#00339 から**（計画は#00338）。マージのコミットは #00347。
- ブランチは `feature/flag-quiz`。mainへのマージは Owner に確認してから（`git merge --no-ff`）。pushはOwnerが行う。
- バックエンドのテストは `./vendor/bin/sail test`（`--parallel` なし）。結果のJSONで `"tool":"pest","result"` を探す。画面は `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`。
- `.env` は読まない・変えない・コミットしない。`migrate:fresh` は禁止（足すだけの `migrate` はよい）。
- ブラウザ確認の画像は `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` の下だけに、**ファイル名を `.playwright-mcp/○○.png` のように、フォルダ名から書いて**保存し、見たら消す（その日の `page-*.yml`・`console-*.log` も）。確認用のログインは `test@example.com` / `password`（町テスト id 7）。普通のクリックが効かないときは、DOMの `click()` で押す。
- 子どもが読む文は `AutoFurigana` に通す。
- 並行して流れる待ち（`browser_wait_for` の並べ書き）は、並行して実行され、思ったより短くなる。時間が要る確認は、1回ずつ待つ。

## 見直しの観点（テストでは見にくい所を、最後に自分で確かめる）

1. 上級で、選択肢（3つ）に出る似た国旗が、正解と重ならず、お互いに重複しない（名前と絵の両方）
2. 国の一覧を直して再実行しても、ステージ・問題の番号が変わらず、進み具合（クリア）が消えない。選択肢の作り直しで、答え中の問題が壊れない
3. はめ込みで、4つ入れる前に答え合わせが走らない・二重に送らない・送れなかったときに「答え合わせ」ボタンで再送できる
4. 今の「国旗」（id 13・38の国の子）が、ミニクイズに出ない。各国のカード・学ぶタブ・英語は、これまでどおり
5. 国旗の絵のあるボタン・はめ込みが、スマホ幅で、はみ出さず、押しやすい（ふりがな・文字の大きさの設定ありでも）

## 決めたこと（計画で確定）

- 計画は、国の一覧から**決まった並び**でできる（ランダムを使わず、名前の `crc32` で並べ替える）。同じ一覧から、いつも同じ計画ができるので、再実行しても変わらない。
- 国の一覧は、`['key', 'name', 'continent', 'tier']` の並びと、`similar_groups`（似ている国の組。同じ組の国どうしが、お互いに「似ている」。1か国につき最大4か国）で書く。`similar` は組から作るので、「片方だけ」にならない。
- コースを出すのは、そのコースの国が8か国以上あるとき（足りないと、はめ込み・まちがいの選択肢が作れない）。
- 1ステージは、そのステージの国を並べ替えた**10個の「正解の国」**で作る。国が10に満たなければ、同じ国を繰り返す（ふつうの問題として、選択肢を変えて出る）。3問目・8問目（中級・上級）は、その国が正解のはめ込み（4か国）。
- ボスのステージは、その級の国から、並べ替えた先頭の10か国。
- 国旗の絵のパスは `/flag/{key}.svg`。`key` は `frontend/public/flag/` のファイル名どおり（`Isreal`・`Kenia`・`Swaziland` などの綴りもそのまま）。
- 問題の識別は `questions.meta.flag_key`（`flag:{コース}:{級}:{ステージ}:q{番号}`）。同じキーがあれば更新、なければ作る。選択肢は、中身が変わったときだけ作り直す。計画から消えたステージ・問題は、消さずに残す（進み具合を守るため）。
- 国旗の絵を持つ選択肢は、`question_choices.meta.image`。はめ込みは `questions.meta.layout = "slots"`。

## ファイルの全体像

**サーバー（新規）**
- `database/data/flag-countries.php`、`app/Support/FlagQuiz/{FlagCatalog,FlagQuizPlanner,FlagQuizWriter}.php`、`database/seeders/FlagQuizSeeder.php`
- `database/migrations/2026_10_05_000001_add_is_course_group_to_categories_table.php`
- `app/Support/Courses.php`
- `tests/Feature/{FlagCatalogTest,FlagQuizPlannerTest,FlagQuizWriterTest,CoursesTest}.php`

**サーバー（変更）**
- `app/Models/Category.php`、`app/Support/MiniQuizzes.php`、`routes/api.php`、`database/seeders/DatabaseSeeder.php`、`tests/Feature/MiniQuizzesTest.php`

**画面（新規）**
- `frontend/src/lib/flag-fit.ts`（+test）、`frontend/src/lib/flag-quiz.ts`（+test）
- `frontend/src/components/app/flag-fit-question.tsx`、`frontend/src/components/quiz/course-select.tsx`

**画面（変更）**
- `frontend/src/components/quiz/types.ts`、`quiz-session.tsx`、`frontend/src/app/play/[id]/page.tsx`

---

### タスク1: 国の一覧（#00339）

**ファイル**
- 新規: `database/data/flag-countries.php`、`app/Support/FlagQuiz/FlagCatalog.php`、`tests/Feature/FlagCatalogTest.php`

**渡すもの:** `FlagCatalog::all(): array<string, array{key, name, continent, tier, similar: list<string>}>`（`key` をキーにした連想配列。登録順）、`FlagCatalog::CONTINENTS`（大陸のキー → 日本語名）、`FlagCatalog::COURSES`（コースのキー → 日本語名。大陸6つ＋`world`）。

- [ ] **手順1: 失敗するテストを書く**（`tests/Feature/FlagCatalogTest.php`）

```php
<?php

use App\Support\FlagQuiz\FlagCatalog;

/*
|--------------------------------------------------------------------------
| 国旗クイズの国の一覧(docs/design/2026-10-05-flag-quiz-design.md 5章)
|--------------------------------------------------------------------------
*/

it('国連加盟の193か国が、大陸ごとの数どおりにそろっている', function () {
    $catalog = FlagCatalog::all();
    $perContinent = collect($catalog)->countBy('continent')->all();

    expect($catalog)->toHaveCount(193);
    expect($perContinent)->toBe([
        'asia' => 47,
        'europe' => 43,
        'africa' => 54,
        'north-america' => 23,
        'south-america' => 12,
        'oceania' => 14,
    ]);
});

it('keyと国名が重ならず、大陸と知名度が決まった値で、国旗の絵が実在する', function () {
    $catalog = FlagCatalog::all();

    expect(collect($catalog)->pluck('name')->unique())->toHaveCount(193);

    foreach ($catalog as $key => $country) {
        expect($country['key'])->toBe($key);
        expect(array_keys(FlagCatalog::CONTINENTS))->toContain($country['continent']);
        expect($country['tier'])->toBeIn([1, 2, 3]);
        expect(is_file(base_path("frontend/public/flag/{$key}.svg")))->toBeTrue("国旗の絵がない: {$key}");
    }
});

it('似ている国は、一覧にいる国で、自分ではなく、お互いに似ていて、最大4か国', function () {
    $catalog = FlagCatalog::all();

    foreach ($catalog as $key => $country) {
        expect(count($country['similar']))->toBeLessThanOrEqual(4);
        foreach ($country['similar'] as $other) {
            expect($other)->not->toBe($key);
            expect($catalog)->toHaveKey($other);
            expect($catalog[$other]['similar'])->toContain($key);
        }
    }
});

it('初級に出る(知名度1・2)国が、どの大陸にも8か国以上ある', function () {
    $beginner = collect(FlagCatalog::all())->where('tier', '<=', 2)->countBy('continent');

    foreach (array_keys(FlagCatalog::CONTINENTS) as $continent) {
        expect($beginner[$continent])->toBeGreaterThanOrEqual(8);
    }
});

it('コースは、大陸6つと世界ぜんぶ', function () {
    expect(array_keys(FlagCatalog::COURSES))->toBe([
        'asia', 'europe', 'africa', 'north-america', 'south-america', 'oceania', 'world',
    ]);
    expect(FlagCatalog::COURSES['world'])->toBe('世界ぜんぶ');
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/FlagCatalogTest.php`
期待: 失敗（クラスがない）。

- [ ] **手順3: 一覧と読み込みを作る**

`database/data/flag-countries.php`（国は、大陸ごとに、登録順＝カタログの順）:

```php
<?php

/*
|--------------------------------------------------------------------------
| 国旗クイズの国の一覧(docs/design/2026-10-05-flag-quiz-design.md 5章)
|--------------------------------------------------------------------------
|
| [key(frontend/public/flag/ のファイル名から .svg を除いたもの), 国名, 大陸, 知名度(1よく知られた〜3あまり知られていない)]
| 国連加盟の193か国。台湾・パレスチナ・コソボ・バチカンは入れない(Owner決定)。
| 国名と知名度、似ている国は、公開前にOwnerが確認する。
|
*/

return [
    'countries' => [
        // アジア(47)
        ['Japan', '日本', 'asia', 1],
        ['China', '中国', 'asia', 1],
        ['Korea-South', '韓国', 'asia', 1],
        ['Korea-North', '北朝鮮', 'asia', 2],
        ['Mongolia', 'モンゴル', 'asia', 2],
        ['India', 'インド', 'asia', 1],
        ['Pakistan', 'パキスタン', 'asia', 2],
        ['Bangladesh', 'バングラデシュ', 'asia', 2],
        ['Sri-Lanka', 'スリランカ', 'asia', 2],
        ['Nepal', 'ネパール', 'asia', 2],
        ['Bhutan', 'ブータン', 'asia', 3],
        ['Maldives', 'モルディブ', 'asia', 3],
        ['Afghanistan', 'アフガニスタン', 'asia', 2],
        ['Iran', 'イラン', 'asia', 2],
        ['Iraq', 'イラク', 'asia', 2],
        ['Saudi-Arabia', 'サウジアラビア', 'asia', 1],
        ['Kuwait', 'クウェート', 'asia', 3],
        ['Bahrain', 'バーレーン', 'asia', 3],
        ['Qatar', 'カタール', 'asia', 2],
        ['United-Arab-Emirates', 'アラブ首長国連邦', 'asia', 2],
        ['Oman', 'オマーン', 'asia', 3],
        ['Yemen', 'イエメン', 'asia', 3],
        ['Jordan', 'ヨルダン', 'asia', 3],
        ['Lebanon', 'レバノン', 'asia', 3],
        ['Syria', 'シリア', 'asia', 3],
        ['Isreal', 'イスラエル', 'asia', 2],
        ['Turkey', 'トルコ', 'asia', 1],
        ['Cyprus', 'キプロス', 'asia', 3],
        ['Georgia', 'ジョージア', 'asia', 2],
        ['Armenia', 'アルメニア', 'asia', 3],
        ['Azerbaijan', 'アゼルバイジャン', 'asia', 3],
        ['Kazakhstan', 'カザフスタン', 'asia', 3],
        ['Uzbekistan', 'ウズベキスタン', 'asia', 3],
        ['Turkmenistan', 'トルクメニスタン', 'asia', 3],
        ['Kyrgyzstan', 'キルギス', 'asia', 3],
        ['Tajikistan', 'タジキスタン', 'asia', 3],
        ['Thailand', 'タイ', 'asia', 1],
        ['Vietnam', 'ベトナム', 'asia', 1],
        ['Laos', 'ラオス', 'asia', 3],
        ['Cambodia', 'カンボジア', 'asia', 2],
        ['Myanmar', 'ミャンマー', 'asia', 2],
        ['Malaysia', 'マレーシア', 'asia', 2],
        ['Singapore', 'シンガポール', 'asia', 1],
        ['Indonesia', 'インドネシア', 'asia', 1],
        ['Philippines', 'フィリピン', 'asia', 1],
        ['Brunei-Darussalam', 'ブルネイ', 'asia', 3],
        ['Timor-Leste', '東ティモール', 'asia', 3],

        // ヨーロッパ(43)
        ['United-Kingdom', 'イギリス', 'europe', 1],
        ['France', 'フランス', 'europe', 1],
        ['Germany', 'ドイツ', 'europe', 1],
        ['Italy', 'イタリア', 'europe', 1],
        ['Spain', 'スペイン', 'europe', 1],
        ['Portugal', 'ポルトガル', 'europe', 1],
        ['Netherlands', 'オランダ', 'europe', 1],
        ['Belgium', 'ベルギー', 'europe', 2],
        ['Switzerland', 'スイス', 'europe', 1],
        ['Sweden', 'スウェーデン', 'europe', 1],
        ['Norway', 'ノルウェー', 'europe', 1],
        ['Denmark', 'デンマーク', 'europe', 1],
        ['Finland', 'フィンランド', 'europe', 1],
        ['Iceland', 'アイスランド', 'europe', 2],
        ['Ireland', 'アイルランド', 'europe', 1],
        ['Greece', 'ギリシャ', 'europe', 1],
        ['Russian-Federation', 'ロシア', 'europe', 1],
        ['Austria', 'オーストリア', 'europe', 2],
        ['Poland', 'ポーランド', 'europe', 2],
        ['Ukraine', 'ウクライナ', 'europe', 2],
        ['Hungary', 'ハンガリー', 'europe', 2],
        ['Czech-Republic', 'チェコ', 'europe', 2],
        ['Romania', 'ルーマニア', 'europe', 2],
        ['Bulgaria', 'ブルガリア', 'europe', 3],
        ['Croatia-Hrvatska', 'クロアチア', 'europe', 2],
        ['Serbia', 'セルビア', 'europe', 3],
        ['Slovakia', 'スロバキア', 'europe', 3],
        ['Slovenia', 'スロベニア', 'europe', 3],
        ['Estonia', 'エストニア', 'europe', 3],
        ['Latvia', 'ラトビア', 'europe', 3],
        ['Lithuania', 'リトアニア', 'europe', 3],
        ['Belarus', 'ベラルーシ', 'europe', 3],
        ['Moldova', 'モルドバ', 'europe', 3],
        ['Albania', 'アルバニア', 'europe', 3],
        ['Bosnia-and-Herzegovina', 'ボスニア・ヘルツェゴビナ', 'europe', 3],
        ['North-Macedonia', '北マケドニア', 'europe', 3],
        ['Montenegro', 'モンテネグロ', 'europe', 3],
        ['Malta', 'マルタ', 'europe', 3],
        ['Luxembourg', 'ルクセンブルク', 'europe', 3],
        ['Monaco', 'モナコ', 'europe', 3],
        ['Liechtenstein', 'リヒテンシュタイン', 'europe', 3],
        ['San-Marino', 'サンマリノ', 'europe', 3],
        ['Andorra', 'アンドラ', 'europe', 3],

        // アフリカ(54)
        ['Egypt', 'エジプト', 'africa', 1],
        ['South-Africa', '南アフリカ', 'africa', 1],
        ['Kenia', 'ケニア', 'africa', 1],
        ['Nigeria', 'ナイジェリア', 'africa', 2],
        ['Morocco', 'モロッコ', 'africa', 1],
        ['Ethiopia', 'エチオピア', 'africa', 2],
        ['Ghana', 'ガーナ', 'africa', 2],
        ['Algeria', 'アルジェリア', 'africa', 2],
        ['Tunisia', 'チュニジア', 'africa', 2],
        ['Tanzania', 'タンザニア', 'africa', 2],
        ['Uganda', 'ウガンダ', 'africa', 2],
        ['Madagascar', 'マダガスカル', 'africa', 2],
        ['Senegal', 'セネガル', 'africa', 2],
        ['Cameroon', 'カメルーン', 'africa', 2],
        ['Cote-d-Ivoire-Ivory-Coast', 'コートジボワール', 'africa', 2],
        ['Democratic-Republic-of-the-Congo', 'コンゴ民主共和国', 'africa', 3],
        ['Republic-of-the-Congo', 'コンゴ共和国', 'africa', 3],
        ['Angola', 'アンゴラ', 'africa', 3],
        ['Zambia', 'ザンビア', 'africa', 3],
        ['Zimbabwe', 'ジンバブエ', 'africa', 3],
        ['Mozambique', 'モザンビーク', 'africa', 3],
        ['Namibia', 'ナミビア', 'africa', 3],
        ['Botswana', 'ボツワナ', 'africa', 3],
        ['Sudan', 'スーダン', 'africa', 3],
        ['South-Sudan', '南スーダン', 'africa', 3],
        ['Libya', 'リビア', 'africa', 3],
        ['Mali', 'マリ', 'africa', 3],
        ['Niger', 'ニジェール', 'africa', 3],
        ['Chad', 'チャド', 'africa', 3],
        ['Somalia', 'ソマリア', 'africa', 3],
        ['Rwanda', 'ルワンダ', 'africa', 3],
        ['Burundi', 'ブルンジ', 'africa', 3],
        ['Malawi', 'マラウイ', 'africa', 3],
        ['Mauritius', 'モーリシャス', 'africa', 3],
        ['Mauritania', 'モーリタニア', 'africa', 3],
        ['Burkina-Faso', 'ブルキナファソ', 'africa', 3],
        ['Benin', 'ベナン', 'africa', 3],
        ['Togo', 'トーゴ', 'africa', 3],
        ['Sierra-Leone', 'シエラレオネ', 'africa', 3],
        ['Liberia', 'リベリア', 'africa', 3],
        ['Guinea', 'ギニア', 'africa', 3],
        ['Guinea-Bissau', 'ギニアビサウ', 'africa', 3],
        ['Gambia', 'ガンビア', 'africa', 3],
        ['Gabon', 'ガボン', 'africa', 3],
        ['Equatorial-Guinea', '赤道ギニア', 'africa', 3],
        ['Central-African-Republic', '中央アフリカ', 'africa', 3],
        ['Eritrea', 'エリトリア', 'africa', 3],
        ['Djibouti', 'ジブチ', 'africa', 3],
        ['Comoros', 'コモロ', 'africa', 3],
        ['Seychelles', 'セーシェル', 'africa', 3],
        ['Cabo-Verde', 'カーボベルデ', 'africa', 3],
        ['Sao-Tome-and-Principe', 'サントメ・プリンシペ', 'africa', 3],
        ['Swaziland', 'エスワティニ', 'africa', 3],
        ['Lesotho', 'レソト', 'africa', 3],

        // 北アメリカ(23)
        ['United-States', 'アメリカ', 'north-america', 1],
        ['Canada', 'カナダ', 'north-america', 1],
        ['Mexico', 'メキシコ', 'north-america', 1],
        ['Cuba', 'キューバ', 'north-america', 1],
        ['Jamaica', 'ジャマイカ', 'north-america', 1],
        ['Panama', 'パナマ', 'north-america', 1],
        ['Costa-Rica', 'コスタリカ', 'north-america', 2],
        ['Haiti', 'ハイチ', 'north-america', 2],
        ['Dominican-Republic', 'ドミニカ共和国', 'north-america', 2],
        ['Bahamas', 'バハマ', 'north-america', 2],
        ['Guatemala', 'グアテマラ', 'north-america', 2],
        ['Honduras', 'ホンジュラス', 'north-america', 2],
        ['El-Salvador', 'エルサルバドル', 'north-america', 2],
        ['Nicaragua', 'ニカラグア', 'north-america', 2],
        ['Barbados', 'バルバドス', 'north-america', 2],
        ['Trinidad-and-Tobago', 'トリニダード・トバゴ', 'north-america', 2],
        ['Belize', 'ベリーズ', 'north-america', 3],
        ['Antigua-and-Barbuda', 'アンティグア・バーブーダ', 'north-america', 3],
        ['Dominica', 'ドミニカ国', 'north-america', 3],
        ['Grenada', 'グレナダ', 'north-america', 3],
        ['Saint-Kitts-and-Nevis', 'セントクリストファー・ネービス', 'north-america', 3],
        ['Saint-Lucia', 'セントルシア', 'north-america', 3],
        ['Saint-Vincent-and-the-Grenadines', 'セントビンセント・グレナディーン', 'north-america', 3],

        // 南アメリカ(12)
        ['Brazil', 'ブラジル', 'south-america', 1],
        ['Argentina', 'アルゼンチン', 'south-america', 1],
        ['Chile', 'チリ', 'south-america', 1],
        ['Peru', 'ペルー', 'south-america', 1],
        ['Colombia', 'コロンビア', 'south-america', 1],
        ['Venezuela', 'ベネズエラ', 'south-america', 1],
        ['Uruguay', 'ウルグアイ', 'south-america', 2],
        ['Paraguay', 'パラグアイ', 'south-america', 2],
        ['Bolivia', 'ボリビア', 'south-america', 2],
        ['Ecuador', 'エクアドル', 'south-america', 2],
        ['Guyana', 'ガイアナ', 'south-america', 3],
        ['Suriname', 'スリナム', 'south-america', 3],

        // オセアニア(14)
        ['Australia', 'オーストラリア', 'oceania', 1],
        ['New-Zealand-Aotearoa', 'ニュージーランド', 'oceania', 1],
        ['Fiji', 'フィジー', 'oceania', 1],
        ['Papua-New-Guinea', 'パプアニューギニア', 'oceania', 1],
        ['Samoa', 'サモア', 'oceania', 2],
        ['Tonga', 'トンガ', 'oceania', 2],
        ['Vanuatu', 'バヌアツ', 'oceania', 2],
        ['Solomon-Islands', 'ソロモン諸島', 'oceania', 2],
        ['Kiribati', 'キリバス', 'oceania', 3],
        ['Tuvalu', 'ツバル', 'oceania', 3],
        ['Nauru', 'ナウル', 'oceania', 3],
        ['Palau', 'パラオ', 'oceania', 3],
        ['Marshall-Islands', 'マーシャル諸島', 'oceania', 3],
        ['Federated-States-of-Micronesia', 'ミクロネシア連邦', 'oceania', 3],
    ],

    // 似ている国旗の組。同じ組の国どうしが、お互いに「似ている」(1か国につき最大4か国)
    'similar_groups' => [
        ['Chad', 'Romania', 'Andorra', 'Moldova'],
        ['Indonesia', 'Monaco', 'Poland'],
        ['Ireland', 'Cote-d-Ivoire-Ivory-Coast', 'Italy', 'Mexico'],
        ['Netherlands', 'Luxembourg'],
        ['Australia', 'New-Zealand-Aotearoa'],
        ['Venezuela', 'Colombia', 'Ecuador'],
        ['Slovakia', 'Slovenia', 'Russian-Federation'],
        ['Norway', 'Iceland', 'Denmark', 'Finland', 'Sweden'],
        ['Mali', 'Guinea', 'Senegal'],
        ['Austria', 'Latvia'],
        ['Yemen', 'Egypt', 'Syria', 'Iraq'],
        ['Sudan', 'Kuwait', 'Jordan', 'United-Arab-Emirates'],
        ['Germany', 'Belgium'],
        ['Thailand', 'Costa-Rica'],
        ['Honduras', 'Nicaragua', 'El-Salvador'],
        ['Hungary', 'Bulgaria'],
    ],
];
```

`app/Support/FlagQuiz/FlagCatalog.php`:

```php
<?php

namespace App\Support\FlagQuiz;

use InvalidArgumentException;

/**
 * 国旗クイズの国の一覧(docs/design/2026-10-05-flag-quiz-design.md 5章)。
 * database/data/flag-countries.php を読み、似ている国(similar)を組から作る
 */
class FlagCatalog
{
    /** 大陸のキー => 日本語名 */
    public const CONTINENTS = [
        'asia' => 'アジア',
        'europe' => 'ヨーロッパ',
        'africa' => 'アフリカ',
        'north-america' => '北アメリカ',
        'south-america' => '南アメリカ',
        'oceania' => 'オセアニア',
    ];

    /** コースのキー => 日本語名。大陸6つと、世界ぜんぶ(最難関) */
    public const COURSES = self::CONTINENTS + ['world' => '世界ぜんぶ'];

    /** @return array<string, array{key: string, name: string, continent: string, tier: int, similar: list<string>}> */
    public static function all(): array
    {
        $data = require base_path('database/data/flag-countries.php');

        $countries = [];
        foreach ($data['countries'] as [$key, $name, $continent, $tier]) {
            $countries[$key] = ['key' => $key, 'name' => $name, 'continent' => $continent, 'tier' => $tier, 'similar' => []];
        }

        foreach ($data['similar_groups'] as $group) {
            foreach ($group as $key) {
                if (! isset($countries[$key])) {
                    throw new InvalidArgumentException("似ている国の組に、一覧にない国がある: {$key}");
                }
                foreach ($group as $other) {
                    if ($other !== $key && ! in_array($other, $countries[$key]['similar'], true)) {
                        $countries[$key]['similar'][] = $other;
                    }
                }
            }
        }

        return $countries;
    }
}
```

- [ ] **手順4: 通す**

実行: `./vendor/bin/sail test tests/Feature/FlagCatalogTest.php`
期待: すべて通る。**国旗の絵がない `key` があれば、`frontend/public/flag/` のファイル名を見て、一覧の `key` を直す**（名前を勝手に変えず、絵のあるものだけを使う）。

- [ ] **手順5: コミット**

```bash
git add database/data/flag-countries.php app/Support/FlagQuiz/FlagCatalog.php tests/Feature/FlagCatalogTest.php
git commit -m "#00339: feat:国旗クイズの国の一覧(国連加盟193か国・大陸・知名度・似ている国)を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク2: 計画（純粋な計算）（#00340）

**ファイル**
- 新規: `app/Support/FlagQuiz/FlagQuizPlanner.php`、`tests/Feature/FlagQuizPlannerTest.php`

**渡すもの:** `FlagQuizPlanner::plan(array $catalog): array`。戻り値:

```
list<array{key: string, name: string, order: int, levels: list<array{
  code: 'beginner'|'intermediate'|'advanced', difficulty: '初級'|'中級'|'上級',
  stages: list<array{number: int, boss: bool, title_reward: ?string, questions: list<question>}>
}>}>
```

`question` は、次の2種類。

```
{ key: string, type: 'multiple_choice', prompt: string, image: ?string,
  choices: list<{label: string, correct: bool, image: ?string}> }          // correct は1つ。まちがいの候補を含む
{ key: string, type: 'matching', prompt: string, layout: 'slots',
  items: list<{id: string, image: string, label: string}> }                // 4つ。idは国のkey
```

定数: `QUESTIONS_PER_STAGE = 10`、`FIT_POSITIONS = [3, 8]`、`WRONG_POOL = 8`、`MIN_WRONG = 3`、`MIN_COURSE_COUNTRIES = 8`。

- [ ] **手順1: 失敗するテストを書く**（`tests/Feature/FlagQuizPlannerTest.php`）

```php
<?php

use App\Support\FlagQuiz\FlagCatalog;
use App\Support\FlagQuiz\FlagQuizPlanner;

/*
|--------------------------------------------------------------------------
| 国旗クイズの計画(docs/design/2026-10-05-flag-quiz-design.md 4章)
|--------------------------------------------------------------------------
*/

/** テスト用の小さな一覧。アジア12か国(知名度1・2が8か国)・ヨーロッパ10か国(同8か国)。似ている国つき */
function flagTestCatalog(): array
{
    $rows = [];
    foreach (range(1, 12) as $n) {
        $rows[] = ["A{$n}", "あじあ{$n}", 'asia', $n <= 3 ? 1 : ($n <= 8 ? 2 : 3)];
    }
    foreach (range(1, 10) as $n) {
        $rows[] = ["E{$n}", "よーろっぱ{$n}", 'europe', $n <= 3 ? 1 : ($n <= 8 ? 2 : 3)];
    }

    $catalog = [];
    foreach ($rows as [$key, $name, $continent, $tier]) {
        $catalog[$key] = compact('key', 'name', 'continent', 'tier') + ['similar' => []];
    }
    foreach ([['A1', 'A2', 'E1'], ['A5', 'A9']] as $group) {
        foreach ($group as $key) {
            $catalog[$key]['similar'] = array_values(array_diff($group, [$key]));
        }
    }

    return $catalog;
}

function flagPlanQuestions(array $plan): array
{
    return collect($plan)->flatMap(fn ($course) => collect($course['levels'])->flatMap(
        fn ($level) => collect($level['stages'])->flatMap(fn ($stage) => $stage['questions'])
    ))->all();
}

function flagLevel(array $plan, string $course, string $code): array
{
    $found = collect($plan)->firstWhere('key', $course);

    return collect($found['levels'])->firstWhere('code', $code);
}

it('国が8か国以上あるコースだけを、大陸の順に出し、最後に世界ぜんぶを足す', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());

    expect(collect($plan)->pluck('key')->all())->toBe(['asia', 'europe', 'world']);
    expect(collect($plan)->pluck('name')->all())->toBe(['アジア', 'ヨーロッパ', '世界ぜんぶ']);
    expect(collect($plan)->pluck('order')->all())->toBe([1, 2, 3]);
    expect(collect($plan[0]['levels'])->pluck('difficulty')->all())->toBe(['初級', '中級', '上級']);
});

it('同じ一覧からは、いつも同じ計画ができる', function () {
    expect(FlagQuizPlanner::plan(flagTestCatalog()))->toBe(FlagQuizPlanner::plan(flagTestCatalog()));
});

it('ステージは、国の数を10で割った切り上げの数だけ。最後にボスが1つ。どのステージも10問', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());

    $beginner = flagLevel($plan, 'asia', 'beginner'); // 知名度1・2が8か国 → 1ステージ + ボス
    expect(collect($beginner['stages'])->pluck('number')->all())->toBe([1, 2]);
    expect(collect($beginner['stages'])->pluck('boss')->all())->toBe([false, true]);

    $intermediate = flagLevel($plan, 'asia', 'intermediate'); // 12か国 → 2ステージ + ボス
    expect(collect($intermediate['stages'])->pluck('number')->all())->toBe([1, 2, 3]);

    foreach ($plan as $course) {
        foreach ($course['levels'] as $level) {
            foreach ($level['stages'] as $stage) {
                expect($stage['questions'])->toHaveCount(10);
            }
        }
    }
});

it('ボスだけに称号がつく(コース名の国旗○○)', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());

    $stages = flagLevel($plan, 'asia', 'advanced')['stages'];
    expect($stages[0]['title_reward'])->toBeNull();
    expect(end($stages)['title_reward'])->toBe('アジアの国旗はかせ');
    expect(end(flagLevel($plan, 'europe', 'beginner')['stages'])['title_reward'])->toBe('ヨーロッパの国旗みならい');
    expect(end(flagLevel($plan, 'world', 'intermediate')['stages'])['title_reward'])->toBe('世界ぜんぶの国旗めいじん');
});

it('問題のキーは、すべて違う', function () {
    $keys = collect(flagPlanQuestions(FlagQuizPlanner::plan(flagTestCatalog())))->pluck('key');

    expect($keys->unique()->count())->toBe($keys->count());
    expect($keys->first())->toBe('flag:asia:beginner:1:q1');
});

it('初級は、国旗→国名の4択だけ。知名度3の国は正解に出ない。選択肢に国旗の絵は付かない', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());
    $catalog = flagTestCatalog();

    foreach (flagLevel($plan, 'asia', 'beginner')['stages'] as $stage) {
        foreach ($stage['questions'] as $question) {
            expect($question['type'])->toBe('multiple_choice');
            expect($question['image'])->toStartWith('/flag/A');
            expect(collect($question['choices'])->where('correct', true))->toHaveCount(1);
            expect(count($question['choices']))->toBeGreaterThanOrEqual(4);
            expect(collect($question['choices'])->pluck('image')->filter()->all())->toBe([]);

            $key = str_replace(['/flag/', '.svg'], '', $question['image']);
            expect($catalog[$key]['tier'])->toBeLessThanOrEqual(2);
        }
    }
});

it('中級は、3問目と8問目がはめ込み(重ならない4か国)。ほかは国名→国旗で、選択肢に国旗の絵が付く', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());

    foreach (flagLevel($plan, 'asia', 'intermediate')['stages'] as $stage) {
        foreach ($stage['questions'] as $index => $question) {
            if (in_array($index + 1, [3, 8], true)) {
                expect($question['type'])->toBe('matching');
                expect($question['layout'])->toBe('slots');
                expect($question['items'])->toHaveCount(4);
                expect(collect($question['items'])->pluck('id')->unique())->toHaveCount(4);
                continue;
            }
            expect($question['type'])->toBe('multiple_choice');
            expect($question['image'])->toBeNull();
            expect($question['prompt'])->toContain('の国旗は、どれ？');
            expect(collect($question['choices'])->where('correct', true)->first()['image'])->toStartWith('/flag/');
            expect(collect($question['choices'])->every(fn ($choice) => $choice['image'] !== null))->toBeTrue();
        }
    }
});

it('上級は、まちがいの候補が似ている国から。似ている国が足りなければ、同じコースの国で足して3つ以上', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());
    $catalog = flagTestCatalog();

    foreach (flagLevel($plan, 'asia', 'advanced')['stages'] as $stage) {
        foreach ($stage['questions'] as $question) {
            if ($question['type'] !== 'multiple_choice') {
                continue;
            }
            $correct = collect($question['choices'])->firstWhere('correct', true);
            $country = collect($catalog)->firstWhere('name', $correct['label']);
            $wrongNames = collect($question['choices'])->where('correct', false)->pluck('label');

            expect($wrongNames->count())->toBeGreaterThanOrEqual(3);
            expect($wrongNames->unique()->count())->toBe($wrongNames->count());
            expect($wrongNames)->not->toContain($correct['label']);
            foreach ($country['similar'] as $similarKey) {
                expect($wrongNames)->toContain($catalog[$similarKey]['name']);
            }
        }
    }
});

it('上級のはめ込みには、いちばん上の国(アンカー)の似ている国が入る', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());
    $catalog = flagTestCatalog();
    $fits = collect(flagLevel($plan, 'asia', 'advanced')['stages'])
        ->flatMap(fn ($stage) => $stage['questions'])
        ->where('type', 'matching');

    expect($fits)->not->toBeEmpty();
    foreach ($fits as $fit) {
        $ids = collect($fit['items'])->pluck('id');
        foreach (array_slice($catalog[$fit['items'][0]['id']]['similar'], 0, 3) as $similarKey) {
            expect($ids)->toContain($similarKey);
        }
    }
});

it('どの級でも、そのコースの国は、どれも1回は正解として出る(はめ込みは4か国とも正解に数える)', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());
    $catalog = flagTestCatalog();

    foreach (['asia', 'europe', 'world'] as $courseKey) {
        foreach (['beginner', 'intermediate', 'advanced'] as $code) {
            $level = flagLevel($plan, $courseKey, $code);
            $shown = collect($level['stages'])->flatMap(fn ($stage) => $stage['questions'])->flatMap(
                fn ($question) => $question['type'] === 'matching'
                    ? collect($question['items'])->pluck('label')
                    : [collect($question['choices'])->firstWhere('correct', true)['label']]
            )->unique();

            $expected = collect($catalog)
                ->when($courseKey !== 'world', fn ($c) => $c->where('continent', $courseKey))
                ->when($code === 'beginner', fn ($c) => $c->where('tier', '<=', 2))
                ->pluck('name');

            expect($shown->intersect($expected)->count())->toBe($expected->count());
        }
    }
});

it('世界ぜんぶの選択肢は、ほかの大陸の国も出る', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());
    $names = collect(flagLevel($plan, 'world', 'beginner')['stages'])
        ->flatMap(fn ($stage) => $stage['questions'])
        ->flatMap(fn ($question) => collect($question['choices'])->pluck('label'));

    expect($names->contains(fn ($name) => str_starts_with($name, 'あじあ')))->toBeTrue();
    expect($names->contains(fn ($name) => str_starts_with($name, 'よーろっぱ')))->toBeTrue();
});

it('本物の一覧では、全部のステージが10問・選択肢が4つ以上・キーが重ならない', function () {
    $plan = FlagQuizPlanner::plan(FlagCatalog::all());
    $questions = flagPlanQuestions($plan);

    expect(collect($plan)->pluck('key')->all())->toBe(array_keys(FlagCatalog::COURSES));
    expect(collect($questions)->pluck('key')->unique()->count())->toBe(count($questions));
    foreach ($plan as $course) {
        foreach ($course['levels'] as $level) {
            foreach ($level['stages'] as $stage) {
                expect($stage['questions'])->toHaveCount(10);
            }
        }
    }
    foreach ($questions as $question) {
        if ($question['type'] === 'multiple_choice') {
            expect(count($question['choices']))->toBeGreaterThanOrEqual(4);
        }
    }
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/FlagQuizPlannerTest.php`
期待: 失敗（クラスがない）。

- [ ] **手順3: 計画を作る**（`app/Support/FlagQuiz/FlagQuizPlanner.php`）

```php
<?php

namespace App\Support\FlagQuiz;

/**
 * 国旗クイズの計画(docs/design/2026-10-05-flag-quiz-design.md 4章)。
 * 国の一覧から、コース・級・ステージ・問題の「計画」を作る純粋な計算。データベースには触らない。
 * ランダムの代わりに、名前から決まる並び(crc32)を使うので、同じ一覧からは、いつも同じ計画ができる
 */
class FlagQuizPlanner
{
    public const QUESTIONS_PER_STAGE = 10;

    /** ステージの何問目をはめ込みにするか(1始まり。中級・上級) */
    public const FIT_POSITIONS = [3, 8];

    /** 1問に持たせる、まちがいの候補の数の上限(初級・中級) */
    public const WRONG_POOL = 8;

    /** まちがいの候補に、最低限そろえる数 */
    public const MIN_WRONG = 3;

    /** この数より国の少ないコースは作らない */
    public const MIN_COURSE_COUNTRIES = 8;

    public const LEVELS = [
        'beginner' => ['difficulty' => '初級', 'title' => 'みならい'],
        'intermediate' => ['difficulty' => '中級', 'title' => 'めいじん'],
        'advanced' => ['difficulty' => '上級', 'title' => 'はかせ'],
    ];

    /**
     * @param  array<string, array{key: string, name: string, continent: string, tier: int, similar: list<string>}>  $catalog
     */
    public static function plan(array $catalog): array
    {
        $courses = [];
        $order = 0;

        foreach (FlagCatalog::COURSES as $courseKey => $courseName) {
            $countries = array_values(array_filter(
                $catalog,
                fn (array $country) => $courseKey === 'world' || $country['continent'] === $courseKey,
            ));
            if (count($countries) < self::MIN_COURSE_COUNTRIES) {
                continue;
            }

            $levels = [];
            foreach (self::LEVELS as $code => $level) {
                $levelCountries = $code === 'beginner'
                    ? array_values(array_filter($countries, fn (array $country) => $country['tier'] <= 2))
                    : $countries;
                $levels[] = self::level($catalog, $courseKey, $courseName, $code, $level, $levelCountries, $countries);
            }

            $courses[] = ['key' => $courseKey, 'name' => $courseName, 'order' => ++$order, 'levels' => $levels];
        }

        return $courses;
    }

    private static function level(array $catalog, string $courseKey, string $courseName, string $code, array $level, array $levelCountries, array $courseCountries): array
    {
        // 知名度の高い国から先に(同じ知名度は、一覧の順のまま)
        $sorted = $levelCountries;
        usort($sorted, fn (array $a, array $b) => $a['tier'] <=> $b['tier']);

        $groups = self::split($sorted, max(1, (int) ceil(count($sorted) / self::QUESTIONS_PER_STAGE)));

        $stages = [];
        foreach ($groups as $index => $group) {
            $stages[] = self::stage($catalog, $courseKey, $code, $index + 1, null, $group, $levelCountries, $courseCountries);
        }

        $boss = array_slice(self::byHash($levelCountries, "boss:{$courseKey}:{$code}", count($levelCountries)), 0, self::QUESTIONS_PER_STAGE);
        $stages[] = self::stage($catalog, $courseKey, $code, count($groups) + 1, "{$courseName}の国旗{$level['title']}", $boss, $levelCountries, $courseCountries);

        return ['code' => $code, 'difficulty' => $level['difficulty'], 'stages' => $stages];
    }

    /** 国を、なるべく均等に、k個の組に分ける(前の組から、1つずつ多く) */
    private static function split(array $countries, int $groups): array
    {
        $base = intdiv(count($countries), $groups);
        $extra = count($countries) % $groups;

        $result = [];
        $offset = 0;
        for ($i = 0; $i < $groups; $i++) {
            $size = $base + ($i < $extra ? 1 : 0);
            $result[] = array_slice($countries, $offset, $size);
            $offset += $size;
        }

        return $result;
    }

    private static function stage(array $catalog, string $courseKey, string $code, int $number, ?string $titleReward, array $group, array $levelCountries, array $courseCountries): array
    {
        $prefix = "flag:{$courseKey}:{$code}:{$number}";
        $questions = [];

        foreach (self::primaries($group, $prefix) as $index => $country) {
            $position = $index + 1;
            $key = "{$prefix}:q{$position}";
            $salt = $key;

            if ($code === 'beginner') {
                $questions[] = self::flagToName($key, $country, self::wrongCountries($country, $code, $levelCountries, $courseCountries, $catalog, $salt));
            } elseif (in_array($position, self::FIT_POSITIONS, true)) {
                $questions[] = self::fit($key, self::fitSet($country, $code, $levelCountries, $catalog, $salt));
            } elseif ($code === 'advanced' && $position % 2 === 0) {
                $questions[] = self::flagToName($key, $country, self::wrongCountries($country, $code, $levelCountries, $courseCountries, $catalog, $salt));
            } else {
                $questions[] = self::nameToFlag($key, $country, self::wrongCountries($country, $code, $levelCountries, $courseCountries, $catalog, $salt));
            }
        }

        return ['number' => $number, 'boss' => $titleReward !== null, 'title_reward' => $titleReward, 'questions' => $questions];
    }

    /** 組の国を、10個になるまで繰り返して、名前から決まる順に並べる(同じ国が続かないように、何回目かも並べ方に入れる) */
    private static function primaries(array $group, string $salt): array
    {
        $cycle = [];
        for ($i = 0; $i < self::QUESTIONS_PER_STAGE; $i++) {
            $cycle[] = ['country' => $group[$i % count($group)], 'round' => intdiv($i, count($group))];
        }
        usort($cycle, fn (array $a, array $b) => self::hash($salt, "{$a['country']['key']}#{$a['round']}") <=> self::hash($salt, "{$b['country']['key']}#{$b['round']}"));

        return array_column($cycle, 'country');
    }

    /** まちがいの候補。上級は似ている国(足りなければ同じコースの国で足す)。ほかは、その級の国から */
    private static function wrongCountries(array $country, string $code, array $levelCountries, array $courseCountries, array $catalog, string $salt): array
    {
        if ($code === 'advanced') {
            $pool = [];
            foreach ($country['similar'] as $similarKey) {
                if (isset($catalog[$similarKey])) {
                    $pool[] = $catalog[$similarKey];
                }
            }

            return self::fill($pool, $courseCountries, $country, $salt, self::MIN_WRONG);
        }

        $candidates = array_values(array_filter($levelCountries, fn (array $other) => $other['key'] !== $country['key']));
        $pool = self::byHash($candidates, $salt, self::WRONG_POOL);

        return self::fill($pool, $courseCountries, $country, $salt, self::MIN_WRONG);
    }

    /** 候補が $min に足りなければ、コースの国から、名前から決まる順に足す(自分と、すでにある国は除く) */
    private static function fill(array $pool, array $courseCountries, array $country, string $salt, int $min): array
    {
        if (count($pool) >= $min) {
            return $pool;
        }

        $taken = array_merge([$country['key']], array_column($pool, 'key'));
        $rest = array_values(array_filter($courseCountries, fn (array $other) => ! in_array($other['key'], $taken, true)));

        return array_merge($pool, array_slice(self::byHash($rest, "{$salt}:fill", count($rest)), 0, $min - count($pool)));
    }

    /** はめ込みの4か国。アンカーと、(上級は)似ている国、残りはその級の国から */
    private static function fitSet(array $anchor, string $code, array $levelCountries, array $catalog, string $salt): array
    {
        $set = [$anchor];

        if ($code === 'advanced') {
            foreach ($anchor['similar'] as $similarKey) {
                if (count($set) < 4 && isset($catalog[$similarKey])) {
                    $set[] = $catalog[$similarKey];
                }
            }
        }

        $taken = array_column($set, 'key');
        $rest = array_values(array_filter($levelCountries, fn (array $other) => ! in_array($other['key'], $taken, true)));
        $rest = self::byHash($rest, "{$salt}:fit", count($rest));
        while (count($set) < 4) {
            $set[] = array_shift($rest);
        }

        return $set;
    }

    private static function flagToName(string $key, array $country, array $wrong): array
    {
        return [
            'key' => $key,
            'type' => 'multiple_choice',
            'prompt' => 'この国旗は、どこの国？',
            'image' => self::image($country),
            'choices' => self::choices($country, $wrong, false),
        ];
    }

    private static function nameToFlag(string $key, array $country, array $wrong): array
    {
        return [
            'key' => $key,
            'type' => 'multiple_choice',
            'prompt' => "{$country['name']}の国旗は、どれ？",
            'image' => null,
            'choices' => self::choices($country, $wrong, true),
        ];
    }

    private static function fit(string $key, array $set): array
    {
        return [
            'key' => $key,
            'type' => 'matching',
            'prompt' => '国旗を、ばんごうの国に はめよう',
            'layout' => 'slots',
            'items' => array_map(fn (array $country) => ['id' => $country['key'], 'image' => self::image($country), 'label' => $country['name']], $set),
        ];
    }

    private static function choices(array $correct, array $wrong, bool $withImage): array
    {
        return array_map(
            fn (array $country, bool $isCorrect) => ['label' => $country['name'], 'correct' => $isCorrect, 'image' => $withImage ? self::image($country) : null],
            array_merge([$correct], $wrong),
            array_merge([true], array_fill(0, count($wrong), false)),
        );
    }

    private static function image(array $country): string
    {
        return "/flag/{$country['key']}.svg";
    }

    /** 名前から決まる順に並べて、先頭から $limit 個 */
    private static function byHash(array $countries, string $salt, int $limit): array
    {
        $countries = array_values($countries);
        usort($countries, fn (array $a, array $b) => self::hash($salt, $a['key']) <=> self::hash($salt, $b['key']));

        return array_slice($countries, 0, $limit);
    }

    private static function hash(string $salt, string $key): int
    {
        return crc32("{$salt}|{$key}");
    }
}
```

- [ ] **手順4: 通す**

実行: `./vendor/bin/sail test tests/Feature/FlagQuizPlannerTest.php`
期待: すべて通る。落ちたら、テストの期待が設計書4章どおりかを先に確かめ、計画の側を直す。

- [ ] **手順5: コミット**

```bash
git add app/Support/FlagQuiz/FlagQuizPlanner.php tests/Feature/FlagQuizPlannerTest.php
git commit -m "#00340: feat:国旗クイズの計画(コース・級・ステージ・問題を、国の一覧から決まった並びで作る)を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク3: 目印の列・データベースへの書き込み（#00341）

**ファイル**
- 新規: `database/migrations/2026_10_05_000001_add_is_course_group_to_categories_table.php`、`app/Support/FlagQuiz/FlagQuizWriter.php`、`database/seeders/FlagQuizSeeder.php`、`tests/Feature/FlagQuizWriterTest.php`
- 変更: `app/Models/Category.php`、`database/seeders/DatabaseSeeder.php`

**渡すもの:** `categories.is_course_group`（真偽値・初期値は偽）、`FlagQuizWriter::write(array $plan): array{courses: int, stages: int, questions: int}`（何度実行しても重複しない）、`FlagQuizSeeder`。

- [ ] **手順1: 失敗するテストを書く**（`tests/Feature/FlagQuizWriterTest.php`。`flagTestCatalog()` は `FlagQuizPlannerTest.php` にあるので、同じファイル群で読み込まれる。単独で動かすときは、同じ関数を `tests/Pest.php` へ移してよい。移すなら、手順のコミットに含める）

```php
<?php

use App\Models\Category;
use App\Models\Question;
use App\Models\QuestionChoice;
use App\Models\Quiz;
use App\Models\Stage;
use App\Support\FlagQuiz\FlagCatalog;
use App\Support\FlagQuiz\FlagQuizPlanner;
use App\Support\FlagQuiz\FlagQuizWriter;
use Database\Seeders\FlagQuizSeeder;

/*
|--------------------------------------------------------------------------
| 国旗クイズのデータベースへの書き込み(docs/design/2026-10-05-flag-quiz-design.md 6-2)
|--------------------------------------------------------------------------
*/

it('「国旗クイズ」の大もと(目印つき)と、コースのカテゴリー・ステージ・問題を作る', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());
    $result = FlagQuizWriter::write($plan);

    $root = Category::where('name', '国旗クイズ')->whereNull('parent_id')->firstOrFail();
    expect($root->is_course_group)->toBeTrue();
    expect($root->children()->pluck('name')->all())->toBe(['アジア', 'ヨーロッパ', '世界ぜんぶ']);

    $asia = Category::where('name', 'アジア')->where('parent_id', $root->id)->firstOrFail();
    expect($asia->is_course_group)->toBeFalse();
    expect(Stage::where('category_id', $asia->id)->count())->toBe(2 + 3 + 3); // 初級(1+ボス)・中級(2+ボス)・上級(2+ボス)

    $stage = Stage::where('category_id', $asia->id)->where('difficulty', '初級')->where('stage_number', 1)->firstOrFail();
    expect([$stage->country_id, $stage->question_count, $stage->is_boss])->toBe([null, 10, false]);
    expect($stage->questions()->count())->toBe(10);

    $boss = Stage::where('category_id', $asia->id)->where('difficulty', '上級')->where('is_boss', true)->firstOrFail();
    expect($boss->title_reward)->toBe('アジアの国旗はかせ');

    expect($result['questions'])->toBe(Question::count());
    expect($result['courses'])->toBe(3);
});

it('国旗→国名の問題は問題に国旗の絵、国名→国旗は選択肢に国旗の絵、はめ込みはmatchingで作る', function () {
    FlagQuizWriter::write(FlagQuizPlanner::plan(flagTestCatalog()));

    $flagToName = Question::where('meta->flag_key', 'flag:asia:beginner:1:q1')->firstOrFail();
    expect($flagToName->type)->toBe('multiple_choice');
    expect($flagToName->meta['image'])->toStartWith('/flag/A');
    expect($flagToName->choices->where('is_correct', true))->toHaveCount(1);
    expect($flagToName->choices->pluck('meta')->filter()->all())->toBe([]);
    expect($flagToName->country_id)->toBeNull();

    $nameToFlag = Question::where('meta->flag_key', 'flag:asia:intermediate:1:q1')->firstOrFail();
    expect($nameToFlag->meta)->not->toHaveKey('image');
    expect($nameToFlag->choices->every(fn (QuestionChoice $choice) => str_starts_with($choice->meta['image'] ?? '', '/flag/')))->toBeTrue();

    $fit = Question::where('meta->flag_key', 'flag:asia:intermediate:1:q3')->firstOrFail();
    expect($fit->type)->toBe('matching');
    expect($fit->meta['layout'])->toBe('slots');
    expect($fit->meta['items'])->toHaveCount(4);
    expect($fit->choices)->toHaveCount(4);
    foreach ($fit->choices as $choice) {
        expect(collect($fit->meta['items'])->pluck('id'))->toContain($choice->meta['item_id']);
        expect($choice->is_correct)->toBeTrue();
    }
});

it('何度書いても、ステージ・問題・選択肢が増えず、番号も変わらない', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());
    FlagQuizWriter::write($plan);

    $counts = [Category::count(), Stage::count(), Question::count(), QuestionChoice::count(), Quiz::count()];
    $ids = Question::orderBy('id')->pluck('id')->all();
    $choiceIds = QuestionChoice::orderBy('id')->pluck('id')->all();

    FlagQuizWriter::write($plan);

    expect([Category::count(), Stage::count(), Question::count(), QuestionChoice::count(), Quiz::count()])->toBe($counts);
    expect(Question::orderBy('id')->pluck('id')->all())->toBe($ids);
    expect(QuestionChoice::orderBy('id')->pluck('id')->all())->toBe($choiceIds); // 中身が同じなら、選択肢も作り直さない
});

it('一覧の国名を直して書き直すと、問題と選択肢の文が直り、ステージ・問題の番号は保たれる', function () {
    FlagQuizWriter::write(FlagQuizPlanner::plan(flagTestCatalog()));
    $stageIds = Stage::orderBy('id')->pluck('id')->all();
    $questionIds = Question::orderBy('id')->pluck('id')->all();

    $catalog = flagTestCatalog();
    $catalog['A1']['name'] = 'なおした国';
    FlagQuizWriter::write(FlagQuizPlanner::plan($catalog));

    expect(Stage::orderBy('id')->pluck('id')->all())->toBe($stageIds);
    expect(Question::orderBy('id')->pluck('id')->all())->toBe($questionIds);
    expect(QuestionChoice::where('label', 'なおした国')->exists())->toBeTrue();
    expect(QuestionChoice::where('label', 'あじあ1')->exists())->toBeFalse();
});

it('今ある「国旗」のカテゴリー(国ごとの学習用)は、触らない', function () {
    $existing = Category::create(['name' => '国旗']);
    $child = Category::create(['name' => '日本', 'parent_id' => $existing->id]);

    FlagQuizWriter::write(FlagQuizPlanner::plan(flagTestCatalog()));

    expect($existing->fresh()->is_course_group)->toBeFalse();
    expect(Category::where('parent_id', $existing->id)->pluck('id')->all())->toBe([$child->id]);
});

it('本物の一覧を、Seederで書ける(何度でも)', function () {
    $this->seed(FlagQuizSeeder::class);
    $first = [Stage::count(), Question::count()];

    $this->seed(FlagQuizSeeder::class);

    expect([Stage::count(), Question::count()])->toBe($first);
    expect(Category::where('name', '国旗クイズ')->count())->toBe(1);
    expect(Category::where('name', '国旗クイズ')->first()->children()->count())->toBe(count(FlagCatalog::COURSES));
    expect(Stage::whereHas('questions')->count())->toBe(Stage::count());
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/FlagQuizWriterTest.php`
期待: 失敗（クラス・列がない）。

- [ ] **手順3: 列・書き込み・Seederを作る**

`database/migrations/2026_10_05_000001_add_is_course_group_to_categories_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** 子のカテゴリーを「コース」として選ばせる親の目印(docs/design/2026-10-05-flag-quiz-design.md 3-2) */
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->boolean('is_course_group')->default(false)->after('is_language_mode');
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('is_course_group');
        });
    }
};
```

`app/Models/Category.php`: `$fillable` に `'is_course_group'` を足し、`casts()` に `'is_course_group' => 'boolean',` を足す。

`app/Support/FlagQuiz/FlagQuizWriter.php`:

```php
<?php

namespace App\Support\FlagQuiz;

use App\Models\Category;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Stage;
use Illuminate\Support\Facades\DB;

/**
 * 国旗クイズの計画を、データベースに書く(docs/design/2026-10-05-flag-quiz-design.md 6-2)。
 * 何度実行しても重複しない。問題は meta.flag_key で見つけ、あれば更新する。選択肢は、中身が変わったときだけ作り直す。
 * 計画から消えたステージ・問題は、消さずに残す(進み具合を守るため)
 */
class FlagQuizWriter
{
    public const ROOT_NAME = '国旗クイズ';

    /** @return array{courses: int, stages: int, questions: int} */
    public static function write(array $plan): array
    {
        return DB::transaction(function () use ($plan) {
            // 問題は、meta.flag_key で見つける。1問ごとに探すと遅いので、最初に全部読んでおく
            $existing = Question::query()->whereNotNull('meta->flag_key')->get()->keyBy(fn (Question $question) => $question->meta['flag_key'])->all();

            $root = Category::updateOrCreate(['name' => self::ROOT_NAME, 'parent_id' => null], ['is_course_group' => true]);

            $stages = 0;
            $questions = 0;

            foreach ($plan as $course) {
                $category = Category::updateOrCreate(
                    ['name' => $course['name'], 'parent_id' => $root->id],
                    ['order' => $course['order']],
                );

                foreach ($course['levels'] as $level) {
                    $quiz = Quiz::firstOrCreate(
                        ['title' => self::ROOT_NAME." {$course['name']} {$level['difficulty']}"],
                        ['difficulty' => $level['difficulty'], 'is_published' => true],
                    );

                    foreach ($level['stages'] as $stagePlan) {
                        $stage = Stage::updateOrCreate(
                            ['category_id' => $category->id, 'difficulty' => $level['difficulty'], 'stage_number' => $stagePlan['number']],
                            [
                                'country_id' => null,
                                'question_count' => count($stagePlan['questions']),
                                'is_boss' => $stagePlan['boss'],
                                'title_reward' => $stagePlan['title_reward'],
                            ],
                        );

                        $pivot = [];
                        foreach ($stagePlan['questions'] as $index => $spec) {
                            $question = self::question($quiz, $spec, $index + 1, $existing);
                            $pivot[$question->id] = ['order' => $index + 1];
                            $questions++;
                        }
                        $stage->questions()->sync($pivot);
                        $stages++;
                    }
                }
            }

            return ['courses' => count($plan), 'stages' => $stages, 'questions' => $questions];
        });
    }

    private static function question(Quiz $quiz, array $spec, int $order, array &$existing): Question
    {
        $attributes = [
            'quiz_id' => $quiz->id,
            'country_id' => null,
            'type' => $spec['type'],
            'prompt' => $spec['prompt'],
            'order' => $order,
            'meta' => self::questionMeta($spec),
        ];

        $question = $existing[$spec['key']] ?? null;
        if ($question) {
            $question->update($attributes);
        } else {
            $question = $existing[$spec['key']] = Question::create($attributes);
        }

        self::syncChoices($question, self::choiceRows($spec));

        return $question;
    }

    private static function questionMeta(array $spec): array
    {
        if ($spec['type'] === 'matching') {
            return [
                'flag_key' => $spec['key'],
                'layout' => $spec['layout'],
                'items' => array_map(fn (array $item) => ['id' => $item['id'], 'image' => $item['image']], $spec['items']),
            ];
        }

        return array_filter(['flag_key' => $spec['key'], 'image' => $spec['image']], fn ($value) => $value !== null);
    }

    /** @return list<array{label: string, is_correct: bool, order: int, meta: ?array}> */
    private static function choiceRows(array $spec): array
    {
        if ($spec['type'] === 'matching') {
            return array_map(fn (array $item, int $index) => [
                'label' => $item['label'],
                'is_correct' => true,
                'order' => $index + 1,
                'meta' => ['item_id' => $item['id']],
            ], $spec['items'], array_keys($spec['items']));
        }

        return array_map(fn (array $choice, int $index) => [
            'label' => $choice['label'],
            'is_correct' => $choice['correct'],
            'order' => $index + 1,
            'meta' => $choice['image'] !== null ? ['image' => $choice['image']] : null,
        ], $spec['choices'], array_keys($spec['choices']));
    }

    private static function syncChoices(Question $question, array $rows): void
    {
        $current = $question->choices()->get()
            ->map(fn ($choice) => ['label' => $choice->label, 'is_correct' => $choice->is_correct, 'order' => $choice->order, 'meta' => $choice->meta])
            ->all();

        if ($current === $rows) {
            return;
        }

        $question->choices()->delete();
        $question->choices()->createMany($rows);
    }
}
```

`database/seeders/FlagQuizSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Support\FlagQuiz\FlagCatalog;
use App\Support\FlagQuiz\FlagQuizPlanner;
use App\Support\FlagQuiz\FlagQuizWriter;
use Illuminate\Database\Seeder;

/** 国旗クイズ(docs/design/2026-10-05-flag-quiz-design.md)。何度実行しても重複しない */
class FlagQuizSeeder extends Seeder
{
    public function run(): void
    {
        $result = FlagQuizWriter::write(FlagQuizPlanner::plan(FlagCatalog::all()));

        $this->command?->info("国旗クイズ: コース{$result['courses']}・ステージ{$result['stages']}・問題{$result['questions']}");
    }
}
```

`database/seeders/DatabaseSeeder.php` の `$this->call([...])` の最後（`WorldItemSeeder::class,` の次）に `FlagQuizSeeder::class,` を足す。

- [ ] **手順4: 通す。バックエンド全体も通す**

実行: `./vendor/bin/sail test tests/Feature/FlagQuizWriterTest.php`、続けて `./vendor/bin/sail test`
期待: すべて通る。`flagTestCatalog()` が別ファイルにあって「未定義」になるときは、`tests/Pest.php` へ移す（`FlagQuizPlannerTest.php` の同名関数は消す）。

- [ ] **手順5: コミット**

```bash
git add database/migrations/2026_10_05_000001_add_is_course_group_to_categories_table.php app/Models/Category.php app/Support/FlagQuiz/FlagQuizWriter.php database/seeders/FlagQuizSeeder.php database/seeders/DatabaseSeeder.php tests/Feature/FlagQuizWriterTest.php tests/Feature/FlagQuizPlannerTest.php tests/Pest.php
git commit -m "#00341: feat:国旗クイズを、データベースに書く(コースの目印の列・Writer・Seeder。何度書いても重複しない)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

（`git add` に、実際に変えたファイルだけを渡す。変えていないファイルは、外す。）

---

### タスク4: ミニクイズの一覧とコースの窓口（#00342）

**ファイル**
- 新規: `app/Support/Courses.php`、`tests/Feature/CoursesTest.php`
- 変更: `app/Support/MiniQuizzes.php`、`routes/api.php`、`tests/Feature/MiniQuizzesTest.php`

**渡すもの:** ミニクイズの一覧が、`is_course_group` が真の大もとは、子のステージの合計で数える。`Courses::list(Category $group, ?UserProfile $profile): array`（`[{id, name, cleared, total}]`。問題のあるステージが0のコースは出さない）。`GET /api/categories/{category}/courses`（ログイン済み。`is_course_group` が偽なら404）。

- [ ] **手順1: 失敗するテストを書く**

`tests/Feature/MiniQuizzesTest.php` に追記（既存の `miniQuizCategory` を使う）:

```php
it('コース親(is_course_group)は、子のステージの合計で数える。stage_countも合計', function () {
    createActiveProfile();
    $group = Category::create(['name' => '国旗クイズ', 'is_course_group' => true]);
    miniQuizCategory('アジア', 2, ['parent' => $group->id]);
    miniQuizCategory('ヨーロッパ', 2, ['parent' => $group->id]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([
        ['id' => $group->id, 'name' => '国旗クイズ', 'stage_count' => 4],
    ]);
});

it('合計が足りないコース親・目印のない親は、出さない(今の「国旗」のように子にステージがあっても出ない)', function () {
    createActiveProfile();
    $few = Category::create(['name' => 'すこし', 'is_course_group' => true]);
    miniQuizCategory('ひとつ', 2, ['parent' => $few->id]);
    $plain = Category::create(['name' => '国旗']);
    miniQuizCategory('日本', 5, ['parent' => $plain->id]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([]);
});

it('コース親の子のうち、鍵の国のステージは数えない', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $group = Category::create(['name' => 'まとめ', 'is_course_group' => true]);
    miniQuizCategory('ふつう', 2, ['parent' => $group->id]);
    miniQuizCategory('アメリカの', 2, ['parent' => $group->id, 'country' => $us->id]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([]);

    $profile->trips()->create(['destination' => 'us', 'arrived_at' => now()]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertJsonPath('0.stage_count', 4);
});
```

`tests/Feature/CoursesTest.php`:

```php
<?php

use App\Models\Category;
use App\Models\ProfileStageProgress;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| コースの一覧(docs/design/2026-10-05-flag-quiz-design.md 7-3)
|--------------------------------------------------------------------------
*/

it('コース親の子を、order順に、クリアしたステージの数と全部の数つきで返す', function () {
    $profile = createActiveProfile();
    $group = Category::create(['name' => '国旗クイズ', 'is_course_group' => true]);
    $second = miniQuizCategory('ヨーロッパ', 2, ['parent' => $group->id, 'order' => 2]);
    $first = miniQuizCategory('アジア', 3, ['parent' => $group->id, 'order' => 1]);

    $cleared = Stage::where('category_id', $first->id)->orderBy('stage_number')->first();
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $cleared->id, 'cleared_at' => now(), 'best_score' => 10, 'attempts' => 1]);

    $this->getJson("/api/categories/{$group->id}/courses")->assertOk()->assertExactJson([
        ['id' => $first->id, 'name' => 'アジア', 'cleared' => 1, 'total' => 3],
        ['id' => $second->id, 'name' => 'ヨーロッパ', 'cleared' => 0, 'total' => 2],
    ]);
});

it('問題のあるステージが無いコースは出さない', function () {
    createActiveProfile();
    $group = Category::create(['name' => '国旗クイズ', 'is_course_group' => true]);
    miniQuizCategory('からっぽ', 3, ['parent' => $group->id, 'questions' => false]);

    $this->getJson("/api/categories/{$group->id}/courses")->assertOk()->assertExactJson([]);
});

it('別のプレイヤーのクリアは数えない', function () {
    $profile = createActiveProfile();
    $group = Category::create(['name' => '国旗クイズ', 'is_course_group' => true]);
    $course = miniQuizCategory('アジア', 1, ['parent' => $group->id]);
    $other = createFamilyMember($profile);
    $stage = Stage::where('category_id', $course->id)->first();
    ProfileStageProgress::create(['user_profile_id' => $other->id, 'stage_id' => $stage->id, 'cleared_at' => now(), 'best_score' => 10, 'attempts' => 1]);

    $this->getJson("/api/categories/{$group->id}/courses")->assertOk()->assertJsonPath('0.cleared', 0);
});

it('コース親でないカテゴリーは404', function () {
    createActiveProfile();
    $plain = Category::create(['name' => '国旗']);

    $this->getJson("/api/categories/{$plain->id}/courses")->assertStatus(404);
});

it('ログインしていないと401', function () {
    $group = Category::create(['name' => '国旗クイズ', 'is_course_group' => true]);

    $this->getJson("/api/categories/{$group->id}/courses")->assertStatus(401);
});
```

（`CoursesTest.php` は `miniQuizCategory` を使うので、`MiniQuizzesTest.php` と同じファイル群で読み込まれる。単独で動かして「未定義」になったら、`miniQuizCategory` を `tests/Pest.php` へ移す。`ProfileStageProgress::create` の項目が足りないときは、`tests/Pest.php` の `clearCountryStage` の作り方に合わせる。）

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/MiniQuizzesTest.php tests/Feature/CoursesTest.php`
期待: 失敗。

- [ ] **手順3: 実装する**

`app/Support/MiniQuizzes.php` の `list` の、`Category::query()...->get()->filter(...)->map(...)` の部分を、次に置き換える（`$counts` の計算までは、そのまま）:

```php
        $roots = Category::query()
            ->whereNull('parent_id')
            ->orderBy('order')
            ->orderBy('id')
            ->get();

        // コース親(is_course_group)は、子のステージも合計に入れる(docs/design/2026-10-05-flag-quiz-design.md 3-2)
        $groupIds = $roots->where('is_course_group', true)->pluck('id');
        $childrenByParent = $groupIds->isEmpty()
            ? collect()
            : Category::query()->whereIn('parent_id', $groupIds)->get(['id', 'parent_id'])->groupBy('parent_id');

        return $roots
            ->map(function (Category $category) use ($counts, $childrenByParent) {
                $total = (int) ($counts[$category->id] ?? 0);
                if ($category->is_course_group) {
                    $total += ($childrenByParent[$category->id] ?? collect())->sum(fn (Category $child) => (int) ($counts[$child->id] ?? 0));
                }

                return ['category' => $category, 'total' => $total];
            })
            ->filter(fn (array $row) => $row['total'] >= $min)
            ->map(fn (array $row) => [
                'id' => $row['category']->id,
                'name' => $row['category']->name,
                'stage_count' => $row['total'],
            ])
            ->values()
            ->all();
```

（`$min = (int) config(...)` の行は、この前にある。クラスのコメントに「コース親は子のステージも数える」を1行足す。）

`app/Support/Courses.php`:

```php
<?php

namespace App\Support;

use App\Models\Category;
use App\Models\ProfileStageProgress;
use App\Models\Stage;
use App\Models\UserProfile;

/**
 * コースの一覧(docs/design/2026-10-05-flag-quiz-design.md 7-3)。
 * コース親(is_course_group)の子を、order の順に、問題のあるステージの数(total)と、今のプレイヤーがクリアした数(cleared)つきで返す。
 * 鍵の国のステージは数えない(ステージ一覧の窓口と同じ決まり)
 */
class Courses
{
    /** @return list<array{id: int, name: string, cleared: int, total: int}> */
    public static function list(Category $group, ?UserProfile $profile): array
    {
        $locked = Travel::lockedCountryIds($profile);
        $children = $group->children()->get();

        $stageIdsByCourse = Stage::query()
            ->whereIn('category_id', $children->pluck('id'))
            ->whereHas('questions')
            ->when($locked !== [], fn ($query) => $query->where(
                fn ($query) => $query->whereNull('country_id')->orWhereNotIn('country_id', $locked),
            ))
            ->get(['id', 'category_id'])
            ->groupBy('category_id')
            ->map(fn ($stages) => $stages->pluck('id')->all());

        $clearedIds = $profile
            ? ProfileStageProgress::query()
                ->where('user_profile_id', $profile->id)
                ->whereNotNull('cleared_at')
                ->pluck('stage_id')
                ->all()
            : [];

        return $children
            ->map(function (Category $course) use ($stageIdsByCourse, $clearedIds) {
                $stageIds = $stageIdsByCourse[$course->id] ?? [];

                return [
                    'id' => $course->id,
                    'name' => $course->name,
                    'cleared' => count(array_intersect($stageIds, $clearedIds)),
                    'total' => count($stageIds),
                ];
            })
            ->filter(fn (array $course) => $course['total'] > 0)
            ->values()
            ->all();
    }
}
```

`routes/api.php`（`use App\Support\Courses;` を use の並びに足す。ミニクイズの窓口の近く）:

```php
// 国旗クイズなどの「コース」の一覧(docs/design/2026-10-05-flag-quiz-design.md 7-3)
Route::middleware(['auth:sanctum'])->get('/categories/{category}/courses', function (Request $request, Category $category) {
    abort_unless($category->is_course_group, 404);

    return Courses::list($category, ActiveProfile::find($request));
})->name('categories.courses');
```

- [ ] **手順4: 通す。バックエンド全体も通す**

実行: `./vendor/bin/sail test tests/Feature/MiniQuizzesTest.php tests/Feature/CoursesTest.php`、続けて `./vendor/bin/sail test`
期待: すべて通る。

- [ ] **手順5: コミット**

```bash
git add app/Support/Courses.php app/Support/MiniQuizzes.php routes/api.php tests/Feature/MiniQuizzesTest.php tests/Feature/CoursesTest.php tests/Pest.php
git commit -m "#00342: feat:ミニクイズの一覧にコース親(子のステージの合計)を加え、コースの一覧の窓口を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク5: 画面の計算（はめ込み・選択肢・コース）（#00343）

**ファイル**
- 新規: `frontend/src/lib/flag-fit.ts`、`flag-fit.test.ts`、`frontend/src/lib/flag-quiz.ts`、`flag-quiz.test.ts`

**渡すもの（`flag-fit.ts`）:** `type FitItem = { id: string; image: string }`、`type FitChoice = { id: number; label: string }`、`type FitResult = { item_id: string; correct: boolean; correct_choice_id: number }`、`emptySlots(count): (string | null)[]`、`placeFlag(slots, itemId)`、`removeFlag(slots, itemId)`、`slotsFull(slots)`、`slotAnswers(slots, choices): { item_id: string; choice_id: number }[]`（全部入っているときだけ）、`unplacedItems(items, slots)`、`seededOrder(items, seed)`、`correctItemId(results, choiceId): string | null`、`SLOT_MARKS`（①〜④）。**（`flag-quiz.ts`）:** `hasImageChoices(choices)`、`isFlagImage(src)`、`COURSE_FLAGS`（コース名 → 絵）、`WORLD_COURSE_NAME`（"世界ぜんぶ"）、`WORLD_COURSE_NOTE`（"ちょうむずかしい"）。

- [ ] **手順1: 失敗するテストを書く**

`frontend/src/lib/flag-fit.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  SLOT_MARKS,
  correctItemId,
  emptySlots,
  placeFlag,
  removeFlag,
  seededOrder,
  slotAnswers,
  slotsFull,
  unplacedItems,
} from "./flag-fit";

describe("はめ込み(国旗を番号の枠に入れる)", () => {
  it("国旗をタップすると、いちばん上の空いている枠に入る", () => {
    let slots = emptySlots(4);
    slots = placeFlag(slots, "Japan");
    slots = placeFlag(slots, "Turkey");

    expect(slots).toEqual(["Japan", "Turkey", null, null]);
  });

  it("入れた国旗をもう一度タップ(取り出す)と、枠が空いて、次に入れた国旗はその枠に入る", () => {
    let slots = placeFlag(placeFlag(placeFlag(emptySlots(4), "A"), "B"), "C");
    slots = removeFlag(slots, "B");

    expect(slots).toEqual(["A", null, "C", null]);
    expect(placeFlag(slots, "D")).toEqual(["A", "D", "C", null]);
  });

  it("同じ国旗は2回入らない。全部の枠が埋まっていれば、何も起きない", () => {
    const one = placeFlag(emptySlots(2), "A");
    expect(placeFlag(one, "A")).toBe(one);

    const full = placeFlag(one, "B");
    expect(placeFlag(full, "C")).toBe(full);
  });

  it("全部入ったかの判定", () => {
    expect(slotsFull(["A", null])).toBe(false);
    expect(slotsFull(["A", "B"])).toBe(true);
    expect(slotsFull([])).toBe(true);
  });

  it("答えは、枠の番号の順の選択肢と、入れた国旗の組。全部入っていなければ空", () => {
    const choices = [
      { id: 11, label: "日本" },
      { id: 12, label: "トルコ" },
    ];

    expect(slotAnswers(["Turkey", "Japan"], choices)).toEqual([
      { item_id: "Turkey", choice_id: 11 },
      { item_id: "Japan", choice_id: 12 },
    ]);
    expect(slotAnswers(["Turkey", null], choices)).toEqual([]);
  });

  it("下に残る国旗は、まだ入れていないもの(順番はそのまま)", () => {
    const items = [
      { id: "A", image: "/flag/A.svg" },
      { id: "B", image: "/flag/B.svg" },
      { id: "C", image: "/flag/C.svg" },
    ];

    expect(unplacedItems(items, ["B", null, null]).map((item) => item.id)).toEqual(["A", "C"]);
  });

  it("並べ替えは、同じ番号なら同じ並び。要素は失われず、もとの配列は変えない", () => {
    const items = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }));

    const first = seededOrder(items, 7);
    expect(seededOrder(items, 7)).toEqual(first);
    expect([...first].map((item) => item.id).sort()).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(items.map((item) => item.id)).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(seededOrder(items, 8)).not.toEqual(first);
  });

  it("答え合わせのあと、枠の選択肢の正しい国旗がどれかを引ける", () => {
    const results = [
      { item_id: "Japan", correct: false, correct_choice_id: 11 },
      { item_id: "Turkey", correct: true, correct_choice_id: 12 },
    ];

    expect(correctItemId(results, 11)).toBe("Japan");
    expect(correctItemId(results, 99)).toBeNull();
    expect(correctItemId(null, 11)).toBeNull();
  });

  it("番号の印は、①〜④", () => {
    expect(SLOT_MARKS).toEqual(["①", "②", "③", "④"]);
  });
});
```

`frontend/src/lib/flag-quiz.test.ts`:

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { COURSE_FLAGS, WORLD_COURSE_NAME, WORLD_COURSE_NOTE, hasImageChoices, isFlagImage } from "./flag-quiz";

describe("国旗クイズの画面の判定", () => {
  it("国旗の絵のある選択肢が1つでもあれば、国旗の選択肢として描く", () => {
    expect(hasImageChoices([{ id: 1, label: "日本", meta: { image: "/flag/Japan.svg" } }])).toBe(true);
    expect(hasImageChoices([{ id: 1, label: "日本", meta: null }, { id: 2, label: "韓国" }])).toBe(false);
    expect(hasImageChoices([])).toBe(false);
  });

  it("/flag/ の絵は、切り取らずに全体を見せる", () => {
    expect(isFlagImage("/flag/Japan.svg")).toBe(true);
    expect(isFlagImage("/heritage/jp/mt-fuji.jpg")).toBe(false);
  });

  it("コースの絵は、7つのコースぶんあり、絵のファイルが実在する", () => {
    expect(Object.keys(COURSE_FLAGS)).toEqual(["アジア", "ヨーロッパ", "アフリカ", "北アメリカ", "南アメリカ", "オセアニア", WORLD_COURSE_NAME]);
    for (const src of Object.values(COURSE_FLAGS)) {
      expect(existsSync(join(__dirname, "../../public", src))).toBe(true);
    }
    expect(WORLD_COURSE_NOTE).toBe("ちょうむずかしい");
  });
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `cd frontend && npx vitest run src/lib/flag-fit.test.ts src/lib/flag-quiz.test.ts`
期待: 失敗（ファイルがない）。

- [ ] **手順3: 実装する**

`frontend/src/lib/flag-fit.ts`:

```ts
// 国旗のはめ込み(番号の枠に、下の国旗をタップで入れる。docs/design/2026-10-05-flag-quiz-design.md 7-2)。画面を描かない部分だけをここに置く

export type FitItem = { id: string; image: string };
export type FitChoice = { id: number; label: string };
export type FitResult = { item_id: string; correct: boolean; correct_choice_id: number };

/** 枠の番号の印 */
export const SLOT_MARKS = ["①", "②", "③", "④"] as const;

/** 枠の中身。入れた国旗の番号(item.id)、空なら null */
export function emptySlots(count: number): (string | null)[] {
  return Array.from({ length: count }, () => null);
}

/** 国旗を、いちばん上の空いている枠に入れる。入っている国旗・全部埋まっているときは、そのまま返す */
export function placeFlag(slots: (string | null)[], itemId: string): (string | null)[] {
  if (slots.includes(itemId)) return slots;
  const index = slots.indexOf(null);
  if (index < 0) return slots;
  return slots.map((slot, i) => (i === index ? itemId : slot));
}

/** 入れた国旗を取り出して、枠を空ける */
export function removeFlag(slots: (string | null)[], itemId: string): (string | null)[] {
  return slots.map((slot) => (slot === itemId ? null : slot));
}

export function slotsFull(slots: (string | null)[]): boolean {
  return slots.every((slot) => slot !== null);
}

/** 答え合わせに送る組。枠の番号の順の選択肢と、入れた国旗。全部入っていなければ空 */
export function slotAnswers(slots: (string | null)[], choices: FitChoice[]): { item_id: string; choice_id: number }[] {
  if (!slotsFull(slots)) return [];
  return slots.map((itemId, index) => ({ item_id: itemId as string, choice_id: choices[index].id }));
}

/** 下に並べる国旗(まだ枠に入れていないもの) */
export function unplacedItems<T extends { id: string }>(items: T[], slots: (string | null)[]): T[] {
  return items.filter((item) => !slots.includes(item.id));
}

/** 番号から決まる並べ替え(同じ番号なら同じ並び)。もとの配列は変えない */
export function seededOrder<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = (seed >>> 0) || 1;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 答え合わせの結果から、その選択肢(枠)の正しい国旗の番号を引く */
export function correctItemId(results: FitResult[] | null, choiceId: number): string | null {
  return results?.find((result) => result.correct_choice_id === choiceId)?.item_id ?? null;
}
```

`frontend/src/lib/flag-quiz.ts`:

```ts
// 国旗クイズの画面の判定(docs/design/2026-10-05-flag-quiz-design.md 7章)。画面を描かない部分だけをここに置く

export const WORLD_COURSE_NAME = "世界ぜんぶ";
export const WORLD_COURSE_NOTE = "ちょうむずかしい";

/** コースのカードに出す絵(国旗。世界ぜんぶは地球) */
export const COURSE_FLAGS: Record<string, string> = {
  アジア: "/flag/Japan.svg",
  ヨーロッパ: "/flag/France.svg",
  アフリカ: "/flag/South-Africa.svg",
  北アメリカ: "/flag/United-States.svg",
  南アメリカ: "/flag/Brazil.svg",
  オセアニア: "/flag/Australia.svg",
  [WORLD_COURSE_NAME]: "/globe.svg",
};

/** 国旗の絵のある選択肢が1つでもあれば、国旗の選択肢として描く */
export function hasImageChoices(choices: { meta?: { image?: string } | null }[]): boolean {
  return choices.some((choice) => Boolean(choice.meta?.image));
}

/** 国旗の絵は、切り取らずに全体を見せる(写真は、これまでどおり切り取り) */
export function isFlagImage(src: string): boolean {
  return src.startsWith("/flag/");
}
```

- [ ] **手順4: 通す**

実行: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
期待: すべて通る。

- [ ] **手順5: コミット**

```bash
git add frontend/src/lib/flag-fit.ts frontend/src/lib/flag-fit.test.ts frontend/src/lib/flag-quiz.ts frontend/src/lib/flag-quiz.test.ts
git commit -m "#00343: feat:国旗クイズの画面の計算(はめ込みの入れ方・戻し方・結果、国旗の選択肢の判定、コースの絵)を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク6: 画面（国旗の選択肢・はめ込み）（#00344）

**ファイル**
- 新規: `frontend/src/components/app/flag-fit-question.tsx`
- 変更: `frontend/src/components/quiz/types.ts`、`frontend/src/components/quiz/quiz-session.tsx`

**使うもの:** タスク5の `flag-fit.ts`・`flag-quiz.ts`。この画面は見た目と動きの確認が中心なので、新しいテストは足さない（計算はタスク5でテスト済み）。

- [ ] **手順1: 型を直す**（`quiz/types.ts`）

```ts
export type QuizChoice = { id: number; label: string; meta?: { image?: string } | null };
```

`QuizQuestion.meta` に `layout?: "slots";` を足す（`image?: string;` の下）。

- [ ] **手順2: はめ込みの部品を作る**（`components/app/flag-fit-question.tsx`）

```tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button } from "@/components/app/button";
import type { MatchingChoice, MatchingItem, MatchingResult } from "@/components/app/matching-question";
import {
  SLOT_MARKS,
  correctItemId,
  emptySlots,
  placeFlag,
  removeFlag,
  seededOrder,
  slotAnswers,
  slotsFull,
  unplacedItems,
} from "@/lib/flag-fit";
import { cn } from "@/lib/utils";

type Props = {
  questionId: number;
  items: MatchingItem[];
  choices: MatchingChoice[];
  answered: boolean;
  results: MatchingResult[] | null;
  submitting: boolean;
  onSubmit: (answers: { item_id: string; choice_id: number }[]) => void;
};

/** 国旗の絵(3:2)。切り取らずに全体を見せる */
function Flag({ src, className }: { src: string; className?: string }) {
  return (
    <span className={cn("relative block aspect-[3/2] overflow-hidden rounded-sm border border-[#e8dfcf] bg-white", className)}>
      <Image src={src} alt="" fill sizes="120px" className="object-contain" />
    </span>
  );
}

/**
 * 国旗のはめ込み(docs/design/2026-10-05-flag-quiz-design.md 7-2)。
 * 上に番号つきの国名の枠。下の国旗をタップすると、いちばん上の空いている枠に入る。入れた国旗をタップすると戻る。
 * 全部入ったら、自動で答え合わせ(送れなかったときのために「答え合わせ」のボタンも出す)
 */
export function FlagFitQuestion({ questionId, items, choices, answered, results, submitting, onSubmit }: Props) {
  const [slots, setSlots] = useState(() => emptySlots(choices.length));
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const tray = useMemo(() => seededOrder(items, questionId), [items, questionId]);
  const resultByItem = new Map((results ?? []).map((result) => [result.item_id, result]));
  const full = slotsFull(slots);
  const remaining = unplacedItems(tray, slots);

  function submit(next: (string | null)[]) {
    if (answered || submitting) return;
    onSubmit(slotAnswers(next, choices));
  }

  function handleFlagTap(itemId: string) {
    if (answered || submitting) return;
    const next = placeFlag(slots, itemId);
    if (next === slots) return;
    setSlots(next);
    if (slotsFull(next)) submit(next);
  }

  function handleSlotTap(itemId: string | null) {
    if (answered || submitting || itemId === null) return;
    setSlots(removeFlag(slots, itemId));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        {choices.map((choice, index) => {
          const placedId = slots[index];
          const placed = placedId ? itemById.get(placedId) : null;
          const result = placedId ? resultByItem.get(placedId) : undefined;
          const correctId = answered && result && !result.correct ? correctItemId(results, choice.id) : null;
          const correctItem = correctId ? itemById.get(correctId) : null;

          return (
            <button
              key={choice.id}
              type="button"
              disabled={answered || submitting || placedId === null}
              onClick={() => handleSlotTap(placedId)}
              aria-label={placed ? `${SLOT_MARKS[index]} ${choice.label}。入れた国旗を戻す` : `${SLOT_MARKS[index]} ${choice.label}。国旗を入れる枠`}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 border-b-4 border-dashed bg-white p-3 text-center transition-colors disabled:pointer-events-none",
                placed ? "border-solid border-[#2b6fa3] bg-[#e6f1f9]" : "border-[#c9b98f]",
                answered && result?.correct && "border-solid border-[#3b7f26] bg-[#e5f4dc]",
                answered && result && !result.correct && "border-solid border-[#c9573b] bg-[#fde6de]",
              )}
            >
              <span className="flex items-center gap-1 text-base font-black text-[#3b3226]">
                <span aria-hidden>{SLOT_MARKS[index]}</span>
                <AutoFurigana text={choice.label} />
              </span>
              {placed ? (
                <Flag src={placed.image} className="w-24" />
              ) : (
                <span className="flex aspect-[3/2] w-24 items-center justify-center rounded-sm border-2 border-dashed border-[#c9b98f] text-xl text-[#c9b98f]" aria-hidden>
                  ？
                </span>
              )}
              {answered && result && (
                <span aria-hidden className="text-sm font-black">
                  {result.correct ? "✓" : "✕"}
                </span>
              )}
              {correctItem && (
                <span className="flex flex-col items-center gap-1 text-[11px] font-bold text-[#6b5d45]">
                  <AutoFurigana text="正しい国旗" />
                  <Flag src={correctItem.image} className="w-16" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!answered && (
        <div className="flex flex-col gap-2">
          <p className="text-center text-xs font-bold text-[#6b5d45]">
            <AutoFurigana text="国旗をタップして、枠に入れよう" />
          </p>
          <div className="grid min-h-16 grid-cols-2 gap-3 sm:grid-cols-4">
            {remaining.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={submitting}
                onClick={() => handleFlagTap(item.id)}
                aria-label="国旗を枠に入れる"
                className="flex items-center justify-center rounded-xl border-2 border-b-4 border-[#e8dfcf] bg-white p-2 transition-transform active:translate-y-0.5 disabled:opacity-60"
              >
                <Flag src={item.image} className="w-24" />
              </button>
            ))}
          </div>
        </div>
      )}

      {!answered && full && (
        <Button variant="primary" size="lg" disabled={submitting} onClick={() => submit(slots)}>
          答え合わせ
        </Button>
      )}
    </div>
  );
}
```

- [ ] **手順3: クイズの画面を直す**（`quiz/quiz-session.tsx`）

1. import に追加: `import { FlagFitQuestion } from "@/components/app/flag-fit-question";`、`import { hasImageChoices, isFlagImage } from "@/lib/flag-quiz";`
2. 問題の絵（`question.meta?.image ? (...)`）の `<Image ... className="object-cover" />` を、`className={isFlagImage(question.meta.image) ? "object-contain bg-white" : "object-cover"}` にする。
3. `question.type === "matching" ? (<MatchingQuestion ... />)` を、国旗のはめ込みのとき `FlagFitQuestion` にする:

```tsx
          {question.type === "matching" && question.meta?.layout === "slots" ? (
            <FlagFitQuestion
              key={question.id}
              questionId={question.id}
              items={question.meta?.items ?? []}
              choices={question.choices}
              answered={answered}
              results={matchingResults}
              submitting={submitting}
              onSubmit={handleMatchingSubmit}
            />
          ) : question.type === "matching" ? (
            <MatchingQuestion ... />   (今のまま)
```

4. 4択の選択肢の並び（`<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">`）を、国旗の選択肢のとき、スマホでも2列にする: `className={hasImageChoices(question.choices) ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}`。
5. 選択肢のボタンの中身（`<ChoiceLabel label={choice.label} />`）を、国旗の絵のある選択肢は国旗にする:

```tsx
                    {choice.meta?.image ? (
                      <span className="flex flex-col items-center gap-1">
                        <span className="relative block aspect-[3/2] w-28 overflow-hidden rounded-sm border border-[#e8dfcf] bg-white">
                          <Image src={choice.meta.image} alt={choice.label} fill sizes="112px" className="object-contain" />
                        </span>
                        {answered && (
                          <span className="text-xs">
                            <AutoFurigana text={choice.label} />
                          </span>
                        )}
                      </span>
                    ) : (
                      <ChoiceLabel label={choice.label} />
                    )}
```

- [ ] **手順4: 通す**

実行: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
期待: すべて通る。

- [ ] **手順5: コミット**

```bash
git add frontend/src/components/app/flag-fit-question.tsx frontend/src/components/quiz/types.ts frontend/src/components/quiz/quiz-session.tsx
git commit -m "#00344: feat:クイズの画面に、国旗の選択肢(絵のボタン)と、番号の枠に国旗を入れるはめ込みを足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク7: コースの選択（#00345）

**ファイル**
- 新規: `frontend/src/components/quiz/course-select.tsx`
- 変更: `frontend/src/app/play/[id]/page.tsx`

**使うもの:** タスク4の `GET /api/categories/{id}/courses`、`categories.is_course_group`（`GET /api/categories` に含まれる）、タスク5の `COURSE_FLAGS`・`WORLD_COURSE_*`、既存の `achievementText`・`achievementRatio`（`components/learn/country-cards.ts`）。

- [ ] **手順1: コースのカードを作る**（`components/quiz/course-select.tsx`）

```tsx
import Image from "next/image";
import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { achievementRatio, achievementText } from "@/components/learn/country-cards";
import { COURSE_FLAGS, WORLD_COURSE_NAME, WORLD_COURSE_NOTE } from "@/lib/flag-quiz";

/** GET /api/categories/{id}/courses の1件 */
export type Course = { id: number; name: string; cleared: number; total: number };

/** コースの選択(国旗クイズの、大陸ごとのコース。docs/design/2026-10-05-flag-quiz-design.md 7-3) */
export function CourseSelect({ courses }: { courses: Course[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {courses.map((course) => {
        const text = achievementText(course);
        const src = COURSE_FLAGS[course.name];

        return (
          <Link
            key={course.id}
            href={`/play/${course.id}`}
            className="relative flex flex-col items-center gap-2 rounded-2xl border-2 border-b-4 border-[#e8dfcf] bg-[#fffaf0] p-3 text-center shadow-lg transition-transform active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b6fa3] focus-visible:ring-offset-2"
          >
            {src && (
              <span className="relative block aspect-[3/2] w-full max-w-28 overflow-hidden rounded-md border border-[#e8dfcf] bg-white">
                <Image src={src} alt="" fill sizes="112px" className="object-contain" />
              </span>
            )}
            <span className="text-base font-black text-[#3b3226]">
              <AutoFurigana text={course.name} />
            </span>
            {course.name === WORLD_COURSE_NAME && (
              <span className="rounded-full bg-[#c2402c] px-2 py-0.5 text-[10px] font-black text-white">
                <AutoFurigana text={WORLD_COURSE_NOTE} />
              </span>
            )}
            <span className="h-2 w-full overflow-hidden rounded-full bg-[#e8dfcf]" aria-hidden>
              <span className="block h-full rounded-full bg-[#5bb33e]" style={{ width: `${achievementRatio(course) * 100}%` }} />
            </span>
            {text && <span className="text-xs font-bold text-[#6b5d45]">{text}</span>}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **手順2: ステージの選択の画面を直す**（`app/play/[id]/page.tsx`）

1. `Category` 型に `is_course_group: boolean;` を足す。import に `CourseSelect, type Course`（`@/components/quiz/course-select`）を足す。
2. state を足す: `const [courses, setCourses] = useState<Course[] | null>(null);`、`const [courseParent, setCourseParent] = useState<Category | null>(null);`
3. カテゴリーの取得の `.then` で、見つけたカテゴリーの親が `is_course_group` のとき、`courseParent` に入れる:

```tsx
        const categories: Category[] = await res.json();
        const found = categories.find((c) => String(c.id) === id) ?? null;
        setCategory(found);
        const parent = found?.parent_id ? categories.find((c) => c.id === found.parent_id) : undefined;
        setCourseParent(parent?.is_course_group ? parent : null);
```

4. コースの取得の effect を足す（`category` を使う前のフックの並びに。lint のため、state は取得のあとの関数の中で入れる）:

```tsx
  const isCourseGroup = category?.is_course_group === true;
  useEffect(() => {
    if (!isCourseGroup) return;
    apiFetch(`/api/categories/${id}/courses`).then(async (res) => {
      if (res.ok) setCourses(await res.json());
    });
  }, [id, isCourseGroup]);
```

5. 今の `if (category === undefined) { return <LoadingScreen /> }` のすぐ後に、コース親の分岐を足す:

```tsx
  if (category?.is_course_group) {
    return (
      <SkyPage>
        <AppHeader />
        <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-12 pb-24">
          <div>
            <BackLink href="/learn" label="学ぶにもどる" />
            <SkyTitle className="mt-2 text-3xl">{category.name}</SkyTitle>
            <SkyText muted className="mt-1 text-sm">
              <AutoFurigana text="どの大陸にする？" />
            </SkyText>
          </div>
          {courses === null ? <SpruLoading /> : <CourseSelect courses={courses} />}
        </div>
        <BottomNav />
      </SkyPage>
    );
  }
```

6. 今のステージ選択の画面の戻るリンク（ページの上の `<BackLink />`）を、コースの中のときは、コース選びへ戻す: `<BackLink {...(courseParent ? { href: `/play/${courseParent.id}`, label: "コースえらびにもどる" } : {})} />`。

（`category` が `undefined` のときの分岐の前に `category?.is_course_group` を読まないこと。`AutoFurigana`・`SkyText`・`SpruLoading`・`BottomNav`・`BackLink` は、このファイルで既に import されているか確かめ、無ければ足す。）

- [ ] **手順3: 通す**

実行: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
期待: すべて通る。

- [ ] **手順4: コミット**

```bash
git add frontend/src/components/quiz/course-select.tsx "frontend/src/app/play/[id]/page.tsx"
git commit -m "#00345: feat:国旗クイズのコース選択(大陸ごとのカード・進み具合)と、コースの中からの戻り導線を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク8: ドキュメント（#00346）

**ファイル**
- 変更: `SPEC.md`、`TASKS.md`

- [ ] **手順1:** `SPEC.md` の 4-4c に、国旗クイズ（コース・級ごとの問題・はめ込み・国連加盟193か国・`is_course_group`・`GET /api/categories/{id}/courses`・Seeder `FlagQuizSeeder`・国の一覧 `database/data/flag-countries.php`）と、ミニクイズの出す条件（コース親は子のステージの合計）を書く。実装の状況（✅）は、ブラウザ確認のあとに付ける。
- [ ] **手順2:** `TASKS.md` の「Ownerの改善案（2026-10-04）」の ③ を完了にし（設計書・計画書へのリンクと日付）、④は残す。Owner側のタスクに「国旗クイズの国名・知名度・似ている国の確認（`database/data/flag-countries.php`。公開前）」を足す。「公開後に随時」に、このとき見つけた小さな点があれば足す。
- [ ] **手順3:** コミット

```bash
git add SPEC.md TASKS.md
git commit -m "#00346: docs:SPEC・TASKSに国旗クイズを書く" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## 登録とブラウザでの確認（全タスクのあと）

Sail（`./vendor/bin/sail up -d`）と、開発サーバー（`cd frontend && npm run dev -- -p 3000`）が立っていることを確かめる。

1. **登録:** 足すだけのマイグレーション `./vendor/bin/sail artisan migrate`、続けて `./vendor/bin/sail artisan db:seed --class=FlagQuizSeeder`（`migrate:fresh` は使わない）。コース・ステージ・問題の数を、出力と `tinker` で確かめる。もう一度 `db:seed --class=FlagQuizSeeder` を実行して、数が増えないことを確かめる。
2. **引き出し:** 町テスト（id 7）で `/learn` の右の引き出しを開く。ミニクイズに「国旗クイズ」が出る（英語は、アメリカ・イギリスに着いていなければ出ない）。今の「国旗」は出ない。
3. **コース:** 「国旗クイズ」を押すと、7つのコースのカードが出る（絵・進み具合・世界ぜんぶに「ちょうむずかしい」）。アジアを選ぶと、初級・中級・上級の選択が出る（中級・上級は、鍵）。「コースえらびにもどる」で戻れる。
4. **初級:** ステージ1を始める。国旗の絵が問題に出て、国名の4択。正解・不正解が出る。10問を終えて、結果が出る。
5. **中級・上級:** ボスまでクリアして、次の級が開くことを確かめる（時間が長いので、確認用に、町テストの進み具合の行を足して開ける。確認のあとに消す）。中級のステージで、国名→国旗（2×2の絵のボタン）と、3問目のはめ込み（国旗をタップで枠へ・取り出し・4つ入れて自動で答え合わせ・○×・まちがいの枠に正しい国旗）を確かめる。上級で、選択肢に似た国旗が入ることを確かめる。
6. **スマホ幅:** 幅390pxで、はみ出さず、押しやすいか。ふりがな・大きい文字の設定ありでも。
7. 画像は `.playwright-mcp/` の下だけに、フォルダ名から書いて保存し、見たら消す。

## 確認のあとに戻すもの（開発データベース）

国旗クイズのコース・ステージ・問題は、中身のデータなので、**残す**（Ownerも使える）。町テスト（id 7）の、遊んで増えた分（経験値・ポイント・台帳・遊んだ回・ステージの進み具合・称号・問題の覚え具合・お使い・遊んだ時間・旅の行など）を、基準（xp 20・coins 60・hp 20・points 95・level 1・bloom_base_level 1・best_streak 2・current_streak 2・last_played_date 2026-09-27・last_correct_on null・combo 3・best_combo 5・last_review_on null・reviews_completed 0・台帳の最大 668・memories 2・trips 0・plays 0・world_items 4・お使いの最大 57・レアな種なし）に戻す。Ownerのプロフィール（id 2）には触らない。戻す前に、増えた行を見て、Ownerに伝える。町テストのステージの進み具合は、国旗クイズのステージに作られた行だけを消す（元からあった、ステージ3の行は残す）。

## 最後に

- 全タスクのあと、サーバーとフロントのテストを全部通し、`feature/flag-quiz` の差分を**自分で見直す**（サブエージェントは使わない。見直しは作者本人が行うため、独立した目の見直しより弱い。マージの前に、Owner に伝える）。
- 見直しで出たCritical・Importantは1回だけ直す（直す前に、失敗するテストを書く）。軽いものは「あとで直す小さなこと」として最後の報告に書く。
- mainへのマージは、Owner に確認してから行う（マージのコミットは #00347）。pushはOwnerが行う。
