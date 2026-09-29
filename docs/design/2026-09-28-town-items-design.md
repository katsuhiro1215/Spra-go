# 町のアイテムのカテゴリ分けと、アイテム画像の決まり — 設計書

- 作成日: 2026-09-28
- ステータス: Owner合意済み（絵のタッチ・カテゴリ6つ・1回目の枚数・取り込み方・画像の決まり・一覧・表示のしかた・進め方を対話で確認）
- 更新: 2026-09-29 シート9枚が届いたあとの変更（Owner確認済み）。タッチを「つやのある立体」にした（4-1）、足元の草・石・台座を認めた（4-2）、シートの置き場所と名前（4-5）、大きさを画像の幅から決める形（7-1・7-2）、夜の明かりを画像の中の位置で持つ形（7-3）、段階2と3をまとめた（8章）
- 前提: 町（`docs/design/2026-09-27-spru-wave-e-design.md` ほか）、旅とおみやげ（`docs/design/2026-09-27-spru-wave-f-design.md`）、国の進め方（`docs/design/2026-09-28-travel-tickets-design.md`）。どれも実装済み
- 対応するタスク: `TASKS.md` 開発部門「町のアイテムのカテゴリ分けと画像への差し替え」（この設計で足す）

## 1. 背景と目的

町のアイテムは、今は21個（うち町に置く物18個）。どれもプログラムで丸や四角を組み合わせて描いているため（`components/world/item-art.tsx` ほか）、質が上がりにくく、「欲しい」と思える絵になっていない。町を広げていくゲームなので、アイテムは主役になる。また、アイテムが増えると、ショップとバッグに1列で並ぶだけでは探しにくくなる（シムシティでカテゴリが少なく、物が増えすぎて扱いにくかった、というOwnerの経験）。

そこで次の3つを決める。

1. アイテムを6つのカテゴリに分け、ショップとバッグにタブを付ける
2. アイテムの絵を、画像生成で作った画像に差し替える。そのための決まり（タッチ・角度・シートの作り方・英語のプロンプト）を作る
3. 1回目にまとめて頼む48点の一覧と、町での表示のしかたを決める

画像生成はOwnerが行う。アイコンと追加の画像（`TASKS.md`）が先で、アイテムの画像はその次。Ownerが画像を作っている間に、開発は出題のくり返し・学ぶタブの地図に進む。

**うまくいった目安**

1. 小さく表示しても（町の1マスはスマホで幅50pxほど）、何の絵かわかる
2. 全部が同じ世界の絵に見え、スプルと並べても違和感がない
3. アイテムが増えても、カテゴリで探しやすい
4. あとから同じ決まりで足していける

## 2. 決定事項（Owner確認済み）

| 項目 | 決定 |
|---|---|
| 絵のタッチ | ~~スプルの絵（素材集 mascot-6 など）に合わせる~~ → 2026-09-29に「つやのある立体」に変更（4-1。見本は `items/item3-2.png`） |
| カテゴリ | 6つ: しぜん／かざり／いえ・お店／名所／のりもの／おみやげ。ショップは5つ（おみやげは売らない）、バッグは「すべて」＋6つ |
| 1回目の枚数 | 描き直し32点＋新しく16点＝48点（シート9枚） |
| 取り込み方 | シートから1点ずつ切り抜いてWebPにし、大きさと足元の位置は設定で合わせる（スプルの画像と同じ仕組み） |
| 画像の決まり | 4章のとおり。試しの1枚で確かめてから残りを頼む |
| 地面のマス目 | 今のまま |
| 緑の未来都市のアイテム | 入れない（町づくりを大きく広げるのは、あとの Spra-world の役目） |

## 3. カテゴリ

### 3-1. 6つのカテゴリと振り分け

| キー | 表示名 | 今のアイテム | 1回目で足す物 |
|---|---|---|---|
| `nature` | しぜん | 花だん・木・竹・桜の木・ヤシの木・スプルの花（非売品） | チューリップ・岩と草・ひまわり・まるい植え込み・もみじ・松 |
| `decor` | かざり | ちょうちん・ベンチ・石灯籠・噴水・ビーチパラソル・自動販売機 | 植木鉢・井戸・街灯・ポスト |
| `house` | いえ・お店 | 屋台 | 小さな家・赤い屋根の家・パン屋・和風の家・カフェ |
| `landmark` | 名所 | 五重塔・お城・タワー | 灯台 |
| `vehicle` | のりもの | 自転車・小さな船・大きな船 | — |
| `souvenir` | おみやげ | 国ごとの10点（非売品） | — |

