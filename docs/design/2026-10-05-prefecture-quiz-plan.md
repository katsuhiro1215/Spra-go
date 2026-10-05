# 都道府県クイズ（段階1）— 実装計画

> **実行方法:** ネイティブ（サブエージェントは使わず、インラインで実装し、最後に自分で見直す）。手順は `- [ ]` で追う。

**Goal:** ミニクイズに「都道府県クイズ」が出て、地方 → 県 → 級の順に選べる。県の上級のボスを全問正解すると、その県のバッジがもらえる。この段階では、仕組みと、バッジ47県の取り込みと、近畿7県（＋近畿まるごと）の問題を作る。

**Architecture:** 県のデータ表から、純粋な計算（`PrefectureQuizPlanner`）が、国旗クイズと同じ形の計画を作り、`FlagQuizWriter` を入れ子のコースに広げて書く。コースの窓口は、孫のステージまで数え、バッジ・称号・もらったかを返す。画面は、コースのカードにバッジを出し、はめ込みを文字でもできるようにし、難読地名の漢字にはふりがなを付けない。

**Tech Stack:** Laravel（Pest）、Next.js/TypeScript（Vitest）、Python（Pillow）

**Spec:** `docs/design/2026-10-05-prefecture-quiz-design.md`

ブランチ: `feature/prefecture-quiz`（設計書 #00410・直し #00411 はコミット済み）。この計画 #00412、実装は #00413 から。コミットの形式は `#NNNNN: type:要約`＋Co-Authored-By。

段階2（残りの地方の事実）・段階3（全国）・段階4（パスポートのバッジ）は、この計画に入れない（段階ごとに、短い計画を別に書く）。

## Global Constraints

