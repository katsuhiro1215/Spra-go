# 町のアイテムのカテゴリ分けと、アイテム画像の決まり — 設計書

- 作成日: 2026-09-28
- ステータス: Owner合意済み（絵のタッチ・カテゴリ6つ・1回目の枚数・取り込み方・画像の決まり・一覧・表示のしかた・進め方を対話で確認）
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
| 絵のタッチ | スプルの絵（素材集 mascot-6 など）に合わせる。image1（スプルの家）ほど立体的には描き込まない（世界観の作り直しになるため） |
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

- スプルの素材集（`company/mascot/assets/mascot-6.png`）と同じタッチ
- 線はやわらかい焦げ茶（黒にしない）。明るくあたたかい色。影は2〜3段。光は左上から
- 形は、丸くて少しずんぐりした、おもちゃのようなミニチュア
- 細かい模様や文字は描かない（幅50pxでつぶれる）。看板は文字でなく絵で表す（パン屋ならパンの絵）
- 目立つ色は1点に1〜2色まで。町の地面（やわらかい黄緑・ベージュ）に合う色にする

### 4-2. 角度と足元

- 町と同じ、斜め上から見下ろす角度（2:1のアイソメ）
- 正面（入口・顔・いちばん見せたい面）は左下に向けてそろえる
- 地面・台座・草の敷物・影は描かない（影はプログラムで同じ形を付ける）
- 明かりのある物（ちょうちん・石灯籠・街灯・灯台・タワーなど）は、昼の消えた状態で描く（夜の明かりはプログラムで重ねる）

### 4-3. シートの作り方

- 横長の1枚（1536×1024）に6点。3列×2段で並べ、間を広く空ける
- 文字・番号・ラベル・透かしは入れない
- 背景は透明。透明にできなければ真っ白の無地（グラデーションや模様にしない）。どの物も線で囲まれているので、白い壁の物も切り抜ける
- 同じシートには大きさの近い物をまとめる（1マスの低い物／1マスの高い物／2×2の物）。シートの中では、物どうしの大きさの比率をそろえる

### 4-4. そろえ方

- まず試しの1枚（シート3）を作り、開発が町に置いて見え方を確かめる。必要なら決まりとプロンプトを直してから、残りの8枚を頼む
- 2枚目からは、良かったシートとスプルの絵を添えて「同じタッチで」と頼む。シートごとの絵柄のぶれを防ぐため
- 添える絵: 全シートでスプルの絵（mascot-6）。シート3はスプルの家（`company/mascot/assets/image1.png`）も添える。2枚目以降は、良かったシート3も添える

### 4-5. ファイル名と置き場所

- シートは `company/mascot/assets/items-01.png`〜`items-09.png`（番号は5章のシート番号）
- 1点だけ描き直したときは `items-03b.png` のように後ろに文字を付けて置く（切り抜きの設定でどのシートから取るかを書き分ける）

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

- `crops.json` に `items` の組を足す。1点ずつ `{ "key": "tree", "source": "items03", "box": [左, 上, 右, 下], "background": "flood", "width": 256 }` の形で書く（`sources` に `"items03": "items-03.png"` を足す）
- `extract.py` は `items` の組を切り抜き、`frontend/public/spru/items/{key}.webp` に保存する。背景が透明でないシートは、今の `clear_background`（四隅から背景を抜く）を使う
- 保存する幅は `width` で決める（1マスの物は256px、2×2の物は384px）。スマホの高精細な画面で町と小さな絵の両方に使える大きさ
- 画面側の一覧 `frontend/src/components/spru/spru-assets.ts` に `SPRU_ITEMS`（キー → `{ src, width, height }`）を書き出す（今のほかの組と同じく、手で直さない）

### 7-2. 大きさと位置

座標はSVGの単位で、菱形1マスは幅64・高さ32（`components/world/iso.ts`）。アイテムの原点は、1マスの物はマスの中心、2×2の物は4マスの真ん中（今と同じ）。

- 幅: `足元のマスの数 × 64 × 0.9 × scale`（1マスは57.6、2×2は115.2が基準）。高さは画像の縦横の比から決める
- 位置: 画像の下の真ん中を、原点から `足元のマスの数 × 8` だけ手前（下）に置く（マスの中心と手前の角のあいだ）
- `scale`・`dx`・`dy` は物ごとの調整値。`components/world/item-image-fit.ts`（手で直す設定）に、必要な物だけ書く。木の枝や桟橋のように、はみ出す物・ずらしたい物に使う
- 計算は1つの関数（`imagePlacement`）にまとめ、町の絵と小さな絵の両方で使う