タブの並びは上の表の順にそろえる。

### 3-2. 決め方

- カテゴリは絵のキー（`asset_key`）で決まる。`config/world.php` に `asset_categories`（キー → カテゴリ）を足す。`asset_keys` のすべてのキーにカテゴリを付ける
- スプルの花（`spru_flower`、ショップの絵の一覧には入っていない）も `asset_categories` に `nature` で入れる
- おみやげ（`meta.souvenir_of` がある品）は、キーによらず `souvenir`
- 町に置く物でない品（回復薬・称号）はカテゴリなし（`null`）
- `asset_categories` にないキーは `decor` として扱う（画面が壊れないようにするための受け皿）
- `ShopItem::category(): ?string` にまとめ、API はこれを返す

### 3-3. ショップ（`/shop`）

- 「町のアイテム（学習ポイントで買う）」の段にタブを付ける。「べんりアイテム（コインで買う）」の段は今のまま下に残す
- タブは、品が1つ以上あるカテゴリだけ出す。最初に開くのは、並びで最初のタブ
- 「すべて」のタブは置かない（物が増えたときに、まとめて並ぶのを避けるため）
- タブの中の並びは今と同じ（レベル順→値段順）。まだ買えない物は今と同じく「Lv.○で解放」
- 今のレベルで買えるようになった物（`min_level` が今のレベルと同じで、鍵がない物）に「NEW」の札を付ける。NEWの物があるタブには小さな点を付ける
- タブは `role="tablist"`・`role="tab"`（`aria-selected`）・`role="tabpanel"` で作る。タブはどれもボタンで、Tabキーで移り、EnterかSpaceで切り替える（矢印キーでの移動は作らない）。横に入りきらない幅では横にスクロールできるようにする

### 3-4. バッグ（`/bag`）

- 最初のタブは「すべて」。そのあとに、品が1つ以上あるカテゴリだけを 3-1 の順に並べる（おみやげも含む）
- バッグは置いていない物だけが入り、ふだんは数が少ないため、「すべて」を最初にする
- 今の「2×2マス」「おみやげ」の札はそのまま

### 3-5. 管理画面（ショップ編集、`/owner/dashboard/shop-items`）

- カテゴリを選ぶ欄は作らない
- 絵の選択肢の名前にカテゴリを添える（例: 「ベンチ（かざり）」「五重塔（名所・2×2）」）
- 画面側の対応表 `ITEM_ART_CATEGORIES`（`components/world/art-keys.ts`）を作り、`config/world.php` の `asset_categories` とずれていないかをテストで確かめる（今の `asset_keys`・`asset_footprints` と同じやり方）

### 3-6. API

- `GET /api/shop`: 各品に `category` を足す（回復薬・称号は `null`）
- `GET /api/world`: 町とバッグの各アイテム（`ProfileWorldItem::toWorldArray()`）に `category` を足す

## 4. 画像の決まり

画像を頼むときに毎回守る決まり。6章のプロンプトはこの決まりを英語にしたもの。

### 4-1. タッチ

- つやのある立体のタッチ（2026-09-29に変更。見本は `company/mascot/assets/items/item3-2.png`）。最初はスプルの素材集（mascot-6）の線のタッチで頼んだが、画像生成では立体のタッチで安定して描かれ、スプルの家（image1）やアプリのアイコン・バッジとも合うため、こちらにそろえた
- 明るくあたたかい色。光は左上から
- 形は、丸くて少しずんぐりした、おもちゃのようなミニチュア
- 細かい模様や文字は描かない（幅50pxでつぶれる）。看板は文字でなく絵で表す（パン屋ならパンの絵）
- 目立つ色は1点に1〜2色まで。町の地面（やわらかい黄緑・ベージュ）に合う色にする

### 4-2. 角度と足元

