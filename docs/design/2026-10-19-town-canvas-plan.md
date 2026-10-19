# 街づくりのCanvas化 段階1 — 実装計画

- 設計書: `docs/design/2026-10-19-town-canvas-design.md`(Owner承認済み 2026-10-19)
- ブランチ: `feature/town-canvas`
- 実行方法: ネイティブ(私が実装し、最後に自分で見直す。最後の見直しだけOpusをOwnerに頼む)
- 方針: 画面の外から見たもの(props・押せる場所・吹き出し)は変えない。`?canvas=1` でCanvas版、なければSVG版

## 全体の決まり

- Canvasの座標は、SVGの座標(`sceneViewBox` の単位)をそのまま使う。`ctx.setTransform(k·dpr, 0, 0, k·dpr, −vb.x·k·dpr, −vb.y·k·dpr)`(k = 表示幅 / vb.width)。SVG版の計算(`tileCenter`・`imagePlacement` など)を共用する。
- 画面の密度は最大2倍。Canvasの幅は4096px以内。
- 夜は `ctx.filter` を使わない(Safariで使えないため)。物は、黒を重ねる(`brightness(0.78)` = 黒を不透明度0.22で重ねる)。波の縁は色に0.6をかける。
- 影・ぼかしは、`shadowBlur` と、不透明度を変えた太い線の重ね描きで近づける。見比べて、違いが目立つ所だけ直す。
- 動きは、1つの時刻(秒)から計算する。動きを減らす設定(`prefersReducedMotion`)・`quiet` のときは動かさない。

## ファイル

| ファイル | 内容 |
|---|---|
| `world/canvas/scene-model.ts` | propsから描く物の一覧を作る純粋な関数 `buildSceneModel` |
| `world/canvas/animation.ts` | 時間から動きの量: `bobOffset`・`hopOffset`・`pulseOpacity`・`popScale`・`cloudClear`・`foamOpacity` |
| `world/canvas/image-cache.ts` | 画像の読み込みの管理 `createImageCache` |
| `world/canvas/draw-ground.ts` | 動かない層 `drawGroundLayer` |
| `world/canvas/draw-objects.ts` | 動く層 `drawObjectsLayer` |
| `world/canvas/town-canvas.tsx` | CanvasのReact部品 `TownCanvas` |
| `world/world-scene.tsx` | `?canvas=1` のときだけ、`<svg>` のかわりに `TownCanvas` |

## タスク

### タスク1: 動きの計算 `animation.ts`

- [ ] テストを先に書く(`animation.test.ts`): `bobOffset(t, delay=0)`(周期2.4秒・0〜−3px、`ease-in-out`)/ `hopOffset(elapsed)`(0.9秒×2回。0→−14→0→−5→0。2回のあとは0)/ `pulseOpacity(t)`(1.1秒周期・0.55〜0.95)/ `popScale(elapsed)`(0.45秒・0.3→1.12→1。不透明度も)/ `cloudClear(elapsed)`(1.2秒・不透明度1→0、上へ14px、1→1.18倍)
- [ ] 失敗を確かめ、実装して通す

### タスク2: 描く物の一覧 `scene-model.ts`

- [ ] テストを先に書く(`scene-model.test.ts`): 奥から手前の並び(目印・アイテム・仲間・スプルが `x+y`、同じなら `x` の順)/ 寝ているスプルは出さない / アイテムの絵の位置は `imagePlacement` と同じ(大きな建物は4マスの真ん中・反転)/ 夜の光の輪は `lit` のときだけ / 道のマス・ふち・中央線(`roadMarks`はアスファルトの道だけ)/ 市松は絵のない地面だけ / 小物は塞がれたマスに出ない / 家の「zzz」は寝ているときだけ / 雲は閉じた区画だけ、開いた直後の雲(veil)は別
- [ ] 実装: `buildSceneModel({ land, items, companions, garden, spru, roadStyle, theme, preview, validTiles, placing, veil, … })` → `{ vb, ground, objects, overlays }`
- [ ] 通す

### タスク3: 画像の管理 `image-cache.ts`

- [ ] テスト: 同じ `src` は1回だけ読む / 全部揃ったら解決 / 読めなかった `src` は `get` が `null`(代わりの絵を使う)/ 読み込み完了で通知(`onLoad`)(画像の読み込みはテスト用の関数を渡す)
- [ ] 実装して通す

### タスク4: 動かない層 `draw-ground.ts`

- [ ] 波の縁(2本。ぼかしの重ね描き・夜は0.6倍)→ 崖(左右。パターンは128×32の小さなCanvasで作る。右は黒を0.2重ねる)→ 区画の地面の絵(`patternMatrix` と同じ変形を `CanvasPattern.setTransform` に。海のマスは `openTilesPath` の `Path2D` で切り抜く)→ 市松 → 道のマス・色の帯・中央線・横断歩道・ふち線 → 林・花畑(ぼかしたマスで切り抜く)→ 小物 → 夜の色
- [ ] ブラウザで見ながら調整(タスク7で見比べる)

### タスク5: 動く層 `draw-objects.ts`

- [ ] 畑の光・置ける場所の光・プレビューのマス → 雲 → 物(奥から手前): 影(楕円)・絵・反転・夜の黒・光の輪・「ぽん」→ 仲間(相棒の札・「！」・跳ねる)→ スプル(つぼみ・花・「！」)→ 家の「zzz」→ 置く前のうす絵 → 開いた直後の雲
- [ ] 画像がまだ無いときの代わりの絵(プレゼント箱・畑の畝)も描く

### タスク6: 部品 `town-canvas.tsx` とつなぎ

- [ ] `TownCanvas({ model, width, … })`: Canvasの大きさ、動かない層の保存(変わったときだけ作り直す)、`requestAnimationFrame`(画面が見えないとき・動くものがないときは止める/間引く)、画像が届いたら描き直す
- [ ] `world-scene.tsx`: `useSearchParams` の `canvas=1` のときだけ `TownCanvas`。ボタン・吹き出し・札は共通
- [ ] 型・lint・既存テスト

### タスク7: SVG版と見比べる・軽さを測る

- [ ] Playwright で、同じデータの写真(昼・夕・夜、雲あり、置くとき、仲間あり、家族の町)をSVG版・Canvas版でとって見比べ、違いを直す
- [ ] 動いている間のフレーム時間を、SVG版・Canvas版で測る(数値を設計書に記録)

### タスク8: 切り替え・後片付け

- [ ] Ownerの確認後、Canvas版をふつうにし、SVG版(`<svg>`・使わなくなった部品)を消す。`ItemIcon` など別の場所で使うSVGは残す
- [ ] `SPEC.md`・`TASKS.md`・設計書を更新。全テスト(Pest・Vitest・tsc・eslint)

## 確認の基準

- 動きの計算・描く物の一覧・画像の管理が、Vitestで通る。
- 見比べて、物の位置・大きさ・前後・動き・夜の見た目に違いがない(細かい色のぼかしの差は許す)。
- 既存のテストがすべて通る。
