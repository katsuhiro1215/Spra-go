# 県マスターと地名コース 実装計画

> 実行する人へ: 実行方法はネイティブ（サブエージェントは使わない。CEOがインラインで実装し、最後に自分で見直す）。各ステップは `- [ ]` で追う。テストを先に書き、失敗を見てから実装する（RED → GREEN）。

**目的:** 県ごとに「地名」コースを足し、プールから抽選して出し、一般と地名の両方をクリアした人に「◯◯マスター」を渡す。

**設計書:** `docs/design/2026-10-06-prefecture-master-design.md`

**技術:** Laravel 13（Pest・Sail）、Next.js 16（Vitest）。MySQL。

**ブランチ:** `feature/prefecture-master`。計画のコミットは #00457、タスクは #00458 から。

## 全体の決まり

- テストは `./vendor/bin/sail test`（全体）、画面は `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`。
- 開発DBは `migrate:fresh` を使わない（`php artisan migrate` と `db:seed --class=...` だけ）。ブラウザ確認でプロフィール7を触ったら、確認後に元に戻す（xp 20・coins 60・hp 20・points 95・level 1・bloom_base_level 1・best_streak 2・current_streak 2・last_played_date 2026-09-27・last_correct_on null・combo 3・best_combo 5・last_review_on null・reviews_completed 0。台帳・覚え具合・遊んだ日・`profile_stage_draws` の増えた行も消す）。
- 新しい単漢字は、ふりがな辞書に足さない（熟語のみ）。
- コメントは、理由が分かりにくいところに1行だけ。
- コミットは `#番号: type:要約`。末尾に `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`。

## 計画時の判断（設計書との差）

1. **`stages.is_pool`（真偽。既定false）を足す。** 設計書は「プールが出す数より多いステージだけ抽選」としたが、Ownerが管理画面で作った既存ステージは、`question_count` より多い問題を割り当てている場合があり、その全問が今出ている。`question_count` だけで判定すると、既存の挙動が変わる。抽選は `is_pool` が真のステージだけにする。費用: 列が1つ増える。
2. **「最高難易度」は、`config('quiz.difficulties')`（3級）を変えず、`quiz.extra_difficulties` に別に持つ。** 3級の配列は、国・地域の画面など多くの場所が使っている。コース一覧（`/categories/{id}/stages`）は、最高難易度のステージがあるカテゴリーだけに、4つ目として足す。費用: 一覧とロック判定に、足す処理が要る。
3. **マスターの付与は、地名の上級ボスに `title_reward` を付けず、専用の処理で行う。** `title_reward` があると、既存の処理が条件なしで称号を渡すため。

## 変更するファイルの地図

| ファイル | 内容 |
|---|---|
| `database/migrations/2026_10_07_000001_add_pool_columns_to_stages_table.php`（新） | `stages.is_pool`・`stages.reward_percent`、表 `profile_stage_draws` |
| `app/Models/Stage.php` | fillable・casts・`playCount()` |
| `app/Models/ProfileStageDraw.php`（新） | 前回の出題 |
| `app/Support/StageDraw.php`（新） | 抽選 |
| `config/quiz.php` | `draw`・`extra_difficulties` |
| `app/Support/FlagQuiz/FlagQuizWriter.php` | 計画の `draw`・`reward_percent` を書く |
| `app/Support/Prefecture/PlaceNameQuizPlanner.php`（新） | CSVから地名コースの計画 |
| `database/data/place-names/*.csv`（新・47枚） | 元原稿のコピー |
| `database/seeders/PlaceNameQuizSeeder.php`（新） | 取り込み |
| `app/Support/Prefecture/PrefectureMaster.php`（新） | マスターの判定と付与 |
| `app/Support/Prefecture/PrefectureCatalog.php` | `masterTitle`、`badgeForTitle` がマスターも扱う |
| `app/Support/Prefecture/PrefectureBadges.php` | `master` を足す |
| `routes/api.php` | 出題・クリア・コース一覧・パスポート |
| `frontend/src/lib/prefecture-badges.ts` ほか | 数の文・金のふち・最高難易度の色 |
| `tests/Feature/StageDrawTest.php`（新）ほか | テスト |