- 町と同じ、斜め上から見下ろす角度（2:1のアイソメ）
- 正面（入口・顔・いちばん見せたい面）は左下に向けてそろえる
- 影は描かない（影はプログラムで同じ形を付ける）。足元の小さな草・石や、像・名所の台座は描かれていてもよい（2026-09-29に変更。届いた絵の多くに描かれていて、町の草地にもなじむため）
- 明かりのある物（ちょうちん・石灯籠・街灯・灯台・タワーなど）は、昼の消えた状態で描く（夜の明かりはプログラムで重ねる）

### 4-3. シートの作り方

- 横長の1枚（1536×1024）に6点。3列×2段で並べ、間を広く空ける
- 文字・番号・ラベル・透かしは入れない
- 背景は透明。透明にできなければ真っ白の無地（グラデーションや模様にしない）。格子模様（透明に見せかけた灰色と白の模様）は切り抜けないので描かない。真っ白の背景は、白い船や灯台も含めて切り抜けることを確かめた（2026-09-29）
- 同じシートには大きさの近い物をまとめる（1マスの低い物／1マスの高い物／2×2の物）。シートの中では、物どうしの大きさの比率をそろえる

### 4-4. そろえ方

- まず試しの1枚（シート3）を作り、開発が町に置いて見え方を確かめる。必要なら決まりとプロンプトを直してから、残りの8枚を頼む
- 2枚目からは、良かったシートとスプルの絵を添えて「同じタッチで」と頼む。シートごとの絵柄のぶれを防ぐため
- 添える絵: 良かったシート（`items/item3-2.png`）。描き直すときも、これを添えて「同じタッチで」と頼む

### 4-5. ファイル名と置き場所

- シートは `company/mascot/assets/items/` にまとめる。名前は `item{シート番号}.png`（番号は5章のシート番号）。描き直したシートは `item3-2.png` のように後ろに番号を付けて置き、切り抜きの設定（`crops.json` の `sources`）で使うシートを書き分ける
- 1回目に使うシート: `item1-2`・`item2-2`・`item3-2`・`item4`・`item5-2`・`item6`〜`item9`（`item1`・`item2`・`item3`・`item5` はタッチか背景が合わないので使わない）

## 5. 1回目の一覧（48点・シート9枚）

★は新しく足す物。キーは画像・設定で使う名前。

### 5-1. シートごとの品目

| シート | 大きさ | 品目（キー） |
|---|---|---|
| 1 | 1マスの低い物 | 花だん(`flowerbed`)・ベンチ(`bench`)・自転車(`bicycle`)・小さな船(`boat_small`)・桟橋(`pier`、目印)・コモドドラゴンの像(`komodo`) |
| 2 | 1マスの低い物 | バイソンの像(`bison`)・★チューリップ(`tulip`)・★岩と草(`rock`)・★ひまわり(`sunflower`)・★まるい植え込み(`bush`)・★植木鉢(`flower_pots`) |
| 3（試し） | 1マスの高い物 | スプルの家(`spru_house`、目印)・鳥居(`torii`、目印)・木(`tree`)・ちょうちん(`chochin`)・自動販売機(`vending`)・★小さな家(`cottage`) |
| 4 | 1マスの高い物 | 石灯籠(`stone_lantern`、目印とアイテムで同じ絵)・竹(`bamboo`)・竹林(`bamboo_grove`、目印)・桜の木(`sakura`)・ヤシの木(`palm`)・ビーチパラソル(`parasol`) |
| 5 | 1マスの高い物 | 屋台(`stall`)・★もみじ(`momiji`)・★松(`pine`)・★井戸(`well`)・★街灯(`street_lamp`)・★ポスト(`mailbox`) |
| 6 | 1マスの高い物 | ★赤い屋根の家(`red_house`)・トルハルバン(`dol_hareubang`)・赤い電話ボックス(`phone_box`)・エッフェル塔の置物(`eiffel`)・（空き2枠） |
| 7 | 2×2の物 | 噴水(`fountain`)・五重塔(`pagoda`)・お城(`castle`)・大きな船(`boat_large`)・タワー(`tower`)・★灯台(`lighthouse`) |
| 8 | 2×2の物 | ★パン屋(`bakery`)・★和風の家(`japanese_house`)・★カフェ(`cafe`)・ボロブドゥール寺院(`borobudur`)・仏国寺(`bulguksa`)・自由の女神(`liberty`) |
| 9 | 2×2の物 | ストーンヘンジ(`stonehenge`)・モン・サン=ミッシェル(`mont_saint_michel`)・（空き4枠） |