### 7-3. 影と夜の明かり

- 影: 画像の物にも、今と同じ色（`#2f5d2a`・不透明度0.15）のだ円の影を原点より少し手前（y=2）に付ける。だ円の半径は、1マスは横20・縦8、2×2は横40・縦16
- 夜: 今と同じく、町の物全体を少し暗くする（`world-scene.tsx` の `artStyle`）
- 明かり: 今の `ITEM_LIGHTS`（光の輪の位置）を、画像に差し替えるときに測り直す。新しく光る物（街灯・灯台）も足す。目印（スプルの家の窓・石灯籠）の明かりも、画像では同じように光の輪を重ねる（`LANDMARK_LIGHTS`）

### 7-4. 小さな絵（ショップ・バッグ・管理画面、`ItemIcon`）

- 画像がある物は、7-2 の計算で出した画像の範囲に少し余白を足した範囲を表示する。今の「2×2は広い範囲」の固定の範囲より、絵が大きくはっきり見える

### 7-5. 画像がない物

- `SPRU_ITEMS` にない物は、今のプログラムの絵のまま表示する。少しずつ差し替えても町が崩れない
- 全部の画像がそろったら、差し替えたプログラムの絵は消す（プレゼント箱の代わりの絵は残す）

### 7-6. 目印

- スプルの家・鳥居・石灯籠・竹林・桟橋も、`SPRU_ITEMS` に画像があれば画像で表示する（`LandmarkArt`）
- 置き方（大きさ・位置・影）はアイテムと同じ計算にする

## 8. 進め方

| 段階 | 時期 | 内容 |
|---|---|---|
| 1 | 今すぐ | カテゴリ（サーバー・ショップ・バッグ・管理画面）と、画像を表示する仕組み（切り抜きの `items` の組・`SPRU_ITEMS`・`imagePlacement`・町の絵・小さな絵・目印）を作る。仕組みは合成した試しのシートで確かめる |
| 2 | 試しの1枚が届いたら | シート3を切り抜いて町に置き、見え方を確かめる。調整値を決め、必要なら4章・6章を直してOwnerに伝える |
| 3 | 残りの8枚が届いたら | 全部を切り抜く。新しい16点を設定（`asset_keys`・`asset_footprints`・`asset_categories`・画面の絵の一覧）と品ぞろえ（`WorldItemSeeder`）に足す。光の位置を測り直す。差し替えたプログラムの絵を消す |

段階1のあと、開発は出題のくり返し・学ぶタブの地図に進む。段階2・3は画像が届いたときに行う。

## 9. テスト

### 9-1. サーバー（Pest）

- `ShopItem::category()`: `asset_categories` のとおりに返す。おみやげは `souvenir`。回復薬・称号は `null`。設定にないキーは `decor`
- `GET /api/shop`: 町のアイテムに `category` が付き、回復薬は `null`
- `GET /api/world`: バッグと町のアイテムに `category` が付く。おみやげは `souvenir`、スプルの花は `nature`
- 設定: `asset_keys` のすべてのキーにカテゴリがあり、カテゴリは6つのどれか（`souvenir` はおみやげだけ）

### 9-2. 画面（Vitest）

- `art-keys.test.ts`: `ITEM_ART_CATEGORIES` が `config/world.php` の `asset_categories` と同じ
- ショップのタブ: 品のあるカテゴリだけが決まった順に並ぶ。最初のタブ。NEW の判定（今のレベルと同じ `min_level` で鍵がない物だけ）。NEWの物があるタブの印
- バッグのタブ: 「すべて」が最初で、そのあとに品のあるカテゴリだけ
- `imagePlacement`: 1マス・2×2の幅と位置。`scale`・`dx`・`dy` が効く。小さな絵の表示範囲

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
- 段階2・3の作業（画像が届いてから、この設計書に沿って行う）

## 11. ドキュメントの更新

- `SPEC.md`: 町のアイテムのカテゴリ（6つ）と、アイテムの絵を画像にする方針を足す
- `TASKS.md`: 「町のアイテムのカテゴリ分けと画像への差し替え」を足し、段階1を完了にする。アイテム画像の依頼（シート9枚・この設計書の6章）を、追加の画像の次の依頼として書く
- `company/mascot/CLAUDE.md`: アイテムの画像の決まりと、シートの置き場所（`assets/items-01.png`〜）を追記する（追記のみ）