---

## 段階1: 出題の仕組み

### タスク1（#00458）: 列と表

**ファイル:** 新規 `2026_10_07_000001_add_pool_columns_to_stages_table.php`、`app/Models/ProfileStageDraw.php`。変更 `app/Models/Stage.php`。テスト `tests/Feature/StageDrawTest.php`。

**公開するもの:** `Stage::playCount(): int`（`is_pool` なら `min(question_count, 割り当てた問題数)`、そうでなければ割り当てた問題数）。`ProfileStageDraw`（`user_profile_id`・`stage_id`・`question_ids` 配列）。

- [ ] **1. 失敗するテストを書く**

```php
<?php

use App\Models\Question;
use App\Models\Stage;

it('プールのステージは、出す数までが満点になる', function () {
    $stage = Stage::factory()->create(['question_count' => 10, 'is_pool' => true]);
    Question::factory()->count(20)->create()->each(fn ($q, $i) => $stage->questions()->attach($q->id, ['order' => $i + 1]));

    expect($stage->playCount())->toBe(10);
});

it('プールでないステージは、割り当てた問題すべてが満点になる(今まで通り)', function () {
    $stage = Stage::factory()->create(['question_count' => 10, 'is_pool' => false]);
    Question::factory()->count(12)->create()->each(fn ($q, $i) => $stage->questions()->attach($q->id, ['order' => $i + 1]));

    expect($stage->playCount())->toBe(12);
});

it('プールが出す数より少ないときは、全問が満点になる', function () {
    $stage = Stage::factory()->create(['question_count' => 10, 'is_pool' => true]);
    Question::factory()->count(4)->create()->each(fn ($q, $i) => $stage->questions()->attach($q->id, ['order' => $i + 1]));

    expect($stage->playCount())->toBe(4);
});
```

（`Stage::factory`・`Question::factory` が無ければ、既存の `StagePlayTest.php` の作り方に合わせる。）

- [ ] **2. 失敗を確認:** `./vendor/bin/sail test --filter=StageDrawTest`。期待: 列と関数がなくて失敗。
- [ ] **3. マイグレーションと実装**

```php
Schema::table('stages', function (Blueprint $table) {
    $table->boolean('is_pool')->default(false)->after('is_boss');
    $table->unsignedTinyInteger('reward_percent')->default(100)->after('is_pool');
});
Schema::create('profile_stage_draws', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
    $table->foreignId('stage_id')->constrained()->cascadeOnDelete();
    $table->json('question_ids');
    $table->timestamps();
    $table->unique(['user_profile_id', 'stage_id']);
});
```

`Stage` の fillable に `is_pool`・`reward_percent`、casts に `'is_pool' => 'boolean'`。

```php
public function playCount(): int
{
    $pool = $this->questions()->count();

    return $this->is_pool ? min($this->question_count, $pool) : $pool;
}
```

- [ ] **4. テストが通ることを確認。**
- [ ] **5. `php artisan migrate`（開発DB。`migrate:fresh` は使わない）→ コミット。**

### タスク2（#00459）: 抽選

**ファイル:** 新規 `app/Support/StageDraw.php`。変更 `config/quiz.php`。テスト `tests/Feature/StageDrawTest.php` に追記。

**公開するもの:** `StageDraw::pick(UserProfile $profile, Stage $stage): Collection`（出す `Question` の id の配列、並べ替え済み）。設定 `config('quiz.draw')`: `['anchor' => 5, 'wrong_max' => 3, 'keep' => 5]`。