- 内訳: 描き直し32点（アイテム18・おみやげ10・目印4〔スプルの家・鳥居・竹林・桟橋〕。石灯籠はアイテムと同じ絵）＋新しく16点
- 空きの6枠は、描き直したい物に使う
- スプルの家は、image1の家（丸い屋根・苔・大きな芽・丸い扉）を簡単にした形にして、入口の絵と同じ家だとわかるようにする
- 畑（`garden`）は、今のスプルの素材集の切り抜き（種・芽・つぼみ・花）のままにする

### 5-2. 新しい16点のレベルと値段（学習ポイント）

| カテゴリ | 物 | キー | Lv | pt | 大きさ |
|---|---|---|---|---|---|
| しぜん | チューリップ | `tulip` | 1 | 15 | 1マス |
| しぜん | 岩と草 | `rock` | 2 | 15 | 1マス |
| しぜん | ひまわり | `sunflower` | 3 | 25 | 1マス |
| しぜん | まるい植え込み | `bush` | 4 | 20 | 1マス |
| しぜん | もみじ | `momiji` | 5 | 50 | 1マス |
| しぜん | 松 | `pine` | 6 | 45 | 1マス |
| かざり | 植木鉢 | `flower_pots` | 1 | 15 | 1マス |
| かざり | 井戸 | `well` | 2 | 50 | 1マス |
| かざり | 街灯 | `street_lamp` | 3 | 40 | 1マス |
| かざり | ポスト | `mailbox` | 5 | 35 | 1マス |
| いえ・お店 | 小さな家 | `cottage` | 2 | 120 | 1マス |
| いえ・お店 | 赤い屋根の家 | `red_house` | 5 | 180 | 1マス |
| いえ・お店 | パン屋 | `bakery` | 6 | 250 | 2×2 |
| いえ・お店 | 和風の家 | `japanese_house` | 8 | 280 | 2×2 |
| いえ・お店 | カフェ | `cafe` | 9 | 320 | 2×2 |
| 名所 | 灯台 | `lighthouse` | 9 | 350 | 2×2 |

- 今 Lv1〜3 で買える物は5つしかないため、序盤の物を多めにした
- 新しい16点は、画像が届いてからショップに並べる（それまでは絵がないため）

### 5-3. これから増やすときの決まり

- 柵・道・線路のように、つながって見える物は、物の向きを変える仕組みができるまで入れない（今は一方向にしかつながらない）
- 名所は2×2にそろえる
- 色違いは家と花だけにし、別のアイテムとして売る（色を選ぶ仕組みは作らない）
- 新しい物は、カテゴリとレベルが偏らないように少しずつ足す
- 足すときも、4章の決まりと6章の共通のプロンプトを使う

### 5-4. 特別の名所（2026-09-29追加）

各国の有名な建物を、Lv10から上の目標になる高額でレアな名所にする。依頼文は `company/mascot/docs/town-item-request.md`（区分「特別」は1枚に2点）。1回目は `items/item10.png`・`item11.png` の4点。

| 物 | キー | 国 | Lv | pt | 大きさ | 夜の明かり |
|---|---|---|---|---|---|---|
| 金閣寺 | `kinkakuji` | 日本 | 10 | 600 | 2×2 | なし |
| 南大門 | `sungnyemun` | 韓国 | 11 | 650 | 2×2 | なし |
| 凱旋門 | `arc_de_triomphe` | フランス | 13 | 750 | 2×2 | なし |
| ビッグ・ベン | `big_ben` | イギリス | 15 | 900 | 2×2 | 時計の文字盤2つ |

- カテゴリは「名所」。今の名所（五重塔 Lv9・300pt〜タワー Lv12・500pt）より上に置き、Lv10から上が1レベルに1点しかなかった所を埋める
- 切り抜きの縮尺は2枚とも0.63（いちばん幅の広い金閣寺・南大門が2×2の幅〔約512px〕になる）。ビッグ・ベンはほかの2×2より背が高い（特別なので高さはあってよい）
- 名前や見た目の権利（商標など）は、公開前に法務の確認とあわせて確かめる（`docs/legal/README.md`）

## 6. プロンプト（英語）

Ownerが画像生成に貼る文。**共通の部分**のあとに、**シートごとの品目**を続けて1つのプロンプトにする。