- 国旗クイズ（作り方・名前・件数・画面）は変えない。今のテストが、そのまま通る
- 採点・出題の窓口は変えない。はめ込みは今のマッチング（`meta.layout = "slots"`）のまま
- 地方は6つ: `hokkaido-tohoku`（北海道・東北）・`kanto`（関東）・`chubu`（中部）・`kinki`（近畿）・`chugoku-shikoku`（中国・四国）・`kyushu-okinawa`（九州・沖縄）。この順
- 称号は、県の上級のボスだけに付ける（`{県名}はかせ`）。地方まるごとの上級は `{地方名}はかせ`。初級・中級のボスには付けない
- 県のコースは、`foods`4・`sights`4・`culture`3・`hard`3 以上そろった県だけ。地方まるごとは、その地方の全県にコースがあるときだけ
- 問題の目印は `meta.flag_key`（既存と同じ名前）。都道府県は `pref:` で始める（例 `pref:kinki:osaka:beginner:1:q1`）
- まちがいの選択肢の並びは、名前から決まる順（`crc32`）。同じ表からは、いつも同じ計画
- `meta.plain` に入れた語は、ふりがなを付けない。難読地名の漢字は、辞書に足さない
- 追加のバッジは192×192のWebP、47枚で1MB以内
- 開発データベースは、追加のみ（`migrate:fresh` は使わない）。確認のあと、プロフィール7を元の状態に戻す（xp 20、coins 60、hp 20、points 95、level 1、best_streak 2、current_streak 2、ledger最大668、`world_items` 4件、進み具合はステージ3だけ、称号なし、など）。Ownerのプロフィール（id 2）には触らない
- テスト: `./vendor/bin/sail test`（`--parallel` なし）、`cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
- スクリーンショットは `.playwright-mcp/` の下だけ。終わったら、その日の `page-*.yml`・`console-*.log` と一緒に消す

## Review Focus

- 国旗クイズが、作り直しの前と同じ（コース7・ステージ129・問題1,290、名前、ミニクイズの数、コースの進み具合）
- 難読地名の問題で、漢字にふりがなが付かない（問題文）。選択肢の読みと、答えのカードで、答えが先に見えない
- はめ込み（文字）で、正しい組が、問題の送られてくるデータから読み取れない（文字の項目だけが見え、組は隠れたまま）
- 同じ文字が2つの県にある事実（みかん・うどんなど）が、逆の問い（「◯◯で有名なのは どの県？」）と、ほかの県のまちがいの選択肢に出ない
- 同じ表から何度でも書ける（Seederの二重実行で増えない）。進み具合は残る。称号は全問正解のときだけ、1度だけ付く。県の上級以外のボスには付かない
- スマホ幅（375px）で、地方・県のカードのバッジが切れず、文字が重ならない

## Task 1: 計画のコミット

- [ ] この計画を #00412 でコミットする

## Task 2: バッジの取り込み

**Files:** `company/spra/mascot/assets/badges/prefecture/sheet_01.png`〜`sheet_08.png`（元のシートを移して名前を直す。会社側・gitの外）、`tools/pref-badges/make_badges.py`、`tools/pref-badges/crops.json`、`frontend/public/badge/pref/{key}.webp`（47枚）、`.gitignore`（必要なら）

**Interfaces:**
- Produces: `/badge/pref/{key}.webp`。`key` は次のとおり（`crops.json` の `sheet`・`slot` と対応）

| シート | 元のファイル名 | 県（左上→右、2段目） |
|---|---|---|
| sheet_01 | 日本のご当地かわいい六県バッジ.png | hokkaido・aomori・iwate / miyagi・akita・yamagata |
| sheet_02 | 日本のご当地マスコット観光バッジ6選.png | fukushima・ibaraki・tochigi / gunma・saitama・chiba |
| sheet_03 | 六県ご当地スプラウトバッジコレクション.png | tokyo・kanagawa・niigata / toyama・ishikawa・fukui |
| sheet_04 | ご当地キュート六県スタンプ__end__.png | yamanashi・nagano・gifu / shizuoka・aichi・mie |
| sheet_05 | きらめく関西六県ご当地バッジ.png | shiga・kyoto・osaka / hyogo・nara・wakayama |
| sheet_06 | 中国地方ご当地旅バッジ六景.png | tottori・shimane・okayama / hiroshima・yamaguchi・tokushima |
| sheet_07 | 四国九州ご当地マスコット旅バッジ.png | kagawa・ehime・kochi / fukuoka・saga・nagasaki |
| sheet_08 | ご当地ゆるキャラ五県バッジម្ពុជា.png | kumamoto・oita・miyazaki / kagoshima・okinawa（2段目は中央寄り） |

- [ ] 元のシートを `badges/prefecture/` に移し、上の名前に直す（`badge1`〜`5` と `course/` は動かさない）。移したあと、元の場所に残りがないか `ls` で確かめる
- [ ] `make_badges.py`: シートごとに、丸いバッジの中心と半径を測る（縁の輪の色が背景の光と分かれる所を探し、円を当てはめる）。測った値を `crops.json`（`key`・`sheet`・`cx`・`cy`・`r`）に書く。輪のすぐ外（半径＋2px）で丸く切って、外側を透明にする。192×192のWebPにして出す。合計のサイズを表示する
- [ ] 確認: 47枚を、重ねた確認画像（丸の位置を線で描いたシート）と、並べた一覧の画像で、目で見る。光のにじみが丸の外に残っていないか、輪が欠けていないか、5県のシートの2段目の位置を確かめる。直しがあれば `crops.json` を直す。確認画像は、確かめたあと消す
- [ ] 合計が1MB以内か確かめる
- [ ] コミット `#00413: feat:都道府県バッジ47枚の取り込み(シートの整理と、丸く切り抜く道具)`

## Task 3: 県のデータ表（先にテスト）

**Files:** `app/Support/Prefecture/PrefectureCatalog.php`、`database/data/prefectures.php`、`tests/Feature/PrefectureCatalogTest.php`

**Interfaces:**
- Produces（`App\Support\Prefecture\PrefectureCatalog`）:
  - `REGIONS: array<string, string>` — 地方のキー => 名前（上の6つ、この順）
  - `all(): array<string, array{key: string, name: string, region: string, capital: string, neighbors: list<string>, foods: list<string>, sights: list<string>, culture: list<string>, hard: list<array{word: string, reading: string, wrong: list<string>}>}>` — 47件。表の並び（北から南）のまま
  - `isReady(array $prefecture): bool` — `foods`≥4・`sights`≥4・`culture`≥3・`hard`≥3
  - `title(string $name): string` — `"{$name}はかせ"`
  - `badgeForTitle(?string $title): ?string` — `{県名}はかせ` なら `/badge/pref/{key}.webp`、そうでなければ null
  - `badgeForName(string $name): ?string` — 県名なら `/badge/pref/{key}.webp`、そうでなければ null
- `database/data/prefectures.php` の形: `return ['prefectures' => [ ['key' => 'osaka', 'name' => '大阪府', 'region' => 'kinki', 'capital' => '大阪市', 'neighbors' => ['kyoto', ...], 'foods' => [...], 'sights' => [...], 'culture' => [...], 'hard' => [['word' => '枚方', 'reading' => 'ひらかた', 'wrong' => ['まいかた', 'ひらがた', 'まいがた']], ...]], ...]]`。`hard` の項目は、配列の添字ではなく、`word`・`reading`・`wrong` の名前つきで読む

