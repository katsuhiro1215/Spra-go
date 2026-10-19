# 街づくり段階2a(道を自由に引く)— 実装計画

- 設計書: `docs/design/2026-10-19-town-roads-design.md`(Owner承認済み 2026-10-19。11章の案のとおり)
- ブランチ: `feature/town-roads`。実行方法: ネイティブ(私が実装し、最後に自分で見直す)
- 2b(Spruが歩く)は、2aを `main` に入れたあとの別の計画

## タスク

### S1: サーバーの土台
- [ ] テストを先に書く(`tests/Feature/WorldRoadsTest.php`): 引いた道が `GET /api/world` の `paths`・`blocked`・`custom_paths` に入る / 置く場所が引いた道なら422 / 他の人の道は入らない / 家族の町に出る
- [ ] マイグレーション `profile_roads`(`user_profile_id`・`x`・`y`・一意)、モデル `ProfileRoad`、`UserProfile::roads()`、`config/world.php` の `roads.max`
- [ ] `WorldLand::toArray($level, $profile = null)`・`WorldPlacement::check`・`Family.php`

### S2: 道のAPI
- [ ] テストを先に書く: 引ける / 雲・海・外・目印・もとの道・アイテムの上・二重は422 / 上限 / 消せるのは自分の道だけ / 全部通るか全部通らないか / 両方空は422
- [ ] `POST /api/world/roads`(トランザクション・プロフィールをロック)

### C1: 純粋な関数(画面)
- [ ] `roads/road-edit.ts`(`strokeTiles`・`canDrawAt`・`canEraseAt`・`diffStroke`・履歴)と `canvas/tile-at.ts` をVitestで先に

### C2: 画面
- [ ] `roads/road-api.ts`・`roads/road-toolbar.tsx`。`world-screen`(道具・引いた道・履歴・送る順番)、`town-canvas`(`onTilePointer`・先読み・`touch-action`)、`town-map`(`lockScroll`)、`world-scene`(道具の間は透明ボタンを止める)
- [ ] 型・lint・Vitest

### C3: 確認・仕上げ
- [ ] Playwright(スマホ幅): 引く→再読み込みで残る/消す/もどす/道具の間はアイテムを押せない/軽さ
- [ ] Pest全体・`SPEC.md`・`TASKS.md`・設計書の記録