### 6-1. 共通の部分

```text
Game asset sheet for a cozy mobile town-building game for children and families.

Draw 6 separate objects on one landscape canvas (1536x1024), arranged in a grid of 3 columns and 2 rows, with wide empty space between the objects. Each object stands alone.

Style: match the attached character art of Spru, a small green sprout character. Use the same soft cartoon style: smooth dark-brown outlines (not black), bright and warm colors, simple cel shading with 2 to 3 tones, light coming from the upper left. Shapes are rounded, chunky and toy-like, like cute miniatures. Keep details simple and bold, so that each object is still easy to recognize when it is shown very small (about 50 pixels wide). No tiny patterns. Use at most one or two strong accent colors per object, and keep the colors friendly with a soft yellow-green lawn and beige paths.

View: isometric 3/4 view from above (2:1 isometric, like a classic isometric town game). Every object faces the same way: its front (door, face or main side) points toward the lower left.

Draw only the object itself: no ground tile, no base, no platform, no grass patch, no cast shadow, no background scenery. Lamps and lanterns are drawn switched off, in daylight.

Background: fully transparent. If transparency is not possible, use a plain pure white background with no gradient.

No text, no letters, no numbers, no labels, no watermark. Signs show simple pictures instead of words.

All six objects on this sheet are drawn at a consistent scale relative to each other, as described below.
```

2枚目からは、共通の部分の最後に次の1文を足し、良かったシートを添える。

```text
Match the attached approved sheet exactly in style, line weight, colors, shading and angle.
```

### 6-2. シートごとの品目

**シート1（1マスの低い物）**

```text
Objects (all low, about knee height compared with a small house):
1. A rectangular flower bed with a low wooden border, filled with pink, yellow and purple flowers.
2. A wooden park bench with a backrest.
3. A cute bicycle with a basket in front, standing on its kickstand.
4. A small white rowing boat with a red stripe, resting on the ground as a decoration.
5. A short wooden pier (a small jetty made of planks on posts), extending toward the lower left.
6. A small stone statue of a Komodo dragon, standing on all fours, friendly-looking.
```

**シート2（1マスの低い物）**

```text
Objects (all low, about knee height compared with a small house):
1. A small bronze statue of an American bison, friendly-looking.
2. A small cluster of red and yellow tulips.
3. A couple of rounded gray rocks with tufts of green grass.
4. Three tall sunflowers standing together (a little taller than the other objects on this sheet).
5. A round, neatly trimmed green bush.
6. A group of three terracotta flower pots with colorful flowers.
```

**シート3（1マスの高い物・試し）**

添える絵: スプルの絵（mascot-6）とスプルの家（image1）。

```text
Objects (tall objects that each fit on one square tile):
1. Spru's house: a small rounded dome-shaped cottage, a simplified version of the attached house image. Mossy green roof with a big two-leaf sprout on top, cream stone walls, a round wooden door and one round window. Keep it simple and chunky.
2. A small vermilion Japanese torii gate with a black top beam.
3. A round, leafy green tree with a short brown trunk.
4. A red Japanese paper lantern (chochin) hanging from the arm of a short wooden post.
5. A Japanese drink vending machine, white and blue, with rows of colorful drink bottles (no text).
6. A small cozy wooden cottage with a triangular roof, one door and one window.
Relative size: the tree and the torii are the tallest, the two houses are slightly shorter, the lantern and the vending machine are about the height of a door.
```

**シート4（1マスの高い物）**

```text
Objects (tall objects that each fit on one square tile):
1. A Japanese stone lantern (ishidoro), gray stone, lamp switched off.
2. A few green bamboo stalks with leaves (a small group of 3 to 4 stalks).
3. A dense little bamboo grove (many bamboo stalks close together, fuller than object 2).
4. A cherry blossom tree in full bloom, soft pink, with a brown trunk.
5. A palm tree with a slightly curved trunk.
6. A beach parasol with red and white stripes, standing upright.
Relative size: the trees and the bamboo grove are the tallest, the parasol and the stone lantern are about the height of a door.
```

**シート5（1マスの高い物）**