- [ ] 先にテスト（RED）: `PrefectureCatalogTest`
  - 47件ある・`key` の重複がない・`name` の重複がない・`public/badge/pref/{key}.webp` が全部実在する
  - すべての県の `region` が `REGIONS` にあり、地方ごとの数が 7・7・9・7・9・8（北海道・東北／関東／中部／近畿／中国・四国／九州・沖縄）
  - `neighbors` の `key` はすべて47県にあり、互いにそろっている（AがBをとなりに持てば、BもAを持つ）・自分自身を持たない・北海道と沖縄は空
  - `capital` がすべて入っている
  - 準備ができた県（`isReady`）は、近畿の7県だけ（この段階）
  - 準備ができた県は、`hard` のまちがいの読みが3つで、正しい読みと重ならず、互いに重ならない・`foods` などの中に重複がない
  - `title`・`badgeForTitle`・`badgeForName`（県名・称号は対応する絵、そうでなければ null）
  - 実行 `./vendor/bin/sail test --filter=PrefectureCatalogTest` **Expected:** 失敗する
- [ ] `PrefectureCatalog` と `database/data/prefectures.php` を書く。47県の名前・地方・県庁所在地（東京都は「新宿区」）・となり（陸で県境が接する県。北海道・沖縄は空。四国は、香川–徳島・香川–愛媛・徳島–愛媛・徳島–高知・愛媛–高知。福岡・山口は海を挟むのでとなりにしない）。近畿7県の事実は、国旗と同じく、小学生が知っていて、まちがいのないものを書く（例 大阪府: foods たこやき・お好み焼き・くしカツ・いか焼き／sights 大阪城・道頓堀・通天閣・万博記念公園／culture 天神祭・文楽・大阪の陣／hard 枚方〔ひらかた。まちがい: まいかた・ひらがた・まいがた〕など、実在の地名と、ありがちな読みまちがい）。書いたものは、公開前にOwnerが確認する（`TASKS.md` に足す）
- [ ] 同じ文字が2つの県にある事実があれば、それは許す（計画の計算が扱う）。`neighbors` の確認が通るまで直す **Expected:** 通る
- [ ] コミット `#00414: feat:都道府県のデータ表(47県の基本データと、近畿7県の事実)と読み込みを足す`

## Task 4: 県のコースの計画（先にテスト）

**Files:** `app/Support/Prefecture/PrefectureQuizPlanner.php`、`tests/Feature/PrefectureQuizPlannerTest.php`（テストの共通の道具 `prefectureTestCatalog()` を、このファイルの中に書く）

**Interfaces:**
- Consumes: `PrefectureCatalog::all()`・`REGIONS`・`isReady`・`title`
- Produces（`App\Support\Prefecture\PrefectureQuizPlanner`）:
  - `plan(array $catalog): array` — 地方のリスト。1件 `['key' => 'kinki', 'name' => '近畿', 'order' => 4, 'group' => true, 'courses' => [コース, ...]]`。コース 1件 `['key' => 'osaka', 'name' => '大阪府', 'order' => 3, 'levels' => [級, ...]]`。級・ステージ・問題は、国旗の計画と同じ形（`code`・`difficulty`・`stages[]`、ステージ `number`・`boss`・`title_reward`・`questions[]`）。問題は `key`・`type`・`prompt`・`image`・`choices[]`（`label`・`correct`・`image`）、はめ込みは `type = matching`・`layout = slots`・`items[]`（`id`・`image`・`text`・`label`）。難読地名の問題には `plain: list<string>` を足す。コースのある県がない地方は出さない
  - 県のコースの1級 = 1ステージ（10問）で、そのステージがボス。称号は、上級だけ `title(県名)`、ほかは null
  - 地方まるごとは Task 5

**問題の形（県のコース。Pの名前を `P`、事実を F0〜F3・S0〜S3・C0〜C2・H0〜H2 とする）**

