# 国の道（町の道のデザインを、旅した国から選ぶ）— 設計書

- 作成日: 2026-10-05
- ステータス: 案（Ownerの承認待ち）。Owner決定済み: 段階3として進める・選ぶ場所は「旅のハブの『着いた国』」
- 前提: 町がなじむ（`docs/design/2026-10-05-town-blend-design.md` 5章。この設計書が詳細）、旅（`docs/design/2026-09-27-spru-wave-f-design.md`、`docs/design/2026-09-28-travel-tickets-design.md`）、町の地面の絵（`components/world/ground-art.ts`、`tools/ground-assets/make_ground.py`）
- 素材の依頼: `company/spra/spra-world/prompts/batches/003-road-textures-by-country.md`（新規5枚＋任意1枚）
- 対応するタスク: `TASKS.md`「Spra-worldの確定画像の活用」6（国の道）

## 1. 背景と目的

旅で国に着くたび、その国の道のデザインを、町の道に使えるようにする。「旅するほど、町の道が変わる」ごほうびになる。道の位置・マスは変えない。変わるのは道の絵だけ。

**うまくいった目安**

1. 国に初めて着くと、その国の道が使えるようになったと分かる
2. 旅のハブで、着いた国のカードから「この国の道にする」を押すと、町の道がその国の道になる。元の日本の道にも戻せる
3. まだ着いていない国の道は選べない
4. 家族の町（ほかの家族の町を見る）でも、持ち主が選んだ道で見える
5. 道の絵がまだ届いていない国は、選ぶボタンを出さない（今の日本の道のまま）

## 2. 決定事項

| 項目 | 決定 |
|---|---|
| 道の種類 | 日本（初めから）＋旅の5か国（`config/travel.php` の行き先: インドネシア `id`・韓国 `kr`・アメリカ `us`・イギリス `gb`・フランス `fr`）。キーは行き先のキーと同じ |
| 使える条件 | その国に着いている（`profile_trips`）こと。日本は、いつでも |
| 選ぶ場所 | 旅のハブ（`/trip`）で、着いた国のカード（`DestinationSheet`）に「この国の道にする」。選んでいる国には「いまの町の道」の印と「日本の道にもどす」。初めて着いた場面にも、一言「○○の道が、町で使えるようになったよ」 |
| 保存 | プロフィールごと（`user_profiles.road_style`。なければ日本） |
| 家族の町 | 持ち主が選んだ道で見える |
| 絵がないとき | 画面側で、その国の道の絵がなければ、選ぶボタンは出さず、町は日本の道（今の道の絵）で描く |

## 3. サーバー

### 3-1. データ

- マイグレーション: `user_profiles.road_style`（`string(8)`、null可、既定 null＝日本）。`UserProfile::$fillable` に足す
- 選んでいる道: `App\Support\Travel::roadStyle(UserProfile $profile): string`（`road_style` が、日本か着いた国のキーならそれ、そうでなければ `jp`）。使える道は、日本と、着いている国（`visitedKeys`）

### 3-2. 窓口

- `PUT /api/world/road`（ログイン・プロフィール必須）: `{ style: string }`。`style` は、`jp` か、行き先のキー。
  - 道の一覧にないキー → 422（`style` の検証エラー）
  - まだ着いていない国 → 422「まだ着いていない国の道は、選べないよ」
  - 成功 → `road_style` を保存して、`{ road_style: 'xx' }`
- `GET /api/world` の返事に `road_style`（`'jp'` など。未選択は `'jp'`）を足す。`land` の中には足さない
- `GET /api/travel` の返事（`Travel::overview`）に `road_style`（選んでいる道）を足す。着いた国かどうかは、各行き先の `state` で分かるので、一覧は足さない
- 家族の町（`Family::town`）の返事に、持ち主の `road_style` を足す（見ているのが、着いていない国の道でも、持ち主の選択どおりに見せる）
- 選べるのは、その国に着いたときだけ。あとから「着いた」記録は消えないので、選んだ道が使えなくなることはない

