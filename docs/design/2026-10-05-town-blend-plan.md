# 町がなじむ（段階1・2）— 実装計画

> **実行方法:** ネイティブ（サブエージェントは使わず、インラインで実装し、最後に自分で見直す）。手順は `- [ ]` で追う。

**Goal:** 町の地面を、市松のマスから、区画ごとの絵のある地面に置き換え、木3本以上・花3つ以上のまとまりの足元を林・花畑の地面に変える（にぎやか度＋4）。

**Architecture:** サーバーは変えない（画面だけ）。純粋な関数（`ground.ts`・`blend.ts`）と、素材の変換スクリプト（`tools/ground-assets/`）を作り、`world-scene.tsx` の地面の描き方を差し替える。絵がない地面は、今の市松で描く。

**Tech Stack:** Next.js/TypeScript（Vitest）、SVG `<pattern>`、Python（Pillow）

**Spec:** `docs/design/2026-10-05-town-blend-design.md`（段階1・2。段階3の国の道は、Ownerの判断後に別の計画で行う）

ブランチ: `feature/town-blend`（設計書は #00378 でコミット済み）。この計画 #00379、実装は #00380 から。コミットの形式は `#NNNNN: type:要約`＋Co-Authored-By。

## Global Constraints

- サーバー・データベース・窓口は変えない（にぎやか度は画面側だけの計算）
- 道の位置、地図の形、置ける・置けない判定、置ける空きマスの光り方は変えない
- 夜・季節の色づけ（`theme.groundTint`、`artStyle`）は今のまま、地面にも効く
- 絵のないキーは、今の市松（`GROUND` の2色）で描く。絵がどれも無くても、今の見た目で動く
- 町は1秒ごとに描き直される（`world-scene.tsx`）。地面の計算は、毎回やり直さず、`useMemo` で、入力（土地・置いたアイテム）が変わったときだけにする
- 追加の画像は合計1MB以内（512px WebP）
- テスト: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`。サーバーは触らないが、最後に `./vendor/bin/sail test` も流す
- 開発用データベース: プロフィール7を元の状態に戻す（アイテムを置いたら、確かめたあとで元の位置・個数に戻す）

## Review Focus

- 区画ごとの地面の絵に、マスの境目の線・すき間が出ない（拡大・縮小しても）
- 区画の一部だけ開いている・開いていない区画（雲）がある地図で、地面が開いた区画だけに描かれる
- 木が2本しかない・離れている・木と花が混ざる、のとき、地面が変わらない
- 木を動かす・戻すと、林の地面がその場で更新される（古い地面が残らない）
- 林・花畑のにぎやか度の加点は、まとまり1つ+4・最大3つまで。家族の町（ほかの家族の町を見る）でも、同じ計算になる
- 絵のファイルが1枚もなくても、今と同じ市松の町になる

## Task 1: 計画のコミット

- [ ] この計画を #00379 でコミットする

## Task 2: 地面の純粋な関数（先にテスト）

**Files:** `frontend/src/components/world/ground.ts`、`frontend/src/components/world/ground.test.ts`

**Interfaces:**
- Produces:
  - `patternMatrix(textureSize: number): string` — `matrix(a b c d 0 0)`（`a = 128/T`、`b = 64/T`、`c = −128/T`、`d = 64/T`）
  - `plotPoints(plot: {x:number;y:number;w:number;h:number}): string` — 区画（`x,y` 奥の角、`w,h` マス数）を1つの菱形にした `points`。角 `(u,v)` は `((u−v)*HALF_W, (u+v)*HALF_H)`
  - `decalAt(x: number, y: number, kinds: number): number | null` — マスの座標から決まる小物（0〜kinds−1の番号）か、なし（`null`）。約15%のマスに出る。同じ座標なら、いつも同じ結果
  - `decalOffset(x: number, y: number): { dx: number; dy: number }` — マスの中心からのずれ（±12、±5の範囲、座標から決まる）

- [ ] 先にテストを書く（RED）: `patternMatrix(512)` が `matrix(0.25 0.125 -0.25 0.125 0 0)`、`plotPoints({x:0,y:0,w:7,h:7})` が上 `0,0`・右 `224,112`・下 `0,224`・左 `-224,112` の順の菱形、`decalAt` が同じ座標で同じ結果・全マス（0〜11の12×12）での出現率が10〜20%・`kinds` 範囲内、`decalOffset` が範囲内で毎回同じ。実行 `cd frontend && npx vitest run src/components/world/ground.test.ts` **Expected:** 失敗する
- [ ] `ground.ts` を実装する（`decalAt`・`decalOffset` は、`x * 73856093 ^ y * 19349663` のような整数の混ぜ方で決める。Math.random は使わない）。**Expected:** 通る
- [ ] コミット `#00380: feat:町の地面の変形・区画の菱形・小物の位置を決める純粋な関数を足す`

## Task 3: 素材の変換（`tools/ground-assets/`）