| 形 | 文 | 正解 | まちがい |
|---|---|---|---|
| 事実（名物） | 「P の めいぶつは どれ？」 | F | 同じ種類の事実（ほかの県から。Pの事実とは重ならない） |
| 事実（名所） | 「P に あるのは どれ？」 | S | 同上 |
| 事実（お祭りなど） | 「P の おまつり・でんとうは どれ？」 | C | 同上 |
| 逆（名物・名所・お祭りなど） | 「『F』で ゆうめいなのは どの県？」「『S』が あるのは どの県？」「『C』が ゆうめいなのは どの県？」 | P の名前 | 県名（その事実を持たない県） |
| 県庁所在地 | 「P の けんちょうしょざいちは どこ？」 | capital | 県庁所在地（Pのものと重ならない） |
| 県庁所在地の逆 | 「『capital』は、どの県の けんちょうしょざいち？」 | P の名前 | 県名 |
| 何地方 | 「P は どの ちほう？」 | 地方名 | 地方名（ほかの5つから） |
| となり | 「P と となりあう 県は どれ？」 | となりの県（1つ） | となりではない県 |
| 難読地名 | 「P の『漢字』は、なんて よむ？」 | reading | `wrong` の3つ（`plain` = [漢字]） |
| はめ込み | 「県庁所在地を、ばんごうの県に はめよう」 | 枠＝県名4つ、項目＝県庁所在地（`text`） | — |

**級ごとの並び（1〜10問目）と、まちがいの選び方**

| 級 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | まちがい・はめ込みの相手 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 初級 | 名物F0 | 逆F0 | 名所S0 | 逆S0 | 名物F1 | 名所S1 | 逆F1 | 逆S1 | 何地方 | お祭りC0 | 全県から |
| 中級 | 県庁所在地 | 県庁所在地の逆 | はめ込み | となり | 名物F2 | 逆S2 | お祭りC0 | はめ込み | 逆F2 | 名所S2 | 同じ地方の県から（足りなければほかで足す） |
| 上級 | 難読H0 | 県庁所在地※ | はめ込み | となり | 名所S3 | お祭りC1 | 難読H1 | はめ込み | 逆F3 | 逆C2 | となりの県から（足りなければ同じ地方、全県で足す） |

- ※上級の2問目は、県名と県庁所在地の名前がちがう県（県名から「県・府・都」を除いた文字で県庁所在地が始まらない県）だけ「県庁所在地」。同じ県は、名物F3にする
- 作れない形は、予備に替える: 逆の形の事実が、ほかの県にもある文字のとき（`factOwners` が2つ以上）、またとなりのない県の「となり」→ **まだ出していない事実の「事実」の形**（F→S→C→Fの順に、次の事実）。それでも足りなければ、同じ問いにならない別の事実の形。1ステージに、同じ文・同じ正解の問いを2回出さない
- 「事実の持ち主」の数は、表の全県の `foods`・`sights`・`culture` の文字から数える（同じ文字が2県以上にあれば、逆の形に使わない。ほかの県の事実のまちがいにもしない）
- はめ込みは、Pと、相手3県で組む。相手に、県庁所在地が同じ文字の県はいない。1ステージの2つのはめ込みは、相手が重ならない（足りなければ重なってよいが、組が同じにならない）。まちがいの選択肢の相手の数が足りない（3つ未満）ときは、全県から足す

- [ ] 先にテスト（RED）: `PrefectureQuizPlannerTest`。道具 `prefectureTestCatalog()` は、本物の地方のキー（`kinki`・`kanto`）で、準備のできた県を2つの地方に4県ずつ、準備のできない県を1つ、となりのない県を1つ（近畿の中）入れた、小さな表
  - 同じ表からは、いつも同じ計画（`toBe`）
  - 地方は `REGIONS` の順・コースのある県がない地方は出ない・県のコースは準備のできた県だけ・準備のできない県のコースは出ない
  - 県のコースは3級（初級・中級・上級）・どの級も1ステージ（10問）・`boss` が真・称号は上級だけ `title(県名)`
  - どのステージも10問・1ステージに同じ `prompt`＋正解の組が2回出ない・どの問題も正解が1つだけ（はめ込みは、枠4つに項目4つで組が重ならない）
  - 初級にはめ込みがない・中級と上級は、3問目と8問目がはめ込み
  - 上級に難読地名が2問・`plain` にその漢字・選択肢が4つ（正しい読み＋`wrong` 3つ）・まちがいの読みが重ならない・`prompt` に漢字が入る
  - 逆の形の事実が、ほかの県の `foods`・`sights`・`culture` にもある文字のときは、逆の形にならない（表に「共通の名物」を1つ入れて確かめる）。また、その文字が、ほかの県の問題のまちがいの選択肢にも出ない
  - となりのない県は「となり」の問いがなく、予備の問いで10問になる
  - 中級のまちがい・はめ込みの相手は、同じ地方の県から（足りないときだけほかから）。上級の「となり」の問いのまちがいは、となりでない県。上級の県庁所在地の問いのまちがいに、となりの県の県庁所在地が入る
  - 上級の2問目は、県名と県庁所在地の名前がちがう県だけ県庁所在地・同じ県は名物
  - 実行 `./vendor/bin/sail test --filter=PrefectureQuizPlannerTest` **Expected:** 失敗する