規則（設計書3章）: ① 出す数 N = `playCount()`。② ボスなら、並び順の先頭 `anchor` 問を固定。ボスでなければ、前回の出題から `keep` 問を残す（前回がなければなし）。③ まちがい優先: `wrong_on` が新しい問題を最大 `wrong_max` 問（プールの中で、固定・残しに入っていないもの）。④ 残りは、まだ正解したことのない問題からランダム、足りなければ正解済みから。⑤ 同じ問題文が続かないよう並べる。⑥ 選んだ結果を `profile_stage_draws` に保存（`updateOrCreate`）。

- [ ] **1. 失敗するテストを書く**（実際のコードを書く。要点）
  - 先頭5問は、何回抽選しても必ず入る（ボス）。
  - まちがえた問題（`wrong_on` あり）が、プールの先頭5問以外にあれば入る（最大3問）。
  - ボスでないとき、2回目は前回の問題から5問が残る。
  - 結果は N 問で、重複がない。プールが N 以下なら全問。
  - 別のプロフィールの前回の出題は使わない。
  - 同じ問題文が連続しない（異なる文が2種類以上あるとき）。
- [ ] **2. 失敗を確認。**
- [ ] **3. 実装**（`QuestionMemory` の `wrong_on`・`mastered_on` の列を使う。正解したことのある問題は、`profile_question_memories` に行がある問題とする。`ProfileQuestionMemory` モデルを使う）。
- [ ] **4. 通ることと、全体のテストが通ることを確認 → コミット。**

### タスク3（#00460）: 出題・クリア・報酬

**ファイル:** `routes/api.php`（`GET /stages/{stage}`・`POST /stages/{stage}/complete`）。テスト `tests/Feature/StagePlayTest.php` に追記。

- [ ] **1. 失敗するテストを書く**
  - `is_pool` のステージ（プール20・出す10）を開くと、問題が10問返る。2回開いて、ボスなら先頭5問は同じ。
  - `is_pool` でないステージは、今まで通り全問（既存のテストが守る）。
  - `complete` は、プールのステージで `score` が10なら満点（ボスの称号が付く）。`score` を20にしても10に抑える。
  - `reward_percent` が50のステージのクリアで、コインが50（100の半分）、ポイントが `config('world.rewards.stage_clear')` の半分（切り捨て）。100のステージは今まで通り。
- [ ] **2. 失敗を確認。**
- [ ] **3. 実装**
  - 出題: `$stage->is_pool` のとき、`StageDraw::pick($profile, $stage)` の id で `Question` を読み込む（`$profile` がなければ、並び順の先頭から N 問）。それ以外は今のまま。
  - `complete`: `$stage->questions()->count()` を2か所とも `$stage->playCount()` に変える。
  - 報酬: `'coin' => intdiv(100 * $stage->reward_percent, 100)`、`'point' => intdiv(config('world.rewards.stage_clear') * $stage->reward_percent, 100)`。
- [ ] **4. 全体のテスト → コミット。**

### タスク4（#00461）: 書き込み（`FlagQuizWriter`）

**ファイル:** `app/Support/FlagQuiz/FlagQuizWriter.php`。テスト `tests/Feature/PrefectureQuizWriterTest.php` に追記。

**公開するもの:** ステージの計画に任意の `draw`（出す数）と `reward_percent`。`draw` があれば `question_count` に `draw`、`is_pool` を真に。なければ今まで通り（`question_count` は問題の数、`is_pool` は偽）。

- [ ] **1. 失敗するテストを書く**（`draw` 付きの計画を書くと、`question_count`・`is_pool`・`reward_percent` が入る。`draw` なしの計画は、`is_pool` が偽で `reward_percent` が100のまま。2回書いても増えない）。
- [ ] **2. 実装**（`writeCourse` の `Stage::updateOrCreate` の値に、`'question_count' => $stagePlan['draw'] ?? count(...)`、`'is_pool' => isset($stagePlan['draw'])`、`'reward_percent' => $stagePlan['reward_percent'] ?? 100`）。
- [ ] **3. 全体のテスト → コミット。**

---

## 段階2: 地名コース