```text
Objects (tall objects that each fit on one square tile):
1. A small Japanese food stall (yatai) with a wooden counter, a small roof and a plain red cloth curtain (no text).
2. A Japanese maple tree (momiji) with bright red and orange autumn leaves.
3. A Japanese pine tree with a gently twisted trunk and layered green needles.
4. A small stone well with a little wooden roof and a bucket.
5. A classic street lamp with a black post and a round lamp, switched off.
6. A round red Japanese mailbox on a short post (no text).
Relative size: the two trees are the tallest, the stall and the street lamp are about the height of a small house, the well and the mailbox are shorter.
```

**シート6（1マスの高い物・4点と空き2枠）**

```text
Objects (tall objects that each fit on one square tile). Draw only these 4 objects, spaced evenly:
1. A small cottage with a red roof, white walls, a door and two windows.
2. A small stone statue of a Dol hareubang (Jeju Island grandfather statue), round and friendly.
3. A classic red British telephone box.
4. A small souvenir figurine of the Eiffel Tower, dark brown iron.
Relative size: the telephone box and the cottage are about the same height, the statue and the figurine are slightly shorter.
```

**シート7（2×2の物）**

```text
Objects (large objects that each fit on a 2x2 square area, so they are wider than one-tile objects):
1. A round stone fountain with a basin and water spouting from the center.
2. A Japanese five-story pagoda with dark roofs and vermilion details.
3. A Japanese castle with white walls and dark green-gray roofs.
4. A small white passenger ship (a little ferry) with a red funnel, resting on the ground as a decoration.
5. A red and white lattice radio tower, similar to Tokyo Tower, lamp at the top switched off.
6. A white lighthouse with a red top and a small house at its base, lamp switched off.
Relative size: the tower and the lighthouse are the tallest, the pagoda and the castle are slightly shorter, the fountain and the ship are low and wide.
```

**シート8（2×2の物）**

```text
Objects (large objects that each fit on a 2x2 square area, so they are wider than one-tile objects):
1. A cozy bakery with a striped awning, a big window and a signboard showing a bread picture (no text).
2. A traditional Japanese house with a dark tiled roof, wooden walls and sliding doors.
3. A small cafe with a green awning, a couple of outdoor tables with chairs and a signboard showing a coffee cup picture (no text).
4. A miniature of Borobudur temple: a stepped stone temple with small bell-shaped stupas.
5. A miniature of Bulguksa temple: a Korean temple building with colorful painted eaves and stone stairs.
6. The Statue of Liberty on a stone pedestal, soft green copper color, torch switched off.
Relative size: the Statue of Liberty is the tallest, the temples and the houses are about the same height.
```

**シート9（2×2の物・2点と空き4枠）**

```text
Objects (large objects that each fit on a 2x2 square area). Draw only these 2 objects, side by side with space between them:
1. A miniature of Stonehenge: a ring of large gray standing stones with a few lintels on top.
2. A miniature of Mont-Saint-Michel: a small rocky island with an abbey and a pointed spire on top.
Relative size: Mont-Saint-Michel is taller, Stonehenge is low and wide.
```

## 7. 町での表示のしかた

### 7-1. 画像ファイルの作り方（`tools/spru-assets/`）

- `crops.json` の `sources` にシートを足す（例: `"item3-2": "items/item3-2.png"`）。`items` の組に1点ずつ `{ "key": "tree", "source": "item3-2", "box": [左, 上, 右, 下], "scale": 0.512 }` の形で書く。背景が真っ白のシートは `"background": "flood"` も書く（四隅から背景を抜く。`item3-2` は透明なので書かない）
- `extract.py` は `items` の組を切り抜き、`frontend/public/spru/items/{key}.webp` に保存し、画面側の一覧 `SPRU_ITEMS`（キー → `{ src, width, height }`）を書き出す（手で直さない）
- 保存する大きさは `scale` で決める。**同じシートの物は同じ `scale` にする**（シートの中の大きさの比率を、そのまま町での大きさに使うため。4-3）。目安は、1マスいっぱいの物（家など）が幅256px、2×2いっぱいの物が幅512pxになる値
- 1回目の `scale`（町に置いて確かめて直す）:

  | シート | 中身 | scale |
  |---|---|---|
  | item1-2・item2-2 | 1マスの低い物 | 0.4（低い物は家より小さく見せる） |
  | item3-2 | 1マスの高い物 | 0.512 |
  | item4 | 1マスの高い物 | 0.533 |
  | item5-2 | 1マスの高い物 | 0.556 |
  | item6 | 1マスの高い物（横長の1枚に4点） | 0.388 |
  | item7 | 2×2の物 | 1.0 |
  | item8 | 2×2の物 | 0.985 |
  | item9 | 2×2の物（大きく2点） | 0.617 |