- [ ] `PrefectureQuizPlanner` を実装する（県のコースまで。地方まるごとと全国は含めない。国旗の計画と同じく、`crc32` の順の道具を持つ） **Expected:** 通る
- [ ] コミット `#00415: feat:都道府県クイズの計画(県のコース3級・難読地名・文字のはめ込み)を作る純粋な計算を足す`

## Task 5: 地方まるごとの計画（先にテスト）

**Files:** `app/Support/Prefecture/PrefectureQuizPlanner.php`、`tests/Feature/PrefectureQuizPlannerTest.php`

**Interfaces:**
- Produces: `plan()` の地方のリストの `courses` に、その地方の**全県にコースがあるとき**、最後に `['key' => '{地方のキー}', 'name' => '{地方名}まるごと', 'order' => 県の数＋1, 'levels' => [...]]` を足す。3級とも1ステージ（10問）でボス。称号は上級だけ `title = "{地方名}はかせ"`（バッジなし）

**問題（アンカーの県を、その地方の県から、名前から決まる順に1つずつ。10に満たなければ繰り返し、同じ県が続かない）**

| 級 | 1〜10問目の形 | まちがい |
|---|---|---|
| 初級 | 奇数番＝逆（アンカーの名物F0）、偶数番＝逆（アンカーの名所S0）。逆にできないときは「事実」の形（そのアンカー県の事実） | その地方の県から（足りなければ全県で足す） |
| 中級 | 3・8問目＝はめ込み、そのほか奇数番＝県庁所在地、偶数番＝県庁所在地の逆 | その地方の県から |
| 上級 | 3・8問目＝はめ込み、そのほか 1・4・7・10問目＝難読地名（アンカーの `hard` を順に）、2・5・9問目＝となり、6問目＝逆（アンカーのお祭りC0）。となりにできない・逆にできないときは「事実」の形 | となりの県／その地方の県から |

- [ ] 先にテスト（RED）: 地方の全県が準備できているときだけ「まるごと」が出る（テスト用の表で、全県そろった地方は出て、1県足りない地方は出ない）・名前は「{地方名}まるごと」・順は県のコースの後ろ・3級・各1ステージ10問・ボス・称号は上級だけ「{地方名}はかせ」・上級に難読地名が4問・はめ込みが3・8問目・正解が1つ・同じ問いが2回出ない・同じ表から同じ計画 **Expected:** 失敗する
- [ ] 実装 **Expected:** 通る
- [ ] コミット `#00416: feat:都道府県クイズの地方まるごと(全県そろった地方だけ)の計画を足す`

## Task 6: 書き込みと、Seeder

**Files:** `app/Support/FlagQuiz/FlagQuizWriter.php`、`database/seeders/PrefectureQuizSeeder.php`、`database/seeders/DatabaseSeeder.php`、`tests/Feature/PrefectureQuizWriterTest.php`

**Interfaces:**
- Consumes: Task 4・5 の計画
- Produces:
  - `FlagQuizWriter::writeTree(string $rootName, array $nodes): array{courses: int, stages: int, questions: int}` — `nodes` の要素が `group => true` なら、`is_course_group` のカテゴリー（名前＝`name`、`order`、親＝大もと）を作り、その `courses` を子として書く。`group` がなければ、大もとの直下のコースとして書く。`write($plan)` は `writeTree(ROOT_NAME, $plan)` と同じ結果になる（国旗は今のまま）。クイズの名前は `"{$rootName} {コース名} {級}"`
  - 問題の `meta`: `plain`（あれば）。はめ込みの項目は `{id, image?, text?}`（絵か文字があるほうだけ書く）。選択肢の `meta.image` は絵があるときだけ（今のまま）
  - `PrefectureQuizSeeder`: `PrefectureQuizPlanner::plan(PrefectureCatalog::all())` を `writeTree('都道府県クイズ', ...)` で書き、件数を表示する。`DatabaseSeeder` に入れる