### タスク5（#00462）: 元原稿のコピーと計画

**ファイル:** 新規 `database/data/place-names/{NN-key}.csv`（47枚）、`app/Support/Prefecture/PlaceNameQuizPlanner.php`。テスト `tests/Feature/PlaceNameQuizPlannerTest.php`。

元原稿は `../../company/spra/spra-go/content/japan/prefectures/{NN-key}/place-names/`（北海道は `beginner/intermediate/advanced/expert.csv` の4枚、ほかは `questions.csv`）。

- [ ] **1. コピー**（一度だけ使う手作業。北海道は4枚を、ヘッダー1行のまま結合）。

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/Spra-go
SRC=../../company/spra/spra-go/content/japan/prefectures
mkdir -p database/data/place-names
for d in $SRC/*/; do n=$(basename "$d"); if [ -f "$d/place-names/questions.csv" ]; then cp "$d/place-names/questions.csv" "database/data/place-names/$n.csv"; fi; done
( head -1 $SRC/01-hokkaido/place-names/beginner.csv; for f in beginner intermediate advanced expert; do tail -n +2 $SRC/01-hokkaido/place-names/$f.csv; done ) > database/data/place-names/01-hokkaido.csv
ls database/data/place-names | wc -l   # 期待: 47
```

- [ ] **2. 失敗するテストを書く**（要点）
  - 北海道の計画は、4級（初級30・中級20・上級10・最高難易度5）。各級は1ステージで、`boss` は真、`title_reward` は null、`draw` は初級・中級・上級が10、最高難易度が5、`reward_percent` が50。
  - ほかの県は4級（初級20・中級10・上級10・最高難易度5）。
  - 問題は4択（`choices` が4つ、正解が1つ、すべて異なる）。`prompt`・`explanation.summary` が元CSVのとおり。
  - `plain` に、問題文の『』の中の語が入る。
  - `key` は `pref:{地方}:{県のkey}:place:{級}:{番号}` で、全問で重ならない。
  - 元CSVの `(問題文, 正解)` の重複がない。47県の合計が2,125問（`place-name-question-summary.csv` の合計）。
- [ ] **3. 失敗を確認。**
- [ ] **4. 実装:** `PlaceNameQuizPlanner::plan(array $catalog): array`。`PrefectureCatalog::all()` の県ごとに、`database/data/place-names/{番号2桁}-{key}.csv` を読む。番号は `array_search` ではなく、`PrefectureCatalog::all()` の並び（1〜47）。コースは `['key' => "{key}-place", 'name' => "{県名} 地名", 'order' => 県の order + 100, 'levels' => ...]`。地方ごとの `group` 配列の形は、`PrefectureQuizPlanner::plan` と同じ（`PrefectureQuizPlanner::plan` の出力と、地方キーで結合できるようにする。結合は seeder で行う）。級の対応: 初級=beginner、中級=intermediate、上級=advanced、最高難易度=expert。最高難易度の `difficulty` は `'最高難易度'`。
- [ ] **5. 通ることを確認 → コミット。**

### タスク6（#00463）: 取り込みと最高難易度

**ファイル:** 新規 `database/seeders/PlaceNameQuizSeeder.php`。変更 `config/quiz.php`・`app/Models/Stage.php`（`isDifficultyLocked`）・`routes/api.php`（`/categories/{category}/stages`・`/categories/{id}/courses`）。テスト `tests/Feature/PlaceNameQuizSeederTest.php`・`tests/Feature/StagePlayTest.php`。

- [ ] **1. 失敗するテストを書く**
  - seeder を実行すると、47県の地名コース（47コース・188ステージ・2,125問）ができ、2回実行しても増えない。コースは同じ地方の下にあり、名前は「◯◯ 地名」。
  - 地名の最高難易度のステージは、上級のボスをクリアするまで `locked`。
  - 地名コースの `/categories/{id}/stages` は、3級に加えて4つ目「最高難易度」を返す。ほかのカテゴリーは3級のまま（4つ目を返さない）。
  - 既存のコース（一般）は影響を受けない（既存のテストが守る）。
- [ ] **2. 失敗を確認。**
- [ ] **3. 実装**
  - `config/quiz.php` に `'extra_difficulties' => ['最高難易度']`。
  - `isDifficultyLocked`: 順序を `array_merge(difficulties, extra_difficulties)` にする（最高難易度の1つ前は上級）。
  - `/categories/{category}/stages`: 3級に加えて、最高難易度のステージがあるときだけ4つ目を足す。
  - seeder: `PrefectureQuizPlanner::plan` の地方の `courses` に、`PlaceNameQuizPlanner` のコースを足してから `FlagQuizWriter::writeTree` に渡す。**一般コースの計画は変えない。**（`PrefectureQuizSeeder` の中でなく、`PlaceNameQuizSeeder` が両方を組み合わせて書く。再実行しても一般の問題は変わらない。）
  - 実行: `php artisan db:seed --class=PlaceNameQuizSeeder`。
- [ ] **4. 全体のテスト → コミット。**

### タスク7（#00464）: ふりがなの網羅

**ファイル:** 変更 `tests/Feature/PrefectureFuriganaTest.php`（地名の要約を対象に足す）、新規 `tools/furigana/place-name-words.json`、`frontend/src/lib/furigana-dictionary.json`。

- [ ] **1. 失敗するテストを書く:** 地名コースの全要約について、辞書にない漢字（問われた語の `plain` の中の漢字を除く）の一覧を、失敗メッセージに出す。
- [ ] **2. 失敗を確認し、一覧を読む。** 異なる語が300を超えるときは、ここで止めてOwnerに相談する（要約の書き方を変えるか、地名を `plain` に広げるか）。
- [ ] **3. 熟語を `tools/furigana/place-name-words.json` に書き、既存のマージスクリプトで辞書に入れる**（単漢字は足さない。足したあとで、全問題文に既存の語の誤読が出ないことを、フロントのテストで確認する）。
- [ ] **4. サーバー・画面のテスト → コミット。**

---

## 段階3: 県マスター

### タスク8（#00465）: マスターの付与

**ファイル:** 新規 `app/Support/Prefecture/PrefectureMaster.php`。変更 `PrefectureCatalog.php`・`routes/api.php`（`complete`）。テスト `tests/Feature/PrefectureMasterTest.php`。

**公開するもの:** `PrefectureCatalog::masterTitle(string $name): string`（例: 北海道マスター）。`badgeForTitle` は、はかせとマスターのどちらでも、その県のバッジを返す。`PrefectureMaster::grantIfReady(UserProfile $profile, string $prefectureName): ?ProfileTitle`（新しく付けたときだけ返す）。

- [ ] **1. 失敗するテストを書く**
  - はかせを持ち、地名の上級ボスを満点でクリアしている → マスターが付く。
  - 地名が先で、あとからはかせを取った → はかせのボスをクリアした時点でマスターも付く（返事の `title` はマスター）。
  - はかせなしで地名の上級ボスだけ満点 → 付かない。
  - 地名の上級ボスが満点でない（`best_score` が出した数未満）→ 付かない。
  - 2回目の呼び出しでは付かない（二重にならない）。
  - 別の県の地名では付かない。
  - 最高難易度のクリアは条件に含まれない。
- [ ] **2. 失敗を確認。**
- [ ] **3. 実装**
  - 地名コースの上級ボスは、カテゴリー名が `"{県名} 地名"`、`difficulty` が上級のステージ。`ProfileStageProgress` の `best_score >= $stage->playCount()` を見る。
  - `complete`: 既存の称号付与のあとで、ボスが「県の一般の上級」または「県の地名の上級」なら（`PrefectureMaster::prefectureOf($stage)` でカテゴリー名から県を判定）、`grantIfReady` を呼ぶ。マスターが付いたら、返事の `title_granted` を真、`title` と `title_badge` をマスターのものにする。
- [ ] **4. 全体のテスト → コミット。**

### タスク9（#00466）: パスポートの `master`

**ファイル:** `PrefectureBadges.php`・`routes/api.php`（passport）・`frontend/src/lib/prefecture-badges.ts`・`frontend/src/app/passport/page.tsx`。テスト `tests/Feature/PrefectureBadgeTest.php`・`frontend/src/lib/prefecture-badges.test.ts`。

- [ ] **1. 失敗するテストを書く**
  - サーバー: `prefecture_badges` の各件に `master`（マスターの称号を持つか）が付く。はかせだけの県は `earned` が真で `master` が偽。今の項目は変わらない。
  - 画面: `badgeCountText` が「はかせ 12/47・マスター 3/47」を返す。`master` が真のとき、金のふちのクラスを返す関数 `badgeRingClass`。
- [ ] **2. 失敗を確認。**
- [ ] **3. 実装**（`PrefectureBadges::list` で `PrefectureCatalog::masterTitle` を `$titles` と比べる。画面は、もらった県は `earned`、マスターは金のふち `ring-2 ring-[#d9a520]`）。
- [ ] **4. サーバー・画面のテスト、tsc、lint → コミット。**

### タスク10（#00467）: 結果画面・最高難易度の色・ブラウザ確認・ドキュメント

**ファイル:** `frontend/src/components/app/palette.ts`（最高難易度の色）、ステージ結果の称号画面（`title_granted` を出している部品。`grep -rn "title_granted" frontend/src` で探す）、`frontend/src/app/play/[id]/page.tsx`（4つ目の級の表示）、`SPEC.md`・`TASKS.md`。

- [ ] **1. 失敗するテストを書く:** `palette.test.ts` に、最高難易度の色が返ること（既存の3級の色は変わらない）。
- [ ] **2. 実装:** 最高難易度の色（金系。既存の上級と区別できる色）を足す。`play/[id]/page.tsx` が3級しか想定していなければ、返事の難易度の一覧のまま描く。結果画面は、`title` がマスターのときも、はかせと同じ画面でそのまま名前を出す（文言を固定していないか確認）。
- [ ] **3. 全体のテスト:** サーバー・画面・tsc・lint。
- [ ] **4. ブラウザ確認**（開発サーバー。スマホ幅375px）: ① 地名コースのカードが並ぶ。② 地名の初級を遊び、報酬が一般の半分。③ やり直して、ボスの先頭5問が同じで、残りが入れ替わる。④ 上級のボスを全問正解 → 最高難易度が開く。⑤ はかせ済みのプロフィールで、地名の上級を全問正解 → マスターの称号画面。⑥ パスポートで、金のふちと「はかせ 〇/47・マスター 〇/47」。⑦ コンソールのエラーなし。確認後、プロフィール7と増えた行を元に戻す。
- [ ] **5. `SPEC.md`（都道府県クイズの項に、地名コース・抽選・マスターを追記）と `TASKS.md`（完了と、Ownerの確認待ち〔地名2,125問〕を追記）を更新 → コミット。**

## 最後の見直し

全タスクのあと、`git diff main..HEAD` を全体で読み、次を確認する: 抽選の偏り（先頭5問が固定で、残りが5問になっているか）、満点の数の変更が既存ステージに影響しないか（`is_pool` が偽）、マスターが二重に付かないか、`migrate:fresh` を使っていないか。直した点は、別のコミットにして報告する。自分で見直した結果であり、別の目の確認ではないことを、最後の報告で書く。

## 設計書との対応

| 設計書 | タスク |
|---|---|
| 2章 コース・称号・報酬 | 5・6・8・9 |
| 3章 出し方のルール | 1・2・3 |
| 4章 サーバー | 1〜6・8 |
| 5章 画面 | 9・10 |
| 6章 ふりがな | 7 |
| 7章 テスト | 各タスク・10 |