### 7-2. 大きさと位置

座標はSVGの単位で、菱形1マスは幅64・高さ32（`components/world/iso.ts`）。アイテムの原点は、1マスの物はマスの中心、2×2の物は4マスの真ん中（今と同じ）。

- 幅: `画像の幅(px) × 0.225 × scale`（256pxの画像が57.6＝1マスの幅の0.9になる）。細い街灯や小さなポストは細く、低い物は小さく出る。足元のマスの数は幅には使わない。高さは画像の縦横の比から決める
  - 2026-09-29に変更。最初は「どの画像も足元のマスの幅いっぱい」にしていたが、細長い物（街灯など）が家の何倍もの高さになるため
- 位置: 画像の下の真ん中を、原点から `足元のマスの数 × 8` だけ手前（下）に置く（マスの中心と手前の角のあいだ）
- `scale`・`dx`・`dy` は物ごとの微調整。`components/world/item-image-fit.ts`（手で直す設定）に、必要な物だけ書く
- 計算は1つの関数（`imagePlacement`）にまとめ、町の絵と小さな絵の両方で使う

### 7-3. 影と夜の明かり

- 影: 画像の物にも、今と同じ色（`#2f5d2a`・不透明度0.15）のだ円の影を原点より少し手前（y=2）に付ける。だ円の半径は、1マスは横20・縦8、2×2は横40・縦16。足元に草や台座がある絵と重ねて変に見える物は、町に置いて確かめて直す
- 夜: 今と同じく、町の物全体を少し暗くする（`world-scene.tsx` の `artStyle`）
- 明かり: 画像の物の明かりは、**画像の中の位置**で持つ（2026-09-29に変更）。`item-image-fit.ts` の `IMAGE_LIGHTS` に、キーごとに光の輪を `{ x, y, r }` で書く。`x`・`y` は画像の左上からの割合（0〜1）、`r` は半径（SVGの単位）。大きさの調整（`scale`）を変えても、光の輪が絵からずれない
  - 画面では関数 `lightCircles(key, footprint)` で、7-2 の置き場所からSVGの位置にする。アイテムも目印も、町の暗くする範囲の外に光の輪を重ねる（今のアイテムの光と同じ見え方）
  - 光る物: ちょうちん・石灯籠（アイテムと目印）・街灯・タワー・自由の女神・灯台・スプルの家（ランプと窓）
  - 今の `ITEM_LIGHTS`（プログラムの絵の位置）と `LANDMARK_LIGHTS` はやめる

### 7-4. 小さな絵（ショップ・バッグ・管理画面、`ItemIcon`）

- 画像がある物は、7-2 の計算で出した画像の範囲に少し余白を足した範囲を表示する。今の「2×2は広い範囲」の固定の範囲より、絵が大きくはっきり見える

### 7-5. 画像がない物

- `SPRU_ITEMS` にない物は、プレゼント箱の代わりの絵で表示する（画面が崩れないため）
- 1回目の画像で、アイテム・おみやげ・目印の絵が全部そろったので、プログラムの絵は消す（`item-art.tsx` の絵、`travel-art.tsx`、`iso-shapes.tsx`、`landmark-art.tsx` の絵）。種から咲くスプルの花（素材集の切り抜き）とプレゼント箱は残す
- アイテム・おみやげ・目印のすべてのキーに画像があることを、テストで確かめる（画像を足し忘れたまま新しいキーを足さないため）

### 7-6. 目印

- スプルの家・鳥居・石灯籠・竹林・桟橋も画像で表示する（`LandmarkArt`）。置き方（大きさ・位置・影）はアイテムと同じ計算にする
- 明かりは 7-3 のとおり、町の側で光の輪を重ねる（`LandmarkArt` は画像だけを描く）

## 8. 進め方