- [ ] 先にテスト（RED）: `PrefectureQuizWriterTest`
  - 書くと、大もと「都道府県クイズ」（`is_course_group`）・地方「近畿」（`is_course_group`、親は大もと）・県のコース（親は近畿・`country_id` なし）が作られる。ステージは県のコースごとに3つ（`is_boss`、上級だけ `title_reward = "◯◯はかせ"`）、近畿まるごとも3つ
  - 2回書いても、カテゴリー・ステージ・問題・選択肢が増えない
  - 難読地名の問題に `meta.plain` が入る・文字のはめ込みの項目に `text` が入る（`image` は入らない）
  - **国旗クイズが変わらない**: 既存の `FlagQuizWriterTest` が、そのまま通る
  - 実行 `./vendor/bin/sail test --filter="PrefectureQuizWriterTest|FlagQuizWriterTest"` **Expected:** 新しいテストが失敗し、既存は通る
- [ ] `FlagQuizWriter` を、`writeTree` を中心に作り直し（`write` はそれを呼ぶ）、`questionMeta`・選択肢の書き込みを広げる。`PrefectureQuizSeeder` と `DatabaseSeeder` への追加 **Expected:** 通る
- [ ] 開発データベースに書く: `./vendor/bin/sail artisan db:seed --class=PrefectureQuizSeeder`（追加のみ）。件数を確かめる（近畿7県×3＋まるごと3＝24ステージ・240問）。国旗クイズの件数（コース7・ステージ129・問題1,290）が変わっていないことも `tinker` で確かめる
- [ ] コミット `#00417: feat:都道府県クイズを、入れ子のコースとして書く(Writerの拡張・Seeder)`

## Task 7: コースの窓口・ミニクイズ・称号のバッジ

**Files:** `app/Support/Courses.php`、`app/Support/MiniQuizzes.php`、`routes/api.php`（ステージ完了の返事）、`tests/Feature/CoursesTest.php`、`tests/Feature/MiniQuizzesTest.php`、`tests/Feature/StageCompleteTest.php`（既存の完了のテストのファイル名に合わせる。なければ、称号のテストがあるファイルに足す）

**Interfaces:**
- Produces:
  - `Courses::list(Category $group, ?UserProfile $profile)` の1件が、`{id, name, cleared, total, group: bool, badge: ?string, title: ?string, earned: bool}`。`group` は、そのコースが `is_course_group` か。`group` のとき、`cleared`・`total` は、その下のコースのステージ（孫）の合計。`title` は、そのコースの上級のボスの `title_reward`（なければ null）、`earned` は、プロフィールがその称号を持つか（`title` が null なら false）、`badge` は `PrefectureCatalog::badgeForName(コース名)`（県でなければ null）
  - `MiniQuizzes::list` の `stage_count` は、大もとの下の、子と**孫**のステージも数える（コース親のとき）
  - ステージ完了の返事に `title_badge: ?string`（`PrefectureCatalog::badgeForTitle($stage->title_reward)`。称号を付けたときも付けないときも、そのステージの称号に対する絵）

- [ ] 先にテスト（RED）:
  - `CoursesTest`: 都道府県クイズの大もとで、地方のカードが `group = true`・`cleared`/`total` が孫の合計・並びが地方の順／地方の中で、県のカードに `badge`（県名に対応する絵）・`title`（「大阪府はかせ」）・`earned`（称号を持つと true、持たないと false）／まるごとは `badge` が null・国旗クイズのコースは `group = false`・`badge = null`・`title` は「アジアの国旗はかせ」のとおり（既存の項目は変わらない）
  - `MiniQuizzesTest`: 孫のステージも数える（近畿のステージ24が、都道府県クイズの `stage_count` になる）・国旗クイズの数は変わらない
  - ステージ完了: 県の上級のボスを全問正解すると、`title_granted = true`・`title = "大阪府はかせ"`・`title_badge = "/badge/pref/osaka.webp"`・称号が1度だけ付く（もう1度やっても付かない）／上級のボスで1問まちがえると付かない／初級のボスは全問正解でも称号が付かない（`title_reward` が null）
  - 実行 `./vendor/bin/sail test --filter="CoursesTest|MiniQuizzesTest|StageCompleteTest"` **Expected:** 新しいテストが失敗する
- [ ] 実装 **Expected:** 通る。サーバー全体 `./vendor/bin/sail test`（648件が、すべて通り、新しいテストが足される）
- [ ] コミット `#00418: feat:コースの窓口を入れ子に広げ、県のバッジ・称号・もらったかを返す(ミニクイズの数え方・ステージ完了の返事も)`

## Task 8: ふりがな