## 4. 画面

### 4-1. 町の描き方（`world-scene.tsx`）

- 道の絵: `GROUND_ART["road_" + style]`（例: `road_id`）があればそれ、なければ今の道の絵（`GROUND_ART.path`）。`WorldScene` は、`roadStyle` を受け取る（既定 `jp`）
- 道の絵ごとの `pattern`・道のふち・道の絵の色の扱いは、今の道の描き方（`pathArt`）を、選んだ絵に差し替えるだけ

### 4-2. 絵の一覧（`ground-art.ts`・`make_ground.py`）

- `GroundArtKey` に `road_id`・`road_kr`・`road_us`・`road_gb`・`road_fr` を足す。絵が届いたものだけ `GROUND_ART` に書く
- `make_ground.py` の対応表に、`road_id ← approved/road/road_indonesia_01.png` などを足す（元の絵がまだ無いものは、今のとおり飛ばす）。日本の石畳版（任意）が届いたら、`road_jp_stone` として、日本の道の選択肢に足すのは、今回はしない

### 4-3. 旅のハブ（`DestinationSheet`・`/trip`）

- 着いた国（`state: "visited"`）のカードに、その国の道の絵があるとき（`GROUND_ART["road_" + key]`）、次を出す。絵が無ければ、何も出さない
  - 選んでいない: ［この国の道にする］ボタン。押すと `PUT /api/world/road`。成功したら「町の道を、○○の道にしたよ」と出す
  - 選んでいる: 「いまの町の道」の印と、［日本の道にもどす］ボタン
- 道の絵のサムネイルを、カードに小さく出す（絵の `src` をそのまま小さく見せる）
- 初めて着いた場面（`departure-scene`・着いたあとのカード）の最後に、その国の道の絵があるとき、一言「○○の道が、町で使えるようになったよ」を足す

### 4-4. 純粋な関数（`components/travel/road.ts`）

- `roadArtKey(style: string): string` — `jp` は `path`、それ以外は `road_{style}`
- `roadChoice(style, selected, hasArt): "select" | "selected" | "none"` — 絵が無ければ `none`、選んでいれば `selected`、そうでなければ `select`
- 町の道の絵を決める `roadArt(style, art)`（絵が無ければ今の道の絵）

## 5. テスト

- **サーバー（Pest）**: 既定は日本。着いた国の道を選べる・日本に戻せる・まだ着いていない国は422・一覧にないキーは422・他人のプロフィールの `road_style` は変わらない・`GET /api/world` と `GET /api/travel`・家族の町に `road_style` が出る（持ち主の選択どおり）・ログイン必須
- **画面（Vitest）**: `roadArtKey`・`roadChoice`（絵がない・選んでいる・選べる）、`roadArt` の差し替え
- **ブラウザ**: 道の絵が届いたら、旅のハブでボタンが出る・押すと町の道が変わる・戻せる・家族の町でも持ち主の道・まだの国にはボタンが出ない・スマホ幅。絵が届くまでは、確認用に、手元だけで、今の道の絵を別の国の名前で一時的に登録して確かめる（コミットしない）。確かめたあと、開発用のデータを元に戻す

## 6. やらないこと

- 道を引く・つなぐ、道の位置を増やす（Spra-worldの役目）
- 道の絵ごとの追加効果（にぎやか度・ごほうび）
- 旅の5か国以外（中国・タイ・ポルトガルなど）の道。国が増えたときに足す（設定の行と絵を足すだけで増やせるよう、一覧は設定と対応表にする）
- 町の区画（草・砂・竹林・丘）ごとに、別の道の絵を選ぶこと
- 日本の石畳版（任意の絵）を、選択肢に足すこと（あとで）

## 7. ドキュメントの更新

- `SPEC.md`: 国の道（選べる条件・保存・窓口）
- `TASKS.md`: 6を完了にし、絵の依頼書（`003-road-textures-by-country.md`）の届き待ちを書く