**Files:** `tools/ground-assets/make_ground.py`、`frontend/public/spru/ground/*.webp`、`frontend/src/components/world/ground-art.ts`

- [ ] `make_ground.py` を作る: 原画（`company/spra/spra-world/assets/` の指定のPNG）を読み、512×512に縮め、**つなぎ目を消す**（半分ずらした絵と、中央を残すぼかしマスクで合成。試作と同じ方法）、WebPで `frontend/public/spru/ground/{キー}.webp`（品質85）に出す。入力と出力の対応は、スクリプト冒頭の表にする。最初の表: `grass_town ← source/terrain/soft_grass_01/v002.png`、`path ← source/terrain/warm_dirt_path_01/v001.png`。ほかのキー（`grass_bamboo`・`sand`・`hill`・`grove`・`meadow`）は、`approved/ground/` の絵が届いたら表に足す（まだ無いキーは、飛ばして、何を飛ばしたかを表示する）
- [ ] 実行して、端の差を測る: 出力を2×2に並べた画像の、つなぎ目の線上の画素の差が、絵の中の隣り合う画素の差の2倍以内か（スクリプトで数値を表示）。つなぎ目が見えるものは、ぼかしの幅を調整する
- [ ] `ground-art.ts` を作る: `GROUND_ART: Partial<Record<Ground | "path" | "grove" | "meadow", { src: string; size: number }>>`（出力した絵だけ。`grass` → `grass_town`、`path`）、`GROUND_DECALS: { src: string; width: number; height: number }[]`（今は空）
- [ ] 追加の画像の合計が1MB以内か確かめる（`du`）
- [ ] コミット `#00381: feat:町の地面の絵(草地・道)を、つなぎ目を消して作る変換スクリプトと一覧を足す`

## Task 4: 地面を絵で描く（`world-scene.tsx`）

**Files:** `frontend/src/components/world/world-scene.tsx`

- [ ] `<svg>` の先頭に `<defs>` を足し、`GROUND_ART` の各絵を `<pattern id="ground-{キー}" patternUnits="userSpaceOnUse" width={size} height={size} patternTransform={patternMatrix(size)}><image href={src} width={size} height={size} /></pattern>` にする（`Ground` の4種＋道）
- [ ] 地面の描き方を分ける: 絵がある地面の区画（開いている `plot` のうち、`GROUND_ART[plot.ground]` がある物）は、`<polygon points={plotPoints(plot)} fill="url(#ground-…)" />` を1つ。絵がない区画は、今のマスごとの市松のまま
- [ ] 道のマス（`pathSet`）: 道の絵（`GROUND_ART.path`）があれば、道のマスだけ `<polygon … fill="url(#ground-path)" stroke="url(#ground-path)" strokeWidth={0.6} />`（すき間を消すため同じ絵でふちも塗る）。道の絵がなければ、今の `PATH_COLOR`
- [ ] 道と地面の境のふち: 道のマスの外周に、半分透明の濃い色（`#8a6a1c`、不透明度0.18、幅1）の線を、道に接する草地側へ。**道と道の間の辺は引かない**（隣が道でない辺だけ。`land.paths` の集合で決める）
- [ ] 小物: `GROUND_DECALS` が空でなければ、開いている区画のマスのうち、道・アイテム・目印・スプルが立つマス以外で `decalAt` が非 `null` のマスに、`<image>` を `decalOffset` のずれで描く（小物は、アイテム・仲間より下に描く）。空なら何も描かない
- [ ] 夜・季節の色づけ（`groundTint`）、置ける空きマスの光、下見は今のまま（地面の上に重なる）
- [ ] `cd frontend && npx tsc --noEmit && npm run lint && npx vitest run` **Expected:** すべて通る
- [ ] ブラウザで見る（Task 7でまとめて行うため、ここでは、町が壊れず描かれることだけ確認）
- [ ] コミット `#00382: feat:町の地面を、区画ごとの絵・道の絵で描く(絵がない地面は今の市松)`

## Task 5: なじみ（林・花畑）の関数（先にテスト）

**Files:** `frontend/src/components/world/blend.ts`、`frontend/src/components/world/blend.test.ts`

**Interfaces:**
- Consumes: `footprintTiles`（`land.ts`）、`WorldItem` の `id`・`asset_key`・`x`・`y`・`footprint`
- Produces:
  - `TREE_KEYS`（`tree`・`sakura`・`momiji`・`pine`・`young_tree`・`broadleaf_tree`・`large_tree`）、`FLOWER_KEYS`（`flowerbed`・`tulip`・`sunflower`・`pathside_flowers`）
  - `blendGroups(items: BlendItem[]): BlendGroup[]` — `BlendItem = { id: number; asset_key: string | null; x: number | null; y: number | null; footprint?: number }`、`BlendGroup = { kind: "grove" | "meadow"; itemIds: number[]; cells: Tile[] }`。`cells` はアイテムが使うマス
  - `blendCells(group: BlendGroup, blocked: Set<string>, inMap: (x: number, y: number) => boolean): Tile[]` — `cells` と周囲1マス（8方向）のうち、`blocked`（道・ほかのアイテム・目印のマス）と地図の外を除いたマス
  - `BLEND_BONUS = 4`、`BLEND_MAX = 3`、`blendBonus(groups: BlendGroup[]): number` — `Math.min(groups.length, BLEND_MAX) * BLEND_BONUS`