**Files:** `frontend/src/components/app/auto-furigana.tsx`、`frontend/src/components/app/auto-furigana.test.ts`、`frontend/src/lib/furigana-dictionary.json`、`tools/furigana/prefecture-words.json`、`tools/furigana/merge_words.py`、`tests/Feature/PrefectureFuriganaTest.php`

**Interfaces:**
- Produces: `tokenize(text: string, plain?: string[]): Segment[]`（`plain` の語がその位置から始まるときは、辞書を見ずに、その語をそのまま文字として出す）。`AutoFurigana` に `plain?: string[]` を足す。`merge_words.py`: `tools/furigana/prefecture-words.json`（語 → 読み）を `furigana-dictionary.json` に足す（すでにある語は変えない）。足したあと、**文字数の長い語から順**（同じ長さは今の並びのまま）に並べ直す

- [ ] 先にテスト（RED）:
  - `auto-furigana.test.ts`: `tokenize("大阪府の枚方は？", ["枚方"])` で「枚方」が読みなしの文字のまま（「大阪府」は読みが付く）／`plain` がなければ、これまでどおり
  - `PrefectureFuriganaTest`（Pest）: 計画（準備のできた県）に出る文字 — `prompt`・選択肢の `label`・はめ込みの `text`・`label` — を、辞書の最長一致（キーの並びどおり）で分けたとき、漢字が読みなしで残らない。ただし、難読地名の問い（`plain` がある問い）の `prompt` の中の `plain` の語と、その選択肢は除く。辞書の並びが「長い語から」になっているかも確かめる
  - 実行 `cd frontend && npx vitest run src/components/app/auto-furigana.test.ts` と `./vendor/bin/sail test --filter=PrefectureFuriganaTest` **Expected:** 失敗する
- [ ] `tokenize`・`AutoFurigana` に `plain` を足す **Expected:** vitest が通る
- [ ] Pest の失敗が示す語（読みのない漢字）を集めて、`tools/furigana/prefecture-words.json` に読みを書く（県名・県庁所在地・事実・「県庁所在地」「名物」「地方」「有名」などの文の語）。**難読地名の漢字は書かない**。`merge_words.py` で辞書に足す。もう一度テストを流して、残りの語を足す **Expected:** 通る
- [ ] コミット `#00419: feat:ふりがなを付けない語(難読地名)と、県・県庁所在地・名物などの辞書を足す`

## Task 9: 画面（はめ込み・問題文・コースの選択・結果）

**Files:** `frontend/src/components/app/flag-fit-question.tsx`、`frontend/src/components/app/matching-question.tsx`（型）、`frontend/src/components/quiz/types.ts`、`frontend/src/components/quiz/quiz-session.tsx`、`frontend/src/components/quiz/course-select.tsx`、`frontend/src/lib/prefecture-quiz.ts`、`frontend/src/lib/prefecture-quiz.test.ts`、`frontend/src/app/play/[id]/page.tsx`、`frontend/src/app/quiz/[stageId]/page.tsx`

**Interfaces:**
- Produces（`lib/prefecture-quiz.ts`）:
  - `courseBadgeState(course: { badge?: string | null; earned?: boolean }): "none" | "earned" | "locked"` — `badge` がなければ `none`、`earned` なら `earned`、そうでなければ `locked`
  - `courseSelectPrompt(category: { name: string }, hasParent: boolean): string` — 大もとの都道府県クイズなら「どの地方にする？」、その下の地方（親がある）なら「どの県にする？」、それ以外（国旗クイズ）は「どの大陸にする？」
  - `PREFECTURE_ROOT_NAME = "都道府県クイズ"`
  - `courseCardKind(course: { group?: boolean; badge?: string | null }): "region" | "prefecture" | "plain"` — `group` なら `region`、`badge` があれば `prefecture`、そうでなければ `plain`
- `QuizQuestion.meta` に `plain?: string[]` を足す。`MatchingItem` は、`image` が無く `text` を持てるようにする。ステージ完了の返事の型に `title_badge?: string | null`