| 段階 | 時期 | 内容 |
|---|---|---|
| 1 | 今すぐ | カテゴリ（サーバー・ショップ・バッグ・管理画面）と、画像を表示する仕組み（切り抜きの `items` の組・`SPRU_ITEMS`・`imagePlacement`・町の絵・小さな絵・目印）を作る。仕組みは合成した試しのシートで確かめる |
| 2・3 | シート9枚が届いたので、まとめて行う（2026-09-29） | 48点を切り抜く（7-1）。大きさを画像の幅から決める形にする（7-2）。明かりを画像の中の位置で持つ（7-3）。プログラムの絵を消す（7-5）。新しい16点を設定（`asset_keys`・`asset_footprints`・`asset_categories`・画面の絵の一覧）と品ぞろえ（`WorldItemSeeder`）に足す。町に置いて、大きさ・位置・影・明かりを確かめて調整する |

段階1のあと、開発は出題のくり返しに進んだ。段階2・3は、シート9枚が届いた 2026-09-29 にまとめて行う。

## 9. テスト

### 9-1. サーバー（Pest）

- `ShopItem::category()`: `asset_categories` のとおりに返す。おみやげは `souvenir`。回復薬・称号は `null`。設定にないキーは `decor`
- `GET /api/shop`: 町のアイテムに `category` が付き、回復薬は `null`
- `GET /api/world`: バッグと町のアイテムに `category` が付く。おみやげは `souvenir`、スプルの花は `nature`
- 設定: `asset_keys` のすべてのキーにカテゴリがあり、カテゴリは6つのどれか（`souvenir` はおみやげだけ）
- 品ぞろえ（`WorldItemSeeder`）: 新しい16点を足して34種類。2×2は9つ（噴水・五重塔・お城・タワー・大きな船・パン屋・和風の家・カフェ・灯台）。新しい物のレベルと値段は5-2のとおり

### 9-2. 画面（Vitest）

- `art-keys.test.ts`: `ITEM_ART_CATEGORIES` が `config/world.php` の `asset_categories` と同じ
- ショップのタブ: 品のあるカテゴリだけが決まった順に並ぶ。最初のタブ。NEW の判定（今のレベルと同じ `min_level` で鍵がない物だけ）。NEWの物があるタブの印
- バッグのタブ: 「すべて」が最初で、そのあとに品のあるカテゴリだけ
- `imagePlacement`: 幅は画像の幅×0.225（2×2でも同じ）、下は足元のマスの数×8だけ手前。`scale`・`dx`・`dy` が効く。小さな絵の表示範囲
- `lightCircles`: 画像の中の割合の位置が、置き場所に合わせたSVGの位置になる。`scale` を変えても絵の同じ所に付く。明かりのない物・画像のない物は空
- すべてのアイテム・おみやげ・目印のキーに `SPRU_ITEMS` の画像がある

### 9-3. ブラウザでの確認

- ショップとバッグのタブ（幅390px・1280px）。Tabキーでタブに移り、Enterで切り替えられる
- 画像を表示する仕組み: 合成した試しのシートから作った画像を、開発中だけ一時的に登録して町・ショップ・バッグで見え方を確かめる（確認用の画像はコミットしない）
- 確認のあと、開発用のデータが変わっていないことを確かめる

## 10. やらないこと

- 物の向きを変える（回転）仕組み
- 柵・道・線路など、つながって見える物
- 色を選ぶ仕組み（色違いは別のアイテムにする）
- ショップの「すべて」のタブ、最後に開いたタブを覚えること
- 地面のマス目の描き直し
- 緑の未来都市のアイテム（Spra-world で扱う）

## 11. ドキュメントの更新

- `SPEC.md`: 町のアイテムのカテゴリ（6つ）と、アイテムの絵を画像にする方針を足す
- `TASKS.md`: 「町のアイテムのカテゴリ分けと画像への差し替え」を足し、段階1を完了にする。アイテム画像の依頼（シート9枚・この設計書の6章）を、追加の画像の次の依頼として書く
- `company/mascot/CLAUDE.md`: アイテムの画像の決まりと、シートの置き場所（`assets/items-01.png`〜）を追記する（追記のみ）
- 段階2・3（2026-09-29）: `SPEC.md` の町のアイテムの項目に、画像にしたこと・新しい16点・大きさと明かりの決め方を足す。`TASKS.md` の段階2・3を完了にする。`company/mascot/CLAUDE.md` にシートの置き場所 `assets/items/` とタッチの変更を追記する（済み）