- [ ] 先にテスト（RED）: 3本が隣り合うと林1つ・2本では空・3本でも離れていれば空・斜めでつながる・2×2の大きな木（`large_tree`）は1本で4マスを使い、隣の2本とつながれば3本として数える・木と花は別のまとまり（木3つ＋花3つで林1・花畑1）・置いていない（`x` が `null`）アイテムは数えない・`blendCells` が周囲1マスを足し、`blocked` と地図の外を除く・`blendBonus` が0・4・8・12・（4つ目も）12。実行 **Expected:** 失敗する
- [ ] `blend.ts` を実装する（つながりは、アイテムごとに使うマスを集め、8方向で隣り合うアイテムを、素集合（union-find）か幅優先でまとめる）。**Expected:** 通る
- [ ] コミット `#00383: feat:木・花が3つ以上隣り合うまとまり(林・花畑)を求める関数を足す`

## Task 6: なじみを描く・にぎやか度に足す

**Files:** `world-scene.tsx`、`liveliness.ts`、`liveliness.test.ts`、`components/family/family-town.tsx`（必要なら）、`ground-art.ts`

- [ ] 先にテスト（RED）: `liveliness.test.ts` に、木3本を置いたアイテムのにぎやか度が、`asset_key` なしの同じ数のアイテムより4高い・まとまり4つでも最大12・今のテスト（`asset_key` なし）の結果は変わらない。実行 **Expected:** 失敗する
- [ ] `liveliness.ts`: `Countable` に `id?`・`asset_key?` を足し、`livelinessScore` の最後に `blendBonus(blendGroups(items))` を足す（`asset_key` がなければ、まとまりは無い。呼び出し側は変えない）。`LIVELINESS_HINTS` に「木や花を、3つ近くに並べると、地面が変わるよ」を足す。**Expected:** 通る
- [ ] `world-scene.tsx`: `useMemo` で `blendGroups(placed)` と、`blendCells` で変えるマスを求める（`blocked` = 道・目印・スプル・仲間のマス・まとまり以外のアイテムが立つマス）。変えるマスは、`GROUND_ART.grove`・`meadow` があればその絵で、なければ、今の色（林: `#5f9e47`・不透明度0.45、花畑: `#f3b7d6`・不透明度0.35）で塗る。まとめて1つの `<g>` に入れ、`feGaussianBlur`（`stdDeviation` 3）のマスクでふちをぼかして、地面の上・アイテムの下に描く
- [ ] 家族の町（`family-town.tsx`）も、同じ関数で、地面とにぎやか度が同じになることを確認する（`world-scene.tsx` を共用なら、そのまま）
- [ ] `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint` **Expected:** すべて通る
- [ ] コミット `#00384: feat:林・花畑の地面を描き、にぎやか度に足す(まとまり1つ+4、最大3つ)`

## Task 7: ブラウザで確かめる

- [ ] ログイン `test@example.com`／プロフィール7（町テスト）。スクリーンショットは `.playwright-mcp/` の下だけ
- [ ] 町: 市松が見えず、草と道の絵が見える。スマホ幅（375px）と広い幅で、マスの境目の線が出ない。夜・夕方（時間帯の切り替え）の色づけが地面にも効く
- [ ] 木を3本、近くに置いて（確かめる間だけ。`profile_world_items` に行を足して）、林の地面に変わる。1本動かすと元に戻る。木と花の混在・2本だけ・離れた3本で変わらない
- [ ] にぎやか度の加点（★の段階の表示）、家族の町（別プロフィールの町を見る画面）でも同じ
- [ ] 確かめたあと、プロフィール7を元の状態に戻す（追加した `profile_world_items` を消す。xp 20、coins 60、points 95、ledger 最大668、`world_items` 4件など）。スクリーンショットと、その日の `page-*.yml`・`console-*.log` を消す
- [ ] 直しがあればコミット `#00385: fix:…`

## Task 8: ドキュメントと全体の確認、マージの確認

- [ ] `SPEC.md`（町の地面の絵・なじみ・にぎやか度の加算）、`TASKS.md`（「町がなじむ」を完了、国の道を段階3として残す）を更新して、コミット
- [ ] 全体のテスト（画面、サーバー）
- [ ] Review Focus の6点を、1つずつ確かめる
- [ ] 自分で見直す（最終見直しは自分によるもの）
- [ ] Ownerに報告して、マージの確認をとる。プッシュはOwner