- [ ] 先にテスト（RED）: `prefecture-quiz.test.ts`（上の4つの関数）、`flag-fit.test.ts` に、絵のない（文字だけの）項目でも、`placeFlag`・`removeFlag`・`slotAnswers` が同じに動く（番号で動くため、変わらないことの確認）。実行 `cd frontend && npx vitest run src/lib` **Expected:** 失敗する（新しい関数がない）
- [ ] `prefecture-quiz.ts` を実装 **Expected:** 通る
- [ ] `flag-fit-question.tsx`: 下の項目が `image` を持てば今のまま国旗を出し、`text` だけなら、枠と同じ大きさの文字のチップ（`AutoFurigana` でふりがな）として出す。枠に入れた項目も同じ（絵か文字）。答え合わせのあとの「正しい国旗」は、文字のときは「正しい答え」の文字にする。番号つきの枠・タップの動き・自動の答え合わせは変えない
- [ ] `quiz-session.tsx`: 問題文の `<AutoFurigana text={question.prompt} />` に `plain={question.meta?.plain}` を渡す。選択肢の `label` は今のまま（ひらがな）
- [ ] `course-select.tsx`: `Course` に `group`・`badge`・`title`・`earned` を足す。`courseCardKind` で出し分ける。
  - `region`: 地方名・進み具合（今のカードの形、絵なし）
  - `prefecture`: 上に正方形のバッジ（`next/image`・`sizes` を小さく、遅く読む）。`earned` はカラー、`locked` は `grayscale`＋`opacity-60`。県名・進み具合。もらった県には「バッジ ゲット」の小さな印
  - `plain`（まるごと・国旗のコース）: 今のカード（国旗の大陸の絵は `COURSE_IMAGES`）。「◯◯まるごと」は、絵なしで名前だけ
  - スマホ幅2列で、バッジが切れず、文字が重ならない
- [ ] `play/[id]/page.tsx`: 副題を `courseSelectPrompt(category, courseParent !== null)` にする。地方のカード（`group`）は、今のリンク（`/play/{id}`）で、また県のカードが開く（コース親の画面を再利用）。戻る導線: 地方の画面からは、都道府県クイズへ（`courseParent` の既存の仕組みを、この入れ子でも通す）
- [ ] `quiz/[stageId]/page.tsx`: 称号のお知らせに、`data.title_badge` があれば、バッジの絵（大きく）と「◯◯県の バッジを ゲット！」を出す。ないときは今のまま（王冠）
- [ ] `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint` **Expected:** すべて通る（439件が通り、新しいテストが足される）
- [ ] コミット `#00420: feat:文字のはめ込み・ふりがなを付けない語・県のバッジ付きのコースの選択・バッジのお知らせ(画面)`

## Task 10: ブラウザで確かめる

- [ ] ログイン `test@example.com`／プロフィール7（町テスト）。スクリーンショットは `.playwright-mcp/` の下だけ
- [ ] 学ぶタブの右端の引き出し → ミニクイズに「都道府県クイズ」が出る → 地方のカード「近畿」だけが出る → 県のカード（7県）と「近畿まるごと」。バッジは白黒で薄い。副題が「どの地方にする？」「どの県にする？」
- [ ] 大阪府 → 初級（4択・名物・名所）。中級（県庁所在地・**はめ込み（文字）**: 枠に入れる・戻す・4つで自動の答え合わせ・○×と正しい答え）。上級（**難読地名**: 問題文の漢字にふりがなが付かない。選択肢はひらがな）
- [ ] 確認のため、開発データベースで、プロフィール7の大阪府の初級・中級を `profile_stage_progress` でクリア済みにして、上級のボスを全問正解する（正解は、窓口の答えの確認で、1問ずつ）。結果で「大阪府はかせ」と、**バッジの絵とメッセージ**が出る。戻ると、県のカードのバッジがカラー。1問まちがえて終えると、称号は付かない
- [ ] スマホ幅（375px）と、デスクトップ幅で、カードが切れない・重ならない
- [ ] 確かめたあと、プロフィール7を元の状態に戻す（追加した `profile_stage_progress`・`profile_titles`・`profile_currency_ledger`・経験値などを、基準の値に。xp 20、coins 60、points 95、ledger最大668、`world_items` 4件、進み具合はステージ3だけ、称号なし）。スクリーンショットと、その日の `page-*.yml`・`console-*.log` を消す
- [ ] 直しがあればコミット `#00421: fix:…`

## Task 11: ドキュメントと全体の確認、マージの確認

- [ ] `SPEC.md`（4-4cに「都道府県クイズ」: 形・級ごとの問題・バッジ・データ表・ふりがなを付けない語）、`TASKS.md`（段階1を完了、段階2〜4と、Ownerの確認〔県の事実・県庁所在地・となり・難読地名の読み〕を足す）を更新して、コミット `#00422: docs:…`
- [ ] 全体のテスト（画面、サーバー）
- [ ] Review Focus の6点を、1つずつ確かめる
- [ ] 自分で見直す（最終見直しは自分によるもの。Opusで見直すかは、Ownerが決める）
- [ ] Ownerに報告して、マージの確認をとる。プッシュはOwner
