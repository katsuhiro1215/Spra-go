# 相棒・仲間の成長・仲間からの復習問題（C回）— 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**ゴール:** 生まれた仲間から相棒を選んで名前を付け、学ぶほど相棒のなかよし度（ハート）が上がり、相棒（いなければスプル）が1日1回「前にまちがえた問題」を出してくれる流れと、解いた直後のやり直しを作る。

**アーキテクチャ:** サーバー（Laravel）が記録を持つ。ハートの数は保存せず、なかよし度（`profile_companions.bond`）から計算する（`app/Support/Bond.php`）。「まちがえたままの問題」は新しい列を作らず、答えの記録（`profile_currency_ledger`）の問題ごとの最新の行から求める（`app/Support/Review.php`）。画面側は、今のクイズ画面の中身を共通の部品 `components/quiz/quiz-session.tsx` に切り出し、ステージ・仲間の復習（`/review`）・やり直しの3つで使う。タップの順番・ハートの表示・名前の入力チェック・やり直しの問題の取り出しは純粋な関数（`components/world/companions.ts`・`components/quiz/retry.ts`）にしてVitestで確かめる。

**技術スタック:** Laravel 13（Sail）/ Pest / MySQL、Next.js 16.2.10 / React 19 / TypeScript / Tailwind CSS / Vitest

**設計書:** `docs/design/2026-09-27-spru-wave-c-design.md`（必ず併せて読むこと）

## 全体の制約

- 既存のバックエンドテスト（175件）とフロントのテスト（60件）はすべて通ること
- DBの更新は `./vendor/bin/sail artisan migrate`（壊さない更新）だけを使う。`migrate:fresh` は使わない
- コインで仲間を育てる・なかよし度を買う機能は作らない
- ひとこと・ハートの呼び方・422のメッセージ・画面の文言は設計書3〜5章の文言どおり
- 名前は1〜8文字（前後の空白は全角も取る、制御文字は不可、空なら元の名前）。サーバーと画面で同じ決まりにする
- やり直しの回答（`practice: true`）は、記録・HP・XP・コイン・ポイント・コンボ・連続日数・なかよし度・`last_correct_on` を何も変えない
- 画面に確認用の隠し機能を作らない。時刻はテスト用ブラウザの時計（Playwrightの `page.clock`）、日付やなかよし度は開発DBを `tinker` で調整して確かめ、確認後に元へ戻す
- ESLint（`react-hooks`）の規則: 描画中にrefの `.current` を読まない、effectの中で直接setStateしない（setInterval・setTimeout・非同期のコールバックの中はよい）。`Date.now()`・`Math.random()` を呼ぶ関数は、それを呼び出す関数より上に書く（React Compilerの純粋さの規則で、後に定義した関数を呼ぶと引っかかることがあった）
- 新しいUIのアイコンに絵文字を使わない（ハートは文字の ♥ U+2665・♡ U+2661、「！」は文字）。ドキュメント・コメントは日本語、コメントは「なぜ」が必要なときだけ1行
- コミットは `#NNNNN: type:summary`（`git log --oneline -1` の番号+1）＋末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 作業ブランチは `feature/spru-wave-c`（作成済み）
- 開発サーバーはポート3000（すでに動いていれば新しく起動しない）。テスト用ログイン: `test@example.com` / `password`、プロフィール「町テスト」。スクリーンショットは `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` にだけ保存し、確認後に消す

## レビューで特に見る点

1. **ステージの切り出し**: 4択と、並べ替え・マッチング・仕分けのどれか、ステージ開始のカード、正解・不正解、レベルアップのお祝い、結果、「もう一度」、HP切れの画面が、切り出しの前と同じに動くこと（Task 5のブラウザ確認）
2. **最後の答えでHPが0になったとき**: HP切れの画面ではなく結果の画面が出て、「まちがえたN問に もう一度チャレンジ」を押せ、やり直しの間もHP切れの画面が出ないこと。「もう一度」で最初からやると、1問目でHP切れの画面になること（Task 5のブラウザ確認）
3. **復習を途中でやめたとき**: 町に戻ると「！」が残り、もう一度開くと正解した問題は出ないこと。やりきって町に戻ると「！」が消えていること（Task 6・Task 7のブラウザ確認）
4. **8文字の名前・全角の空白を含む名前**: 仲間のカード・吹き出し・復習の見出し・クイズのお祝いで崩れないこと。9文字は画面で止まり、送らないこと（Task 7のブラウザ確認）
5. **相棒を替えた直後**: 「相棒」の札と立ち位置が入れ替わり、「！」と「〇〇が復習を用意してるよ」の名前が新しい相棒に替わること（Task 7のブラウザ確認）

## ファイル構成

**サーバー（リポジトリ直下）**
- 作成: `app/Support/Bond.php` — ハートの数・呼び方・覚えたひとこと・相棒へのなかよし度の加算
- 作成: `app/Support/Review.php` — 復習に出す問題・「！」の状態・出す人・やりきり
- 作成: `app/Support/PlayableQuestion.php` — 正解の手がかりを隠して出す（ステージの出題APIから切り出し）
- 作成: `database/migrations/2026_09_27_000006〜000008_*.php`
- 変更: `app/Support/Garden.php`（仲間の一覧の形・並び・最初の仲間を相棒に）、`app/Support/ContinueStage.php`（コメント）
- 変更: `app/Models/ProfileCompanion.php`、`app/Models/UserProfile.php`、`config/companions.php`、`routes/api.php`
- テスト: 作成 `tests/Feature/CompanionBondTest.php`・`StagePlayTest.php`・`PracticeAnswerTest.php`・`ReviewTest.php`・`CompanionPartnerTest.php`、変更 `GardenStateTest.php`・`GardenActionsTest.php`

**フロントエンド（`frontend/src/`）**
- 作成: `components/world/companions.ts`・`companions.test.ts` — ハートの表示・ひとことの選び方・名前の入力チェック・スプルのタップ・復習の案内
- 作成: `components/quiz/types.ts`（クイズの問題の型）、`components/quiz/retry.ts`・`retry.test.ts` — やり直しの問題の取り出し
- 作成: `components/spru/companion-image.tsx` — HTMLの中の仲間の絵
- 作成: `components/quiz/quiz-session.tsx` — 共通のクイズの部品（今の `app/quiz/[stageId]/page.tsx` の中身）
- 作成: `app/review/page.tsx` — 仲間からの復習の画面
- 作成: `components/world/companion-sheet.tsx`・`review-card.tsx`・`nickname-form.tsx`・`nickname-dialog.tsx`
- 変更: `app/quiz/[stageId]/page.tsx`（読み込みと見出しだけにする）、`components/world/types.ts`・`world-scene.tsx`・`world-screen.tsx`・`born-overlay.tsx`

**ドキュメント**
- 変更: `SPEC.md`・`TASKS.md`

---

### Task 1: なかよし度と、正解で相棒が育つ

**Files:**
- Create: `app/Support/Bond.php`、`database/migrations/2026_09_27_000006_add_bond_columns_to_profile_companions_table.php`、`database/migrations/2026_09_27_000007_add_partner_and_review_columns_to_user_profiles_table.php`
- Modify: `config/companions.php`（全体）、`app/Models/ProfileCompanion.php`、`app/Models/UserProfile.php`（`$fillable`・`casts`）、`app/Support/Garden.php`（`companionArray` の `line`）、`routes/api.php`（回答API）
- Test: `tests/Feature/CompanionBondTest.php`

**Interfaces:**
- Produces:
  - 列 `profile_companions.nickname`（string 8、null可）・`profile_companions.bond`（unsigned int、既定0）、`user_profiles.partner_companion_key`（string 32、null可）・`user_profiles.last_review_on`（date、null可）
  - 設定 `companions.list.{key}.lines`（5つ）・`companions.bond_hearts`・`companions.heart_labels`・`companions.bond_per_correct`・`companions.review_bonus`・`companions.review_size`・`companions.nickname_max`
  - `Bond::hearts(int $bond): int`、`Bond::label(int $hearts): string`、`Bond::nextHeartBond(int $bond): ?int`、`Bond::lines(string $key, int $hearts): array`（list<string>）、`Bond::displayName(ProfileCompanion $c): string`、`Bond::partner(UserProfile $p): ?ProfileCompanion`、`Bond::addToPartner(UserProfile $p, int $amount): ?array`（`{key, name, hearts, heart_label, hearts_up, new_line}` の順、相棒がいなければ null）
  - 回答APIの `profile.partner`（上の形か null）

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/CompanionBondTest.php`:

```php
<?php

use App\Support\Bond;

/*
|--------------------------------------------------------------------------
| 相棒のなかよし度(docs/design/2026-09-27-spru-wave-c-design.md 3-3・3-4)
|--------------------------------------------------------------------------
|
| 相棒でいる間に正解すると、相棒のなかよし度が1上がる。ハートの数は
| なかよし度から計算し、ハートが増えると新しいひとことを覚える。
|
*/

it('なかよし度からハートの数と呼び方が決まる', function (int $bond, int $hearts, string $label) {
    expect(Bond::hearts($bond))->toBe($hearts)
        ->and(Bond::label($hearts))->toBe($label);
})->with([
    [0, 1, 'はじめまして'],
    [19, 1, 'はじめまして'],
    [20, 2, 'なかよし'],
    [49, 2, 'なかよし'],
    [50, 3, 'とってもなかよし'],
    [100, 4, 'だいすき'],
    [179, 4, 'だいすき'],
    [180, 5, 'しんゆう'],
    [999, 5, 'しんゆう'],
]);

it('次のハートに必要ななかよし度を返し、ハート5つなら null', function () {
    expect(Bond::nextHeartBond(0))->toBe(20)
        ->and(Bond::nextHeartBond(20))->toBe(50)
        ->and(Bond::nextHeartBond(179))->toBe(180)
        ->and(Bond::nextHeartBond(180))->toBeNull();
});

it('覚えているひとことはハートの数だけ', function () {
    expect(Bond::lines('momo', 1))->toBe(['お花、きれいだね'])
        ->and(Bond::lines('momo', 3))->toBe([
            'お花、きれいだね',
            'まちがえても大丈夫。つぎはきっとできるよ',
            'きみががんばってるの、ちゃんと見てるよ',
        ]);
});

it('相棒がいれば、正解で相棒のなかよし度だけが1上がる', function () {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo']);
    $kuru = $profile->companions()->create(['companion_key' => 'kuru']);
    $profile->update(['partner_companion_key' => 'momo']);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.partner', [
            'key' => 'momo', 'name' => 'Momo', 'hearts' => 1, 'heart_label' => 'はじめまして', 'hearts_up' => false, 'new_line' => null,
        ]);

    expect($momo->fresh()->bond)->toBe(1)
        ->and($kuru->fresh()->bond)->toBe(0);
});

it('まちがえたときは、なかよし度は上がらない', function () {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo']);
    $profile->update(['partner_companion_key' => 'momo']);
    [$question, , $wrong] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $wrong->id])
        ->assertOk()
        ->assertJsonPath('profile.partner.key', 'momo')
        ->assertJsonPath('profile.partner.hearts_up', false);

    expect($momo->fresh()->bond)->toBe(0);
});

it('相棒がいなければ、回答の partner は null', function () {
    createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.partner', null);
});

it('ハートが増えた回答では、増えたことと新しいひとことが返る', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo', 'bond' => 19]);
    $profile->update(['partner_companion_key' => 'momo']);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.partner', [
            'key' => 'momo', 'name' => 'Momo', 'hearts' => 2, 'heart_label' => 'なかよし', 'hearts_up' => true,
            'new_line' => 'まちがえても大丈夫。つぎはきっとできるよ',
        ]);
});

it('名前を付けていれば、相棒は名前で返る', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo', 'nickname' => 'モモちゃん']);
    $profile->update(['partner_companion_key' => 'momo']);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.partner.name', 'モモちゃん');
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `./vendor/bin/sail artisan test --filter=CompanionBondTest`
Expected: FAIL（`App\Support\Bond` が見つからない、`bond`・`partner_companion_key` の列が無い など）

- [ ] **Step 3: 列を足す更新を書く**

`database/migrations/2026_09_27_000006_add_bond_columns_to_profile_companions_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profile_companions', function (Blueprint $table) {
            // 子どもが付けた名前。null なら元の名前(docs/design/2026-09-27-spru-wave-c-design.md 3-2)
            $table->string('nickname', 8)->nullable()->after('companion_key');
            // なかよし度。ハートの数はここから計算する(3-3)
            $table->unsignedInteger('bond')->default(0)->after('nickname');
        });
    }

    public function down(): void
    {
        Schema::table('profile_companions', function (Blueprint $table) {
            $table->dropColumn(['nickname', 'bond']);
        });
    }
};
```

`database/migrations/2026_09_27_000007_add_partner_and_review_columns_to_user_profiles_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            // 相棒の仲間のキー。外部キーにすると、プロフィールを消すときに削除の連動が循環するためキーで持つ
            $table->string('partner_companion_key', 32)->nullable()->after('bloom_base_level');
            // 仲間の復習をやりきった日(日本時間)。1日1回に使う
            $table->date('last_review_on')->nullable()->after('last_correct_on');
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn(['partner_companion_key', 'last_review_on']);
        });
    }
};
```

- [ ] **Step 4: モデルと設定を直す**

`app/Models/ProfileCompanion.php` の `$fillable` を次にし、`casts` を足す:

```php
    protected $fillable = ['companion_key', 'nickname', 'bond'];

    protected function casts(): array
    {
        return [
            'bond' => 'integer',
        ];
    }
```

`app/Models/UserProfile.php`:
- `$fillable` の最後の行 `'bloom_base_level', 'last_correct_on',` を `'bloom_base_level', 'last_correct_on', 'partner_companion_key', 'last_review_on',` にする
- `casts()` に `'last_review_on' => 'date',` を足す（`'last_correct_on' => 'date',` の次）

`config/companions.php` を全部次に置き換える（`line` を `lines` にし、なかよし度の設定を足す）:

```php
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | 仲間の一覧(docs/design/2026-09-27-spru-wave-b-design.md 3-5)
    |--------------------------------------------------------------------------
    |
    | 種をまいたとき、まだ生まれていない仲間から weight(出やすさ)の重みで1人選ぶ。
    | lines はハートの数だけ覚えるひとこと。1つ目が生まれたときのひとこと
    | (docs/design/2026-09-27-spru-wave-c-design.md 3-4)。
    | 特別な仲間を足すときは、絵(tools/spru-assets/crops.json の companions)と1行を足す。
    | 立ち位置は config/world.php の companion_spots。
    |
    */

    'list' => [
        'lumi' => ['name' => 'Lumi', 'trait' => '光・ひらめき', 'weight' => 1, 'lines' => [
            'ひらめいた！いっしょに学ぼう',
            'わかった瞬間って、ピカッとするよね',
            'きみといると、アイデアがどんどん出てくるよ',
            'むずかしい問題も、きみとならひらめける！',
            'きみはぼくの一番の光だよ。これからもよろしくね',
        ]],
        'momo' => ['name' => 'Momo', 'trait' => '花・やさしさ', 'weight' => 1, 'lines' => [
            'お花、きれいだね',
            'まちがえても大丈夫。つぎはきっとできるよ',
            'きみががんばってるの、ちゃんと見てるよ',
            'いっしょにいると、心がぽかぽかするね',
            'きみはわたしの大切なしんゆうだよ',
        ]],
        'kuru' => ['name' => 'Kuru', 'trait' => '木の実・知識', 'weight' => 1, 'lines' => [
            'ものしりになりたいな',
            '知ってる？世界には190以上の国があるんだって',
            'ひとつ覚えるたびに、木の実がひとつ増えるみたい',
            'きみといっしょだと、覚えるのが楽しいね',
            'きみはぼくの自慢のしんゆう！もっといろいろ知ろうね',
        ]],
        'piko' => ['name' => 'Piko', 'trait' => '葉・冒険', 'weight' => 1, 'lines' => [
            '冒険に行こうよ！',
            'つぎはどの国に行ってみたい？',
            '地図を見てると、わくわくしてくるね',
            'きみとならどこまでも行けそう！',
            '世界じゅう、いっしょに冒険しようね。しんゆう！',
        ]],
        'ruru' => ['name' => 'Ruru', 'trait' => '水・知恵', 'weight' => 1, 'lines' => [
            'じっくり考えるのが好き',
            'あわてなくていいよ。ゆっくり考えよう',
            '考えてわかると、すっきりするね',
            'きみの考える力、どんどん強くなってるね',
            'きみとなら、どんななぞも解ける気がするよ',
        ]],
    ],

    // 種ができるまでのレベルアップの回数(ふつう → つぼみ → 花 → 種)
    'growth_steps' => 3,

    // 生まれるまでの水やりの回数(1日1回)
    'waterings_to_bloom' => 3,

    // 全員生まれた後の種から咲くもの(非売品の町のアイテム)
    'flower_result' => 'spru_flower',
    'flower_item' => ['name' => 'スプルの花', 'asset_key' => 'spru_flower'],

    /*
    | なかよし度(docs/design/2026-09-27-spru-wave-c-design.md 3-3)。相棒でいる間の正解1問で
    | bond_per_correct、復習をやりきると review_bonus 増える。ハートn個に必要ななかよし度は
    | bond_hearts の n−1 番目
    */
    'bond_hearts' => [0, 20, 50, 100, 180],
    'heart_labels' => ['はじめまして', 'なかよし', 'とってもなかよし', 'だいすき', 'しんゆう'],
    'bond_per_correct' => 1,
    'review_bonus' => 5,

    // 仲間からの復習で1日に出す問題の数(3-5)
    'review_size' => 5,

    // 子どもが付ける名前の長さ(3-2)
    'nickname_max' => 8,

];
```

`app/Support/Garden.php` の `companionArray` の中の `'line' => $def['line'] ?? '',` を `'line' => $def['lines'][0] ?? '',` にする（仲間の一覧の形はTask 3で作り直す。それまでB回のテストを通すため）。

- [ ] **Step 5: なかよし度の部品を書く**

`app/Support/Bond.php`:

```php
<?php

namespace App\Support;

use App\Models\ProfileCompanion;
use App\Models\UserProfile;

/**
 * 相棒のなかよし度(docs/design/2026-09-27-spru-wave-c-design.md 3-3・3-4)。
 * ハートの数は保存せず、なかよし度(profile_companions.bond)から決める。
 */
class Bond
{
    public static function hearts(int $bond): int
    {
        return max(1, collect(config('companions.bond_hearts'))->filter(fn (int $need) => $bond >= $need)->count());
    }

    public static function label(int $hearts): string
    {
        return config('companions.heart_labels')[$hearts - 1];
    }

    /** 次のハートに必要ななかよし度。ハート5つなら null */
    public static function nextHeartBond(int $bond): ?int
    {
        return collect(config('companions.bond_hearts'))->first(fn (int $need) => $need > $bond);
    }

    /** @return list<string> ハートの数だけ覚えたひとこと */
    public static function lines(string $key, int $hearts): array
    {
        return array_slice(config("companions.list.{$key}.lines", []), 0, $hearts);
    }

    public static function displayName(ProfileCompanion $companion): string
    {
        return $companion->nickname ?? config("companions.list.{$companion->companion_key}.name", $companion->companion_key);
    }

    public static function partner(UserProfile $profile): ?ProfileCompanion
    {
        if ($profile->partner_companion_key === null) {
            return null;
        }

        return $profile->companions()->where('companion_key', $profile->partner_companion_key)->first();
    }

    /**
     * 相棒になかよし度を足す(0なら足さずに今の様子だけ返す)。相棒がいなければ null。
     *
     * @return array{key: string, name: string, hearts: int, heart_label: string, hearts_up: bool, new_line: ?string}|null
     */
    public static function addToPartner(UserProfile $profile, int $amount): ?array
    {
        $partner = self::partner($profile);
        if ($partner === null) {
            return null;
        }

        $before = self::hearts($partner->bond);
        if ($amount > 0) {
            // 続けて足しても取りこぼさないよう、DBの上で足す
            $partner->increment('bond', $amount);
        }
        $hearts = self::hearts($partner->bond);
        $up = $hearts > $before;

        return [
            'key' => $partner->companion_key,
            'name' => self::displayName($partner),
            'hearts' => $hearts,
            'heart_label' => self::label($hearts),
            'hearts_up' => $up,
            'new_line' => $up ? (self::lines($partner->companion_key, $hearts)[$hearts - 1] ?? null) : null,
        ];
    }
}
```

- [ ] **Step 6: 回答APIで相棒を育てる**

`routes/api.php`:
- 先頭の `use App\Support\ActiveProfile;` の次に `use App\Support\Bond;` を足す
- 回答API（`questions.answer`）の `$economy = [ ... ]` の最後の行 `'garden_busy' => Garden::activeSeed($profile) !== null,` の次に足す:

```php
            'partner' => Bond::addToPartner($profile, $isCorrect ? config('companions.bond_per_correct') : 0),
```

- [ ] **Step 7: 更新してテストを通す**

Run: `./vendor/bin/sail artisan migrate`
Expected: `2026_09_27_000006_...` と `2026_09_27_000007_...` が `DONE`（`migrate:fresh` は使わない）

Run: `./vendor/bin/sail artisan test --filter=CompanionBondTest && ./vendor/bin/sail artisan test`
Expected: CompanionBondTest 16件PASS、全体 191件PASS

- [ ] **Step 8: コミット**

```bash
git add app/Support/Bond.php app/Support/Garden.php app/Models/ProfileCompanion.php app/Models/UserProfile.php config/companions.php routes/api.php database/migrations/2026_09_27_000006_add_bond_columns_to_profile_companions_table.php database/migrations/2026_09_27_000007_add_partner_and_review_columns_to_user_profiles_table.php tests/Feature/CompanionBondTest.php
git commit -m "$(cat <<'EOF'
#NNNNN: feature:相棒のなかよし度(ハート)を追加し、正解で相棒が育つようにする

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 仲間からの復習と、やり直しの回答

**Files:**
- Create: `app/Support/PlayableQuestion.php`、`app/Support/Review.php`
- Modify: `routes/api.php`（ステージの出題API・回答API・町のAPI、復習のAPIを追加）
- Test: `tests/Feature/StagePlayTest.php`、`tests/Feature/PracticeAnswerTest.php`、`tests/Feature/ReviewTest.php`

**Interfaces:**
- Consumes: `Bond::partner`・`Bond::displayName`・`Bond::addToPartner`（Task 1）、`Garden::today()`（B回）
- Produces:
  - `PlayableQuestion::present(Collection $questions): Collection`（choices・country を読み込み済みの問題の、正解の手がかりを隠す）
  - `Review::questionIds(UserProfile $p, ?int $limit = null): array`（list<int>、まちがえたのが古い順）、`Review::doneToday(UserProfile $p): bool`、`Review::giver(UserProfile $p): array{kind: string, key: ?string, name: string}`、`Review::state(UserProfile $p): array{available: bool, count: int, giver: array}`、`Review::questions(UserProfile $p): Collection`、`Review::complete(UserProfile $p): array{bond_gained: int, partner: ?array}`
  - `GET /api/world` の `review`、`GET /api/review`（`{ giver, questions }`）、`POST /api/review/complete`（`{ bond_gained, partner }`）、回答APIの `practice: true`

- [ ] **Step 1: ステージの4択の出し方を確かめるテストを書く（切り出しの前後で同じか見るため。今の時点で通る）**

`tests/Feature/StagePlayTest.php`:

```php
<?php

use App\Models\Category;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| ステージの出題(stages.play)
|--------------------------------------------------------------------------
|
| 正解の手がかりを隠す処理を app/Support/PlayableQuestion.php に切り出す前後で、
| 4択の出し方が変わらないことを確かめる(docs/design/2026-09-27-spru-wave-c-design.md 4-3)。
|
*/

it('ステージの4択は、正解1つと不正解3つを、正解の印を隠して出す', function () {
    createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();
    foreach (['ア', 'イ', 'ウ', 'エ'] as $i => $label) {
        $question->choices()->create(['label' => $label, 'is_correct' => false, 'order' => $i + 3]);
    }
    $category = Category::create(['name' => '4択カテゴリー']);
    $stage = Stage::create(['category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => 1, 'question_count' => 1]);
    $stage->questions()->attach([$question->id => ['order' => 1]]);

    $choices = collect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions.0.choices'));

    expect($choices)->toHaveCount(4)
        ->and($choices->pluck('id'))->toContain($correct->id);
    $choices->each(fn (array $choice) => expect($choice)->not->toHaveKey('is_correct'));
});
```

Run: `./vendor/bin/sail artisan test --filter=StagePlayTest`
Expected: 1件PASS（今の動きを押さえるテストなので、切り出しの前から通る）

- [ ] **Step 2: やり直しの回答と復習の失敗するテストを書く**

`tests/Feature/PracticeAnswerTest.php`:

```php
<?php

/*
|--------------------------------------------------------------------------
| 解いた直後のやり直し(docs/design/2026-09-27-spru-wave-c-design.md 3-7)
|--------------------------------------------------------------------------
|
| 練習なので、正解かどうかだけを返し、HP・XP・記録などは何も変えない。
|
*/

it('やり直しの正解は、正解かどうかだけを返し、何も変えない', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();
    $before = $profile->fresh()->only(['hp', 'xp', 'coins', 'points', 'level', 'combo', 'current_streak']);

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])
        ->assertOk()
        ->assertJsonPath('correct', true)
        ->assertJsonPath('correct_choice_id', $correct->id)
        ->assertJsonPath('profile', null);

    $after = $profile->fresh();
    expect($after->only(['hp', 'xp', 'coins', 'points', 'level', 'combo', 'current_streak']))->toBe($before)
        ->and($after->last_correct_on)->toBeNull()
        ->and($profile->currencyLedger()->count())->toBe(0);
});

it('やり直しでまちがえても、何も変えない', function () {
    $profile = createActiveProfile();
    [$question, , $wrong] = createQuestionWithChoices();
    $hp = $profile->fresh()->hp;

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $wrong->id, 'practice' => true])
        ->assertOk()
        ->assertJsonPath('correct', false);

    expect($profile->fresh()->hp)->toBe($hp)
        ->and($profile->currencyLedger()->count())->toBe(0);
});

it('やり直しは、HPが0でも答えられる', function () {
    $profile = createActiveProfile();
    $profile->update(['hp' => 0, 'hp_updated_at' => now()]);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])
        ->assertOk()
        ->assertJsonPath('correct', true);
});

it('やり直しの正解では、相棒のなかよし度は増えない', function () {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo']);
    $profile->update(['partner_companion_key' => 'momo']);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])->assertOk();

    expect($momo->fresh()->bond)->toBe(0);
});
```

`tests/Feature/ReviewTest.php`:

```php
<?php

use App\Models\Question;
use App\Models\UserProfile;
use App\Support\Review;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 仲間からの復習(docs/design/2026-09-27-spru-wave-c-design.md 3-5)
|--------------------------------------------------------------------------
|
| まちがえて、その後にまだ正解していない問題を、まちがえたのが古い順に最大5問出す。
| 1日1回(日本時間)で、やりきると相棒のなかよし度が5上がる。
|
*/

/** 回答APIと同じ reason で、答えの記録だけを付ける */
function recordReviewAnswer(UserProfile $profile, Question $question, bool $correct): void
{
    $profile->currencyLedger()->create([
        'type' => 'hp',
        'delta' => $correct ? -1 : -2,
        'reason' => $correct ? 'answer_correct' : 'answer_wrong',
        'question_id' => $question->id,
    ]);
}

it('まちがえて、その後にまだ正解していない問題だけが復習に出る', function () {
    $profile = createActiveProfile();
    [$q1, , $w1] = createQuestionWithChoices();
    [$q2, $c2, $w2] = createQuestionWithChoices();
    $this->postJson("/api/questions/{$q1->id}/answer", ['choice_id' => $w1->id])->assertOk();
    $this->postJson("/api/questions/{$q2->id}/answer", ['choice_id' => $w2->id])->assertOk();
    $this->postJson("/api/questions/{$q2->id}/answer", ['choice_id' => $c2->id])->assertOk();

    expect(Review::questionIds($profile))->toBe([$q1->id]);
});

it('正解した後にまたまちがえた問題は、また出る', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);
    recordReviewAnswer($profile, $question, true);
    recordReviewAnswer($profile, $question, false);

    expect(Review::questionIds($profile))->toBe([$question->id]);
});

it('やり直しの回答は、復習に出る問題を変えない', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])->assertOk();

    expect(Review::questionIds($profile))->toBe([$question->id]);
});

it('まちがえたのが古い順に、最大5問', function () {
    $profile = createActiveProfile();
    $questions = collect(range(1, 6))->map(fn () => createQuestionWithChoices()[0]);
    $questions->each(fn (Question $question) => recordReviewAnswer($profile, $question, false));
    // 1問目をもう一度まちがえると、一番新しいまちがいになる
    recordReviewAnswer($profile, $questions[0], false);

    expect(Review::questionIds($profile, 5))->toBe($questions->slice(1)->pluck('id')->all());
});

it('消された問題は出ない', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);
    $question->delete();

    expect(Review::questionIds($profile))->toBe([]);
});

it('相棒がいないと、町のAPIの復習はスプルが出す', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);

    $this->getJson('/api/world')->assertOk()->assertJsonPath('review', [
        'available' => true, 'count' => 1, 'giver' => ['kind' => 'spru', 'key' => null, 'name' => 'スプル'],
    ]);
});

it('相棒がいると、復習は相棒が出す', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo', 'nickname' => 'モモ']);
    $profile->update(['partner_companion_key' => 'momo']);
    [$question] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);

    $this->getJson('/api/world')->assertJsonPath('review.giver', ['kind' => 'companion', 'key' => 'momo', 'name' => 'モモ']);
});

it('復習する問題が無ければ、「！」は出ない', function () {
    createActiveProfile();

    $this->getJson('/api/world')->assertJsonPath('review.available', false)->assertJsonPath('review.count', 0);
});

it('復習の問題は、正解の手がかりを隠して出る', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);

    $response = $this->getJson('/api/review')->assertOk()
        ->assertJsonPath('giver.kind', 'spru')
        ->assertJsonCount(1, 'questions')
        ->assertJsonPath('questions.0.id', $question->id)
        ->assertJsonPath('questions.0.prompt', 'テスト問題');

    collect($response->json('questions.0.choices'))->each(fn (array $choice) => expect($choice)->not->toHaveKey('is_correct'));
});

it('やりきると今日の記録が付き、相棒に+5。「！」は次の日まで出ない', function () {
    $this->travelTo(Carbon::parse('2026-09-27 03:00:00', 'UTC')); // 日本時間 12:00
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo']);
    $profile->update(['partner_companion_key' => 'momo']);
    [$question] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);

    $this->postJson('/api/review/complete')
        ->assertOk()
        ->assertJsonPath('bond_gained', 5)
        ->assertJsonPath('partner.key', 'momo');

    expect($momo->fresh()->bond)->toBe(5)
        ->and($profile->fresh()->last_review_on->toDateString())->toBe('2026-09-27');
    $this->getJson('/api/world')->assertJsonPath('review.available', false)->assertJsonPath('review.count', 1);
    $this->getJson('/api/review')->assertStatus(422)->assertJsonPath('message', '今日の復習はもう終わったよ。また明日ね');

    $this->travelTo(Carbon::parse('2026-09-27 15:00:00', 'UTC')); // 日本時間 翌日の0:00
    $this->getJson('/api/world')->assertJsonPath('review.available', true);
});

it('スプルが出した復習をやりきっても、なかよし度は誰にも足さない', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);

    $this->postJson('/api/review/complete')->assertOk()->assertJsonPath('bond_gained', 0)->assertJsonPath('partner', null);
});

it('今日すでにやりきっていれば、もう一度はやりきれない', function () {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo']);
    $profile->update(['partner_companion_key' => 'momo']);

    $this->postJson('/api/review/complete')->assertOk();
    $this->postJson('/api/review/complete')->assertStatus(422)->assertJsonPath('message', '今日の復習はもう終わったよ。また明日ね');

    expect($momo->fresh()->bond)->toBe(5);
});

it('復習する問題が無いと、復習は始められない', function () {
    createActiveProfile();

    $this->getJson('/api/review')->assertStatus(422)->assertJsonPath('message', '復習する問題はないよ');
});

it('やりきってハートが増えると、そのことが返る', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo', 'bond' => 16]);
    $profile->update(['partner_companion_key' => 'momo']);

    $this->postJson('/api/review/complete')
        ->assertOk()
        ->assertJsonPath('partner.hearts', 2)
        ->assertJsonPath('partner.hearts_up', true)
        ->assertJsonPath('partner.new_line', 'まちがえても大丈夫。つぎはきっとできるよ');
});
```

- [ ] **Step 3: 失敗することを確かめる**

Run: `./vendor/bin/sail artisan test --filter='PracticeAnswerTest|ReviewTest'`
Expected: FAIL（`App\Support\Review` が見つからない、`/api/review` が404、やり直しでも `profile` が返る・HPが0で409 など）

- [ ] **Step 4: 正解の手がかりを隠す処理を切り出す**

`app/Support/PlayableQuestion.php`（中身は `routes/api.php` の `stages.play` の `$questions->each(...)` をそのまま移したもの）:

```php
<?php

namespace App\Support;

use App\Models\Question;
use Illuminate\Support\Collection;

/**
 * 問題を出すときに、正解の手がかりを隠す(ステージの出題と、仲間の復習で共通)。
 */
class PlayableQuestion
{
    /**
     * @param  Collection<int, Question>  $questions  choices・country を読み込み済みのもの
     * @return Collection<int, Question>
     */
    public static function present(Collection $questions): Collection
    {
        $questions->each(function (Question $question) {
            if ($question->type === 'matching') {
                // マッチングは全ペア分の選択肢をそのまま出す(is_correctの単一正解という概念がないため)。
                // meta.item_idを返すと正解の組み合わせが漏れるので隠す。
                $question->setRelation('choices', $question->choices->shuffle()->values());
                $question->choices->each->makeHidden(['is_correct', 'meta']);

                return;
            }

            if ($question->type === 'ordering') {
                // 並べ替えはorder列を「正解の順序」として使うため、シャッフルして出し、
                // 手がかりになるorder/is_correctを隠す。
                $question->setRelation('choices', $question->choices->shuffle()->values());
                $question->choices->each->makeHidden(['is_correct', 'order']);

                return;
            }

            if ($question->type === 'sorting') {
                // 仕分けはquestion_choicesを使わずmeta(items/baskets)だけで完結する。
                // items内のcorrect_basket_idは正解の手がかりになるため取り除いて返す。
                $question->meta = [
                    'items' => collect($question->meta['items'] ?? [])
                        ->map(fn (array $item) => ['id' => $item['id'], 'image' => $item['image']])
                        ->all(),
                    'baskets' => $question->meta['baskets'] ?? [],
                ];

                return;
            }

            $correct = $question->choices->firstWhere('is_correct', true);
            $wrong = $question->choices->where('is_correct', false);
            $display = $wrong->random(min(3, $wrong->count()));

            if ($correct) {
                $display->push($correct);
            }

            $question->setRelation('choices', $display->shuffle()->values());
            $question->choices->each->makeHidden('is_correct');
        });

        return $questions;
    }
}
```

`routes/api.php` の `stages.play` の `$questions->each(function (Question $question) { ... });`（`abort_if($questions->isEmpty(), 404);` の後から `return [` の前まで）を、次の1行に置き換える:

```php
    PlayableQuestion::present($questions);
```

Run: `./vendor/bin/sail artisan test --filter='StagePlayTest|MatchingQuestionTest|OrderingQuestionTest|SortingQuestionTest'`
Expected: すべてPASS（切り出しても出し方が変わらない）

- [ ] **Step 5: 復習の部品を書く**

`app/Support/Review.php`:

```php
<?php

namespace App\Support;

use App\Models\ProfileCurrencyLedger;
use App\Models\Question;
use App\Models\UserProfile;
use Illuminate\Support\Collection;

/**
 * 仲間からの復習(docs/design/2026-09-27-spru-wave-c-design.md 3-5)。
 * 「まちがえたままの問題」は列を作らず、答えの記録で問題ごとに一番新しい行が
 * answer_wrong のものとする(やり直しは記録を残さないので影響しない)。
 */
class Review
{
    private const ANSWER_REASONS = ['answer_correct', 'answer_wrong'];

    /** @return list<int> まちがえたのが古い順 */
    public static function questionIds(UserProfile $profile, ?int $limit = null): array
    {
        $latest = ProfileCurrencyLedger::query()
            ->selectRaw('MAX(id) as last_id')
            ->where('user_profile_id', $profile->id)
            ->whereIn('reason', self::ANSWER_REASONS)
            ->whereNotNull('question_id')
            ->groupBy('question_id');

        return ProfileCurrencyLedger::query()
            ->joinSub($latest, 'latest', 'latest.last_id', '=', 'profile_currency_ledger.id')
            ->where('profile_currency_ledger.reason', 'answer_wrong')
            ->orderBy('profile_currency_ledger.id')
            ->when($limit !== null, fn ($query) => $query->limit($limit))
            ->pluck('profile_currency_ledger.question_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    public static function doneToday(UserProfile $profile): bool
    {
        return $profile->last_review_on?->toDateString() === Garden::today();
    }

    /** @return array{kind: string, key: ?string, name: string} 相棒がいれば相棒、いなければスプル */
    public static function giver(UserProfile $profile): array
    {
        $partner = Bond::partner($profile);

        return $partner
            ? ['kind' => 'companion', 'key' => $partner->companion_key, 'name' => Bond::displayName($partner)]
            : ['kind' => 'spru', 'key' => null, 'name' => 'スプル'];
    }

    /** @return array{available: bool, count: int, giver: array{kind: string, key: ?string, name: string}} */
    public static function state(UserProfile $profile): array
    {
        $count = count(self::questionIds($profile, config('companions.review_size')));

        return [
            'available' => $count > 0 && ! self::doneToday($profile),
            'count' => $count,
            'giver' => self::giver($profile),
        ];
    }

    /** @return Collection<int, Question> 今日出す問題(正解の手がかりを隠した形) */
    public static function questions(UserProfile $profile): Collection
    {
        abort_if(self::doneToday($profile), 422, '今日の復習はもう終わったよ。また明日ね');
        $ids = self::questionIds($profile, config('companions.review_size'));
        abort_if($ids === [], 422, '復習する問題はないよ');

        $questions = Question::query()
            ->with(['choices', 'country'])
            ->whereIn('id', $ids)
            ->get(['id', 'type', 'prompt', 'country_id', 'meta'])
            ->sortBy(fn (Question $question) => array_search($question->id, $ids, true))
            ->values();

        return PlayableQuestion::present($questions);
    }

    /**
     * 今日の復習をやりきった記録を付け、相棒に review_bonus を足す。呼び出し側で lockForUpdate してから呼ぶ。
     *
     * @return array{bond_gained: int, partner: ?array}
     */
    public static function complete(UserProfile $profile): array
    {
        abort_if(self::doneToday($profile), 422, '今日の復習はもう終わったよ。また明日ね');

        $profile->last_review_on = Garden::today();
        $profile->save();
        $partner = Bond::addToPartner($profile, config('companions.review_bonus'));

        return ['bond_gained' => $partner ? config('companions.review_bonus') : 0, 'partner' => $partner];
    }
}
```

- [ ] **Step 6: APIにつなぐ**

`routes/api.php`:
- `use App\Support\LevelCurve;` の次に `use App\Support\PlayableQuestion;` を、`use App\Support\QuestionAnswerResolver;` の次に `use App\Support\Review;` を足す（アルファベット順）
- 回答API（`questions.answer`）の `$isCorrect = $result['correct'];` の次に足す:

```php

    // 解いた直後のやり直しは練習なので、正解かどうかだけを返し何も記録しない(設計書3-7)
    if ($request->boolean('practice')) {
        return [
            'correct' => $isCorrect,
            'correct_choice_id' => $result['correct_choice_id'] ?? null,
            'results' => $result['results'] ?? null,
            'profile' => null,
        ];
    }
```

- 町のAPI（`world.show`）の返す配列の最後 `'companions' => Garden::companions($profile),` の次に `'review' => Review::state($profile),` を足す
- 町のAPIのグループ（`Route::middleware(['auth:sanctum'])->prefix('world')->name('world.')->group(...)`）の閉じ `});` の次に足す:

```php

Route::middleware(['auth:sanctum'])->prefix('review')->name('review.')->group(function () {
    Route::get('/', function (Request $request) {
        $profile = ActiveProfile::require($request);

        return ['giver' => Review::giver($profile), 'questions' => Review::questions($profile)];
    })->name('show');

    Route::post('/complete', function (Request $request) {
        $activeProfile = ActiveProfile::require($request);

        return DB::transaction(function () use ($activeProfile) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();

            return Review::complete($profile);
        });
    })->name('complete');
});
```

- [ ] **Step 7: テストを通す**

Run: `./vendor/bin/sail artisan test --filter='StagePlayTest|PracticeAnswerTest|ReviewTest' && ./vendor/bin/sail artisan test`
Expected: StagePlayTest 1件・PracticeAnswerTest 4件・ReviewTest 14件PASS、全体 210件PASS

- [ ] **Step 8: コミット**

```bash
git add app/Support/PlayableQuestion.php app/Support/Review.php routes/api.php tests/Feature/StagePlayTest.php tests/Feature/PracticeAnswerTest.php tests/Feature/ReviewTest.php
git commit -m "$(cat <<'EOF'
#NNNNN: feature:仲間からの復習(1日1回・最大5問)のAPIと、解いた直後のやり直しの回答を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 相棒えらびと名前、仲間の一覧の形

**Files:**
- Create: `database/migrations/2026_09_27_000008_make_first_companion_partner.php`
- Modify: `app/Support/Garden.php`（`companions`・`bloom`・`companionArray`）、`routes/api.php`（名前の変更・相棒の変更）
- Modify（テストの期待値）: `tests/Feature/GardenStateTest.php`（100〜113行）、`tests/Feature/GardenActionsTest.php`（130〜135行）
- Test: `tests/Feature/CompanionPartnerTest.php`

**Interfaces:**
- Consumes: `Bond::hearts`・`label`・`lines`・`nextHeartBond`・`displayName`（Task 1）、`Review::state`（Task 2）
- Produces:
  - 仲間の一覧（`GET /api/world` の `companions`、水やりAPIの `born`）の各仲間の形（この順）: `{ key, name, official_name, nickname, trait, lines, hearts, heart_label, bond, next_heart_bond, is_partner, x, y }`。`born` はこの前に `kind: "companion"`。並びは相棒が先頭、ほかは生まれた順
  - `PATCH /api/world/companions/{key}`（`{ nickname }` → `{ companions, review }`）、`POST /api/world/partner`（`{ key }` → `{ companions, review }`）

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/CompanionPartnerTest.php`:

```php
<?php

use App\Models\User;
use App\Support\Garden;

/*
|--------------------------------------------------------------------------
| 相棒えらびと名前(docs/design/2026-09-27-spru-wave-c-design.md 3-1・3-2)
|--------------------------------------------------------------------------
|
| 最初に生まれた仲間は自動で相棒になる。相棒は仲間の立ち位置の先頭(スプルの隣)に立つ。
| 名前は1〜8文字で、前後の空白を取り、空なら元の名前に戻す。
|
*/

it('仲間の一覧に名前・ハート・相棒かが出て、相棒が先頭に立つ', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'ruru']);
    $profile->companions()->create(['companion_key' => 'lumi', 'nickname' => 'ピカ', 'bond' => 25]);
    $profile->update(['partner_companion_key' => 'lumi']);

    $this->getJson('/api/world')
        ->assertJsonPath('companions.0', [
            'key' => 'lumi', 'name' => 'ピカ', 'official_name' => 'Lumi', 'nickname' => 'ピカ', 'trait' => '光・ひらめき',
            'lines' => ['ひらめいた！いっしょに学ぼう', 'わかった瞬間って、ピカッとするよね'],
            'hearts' => 2, 'heart_label' => 'なかよし', 'bond' => 25, 'next_heart_bond' => 50, 'is_partner' => true, 'x' => 0, 'y' => 3,
        ])
        ->assertJsonPath('companions.1.key', 'ruru')
        ->assertJsonPath('companions.1.is_partner', false)
        ->assertJsonPath('companions.1.x', 3)
        ->assertJsonPath('companions.1.y', 2);
});

it('最初に生まれた仲間は、自動で相棒になる', function () {
    $profile = createActiveProfile();
    $profile->update(['last_correct_on' => Garden::today()]);
    $profile->seeds()->create(['result_key' => 'momo', 'waterings' => 2]);

    $this->postJson('/api/world/garden/water')
        ->assertOk()
        ->assertJsonPath('born.key', 'momo')
        ->assertJsonPath('born.is_partner', true);

    expect($profile->fresh()->partner_companion_key)->toBe('momo');
});

it('2人目からは、生まれても相棒は替わらない', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'lumi']);
    $profile->update(['partner_companion_key' => 'lumi', 'last_correct_on' => Garden::today()]);
    $profile->seeds()->create(['result_key' => 'momo', 'waterings' => 2]);

    $this->postJson('/api/world/garden/water')
        ->assertOk()
        ->assertJsonPath('born.is_partner', false)
        ->assertJsonPath('born.x', 3)
        ->assertJsonPath('born.y', 2);

    expect($profile->fresh()->partner_companion_key)->toBe('lumi');
});

it('相棒を替えると、並びと立ち位置と復習を出す人が替わる', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo']);
    $profile->companions()->create(['companion_key' => 'kuru']);
    $profile->update(['partner_companion_key' => 'momo']);

    $this->postJson('/api/world/partner', ['key' => 'kuru'])
        ->assertOk()
        ->assertJsonPath('companions.0.key', 'kuru')
        ->assertJsonPath('companions.0.is_partner', true)
        ->assertJsonPath('companions.0.x', 0)
        ->assertJsonPath('companions.0.y', 3)
        ->assertJsonPath('companions.1.key', 'momo')
        ->assertJsonPath('companions.1.x', 3)
        ->assertJsonPath('review.giver.key', 'kuru');

    expect($profile->fresh()->partner_companion_key)->toBe('kuru');
});

it('まだ生まれていない仲間は、相棒にできない', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo']);
    $profile->update(['partner_companion_key' => 'momo']);

    $this->postJson('/api/world/partner', ['key' => 'piko'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'まだ生まれていない仲間だよ');

    expect($profile->fresh()->partner_companion_key)->toBe('momo');
});

it('名前を付けられ、前後の空白(全角も)は取れる', function () {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo']);
    $profile->update(['partner_companion_key' => 'momo']);

    $this->patchJson('/api/world/companions/momo', ['nickname' => '　モモちゃん '])
        ->assertOk()
        ->assertJsonPath('companions.0.name', 'モモちゃん')
        ->assertJsonPath('companions.0.official_name', 'Momo')
        ->assertJsonPath('review.giver.name', 'モモちゃん');

    expect($momo->fresh()->nickname)->toBe('モモちゃん');
});

it('空や空白だけにすると、元の名前に戻る', function (?string $input) {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo', 'nickname' => 'モモちゃん']);

    $this->patchJson('/api/world/companions/momo', ['nickname' => $input])
        ->assertOk()
        ->assertJsonPath('companions.0.name', 'Momo')
        ->assertJsonPath('companions.0.nickname', null);

    expect($momo->fresh()->nickname)->toBeNull();
})->with(['空文字' => [''], '半角の空白' => ['   '], '全角の空白' => ['　'], 'null' => [null]]);

it('8文字ちょうどの名前は付けられる', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo']);

    $this->patchJson('/api/world/companions/momo', ['nickname' => 'あいうえおかきく'])
        ->assertOk()
        ->assertJsonPath('companions.0.name', 'あいうえおかきく');
});

it('9文字以上や改行の入った名前は付けられない', function (string $input, string $message) {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo']);

    $this->patchJson('/api/world/companions/momo', ['nickname' => $input])
        ->assertStatus(422)
        ->assertJsonPath('errors.nickname.0', $message);

    expect($momo->fresh()->nickname)->toBeNull();
})->with([
    '9文字' => ['あいうえおかきくけ', '8文字までにしてね'],
    '改行' => ["モ\nモ", '使えない文字が入っているよ'],
]);

it('まだ生まれていない仲間の名前は変えられない', function () {
    createActiveProfile();

    $this->patchJson('/api/world/companions/momo', ['nickname' => 'モモ'])->assertNotFound();
});

it('ほかのプロフィールの仲間の名前は変えられない', function () {
    $other = User::factory()->create()->schema()->create(['name' => 'よその家族'])->profiles()->create(['name' => 'よその子']);
    $othersMomo = $other->companions()->create(['companion_key' => 'momo']);
    createActiveProfile();

    $this->patchJson('/api/world/companions/momo', ['nickname' => 'モモ'])->assertNotFound();

    expect($othersMomo->fresh()->nickname)->toBeNull();
});

it('更新のとき、仲間がいて相棒がいないプロフィールは、最初に生まれた仲間が相棒になる', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'kuru']);
    $profile->companions()->create(['companion_key' => 'momo']);
    $noCompanion = $profile->schema->profiles()->create(['name' => '仲間なし']);
    $chosen = $profile->schema->profiles()->create(['name' => '相棒あり', 'partner_companion_key' => 'piko']);
    $chosen->companions()->create(['companion_key' => 'lumi']);
    $chosen->companions()->create(['companion_key' => 'piko']);

    (require database_path('migrations/2026_09_27_000008_make_first_companion_partner.php'))->up();

    expect($profile->fresh()->partner_companion_key)->toBe('kuru')
        ->and($noCompanion->fresh()->partner_companion_key)->toBeNull()
        ->and($chosen->fresh()->partner_companion_key)->toBe('piko');
});
```

B回のテストの期待値を新しい形にする。

`tests/Feature/GardenStateTest.php` の `it('生まれた仲間は、生まれた順に道の立ち位置つきで出る', ...)` の `->assertJsonPath('companions.0', [ ... ])` の配列を次にする:

```php
        ->assertJsonPath('companions.0', [
            'key' => 'ruru', 'name' => 'Ruru', 'official_name' => 'Ruru', 'nickname' => null, 'trait' => '水・知恵',
            'lines' => ['じっくり考えるのが好き'], 'hearts' => 1, 'heart_label' => 'はじめまして', 'bond' => 0,
            'next_heart_bond' => 20, 'is_partner' => false, 'x' => 0, 'y' => 3,
        ])
```

`tests/Feature/GardenActionsTest.php` の `it('3回目の水やりで仲間が生まれ、道に並ぶ', ...)` の `->assertJsonPath('born', [ ... ])` の配列を次にする（最初の仲間なので自動で相棒）:

```php
        ->assertJsonPath('born', [
            'kind' => 'companion', 'key' => 'momo', 'name' => 'Momo', 'official_name' => 'Momo', 'nickname' => null,
            'trait' => '花・やさしさ', 'lines' => ['お花、きれいだね'], 'hearts' => 1, 'heart_label' => 'はじめまして',
            'bond' => 0, 'next_heart_bond' => 20, 'is_partner' => true, 'x' => 0, 'y' => 3,
        ])
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `./vendor/bin/sail artisan test --filter='CompanionPartnerTest|GardenStateTest|GardenActionsTest'`
Expected: FAIL（一覧に `official_name` などが無い、`/api/world/partner` が404、更新ファイルが無い など）

- [ ] **Step 3: 仲間の一覧の形と並びを作り直す**

`app/Support/Garden.php`:
- 先頭の `use` に並べて `use App\Support\Bond;` は不要（同じ名前空間）。そのまま使う
- `companions` を次に置き換える:

```php
    /**
     * 生まれた仲間。相棒を先頭に、ほかは生まれた順(docs/design/2026-09-27-spru-wave-c-design.md 3-1)。
     * 立ち位置(config/world.php の companion_spots)はこの順に前から使う。
     *
     * @return list<array<string, mixed>>
     */
    public static function companions(UserProfile $profile): array
    {
        $spots = config('world.companion_spots');
        $partnerKey = $profile->partner_companion_key;

        return $profile->companions()->orderBy('id')->get()
            ->sortBy(fn (ProfileCompanion $companion) => $companion->companion_key === $partnerKey ? 0 : 1)
            ->values()
            ->map(fn (ProfileCompanion $companion, int $i) => self::companionArray($companion, $partnerKey, $spots[$i] ?? null))
            ->all();
    }
```

- `bloom` の仲間の部分（`$profile->companions()->firstOrCreate(...)` から `return ['kind' => 'companion', ...];` まで）を次に置き換える:

```php
        $profile->companions()->firstOrCreate(['companion_key' => $resultKey]);
        if ($profile->partner_companion_key === null) {
            // 最初の仲間は自動で相棒になる(C回、設計書3-1)
            $profile->partner_companion_key = $resultKey;
            $profile->save();
        }

        return ['kind' => 'companion', ...collect(self::companions($profile))->firstWhere('key', $resultKey)];
```

- `companionArray` を次に置き換える:

```php
    /** @param  array{0: int, 1: int}|null  $spot */
    private static function companionArray(ProfileCompanion $companion, ?string $partnerKey, ?array $spot): array
    {
        $key = $companion->companion_key;
        $def = config("companions.list.{$key}", []);
        $hearts = Bond::hearts($companion->bond);

        return [
            'key' => $key,
            'name' => Bond::displayName($companion),
            'official_name' => $def['name'] ?? $key,
            'nickname' => $companion->nickname,
            'trait' => $def['trait'] ?? '',
            'lines' => Bond::lines($key, $hearts),
            'hearts' => $hearts,
            'heart_label' => Bond::label($hearts),
            'bond' => $companion->bond,
            'next_heart_bond' => Bond::nextHeartBond($companion->bond),
            'is_partner' => $key === $partnerKey,
            'x' => $spot[0] ?? null,
            'y' => $spot[1] ?? null,
        ];
    }
```

- クラスの説明コメントの1行目を `* スプルの育ち具合と、畑・仲間(docs/design/2026-09-27-spru-wave-b-design.md 3〜4章、C回の相棒は 2026-09-27-spru-wave-c-design.md)。` にする

- [ ] **Step 4: 今いる仲間の最初の1人を相棒にする更新を書く**

`database/migrations/2026_09_27_000008_make_first_companion_partner.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 仲間がいて相棒がいないプロフィールは、最初に生まれた仲間を相棒にする(docs/design/2026-09-27-spru-wave-c-design.md 4-1)
        $firstIds = DB::table('profile_companions')
            ->selectRaw('MIN(id) as first_id')
            ->groupBy('user_profile_id')
            ->pluck('first_id');

        DB::table('profile_companions')->whereIn('id', $firstIds)->get(['user_profile_id', 'companion_key'])
            ->each(fn ($companion) => DB::table('user_profiles')
                ->where('id', $companion->user_profile_id)
                ->whereNull('partner_companion_key')
                ->update(['partner_companion_key' => $companion->companion_key]));
    }

    public function down(): void
    {
        //
    }
};
```

- [ ] **Step 5: 名前の変更と相棒の変更のAPIを書く**

`routes/api.php`:
- `use Illuminate\Support\Facades\Route;` の次に `use Illuminate\Support\Facades\Validator;` を足す
- 町のAPIのグループの中、`Route::post('/garden/water', ...)->name('garden.water');` の次に足す:

```php

    Route::patch('/companions/{key}', function (Request $request, string $key) {
        $activeProfile = ActiveProfile::require($request);
        $nickname = $request->input('nickname');
        // 前後の空白(全角の空白も)を取り、空なら元の名前に戻す(設計書3-2)
        $nickname = is_string($nickname) ? preg_replace('/^[\s\x{3000}]+|[\s\x{3000}]+$/u', '', $nickname) : $nickname;
        $nickname = $nickname === '' ? null : $nickname;
        $max = config('companions.nickname_max');
        Validator::make(
            ['nickname' => $nickname],
            ['nickname' => ['nullable', 'string', "max:{$max}", 'regex:/^[^\p{Cc}]*$/u']],
            [
                'nickname.string' => '名前は文字で入れてね',
                'nickname.max' => "{$max}文字までにしてね",
                'nickname.regex' => '使えない文字が入っているよ',
            ],
        )->validate();

        return DB::transaction(function () use ($activeProfile, $key, $nickname) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();
            $companion = $profile->companions()->where('companion_key', $key)->first();
            abort_unless($companion, 404);
            $companion->update(['nickname' => $nickname]);

            return ['companions' => Garden::companions($profile), 'review' => Review::state($profile)];
        });
    })->name('companions.update');

    Route::post('/partner', function (Request $request) {
        $activeProfile = ActiveProfile::require($request);
        $data = $request->validate(['key' => ['required', 'string']]);

        return DB::transaction(function () use ($activeProfile, $data) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();
            abort_unless($profile->companions()->where('companion_key', $data['key'])->exists(), 422, 'まだ生まれていない仲間だよ');
            $profile->partner_companion_key = $data['key'];
            $profile->save();

            return ['companions' => Garden::companions($profile), 'review' => Review::state($profile)];
        });
    })->name('partner');
```

- [ ] **Step 6: 更新してテストを通す**

Run: `./vendor/bin/sail artisan migrate`
Expected: `2026_09_27_000008_make_first_companion_partner` が `DONE`

Run: `./vendor/bin/sail artisan test --filter='CompanionPartnerTest|GardenStateTest|GardenActionsTest' && ./vendor/bin/sail artisan test`
Expected: CompanionPartnerTest 16件PASS（データセット込み）、GardenStateTest・GardenActionsTest もPASS、全体 226件PASS

- [ ] **Step 7: コミット**

```bash
git add app/Support/Garden.php routes/api.php database/migrations/2026_09_27_000008_make_first_companion_partner.php tests/Feature/CompanionPartnerTest.php tests/Feature/GardenStateTest.php tests/Feature/GardenActionsTest.php
git commit -m "$(cat <<'EOF'
#NNNNN: feature:相棒えらびと名前のAPIを追加し、仲間の一覧に名前・ハートを足して相棒を先頭に立たせる

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 画面側の計算（ハート・名前・タップ・やり直し）と型

**Files:**
- Create: `frontend/src/components/world/companions.ts`・`companions.test.ts`、`frontend/src/components/quiz/types.ts`、`frontend/src/components/quiz/retry.ts`・`retry.test.ts`
- Modify: `frontend/src/components/world/types.ts`（`WorldCompanion`・`WorldData`、`WorldReview`・`AnswerPartner` を追加）
- Modify（型に合わせる最小限）: `frontend/src/components/world/world-scene.tsx`（吹き出しのひとこと）、`born-overlay.tsx`（ひとこと）、`world-screen.tsx`（`handleBornClose`）

**Interfaces:**
- Consumes: Task 3 の仲間の形、Task 2 の `review`・回答APIの `profile.partner`
- Produces:
  - 型 `WorldCompanion`（Task 3 の形）、`WorldReview = { available; count; giver: { kind: "companion" | "spru"; key: string | null; name: string } }`、`AnswerPartner = { key; name; hearts; heart_label; hearts_up; new_line: string | null }`、`WorldData.review`
  - `components/world/companions.ts`: `NICKNAME_MAX`、`heartsText(hearts: number): string`、`nextHeartText(c: Pick<WorldCompanion, "hearts" | "bond" | "next_heart_bond">): string`、`pickLine(lines: string[], random: number): string`、`checkNickname(input: string): NicknameCheck`、`pickSpruTap({ canSow, review }): "sow" | "review" | "chat"`、`reviewPrompt(review: WorldReview): string | null`、`reviewInvite(count: number): string`、`reviewGiverKey(review: WorldReview): string | null`
  - `components/quiz/types.ts`: `QuizChoice`・`QuizCountry`・`QuizQuestion`
  - `components/quiz/retry.ts`: `shuffled<T>(list: readonly T[], random: () => number): T[]`、`retryRound(questions: readonly QuizQuestion[], missedIds: readonly number[], random: () => number): QuizQuestion[]`

- [ ] **Step 1: 型を足す**

`frontend/src/components/world/types.ts`:
- `WorldData` の `companions: WorldCompanion[];` の次に `review: WorldReview;` を足す
- `export type WorldCompanion = { ... };` を次に置き換え、その次に `WorldReview`・`AnswerPartner` を足す:

```ts
export type WorldCompanion = {
  key: string;
  name: string;
  official_name: string;
  nickname: string | null;
  trait: string;
  lines: string[];
  hearts: number;
  heart_label: string;
  bond: number;
  next_heart_bond: number | null;
  is_partner: boolean;
  x: number | null;
  y: number | null;
};

export type WorldReview = {
  available: boolean;
  count: number;
  giver: { kind: "companion" | "spru"; key: string | null; name: string };
};

/** 回答APIが返す相棒(設計書4-4) */
export type AnswerPartner = {
  key: string;
  name: string;
  hearts: number;
  heart_label: string;
  hearts_up: boolean;
  new_line: string | null;
};
```

`frontend/src/components/quiz/types.ts`（今の `app/quiz/[stageId]/page.tsx` の `Choice`・`Country`・`QuestionItem` を移したもの。ページ側はTask 5で使うように変える）:

```ts
import type { MatchingItem } from "@/components/app/matching-question";
import type { SortingBasket } from "@/components/app/sorting-question";

export type QuizChoice = { id: number; label: string };
export type QuizCountry = { id: number; code: string; name: string };
export type QuizQuestion = {
  id: number;
  type: "multiple_choice" | "matching" | "ordering" | "true_false" | "sorting";
  prompt: string;
  country: QuizCountry | null;
  choices: QuizChoice[];
  meta: {
    items?: MatchingItem[];
    baskets?: SortingBasket[];
    image?: string;
  } | null;
};
```

- [ ] **Step 2: 型に合わせて今の画面を最小限直す（Task 7で作り直す）**

`frontend/src/components/world/world-scene.tsx` の仲間の吹き出し `<AutoFurigana text={talking.line} />` を `<AutoFurigana text={talking.lines[0] ?? ""} />` にする。

`frontend/src/components/world/born-overlay.tsx` の `<AutoFurigana text={`「${companion.line}」`} />` を `<AutoFurigana text={`「${companion.lines[0] ?? ""}」`} />` にする。

`frontend/src/components/world/world-screen.tsx` の `handleBornClose` の `const companion: WorldCompanion = { ... };` から `setCompanionTalk({ key: companion.key, at: Date.now() });` までを次にし、`import type { ... } from "./types";` から `WorldCompanion` を消す:

```tsx
    setWorld((prev) => (prev ? { ...prev, companions: [...prev.companions, result] } : prev));
    setCompanionTalk({ key: result.key, at: Date.now() });
```

- [ ] **Step 3: 失敗するテストを書く**

`frontend/src/components/world/companions.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  checkNickname,
  heartsText,
  nextHeartText,
  pickLine,
  pickSpruTap,
  reviewGiverKey,
  reviewPrompt,
} from "./companions";
import type { WorldReview } from "./types";

const review = (overrides: Partial<WorldReview> = {}): WorldReview => ({
  available: false,
  count: 0,
  giver: { kind: "spru", key: null, name: "スプル" },
  ...overrides,
});
const momoReview = review({ available: true, count: 3, giver: { kind: "companion", key: "momo", name: "モモ" } });

describe("heartsText", () => {
  it("♥が今の数、♡が残り(5つ)", () => {
    expect(heartsText(1)).toBe("♥♡♡♡♡");
    expect(heartsText(5)).toBe("♥♥♥♥♥");
  });
});

describe("nextHeartText", () => {
  it("次のハートまでの残り", () => {
    expect(nextHeartText({ hearts: 3, bond: 88, next_heart_bond: 100 })).toBe("ハート4つまで あと12");
  });

  it("ハート5つなら しんゆう", () => {
    expect(nextHeartText({ hearts: 5, bond: 200, next_heart_bond: null })).toBe("しんゆう！");
  });
});

describe("pickLine", () => {
  it("覚えたひとことから選ぶ", () => {
    const lines = ["ア", "イ", "ウ"];
    expect(pickLine(lines, 0)).toBe("ア");
    expect(pickLine(lines, 0.5)).toBe("イ");
    expect(pickLine(lines, 0.99)).toBe("ウ");
  });

  it("ひとことが無ければ空", () => {
    expect(pickLine([], 0.3)).toBe("");
  });
});

describe("checkNickname", () => {
  it("前後の空白(全角も)を取る", () => {
    expect(checkNickname("　モモちゃん ")).toEqual({ ok: true, value: "モモちゃん" });
  });

  it("空や空白だけなら、元の名前に戻す(null)", () => {
    expect(checkNickname("")).toEqual({ ok: true, value: null });
    expect(checkNickname("  　")).toEqual({ ok: true, value: null });
  });

  it("8文字まではよい", () => {
    expect(checkNickname("あいうえおかきく")).toEqual({ ok: true, value: "あいうえおかきく" });
  });

  it("9文字以上はだめ", () => {
    expect(checkNickname("あいうえおかきくけ")).toEqual({ ok: false, message: "8文字までにしてね" });
  });

  it("改行などはだめ", () => {
    expect(checkNickname("モ\nモ")).toEqual({ ok: false, message: "使えない文字が入っているよ" });
  });
});

describe("pickSpruTap", () => {
  it("種がまけるなら、復習より先に種まき", () => {
    expect(pickSpruTap({ canSow: true, review: review({ available: true, count: 2 }) })).toBe("sow");
  });

  it("スプルが出す復習があれば、復習カード", () => {
    expect(pickSpruTap({ canSow: false, review: review({ available: true, count: 2 }) })).toBe("review");
  });

  it("相棒が出す復習の日は、スプルはふだんどおり", () => {
    expect(pickSpruTap({ canSow: false, review: momoReview })).toBe("chat");
  });

  it("復習が無ければ、ふだんどおり", () => {
    expect(pickSpruTap({ canSow: false, review: review() })).toBe("chat");
  });
});

describe("reviewPrompt", () => {
  it("相棒が出す日は、相棒の名前で案内する", () => {
    expect(reviewPrompt(momoReview)).toBe("モモが復習を用意してるよ");
  });

  it("スプルが出す日", () => {
    expect(reviewPrompt(review({ available: true, count: 1 }))).toBe("この前の問題、いっしょに復習しよう！");
  });

  it("復習が無い日は、案内しない", () => {
    expect(reviewPrompt(review())).toBeNull();
  });
});

describe("reviewGiverKey", () => {
  it("復習が無い日は、「！」を出さない", () => {
    expect(reviewGiverKey(review())).toBeNull();
  });

  it("スプルが出す日は spru", () => {
    expect(reviewGiverKey(review({ available: true, count: 1 }))).toBe("spru");
  });

  it("相棒が出す日は、相棒のキー", () => {
    expect(reviewGiverKey(momoReview)).toBe("momo");
  });
});
```

`frontend/src/components/quiz/retry.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { retryRound, shuffled } from "./retry";
import type { QuizQuestion } from "./types";

const question = (id: number, overrides: Partial<QuizQuestion> = {}): QuizQuestion => ({
  id,
  type: "multiple_choice",
  prompt: `問題${id}`,
  country: null,
  choices: [
    { id: id * 10 + 1, label: "ア" },
    { id: id * 10 + 2, label: "イ" },
    { id: id * 10 + 3, label: "ウ" },
  ],
  meta: null,
  ...overrides,
});

describe("shuffled", () => {
  it("元の並びを変えずに、入れ替えた新しい並びを返す", () => {
    const list = [1, 2, 3];
    // 常に0を返すと、後ろから順に先頭と入れ替わる
    expect(shuffled(list, () => 0)).toEqual([2, 3, 1]);
    expect(list).toEqual([1, 2, 3]);
  });

  it("中身は同じ", () => {
    expect(shuffled([1, 2, 3, 4], Math.random).sort()).toEqual([1, 2, 3, 4]);
  });
});

describe("retryRound", () => {
  it("まちがえた問題だけを、最初に出した順で返す", () => {
    const round = retryRound([question(1), question(2), question(3)], [3, 1], () => 0.999);
    expect(round.map((q) => q.id)).toEqual([1, 3]);
  });

  it("選択肢の順番を入れ替え、問題の中身は変えない", () => {
    const [q] = retryRound([question(1)], [1], () => 0);
    expect(q.choices.map((c) => c.label)).toEqual(["イ", "ウ", "ア"]);
    expect(q.prompt).toBe("問題1");
  });

  it("仕分け・マッチングの絵の順番も入れ替える", () => {
    const items = [
      { id: "jp", image: "/flag/jp.svg" },
      { id: "fr", image: "/flag/fr.svg" },
    ];
    const [q] = retryRound([question(1, { type: "sorting", choices: [], meta: { items, baskets: [] } })], [1], () => 0);
    expect(q.meta?.items?.map((item) => item.id)).toEqual(["fr", "jp"]);
    expect(q.meta?.baskets).toEqual([]);
  });

  it("まちがえた問題が無ければ空", () => {
    expect(retryRound([question(1)], [], Math.random)).toEqual([]);
  });
});
```

- [ ] **Step 4: 失敗することを確かめる**

Run: `cd frontend && npx vitest run src/components/world/companions.test.ts src/components/quiz/retry.test.ts`
Expected: FAIL（`./companions`・`./retry` が見つからない）

- [ ] **Step 5: 計算を書く**

`frontend/src/components/world/companions.ts`:

```ts
import type { WorldCompanion, WorldReview } from "./types";

/** 子どもが付ける名前の長さ(サーバーの config/companions.php の nickname_max と同じ) */
export const NICKNAME_MAX = 8;

/** ハートの並び。♥が今の数、♡が残り(設計書5-2) */
export function heartsText(hearts: number): string {
  const filled = Math.max(0, Math.min(5, hearts));
  return "♥".repeat(filled) + "♡".repeat(5 - filled);
}

/** 仲間のカードの「次のハートまで」(設計書5-2) */
export function nextHeartText(companion: Pick<WorldCompanion, "hearts" | "bond" | "next_heart_bond">): string {
  if (companion.next_heart_bond === null) return "しんゆう！";
  return `ハート${companion.hearts + 1}つまで あと${companion.next_heart_bond - companion.bond}`;
}

/** 町でタップしたときのひとこと。覚えたひとことからランダムに1つ(random は0以上1未満。設計書3-4) */
export function pickLine(lines: string[], random: number): string {
  return lines[Math.floor(random * lines.length)] ?? "";
}

export type NicknameCheck = { ok: true; value: string | null } | { ok: false; message: string };

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;

/** 名前の入力チェック。サーバーと同じ決まり(設計書3-2)。空なら元の名前に戻す(null) */
export function checkNickname(input: string): NicknameCheck {
  const value = input.replace(/^[\s　]+|[\s　]+$/g, "");
  if (value === "") return { ok: true, value: null };
  if (CONTROL_CHARS.test(value)) return { ok: false, message: "使えない文字が入っているよ" };
  if (Array.from(value).length > NICKNAME_MAX) return { ok: false, message: `${NICKNAME_MAX}文字までにしてね` };
  return { ok: true, value };
}

/** スプルをタップしたときの動き。寝ているときは、その前に起きる(設計書3-6) */
export function pickSpruTap({ canSow, review }: { canSow: boolean; review: WorldReview }): "sow" | "review" | "chat" {
  if (canSow) return "sow";
  if (review.available && review.giver.kind === "spru") return "review";
  return "chat";
}

/** スプルのふだんのひとこと。畑の案内が無いときに言う(設計書3-6) */
export function reviewPrompt(review: WorldReview): string | null {
  if (!review.available) return null;
  return review.giver.kind === "companion" ? `${review.giver.name}が復習を用意してるよ` : "この前の問題、いっしょに復習しよう！";
}

/** 仲間のカードと、スプルの復習カードの誘い(設計書3-5) */
export function reviewInvite(count: number): string {
  return `この前まちがえた問題、いっしょにやってみよう！（${count}問）`;
}

/** 復習の「！」を出す相手。スプルなら "spru"、仲間ならそのキー、出さない日は null */
export function reviewGiverKey(review: WorldReview): string | null {
  if (!review.available) return null;
  return review.giver.kind === "spru" ? "spru" : review.giver.key;
}
```

`frontend/src/components/quiz/retry.ts`:

```ts
import type { QuizQuestion } from "./types";

/** 並びを入れ替えた新しい配列(フィッシャー–イェーツ)。random は0以上1未満を返す関数 */
export function shuffled<T>(list: readonly T[], random: () => number): T[] {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 解いた直後のやり直しで出す問題(設計書3-7)。まちがえた問題だけを最初に出した順のまま、
 * 選択肢(と、仕分け・マッチングの絵)の順番を入れ替えて返す。問題そのものは変えない
 */
export function retryRound(questions: readonly QuizQuestion[], missedIds: readonly number[], random: () => number): QuizQuestion[] {
  return questions
    .filter((question) => missedIds.includes(question.id))
    .map((question) => ({
      ...question,
      choices: shuffled(question.choices, random),
      meta: question.meta?.items ? { ...question.meta, items: shuffled(question.meta.items, random) } : question.meta,
    }));
}
```

- [ ] **Step 6: 型・lint・テスト**

Run: `cd frontend && npx tsc --noEmit && npx eslint src/components && npm test`
Expected: エラーなし、テスト86件PASS

- [ ] **Step 7: コミット**

```bash
git add frontend/src/components/world/companions.ts frontend/src/components/world/companions.test.ts frontend/src/components/world/types.ts frontend/src/components/world/world-scene.tsx frontend/src/components/world/born-overlay.tsx frontend/src/components/world/world-screen.tsx frontend/src/components/quiz/types.ts frontend/src/components/quiz/retry.ts frontend/src/components/quiz/retry.test.ts
git commit -m "$(cat <<'EOF'
#NNNNN: feature:ハートの表示・名前の入力チェック・スプルのタップ・復習の案内・やり直しの問題の取り出しを決める計算を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: クイズ画面の切り出しと、相棒の応援・やり直し

**Files:**
- Create: `frontend/src/components/spru/companion-image.tsx`、`frontend/src/components/quiz/quiz-session.tsx`
- Modify: `frontend/src/app/quiz/[stageId]/page.tsx`（全体を置き換え）

**Interfaces:**
- Consumes: `QuizQuestion`（Task 4）、`retryRound`（Task 4）、`heartsText`（Task 4）、`AnswerPartner`（Task 4）、回答APIの `profile.partner`・`practice`（Task 1・2）
- Produces:
  - `CompanionImage({ companionKey: string; standHeight: number; className?: string })`（知らないキーなら何も描かない）
  - `QuizSession({ questions: QuizQuestion[]; title: ReactNode; stageNumber?: number | null; allowRestart: boolean; backLabel: string; onFinish: (score: number) => Promise<ReactNode> })`。`onFinish` は最初の1周（と「もう一度」の周）を最後まで答えたときに1回呼び、返したものを結果の画面に足す。やり直しの周では呼ばない

- [ ] **Step 1: HTMLの中の仲間の絵を書く**

`frontend/src/components/spru/companion-image.tsx`:

```tsx
import Image from "next/image";

import { COMPANION_IMAGES, SPRU_STAND_HEIGHT, type CompanionKey } from "./spru-assets";

/**
 * HTMLの中で仲間を出す(クイズ・仲間のカード用)。standHeight はスプルの立ち姿の高さ(px)で、
 * 仲間は素材集の縮尺どおり、スプルより少し小さく描く
 */
export function CompanionImage({
  companionKey,
  standHeight,
  className,
}: {
  companionKey: string;
  standHeight: number;
  className?: string;
}) {
  if (!(companionKey in COMPANION_IMAGES)) return null;
  const asset = COMPANION_IMAGES[companionKey as CompanionKey];
  const scale = standHeight / SPRU_STAND_HEIGHT;
  return (
    <Image
      src={asset.src}
      alt=""
      width={Math.round(asset.width * scale)}
      height={Math.round(asset.height * scale)}
      aria-hidden
      className={className}
    />
  );
}
```

- [ ] **Step 2: 共通のクイズの部品を書く**

`frontend/src/components/quiz/quiz-session.tsx`（今の `app/quiz/[stageId]/page.tsx` の出題部分を移し、相棒とやり直しを足したもの。`formatMinutesSeconds`・`flagEmojiToCountryCode`・`ChoiceLabel` は今のページからそのまま移す）:

```tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { MatchingQuestion, type MatchingResult } from "@/components/app/matching-question";
import { OrderingQuestion } from "@/components/app/ordering-question";
import { useProfile } from "@/components/app/profile-provider";
import { SceneBackground } from "@/components/app/scene-background";
import { SortingQuestion } from "@/components/app/sorting-question";
import { useSound } from "@/components/app/sound-provider";
import { bloomOf, type Bloom } from "@/components/spru/bloom";
import { CompanionImage } from "@/components/spru/companion-image";
import { pickAnswerImage, pickResult } from "@/components/spru/mood";
import { SpruFigure } from "@/components/spru/spru-figure";
import { heartsText } from "@/components/world/companions";
import { levelUpGrowthLine } from "@/components/world/garden";
import type { AnswerPartner, ShopListItem } from "@/components/world/types";
import { apiFetch } from "@/lib/api";

import { LevelUpOverlay } from "./level-up-overlay";
import { retryRound } from "./retry";
import { StageStartCard } from "./stage-start-card";
import type { QuizQuestion } from "./types";

type EconomyDelta = { hp?: number; xp?: number; coin?: number; point?: number };
type ComboInfo = { combo: number; combo_milestone_bonus_coin: number };
type StreakInfo = {
  streak: number;
  streak_extended_today: boolean;
  streak_milestone_bonus_coin: number;
};
type HpBlocked = { hp: number; max_hp: number; hp_regen_seconds: number | null };

function formatMinutesSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// 「国名→国旗」形式の選択肢は絵文字の国旗文字(例:🇬🇧)がそのままテキストで
// 入っている。環境によっては極小表示や文字化けになるため、可能なら
// /flag/{code}.svgの実画像に差し替える(選択肢データ自体は変更しない)。
function flagEmojiToCountryCode(text: string): string | null {
  const codePoints = Array.from(text.trim());
  if (codePoints.length !== 2) return null;

  const offsets = codePoints.map((ch) => ch.codePointAt(0));
  if (
    offsets.some(
      (cp) => cp === undefined || cp < 0x1f1e6 || cp > 0x1f1ff,
    )
  ) {
    return null;
  }

  return offsets
    .map((cp) => String.fromCharCode((cp as number) - 0x1f1e6 + 65))
    .join("")
    .toLowerCase();
}

function ChoiceLabel({ label }: { label: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const flagCode = flagEmojiToCountryCode(label);

  if (!flagCode || imageFailed) {
    // ボタンはflexコンテナのため、AutoFurigana(<ruby>を含む複数要素)がそのまま
    // 子として並ぶと各要素が個別のflexアイテムになり、1文字ずつ改行されて
    // しまう。1つのspanで包んで、その中で通常のテキスト折り返しにする。
    return (
      <span>
        <AutoFurigana text={label} />
      </span>
    );
  }

  return (
    // 存在しない国コードでもonErrorで絵文字表示にフォールバックしたいため、next/imageではなく生imgを使う
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flag/${flagCode}.svg`}
      alt={label}
      className="h-9 w-12 rounded-sm border border-border object-cover"
      onError={() => setImageFailed(true)}
    />
  );
}

/**
 * 問題を出して答えを送り、正解・不正解・レベルアップ・結果を見せる(ステージと仲間の復習で共通。設計書5-4)。
 * 結果の画面から、まちがえた問題だけをもう一度解ける(練習なので何も記録しない。設計書3-7)
 */
export function QuizSession({
  questions,
  title,
  stageNumber = null,
  allowRestart,
  backLabel,
  onFinish,
}: {
  questions: QuizQuestion[];
  // 問題番号の前に出す見出し(ステージ名や「〇〇からの復習」)
  title: ReactNode;
  // ステージ開始のカードに出す番号。復習では出さない
  stageNumber?: number | null;
  // 結果の画面の「もう一度」(全部やり直し)。復習では、正解した問題でごほうびが2回もらえてしまうため出さない
  allowRestart: boolean;
  backLabel: string;
  // 最後まで答えたときに1回呼ぶ(やり直しの周では呼ばない)。返したものを結果の画面に足す
  onFinish: (score: number) => Promise<ReactNode>;
}) {
  const { play: playSound, playBgm, stopBgm } = useSound();
  const { profile, applyPartial, refresh: refreshProfile } = useProfile();

  const [round, setRound] = useState(questions);
  // retry は解いた直後のやり直し(練習なので何も記録しない)
  const [mode, setMode] = useState<"main" | "retry">("main");
  const [missedIds, setMissedIds] = useState<number[]>([]);
  const [hpBlocked, setHpBlocked] = useState<HpBlocked | null>(null);
  const [hpBlockedSecondsLeft, setHpBlockedSecondsLeft] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(
    null,
  );
  const [correctChoiceId, setCorrectChoiceId] = useState<number | null>(null);
  const [matchingResults, setMatchingResults] = useState<
    MatchingResult[] | null
  >(null);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastDelta, setLastDelta] = useState<EconomyDelta | null>(null);
  const [combo, setCombo] = useState<ComboInfo | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [completionSubmitted, setCompletionSubmitted] = useState(false);
  const [finishNote, setFinishNote] = useState<ReactNode>(null);
  const [levelUp, setLevelUp] = useState<{
    level: number;
    previousLevel: number;
    growthLine: string | null;
    bloom: Bloom | null;
  } | null>(null);
  // スプルの育ち具合(回答APIが返す)。正解・不正解・結果のスプルにつぼみ・花を付ける
  const [spruGrowth, setSpruGrowth] = useState(0);
  // 回答APIが返す相棒。スプルの隣に出す(やり直しの間は直前の相棒のまま)
  const [partner, setPartner] = useState<AnswerPartner | null>(null);
  const [partnerUp, setPartnerUp] = useState<AnswerPartner | null>(null);
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [shopItems, setShopItems] = useState<ShopListItem[]>([]);
  // 「もう一度」のたびに増やし、ステージ開始のカードを出し直す
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    // レベルアップの演出で「新しく買えるようになったアイテム」を見せるため
    apiFetch("/api/shop").then(async (res) => {
      if (res.ok) setShopItems(await res.json());
    });
  }, []);

  useEffect(() => {
    playBgm("bgm1");
    return () => stopBgm();
  }, [playBgm, stopBgm]);

  // 画面を開いた時点ですでにHPが0なら、問題を見せる前にブロック画面にする
  useEffect(() => {
    (async () => {
      if (profile && profile.hp <= 0) {
        setHpBlocked({
          hp: profile.hp,
          max_hp: profile.max_hp,
          hp_regen_seconds: profile.hp_regen_seconds,
        });
      } else if (profile && profile.hp > 0) {
        setHpBlocked(null);
      }
    })();
  }, [profile]);

  useEffect(() => {
    (async () => {
      if (hpBlocked) {
        setHpBlockedSecondsLeft(hpBlocked.hp_regen_seconds ?? 0);
      }
    })();
  }, [hpBlocked]);

  useEffect(() => {
    if (!hpBlocked) return;

    const timer = setInterval(() => {
      setHpBlockedSecondsLeft((prev) => {
        if (prev <= 1) {
          (async () => {
            await refreshProfile();
          })();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hpBlocked, refreshProfile]);

  useEffect(() => {
    if (completionSubmitted || currentIndex < round.length) return;

    if (score === round.length) {
      playSound("allCorrect");
    }

    (async () => {
      setCompletionSubmitted(true);
      // やり直しは練習なので、ステージのクリアや復習のやりきりは送らない
      if (mode !== "main") return;
      setFinishNote(await onFinish(score).catch(() => null));
    })();
  }, [round, currentIndex, completionSubmitted, score, mode, playSound, onFinish]);

  const finished = currentIndex >= round.length;
  const practice = mode === "retry";

  // やり直しはHPが0でも遊べる。結果の画面も、最後の答えでHPが0になっても見られるようにする
  if (hpBlocked && !practice && !finished) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <SceneBackground />
        <AppHeader />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/90 p-8 shadow-xl backdrop-blur-sm">
            <SpruFigure image="sleep" standHeight={96} />
            <h1 className="text-xl font-bold">これ以上続けられません</h1>
            <p className="text-sm text-muted-foreground">
              スプルもひと休み。HPが回復したらまた遊ぼう
            </p>
            {hpBlockedSecondsLeft > 0 ? (
              <p className="text-3xl font-bold text-primary">
                {formatMinutesSeconds(hpBlockedSecondsLeft)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                確認しています...
              </p>
            )}
            <Link href="/">
              <AppButton variant="default">ホームに戻る</AppButton>
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const question = round[currentIndex];
  const isLastQuestion = currentIndex === round.length - 1;

  async function submitAnswer(body: Record<string, unknown>) {
    if (answered || submitting) return;
    setSubmitting(true);

    try {
      const res = await apiFetch(`/api/questions/${question.id}/answer`, {
        method: "POST",
        body: JSON.stringify(practice ? { ...body, practice: true } : body),
      });

      if (res.status === 409) {
        const data = await res.json();
        setHpBlocked({
          hp: data.profile?.hp ?? 0,
          max_hp: data.profile?.max_hp ?? profile?.max_hp ?? 20,
          hp_regen_seconds: data.profile?.hp_regen_seconds ?? null,
        });
        return;
      }

      if (!res.ok) return;

      const data = await res.json();
      setCorrectChoiceId(data.correct_choice_id ?? null);
      setMatchingResults(data.results ?? null);
      setAnswered(true);
      setLastCorrect(Boolean(data.correct));
      playSound(data.correct ? "correct" : "incorrect");
      setLastDelta(data.profile?.delta ?? null);
      if (!data.correct) setMissedIds((prev) => [...prev, question.id]);
      if (data.profile) {
        applyPartial({
          hp: data.profile.hp,
          max_hp: data.profile.max_hp,
          hp_regen_seconds: data.profile.hp_regen_seconds,
          coins: data.profile.coins,
          points: data.profile.points,
          xp: data.profile.xp,
          level: data.profile.level,
          current_streak: data.profile.streak,
        });
        const growth: number = data.profile.spru_growth ?? 0;
        setSpruGrowth(growth);
        if (data.profile.leveled_up) {
          setLevelUp({
            level: data.profile.level,
            previousLevel: profile?.level ?? data.profile.level - 1,
            growthLine: levelUpGrowthLine(growth, Boolean(data.profile.garden_busy)),
            bloom: bloomOf(growth),
          });
        }
        const answerPartner: AnswerPartner | null = data.profile.partner ?? null;
        setPartner(answerPartner);
        setPartnerUp(answerPartner?.hearts_up ? answerPartner : null);
      }
      setCombo(
        data.profile
          ? {
              combo: data.profile.combo,
              combo_milestone_bonus_coin:
                data.profile.combo_milestone_bonus_coin,
            }
          : null,
      );
      setStreak(
        data.profile
          ? {
              streak: data.profile.streak,
              streak_extended_today: data.profile.streak_extended_today,
              streak_milestone_bonus_coin:
                data.profile.streak_milestone_bonus_coin,
            }
          : null,
      );
      if (data.correct) setScore((prev) => prev + 1);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSelect(choiceId: number) {
    setSelectedChoiceId(choiceId);
    await submitAnswer({ choice_id: choiceId });
  }

  async function handleMatchingSubmit(
    answers: { item_id: string; choice_id: number }[],
  ) {
    await submitAnswer({ answers });
  }

  async function handleOrderingSubmit(answerOrder: number[]) {
    await submitAnswer({ answer_order: answerOrder });
  }

  async function handleSortingSubmit(
    assignments: { item_id: string; basket_id: string }[],
  ) {
    await submitAnswer({ assignments });
  }

  function advance() {
    setCurrentIndex((prev) => prev + 1);
    setSelectedChoiceId(null);
    setCorrectChoiceId(null);
    setMatchingResults(null);
    setAnswered(false);
    setLastDelta(null);
    setPartnerUp(null);
  }

  function handleNext() {
    // レベルが上がったときは、次の問題(最後なら結果画面)の前にお祝いを挟む
    if (levelUp && !levelUpOpen) {
      setLevelUpOpen(true);
      playSound("allCorrect");
      return;
    }
    advance();
  }

  function handleLevelUpContinue() {
    setLevelUp(null);
    setLevelUpOpen(false);
    advance();
  }

  // 「もう一度」とやり直しで共通の、1周ぶんの状態を最初に戻す
  function resetRun() {
    setCurrentIndex(0);
    setSelectedChoiceId(null);
    setCorrectChoiceId(null);
    setMatchingResults(null);
    setAnswered(false);
    setLastDelta(null);
    setCombo(null);
    setStreak(null);
    setScore(0);
    setCompletionSubmitted(false);
    setLevelUp(null);
    setLevelUpOpen(false);
    setMissedIds([]);
    setPartnerUp(null);
  }

  function handleRestart() {
    resetRun();
    setRound(questions);
    setMode("main");
    setFinishNote(null);
    setRunId((prev) => prev + 1);
  }

  function handleRetry() {
    resetRun();
    setRound(retryRound(round, missedIds, Math.random));
    setMode("retry");
  }

  if (finished) {
    const result = pickResult(score, round.length);
    const missedCount = missedIds.length;
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <SceneBackground />
        <AppHeader />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="flex flex-col items-center gap-6 rounded-2xl bg-white/90 p-8 shadow-xl backdrop-blur-sm">
            <div className="flex items-end gap-3">
              <SpruFigure image={result.image} standHeight={96} bloom={bloomOf(spruGrowth)} className={result.image === "jump" ? "animate-spru-hop" : undefined} />
              {partner && <CompanionImage companionKey={partner.key} standHeight={96} />}
            </div>
            <h1 className="text-2xl font-bold">{practice ? "もう一度チャレンジ" : "結果発表"}</h1>
            <p className="text-4xl font-bold text-primary">
              {score} / {round.length} 問正解
            </p>
            {result.line && <p className="text-sm font-semibold text-muted-foreground">{result.line}</p>}
            {!practice && finishNote}
            <div className="flex flex-wrap justify-center gap-3">
              {missedCount > 0 && (
                <AppButton variant="primary" onClick={handleRetry}>
                  まちがえた{missedCount}問に もう一度チャレンジ
                </AppButton>
              )}
              {allowRestart && !practice && (
                <AppButton variant={missedCount > 0 ? "default" : "primary"} onClick={handleRestart}>
                  もう一度
                </AppButton>
              )}
              <Link href="/">
                <AppButton variant="default">{backLabel}</AppButton>
              </Link>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const correctChoiceLabel = question.choices.find(
    (c) => c.id === correctChoiceId,
  )?.label;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <SceneBackground />
      <AppHeader />
      {currentIndex === 0 && !practice && stageNumber !== null && <StageStartCard key={runId} stageNumber={stageNumber} />}
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-12">
        <div className="flex flex-col gap-8 rounded-2xl bg-white/90 p-6 shadow-xl backdrop-blur-sm">
          <div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {practice ? "もう一度チャレンジ" : title}
              <span>
                ・ 問題 {currentIndex + 1} / {round.length}
              </span>
            </p>
            {question.meta?.image ? (
              <div className="relative mx-auto mt-4 h-32 w-52 overflow-hidden rounded-lg border border-border shadow-sm">
                <Image
                  src={question.meta.image}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              question.country && (
                <div className="relative mx-auto mt-4 h-28 w-44 overflow-hidden rounded-lg border border-border shadow-sm">
                  <Image
                    src={`/flag/${question.country.code}.svg`}
                    alt={question.country.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )
            )}
            <h1 className="mt-2 text-xl font-bold">
              <AutoFurigana text={question.prompt} />
            </h1>
          </div>

          {question.type === "matching" ? (
            <MatchingQuestion
              items={question.meta?.items ?? []}
              choices={question.choices}
              answered={answered}
              results={matchingResults}
              submitting={submitting}
              onSubmit={handleMatchingSubmit}
            />
          ) : question.type === "ordering" ? (
            <OrderingQuestion
              choices={question.choices}
              answered={answered}
              submitting={submitting}
              onSubmit={handleOrderingSubmit}
            />
          ) : question.type === "sorting" ? (
            <SortingQuestion
              items={question.meta?.items ?? []}
              baskets={question.meta?.baskets ?? []}
              answered={answered}
              submitting={submitting}
              onSubmit={handleSortingSubmit}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {question.choices.map((choice) => {
                let variant: "default" | "secondary" | "danger" | "locked" =
                  "default";
                if (answered) {
                  if (choice.id === correctChoiceId) variant = "secondary";
                  else if (choice.id === selectedChoiceId) variant = "danger";
                  else variant = "locked";
                }

                return (
                  <AppButton
                    key={choice.id}
                    variant={variant}
                    size="lg"
                    disabled={answered || submitting}
                    onClick={() => handleSelect(choice.id)}
                    className="h-auto min-h-12 w-full items-center justify-center gap-2 py-3 text-center leading-snug whitespace-normal normal-case"
                  >
                    {/* 色だけに頼らず、正解/選択した不正解にはアイコンも添える(色弱配慮) */}
                    {variant === "secondary" && <span aria-hidden>✓</span>}
                    {variant === "danger" && <span aria-hidden>✕</span>}
                    <ChoiceLabel label={choice.label} />
                  </AppButton>
                );
              })}
            </div>
          )}

          {answered && (
            <div
              className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 px-6 text-center ${
                lastCorrect
                  ? "bg-linear-to-br from-emerald-950 via-green-900 to-emerald-950"
                  : "bg-linear-to-br from-zinc-950 via-rose-950 to-zinc-950"
              }`}
            >
              <div className="flex items-end gap-3">
                <SpruFigure
                  key={currentIndex}
                  image={pickAnswerImage({
                    correct: lastCorrect,
                    combo: combo?.combo ?? 0,
                    comboBonus: combo?.combo_milestone_bonus_coin ?? 0,
                  })}
                  standHeight={100}
                  bloom={bloomOf(spruGrowth)}
                  className="animate-pop-in"
                />
                {partner && (
                  <CompanionImage
                    key={`partner-${currentIndex}`}
                    companionKey={partner.key}
                    standHeight={100}
                    className="animate-pop-in"
                  />
                )}
              </div>
              {lastCorrect ? (
                <>
                  <p className="animate-stage-intro text-6xl font-extrabold text-white drop-shadow-lg">
                    Correct!!
                  </p>
                  <p className="animate-stage-intro-subtitle flex gap-4 text-lg font-semibold text-white/90">
                    {typeof lastDelta?.xp === "number" && (
                      <span>+{lastDelta.xp}XP</span>
                    )}
                    {typeof lastDelta?.coin === "number" && (
                      <span>+{lastDelta.coin}Coin</span>
                    )}
                    {typeof lastDelta?.point === "number" && (
                      <span>+{lastDelta.point}pt</span>
                    )}
                  </p>
                  {combo && combo.combo >= 2 && (
                    <p className="animate-stage-intro-subtitle text-lg font-bold text-amber-300">
                      🔥 {combo.combo}コンボ！
                    </p>
                  )}
                  {combo && combo.combo_milestone_bonus_coin > 0 && (
                    <p className="animate-stage-intro-subtitle text-base font-semibold text-amber-200">
                      ボーナス +{combo.combo_milestone_bonus_coin}Coin
                    </p>
                  )}
                  {streak?.streak_extended_today && (
                    <p className="animate-stage-intro-subtitle text-base font-semibold text-orange-200">
                      🔥 {streak.streak}日連続プレイ！
                      {streak.streak_milestone_bonus_coin > 0 &&
                        ` ボーナス+${streak.streak_milestone_bonus_coin}Coin`}
                    </p>
                  )}
                  {partnerUp && (
                    <div className="animate-stage-intro-subtitle flex flex-col items-center gap-1 rounded-2xl bg-white/15 px-4 py-2 text-white">
                      <p className="text-base font-black text-pink-200">
                        <AutoFurigana text={`${partnerUp.name}とのなかよし度が上がった！`} />
                      </p>
                      <p className="text-lg tracking-widest text-pink-300" aria-label={`ハート${partnerUp.hearts}つ`}>
                        {heartsText(partnerUp.hearts)}
                      </p>
                      {partnerUp.new_line && (
                        <p className="text-sm font-bold">
                          <AutoFurigana text={`「${partnerUp.new_line}」`} />
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="animate-stage-intro text-5xl font-extrabold text-rose-200 drop-shadow-lg">
                    Wrong...
                  </p>
                  <p className="animate-stage-intro-subtitle flex flex-col items-center gap-1 text-lg font-semibold text-white/90">
                    {typeof lastDelta?.hp === "number" && (
                      <span>❤️{lastDelta.hp}</span>
                    )}
                    {correctChoiceLabel && (
                      <span className="flex items-center gap-1 text-base font-normal text-white/80">
                        正解: <ChoiceLabel label={correctChoiceLabel} />
                      </span>
                    )}
                  </p>
                </>
              )}

              <AppButton
                variant="primary"
                size="lg"
                onClick={handleNext}
                className="mt-4"
              >
                {isLastQuestion ? "結果を見る ▶" : "次へ ▶"}
              </AppButton>
            </div>
          )}
        </div>
      </div>
      {levelUpOpen && levelUp && (
        <LevelUpOverlay
          level={levelUp.level}
          unlocked={shopItems.filter(
            (item) =>
              item.type === "decoration" && item.min_level > levelUp.previousLevel && item.min_level <= levelUp.level,
          )}
          growthLine={levelUp.growthLine}
          bloom={levelUp.bloom}
          onContinue={handleLevelUpContinue}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: ステージの画面を、読み込みと見出しだけにする**

`frontend/src/app/quiz/[stageId]/page.tsx` を全部次に置き換える:

```tsx
"use client";

import { use, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { BottomNav } from "@/components/app/bottom-nav";
import { useProfile } from "@/components/app/profile-provider";
import { SceneBackground } from "@/components/app/scene-background";
import { QuizSession } from "@/components/quiz/quiz-session";
import type { QuizQuestion } from "@/components/quiz/types";
import { apiFetch } from "@/lib/api";

type StagePlayData = {
  id: number;
  category: { id: number; name: string };
  difficulty: string;
  stage_number: number;
  is_boss: boolean;
  title_reward: string | null;
  questions: QuizQuestion[];
};

export default function Page({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = use(params);
  const router = useRouter();
  const { applyPartial } = useProfile();
  const [stage, setStage] = useState<StagePlayData | null | undefined>(
    undefined,
  );

  useEffect(() => {
    apiFetch(`/api/stages/${stageId}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        setStage(res.ok ? await res.json() : null);
      })
      .catch(() => setStage(null));
  }, [stageId, router]);

  async function completeStage(score: number): Promise<ReactNode> {
    const res = await apiFetch(`/api/stages/${stageId}/complete`, {
      method: "POST",
      body: JSON.stringify({ score }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // ステージクリアのコイン+100・学習ポイント+50をヘッダーにも反映する
    applyPartial({ coins: data.profile.coins, points: data.profile.points });
    return data.title_granted && data.title ? (
      <p className="text-sm font-semibold text-amber-600">
        🏆 称号「{data.title}」を獲得しました！
      </p>
    ) : null;
  }

  if (stage === undefined) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <SceneBackground />
        <AppHeader />
        <div className="relative z-10 flex flex-1 items-center justify-center text-sm text-white/85 drop-shadow">
          読み込み中...
        </div>
        <BottomNav />
      </div>
    );
  }

  if (stage === null || stage.questions.length === 0) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <SceneBackground />
        <AppHeader />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm text-white/85 drop-shadow">
            このステージは見つかりませんでした。
          </p>
          <Link href="/" className="text-sm text-white/85 hover:underline">
            ホームに戻る
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <QuizSession
      key={stage.id}
      questions={stage.questions}
      title={
        <>
          {stage.category.name} ・ Stage {stage.stage_number}
          {stage.is_boss && (
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
              BOSS
            </span>
          )}
        </>
      }
      stageNumber={stage.stage_number}
      allowRestart
      backLabel="ホームに戻る"
      onFinish={completeStage}
    />
  );
}
```

- [ ] **Step 4: 型・lint・テスト**

Run: `cd frontend && npx tsc --noEmit && npx eslint src && npm test`
Expected: エラーなし、テスト86件PASS

- [ ] **Step 5: ブラウザで確認する（スマホ幅390pxとPC幅）**

開発サーバー（ポート3000）で「町テスト」にログインして確認する。先に、元に戻すための値を控える（Task 7の最後で戻す）:

```bash
./vendor/bin/sail artisan tinker --execute='$p=App\Models\UserProfile::where("name","町テスト")->first(); echo json_encode($p->only(["id","level","xp","hp","hp_updated_at","coins","points","bloom_base_level","last_correct_on","combo","best_combo","current_streak","best_streak","last_played_date","partner_companion_key","last_review_on"])), PHP_EOL;'
```

以下、`$p` は `App\Models\UserProfile::where("name","町テスト")->first()`。確かめるステージを探す:

```bash
./vendor/bin/sail artisan tinker --execute='echo App\Models\Stage::whereHas("questions", fn ($q) => $q->where("type","multiple_choice"))->value("id"), " ", App\Models\Stage::whereHas("questions", fn ($q) => $q->whereIn("type",["ordering","matching","sorting"]))->value("id"), PHP_EOL;'
```

相棒を用意する: `$p->companions()->create(["companion_key"=>"momo","bond"=>19]); $p->update(["partner_companion_key"=>"momo"]);`

- 4択のステージ（`/quiz/{id}`）: ステージ開始のカードが2秒出て消える。見出しが「カテゴリー名 ・ Stage N ・ 問題 1 / n」（ボスならBOSSの札）
- 正解: 「Correct!!」、+XP・+Coin・+pt、スプルの隣にMomo。1問目の正解で「Momoとのなかよし度が上がった！」「♥♥♡♡♡」「「まちがえても大丈夫。つぎはきっとできるよ」」が出る。次の正解では出ない
- 不正解: 「Wrong...」、❤️-2、正解の表示、スプルの隣にMomo
- レベルアップ: `$p->update(["xp"=>App\Support\LevelCurve::totalXpFor($p->level+1)-5]);` の後に正解 →「次へ」でお祝いが出る
- 結果の画面: スプルとMomo、「結果発表」「x / n 問正解」、まちがえた問題があれば「まちがえたN問に もう一度チャレンジ」、「もう一度」「ホームに戻る」
- やり直し: 押すと、ステージ開始のカードは出ず、見出しが「もう一度チャレンジ ・ 問題 1 / N」。まちがえた問題だけが出る。正解の画面に +XP などが出ない。やり直しの前後で `echo json_encode($p->fresh()->only(["xp","hp","coins","points","combo"]));` が変わらない。結果は「もう一度チャレンジ」「x / N 問正解」、まだまちがえた問題があれば、もう一度挑戦できる。「もう一度」は出ない
- 「もう一度」: 最初の結果の画面から押すと、ステージ開始のカードからやり直せる
- 並べ替え・マッチング・仕分けのステージ: 1問以上答え、今までどおり動く（レビューで特に見る点1）
- 最後の答えでHPが0（レビューで特に見る点2）: 最後の問題の前に `$p->update(["hp"=>2,"hp_updated_at"=>now()]);`（画面を読み直さずに続ける）→ 最後をまちがえる →「結果を見る」でHP切れの画面ではなく結果の画面が出る →「もう一度チャレンジ」でやり直しが最後まで遊べる（HP切れの画面が出ない）。もう一度 `$p->update(["hp"=>20,"hp_updated_at"=>null]);` で同じステージを最初から開き、同じ手順で結果の画面まで進めて、今度は「もう一度」を押す → 1問目でHP切れの画面になる。確かめたら `$p->update(["hp"=>20,"hp_updated_at"=>null]);`

- [ ] **Step 6: コミット**

```bash
git add frontend/src/components/spru/companion-image.tsx frontend/src/components/quiz/quiz-session.tsx "frontend/src/app/quiz/[stageId]/page.tsx"
git commit -m "$(cat <<'EOF'
#NNNNN: refactor:クイズ画面の出題部分を共通の部品に切り出し、相棒の応援と解いた直後のやり直しを足す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 仲間からの復習の画面

**Files:**
- Create: `frontend/src/app/review/page.tsx`

**Interfaces:**
- Consumes: `QuizSession`（Task 5）、`QuizQuestion`・`heartsText`・`AnswerPartner`・`WorldReview`（Task 4）、`GET /api/review`・`POST /api/review/complete`（Task 2）
- Produces: 画面 `/review`（町の「やってみる」の行き先）

- [ ] **Step 1: 復習の画面を書く**

`frontend/src/app/review/page.tsx`:

```tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { SceneBackground } from "@/components/app/scene-background";
import { QuizSession } from "@/components/quiz/quiz-session";
import type { QuizQuestion } from "@/components/quiz/types";
import { SpruFigure } from "@/components/spru/spru-figure";
import { heartsText } from "@/components/world/companions";
import type { AnswerPartner, WorldReview } from "@/components/world/types";
import { apiFetch } from "@/lib/api";

type ReviewData = { giver: WorldReview["giver"]; questions: QuizQuestion[] };
type LoadState = { kind: "ready"; data: ReviewData } | { kind: "closed"; message: string };

/** 仲間からの復習(1日1回・最大5問。設計書5-5) */
export default function ReviewPage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState | undefined>(undefined);

  useEffect(() => {
    apiFetch("/api/review")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await res.json().catch(() => ({}));
        setState(res.ok ? { kind: "ready", data } : { kind: "closed", message: data.message ?? "復習する問題はないよ" });
      })
      .catch(() => setState({ kind: "closed", message: "通信エラーが発生しました。" }));
  }, [router]);

  async function completeReview(): Promise<ReactNode> {
    const res = await apiFetch("/api/review/complete", { method: "POST" });
    if (!res.ok) return null;
    const data: { bond_gained: number; partner: AnswerPartner | null } = await res.json();
    if (!data.partner || data.bond_gained === 0) return null;
    return (
      <div className="flex flex-col items-center gap-1 text-sm font-bold text-[#2e6b1c]">
        <p>
          <AutoFurigana text={`${data.partner.name}のなかよし度 +${data.bond_gained}`} />
        </p>
        {data.partner.hearts_up && (
          <>
            <p className="text-pink-600">
              <AutoFurigana text={`${data.partner.name}とのなかよし度が上がった！`} />{" "}
              <span aria-label={`ハート${data.partner.hearts}つ`}>{heartsText(data.partner.hearts)}</span>
            </p>
            {data.partner.new_line && (
              <p className="text-muted-foreground">
                <AutoFurigana text={`「${data.partner.new_line}」`} />
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  if (state === undefined) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <SceneBackground />
        <AppHeader />
        <div className="relative z-10 flex flex-1 items-center justify-center text-sm text-white/85 drop-shadow">
          読み込み中...
        </div>
        <BottomNav />
      </div>
    );
  }

  if (state.kind === "closed") {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <SceneBackground />
        <AppHeader />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/90 p-8 shadow-xl backdrop-blur-sm">
            <SpruFigure image="smile" standHeight={96} />
            <p className="text-base font-bold">
              <AutoFurigana text={state.message} />
            </p>
            <Link href="/">
              <AppButton variant="default">町にもどる</AppButton>
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <QuizSession
      questions={state.data.questions}
      title={<AutoFurigana text={`${state.data.giver.name}からの復習`} />}
      allowRestart={false}
      backLabel="町にもどる"
      onFinish={completeReview}
    />
  );
}
```

- [ ] **Step 2: 型・lint・テスト・ビルド**

Run: `cd frontend && npx tsc --noEmit && npx eslint src && npm test && npm run build`
Expected: エラーなし、テスト86件PASS、ビルド成功（`/review` が一覧に出る）

- [ ] **Step 3: ブラウザで確認する（スマホ幅390pxとPC幅）**

Task 5で用意した相棒Momoのまま確かめる。復習に出る問題を確かめる（0なら、どれかのステージで2〜3問わざとまちがえる）:

```bash
./vendor/bin/sail artisan tinker --execute='$p=App\Models\UserProfile::where("name","町テスト")->first(); echo json_encode(App\Support\Review::questionIds($p, 5)), PHP_EOL;'
```

- `/review` を開く: ステージ開始のカードは出ず、見出しが「Momoからの復習 ・ 問題 1 / N」。答えると今までどおり +XP など、スプルの隣にMomo
- 最後まで答える: 結果の画面に「Momoのなかよし度 +5」（ハートが増えたら、そのお祝いとひとことも）。ボタンは「まちがえたN問に もう一度チャレンジ」（まちがえたときだけ）と「町にもどる」だけ。「もう一度」は出ない
- もう一度 `/review` を開く:「今日の復習はもう終わったよ。また明日ね」と「町にもどる」
- 途中でやめる（レビューで特に見る点3）: `$p->update(["last_review_on"=>null]);` → `/review` で1問目を正解 → 下のナビで町へ → もう一度 `/review` を開くと、正解した問題は出ず、問題数が1つ減っている
- 相棒がいない: `$p->update(["partner_companion_key"=>null,"last_review_on"=>null]);` → 見出しが「スプルからの復習」。やりきっても、なかよし度の行は出ない
- HPが0: `$p->update(["hp"=>0,"hp_updated_at"=>now(),"last_review_on"=>null]);` → 町を開いてから `/review` を開くと、HP切れの画面。確かめたら `$p->update(["hp"=>20,"hp_updated_at"=>null,"partner_companion_key"=>"momo","last_review_on"=>null]);`

- [ ] **Step 4: コミット**

```bash
git add frontend/src/app/review/page.tsx
git commit -m "$(cat <<'EOF'
#NNNNN: feature:仲間からの復習の画面(/review)を追加する

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 町の相棒・仲間のカード・名前付け・「！」

**Files:**
- Create: `frontend/src/components/world/nickname-form.tsx`、`nickname-dialog.tsx`、`review-card.tsx`、`companion-sheet.tsx`
- Modify: `frontend/src/components/world/world-scene.tsx`、`born-overlay.tsx`、`world-screen.tsx`（全体を置き換え）

**Interfaces:**
- Consumes: `companions.ts` の関数（Task 4）、`CompanionImage`（Task 5）、`WorldCompanion`・`WorldReview`（Task 4）、`PATCH /api/world/companions/{key}`・`POST /api/world/partner`（Task 3）、`/review`（Task 6）
- Produces:
  - `NicknameForm({ initial, placeholder, submitLabel, cancelLabel, onSubmit: (nickname: string | null) => Promise<string | null>, onCancel })`（`onSubmit` は失敗したときの理由を返し、成功なら null）
  - `NicknameDialog({ companion, onSubmit, onSkip })`、`ReviewInvite({ count, onStart })`・`ReviewCard({ count, onStart, onClose })`、`CompanionSheet({ companion, reviewCount: number | null, busy, onStartReview, onMakePartner, onRename, onClose })`
  - `WorldScene` の新しい props: `reviewGiver: string | null`、`companionTalk: { key: string; at: number; line: string } | null`

- [ ] **Step 1: 名前の入力欄と、名前付け・復習のカードを書く**

`frontend/src/components/world/nickname-form.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";

import { checkNickname, NICKNAME_MAX } from "./companions";

/** 名前の入力欄(仲間のカードと、最初の仲間の名前付けで共通。設計書3-2) */
export function NicknameForm({
  initial,
  placeholder,
  submitLabel,
  cancelLabel,
  onSubmit,
  onCancel,
}: {
  initial: string;
  placeholder: string;
  submitLabel: string;
  cancelLabel: string;
  // 失敗したときはその理由を返す(成功なら null)
  onSubmit: (nickname: string | null) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const checked = checkNickname(value);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    setBusy(true);
    try {
      setError(await onSubmit(checked.value));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor="nickname-input" className="text-sm font-bold text-[#6b5d45]">
        <AutoFurigana text={`名前（${NICKNAME_MAX}文字まで）`} />
      </label>
      <input
        id="nickname-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        // 長く打ったときも、止めずにわけを見せるため、入力は少し長めまで受ける
        maxLength={NICKNAME_MAX * 2}
        aria-invalid={error !== null}
        aria-describedby={error ? "nickname-error" : undefined}
        className="h-12 rounded-xl border-2 border-[#d9ccb0] bg-white px-3 text-base font-bold focus:border-[#3b7f26] focus:outline-none"
      />
      {error && (
        <p id="nickname-error" role="alert" className="text-sm font-bold text-[#a33a22]">
          <AutoFurigana text={error} />
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="h-12 flex-1 rounded-2xl bg-[#3b7f26] text-base font-black text-white disabled:opacity-60"
        >
          <AutoFurigana text={submitLabel} />
        </button>
        <button type="button" onClick={onCancel} className="h-12 flex-1 rounded-2xl bg-[#efe5cf] text-base font-black">
          <AutoFurigana text={cancelLabel} />
        </button>
      </div>
    </form>
  );
}
```

`frontend/src/components/world/nickname-dialog.tsx`:

```tsx
"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { CompanionImage } from "@/components/spru/companion-image";

import { NicknameForm } from "./nickname-form";
import type { WorldCompanion } from "./types";

/** 最初の仲間が生まれて相棒になったときの名前付け(設計書5-3) */
export function NicknameDialog({
  companion,
  onSubmit,
  onSkip,
}: {
  companion: WorldCompanion;
  onSubmit: (nickname: string | null) => Promise<string | null>;
  onSkip: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nickname-title"
        className="animate-pop-in flex w-full max-w-[340px] flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] px-5 pt-6 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        <CompanionImage companionKey={companion.key} standHeight={150} className="animate-spru-hop" />
        <h2 id="nickname-title" className="text-xl font-black text-[#2e6b1c]">
          <AutoFurigana text="相棒になってくれるって！名前をつけよう" />
        </h2>
        <div className="w-full text-left">
          <NicknameForm
            initial=""
            placeholder={companion.official_name}
            submitLabel="決める"
            cancelLabel="このままでいい"
            onSubmit={onSubmit}
            onCancel={onSkip}
          />
        </div>
      </div>
    </div>
  );
}
```

`frontend/src/components/world/review-card.tsx`:

```tsx
import { AutoFurigana } from "@/components/app/auto-furigana";
import { SpruFace } from "@/components/spru/spru-figure";

import { reviewInvite } from "./companions";

/** 復習の誘い(仲間のカードの一番上と、スプルの復習カードで共通。設計書3-5) */
export function ReviewInvite({ count, onStart }: { count: number; onStart: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-[#fff1dc] p-3">
      <p className="text-sm font-black text-[#8a4b12]">
        <AutoFurigana text={reviewInvite(count)} />
      </p>
      <button
        type="button"
        onClick={onStart}
        className="h-12 rounded-2xl bg-[#f28c28] text-base font-black text-white shadow-[0_4px_0_#c46a12]"
      >
        <AutoFurigana text="やってみる" />
      </button>
    </div>
  );
}

/** スプルが復習を出す日に、スプルをタップしたときのカード */
export function ReviewCard({ count, onStart, onClose }: { count: number; onStart: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-card-title"
        className="relative flex w-full max-w-[480px] flex-col gap-3 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        <h2 id="review-card-title" className="flex items-center gap-2 text-lg font-black">
          <SpruFace face="happy" size={36} />
          <AutoFurigana text="スプルからの復習" />
        </h2>
        <ReviewInvite count={count} onStart={onStart} />
        <button type="button" onClick={onClose} className="h-11 text-sm font-bold text-[#6b5d45]">
          あとで
        </button>
      </div>
    </div>
  );
}
```

`frontend/src/components/world/companion-sheet.tsx`:

```tsx
"use client";

import { useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { CompanionImage } from "@/components/spru/companion-image";

import { heartsText, nextHeartText } from "./companions";
import { NicknameForm } from "./nickname-form";
import { ReviewInvite } from "./review-card";
import type { WorldCompanion } from "./types";

/** 仲間をタップしたときのカード(設計書5-2) */
export function CompanionSheet({
  companion,
  reviewCount,
  busy,
  onStartReview,
  onMakePartner,
  onRename,
  onClose,
}: {
  companion: WorldCompanion;
  // 相棒が復習を出す日で、この仲間が相棒のときだけ問題数を渡す(それ以外は null)
  reviewCount: number | null;
  busy: boolean;
  onStartReview: () => void;
  onMakePartner: () => void;
  onRename: (nickname: string | null) => Promise<string | null>;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="companion-sheet-title"
        className="relative flex w-full max-w-[480px] flex-col gap-3 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        {reviewCount !== null && <ReviewInvite count={reviewCount} onStart={onStartReview} />}
        <div className="flex items-center gap-3">
          <div className="flex h-20 w-16 shrink-0 items-end justify-center rounded-xl bg-[#f5efe1] pb-1">
            <CompanionImage companionKey={companion.key} standHeight={96} />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id="companion-sheet-title" className="flex flex-wrap items-center gap-2 text-lg font-black break-all">
              {companion.name}
              {companion.is_partner && (
                <span className="rounded-full bg-[#3b7f26] px-2 py-0.5 text-[11px] font-black text-white">
                  <AutoFurigana text="相棒" />
                </span>
              )}
            </h2>
            {companion.nickname && (
              <p className="text-xs font-bold text-[#6b5d45]">
                <AutoFurigana text={`元の名前: ${companion.official_name}`} />
              </p>
            )}
            <p className="text-xs font-bold text-[#6b5d45]">
              <AutoFurigana text={companion.trait} />
            </p>
            <p className="text-sm font-black text-[#d0467a]">
              <span aria-label={`ハート${companion.hearts}つ`}>{heartsText(companion.hearts)}</span>
              <span className="ml-2 text-xs text-[#6b5d45]">
                <AutoFurigana text={`${companion.heart_label} ・ ${nextHeartText(companion)}`} />
              </span>
            </p>
          </div>
        </div>
        {editing ? (
          <NicknameForm
            initial={companion.nickname ?? ""}
            placeholder={companion.official_name}
            submitLabel="決める"
            cancelLabel="やめる"
            onSubmit={async (nickname) => {
              const error = await onRename(nickname);
              if (error === null) setEditing(false);
              return error;
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            {!companion.is_partner && (
              <button
                type="button"
                disabled={busy}
                onClick={onMakePartner}
                className="h-12 rounded-2xl bg-[#3b7f26] text-base font-black text-white disabled:opacity-60"
              >
                <AutoFurigana text="相棒にする" />
              </button>
            )}
            <button type="button" onClick={() => setEditing(true)} className="h-12 rounded-2xl bg-[#efe5cf] text-base font-black">
              <AutoFurigana text="名前を変える" />
            </button>
          </>
        )}
        <button type="button" onClick={onClose} className="h-11 text-sm font-bold text-[#6b5d45]">
          とじる
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 生まれたときのお祝いを直す**

`frontend/src/components/world/born-overlay.tsx` の仲間のひとことの `<p>`（`<AutoFurigana text={`「${companion.lines[0] ?? ""}」`} />` を含むもの）の次に足す:

```tsx
            {!companion.is_partner && (
              <p className="text-xs font-bold text-[#8a7a5c]">
                <AutoFurigana text="町でタップすると、相棒にできるよ" />
              </p>
            )}
```

- [ ] **Step 3: 町の絵に「相棒」の札と「！」を足す**

`frontend/src/components/world/world-scene.tsx`:
- props の型の `companionTalk: { key: string; at: number } | null;` を `companionTalk: { key: string; at: number; line: string } | null;` にし、その次に `reviewGiver: string | null;` を足す。分割代入の `companionTalk,` の次に `reviewGiver,` を足す
- 仲間の描画 `<CompanionFigure ... hopping={hopping} />` に `partner={o.companion.is_partner}` と `review={reviewGiver === o.companion.key}` を足す
- スプルの描画 `{o.kind === "spru" && ( <g key={spru.image} className={spruMotion}> ... </g> )}` を次にする（「！」はスプルと一緒にゆれないよう外に置く）:

```tsx
              {o.kind === "spru" && (
                <>
                  <g key={spru.image} className={spruMotion}>
                    <image href={spruAsset.src} x={spruX} y={spruY} width={spruW} height={spruH} />
                    {bloom && spruBloom && (
                      <image
                        href={SPRU_BLOOM[bloom].src}
                        x={spruX + spruBloom.x * TOWN_SCALE}
                        y={spruY + spruBloom.y * TOWN_SCALE}
                        width={spruBloom.width * TOWN_SCALE}
                        height={spruBloom.height * TOWN_SCALE}
                      />
                    )}
                  </g>
                  {reviewGiver === "spru" && <ReviewMark x={spruX + spruW - 4} y={spruY + 8} quiet={quiet} />}
                </>
              )}
```

- 仲間の吹き出しを次にする（ひとことは、タップしたときに選んだもの）:

```tsx
      {/* 仲間の吹き出しは、隣に立つスプルの吹き出しより手前に出す */}
      {talking && talkPos && companionTalk && (
        <div
          className="pointer-events-none absolute w-max max-w-[48%] -translate-x-1/2 -translate-y-full rounded-xl bg-white px-2.5 py-1 text-[11.5px] leading-snug font-bold text-[#3b3226] shadow-[0_2px_8px_rgba(59,50,38,0.16)]"
          style={{ left: `${talkPos.left}%`, top: `${talkPos.top}%` }}
          aria-live="polite"
        >
          <span className="mr-1 text-[#2e6b1c]">{talking.name}</span>
          <AutoFurigana text={companionTalk.line} />
        </div>
      )}
```

- ファイルの最後の `CompanionFigure` を次に置き換え、`PartnerTag`・`ReviewMark` を足す:

```tsx
// 仲間はタップしたときだけ跳ねる。夜は静かにゆれない(動きを減らす設定はCSSで止まる)
function CompanionFigure({
  companionKey,
  delay,
  quiet,
  hopping,
  partner,
  review,
}: {
  companionKey: CompanionKey;
  delay: number;
  quiet: boolean;
  hopping: boolean;
  partner: boolean;
  review: boolean;
}) {
  const asset = COMPANION_IMAGES[companionKey];
  const width = asset.width * TOWN_SCALE;
  const height = asset.height * TOWN_SCALE;
  const motion = hopping ? "animate-spru-hop" : quiet ? undefined : "animate-spru-bob";
  return (
    <>
      <g
        className={motion}
        style={motion === "animate-spru-bob" ? { animationDuration: "3.2s", animationDelay: `${delay}s` } : undefined}
      >
        <image href={asset.src} x={-width / 2} y={-height + 2} width={width} height={height} />
      </g>
      {partner && <PartnerTag />}
      {review && <ReviewMark x={width / 2 - 2} y={-height + 10} quiet={quiet} />}
    </>
  );
}

// 相棒の足元の札(設計書5-1)
function PartnerTag() {
  return (
    <g transform="translate(0 7)">
      <rect x={-13} y={-5.5} width={26} height={11} rx={5.5} fill="#3b7f26" stroke="#fff" strokeWidth={1} />
      <text y={3} textAnchor="middle" fontSize={7.5} fontWeight={900} fill="#fff">
        相棒
      </text>
    </g>
  );
}

// 復習を出す人の頭の上の「！」。CSSの動きがtransform属性を上書きしないよう、位置と動きの<g>を分ける
function ReviewMark({ x, y, quiet }: { x: number; y: number; quiet: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={quiet ? undefined : "animate-spru-bob"} style={quiet ? undefined : { animationDuration: "1.2s" }}>
        <circle r={7.5} fill="#f28c28" stroke="#fff" strokeWidth={1.5} />
        <text y={3.8} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff">
          !
        </text>
      </g>
    </g>
  );
}
```

- [ ] **Step 4: 町の画面をつなぐ**

`frontend/src/components/world/world-screen.tsx` を全部次に置き換える（変わるのは、仲間のタップ・カード・名前付け・相棒の変更・スプルのタップの順番・復習の案内。ほかは今のまま）:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";

import { BottomNav } from "@/components/app/bottom-nav";
import { useProfile } from "@/components/app/profile-provider";
import { useSound } from "@/components/app/sound-provider";
import { bloomOf } from "@/components/spru/bloom";
import { pickTownHint } from "@/components/spru/hint";
import { pickTownMood, type TownEvent } from "@/components/spru/mood";
import { apiFetch } from "@/lib/api";

import { Ambience, TIME_THEME } from "./ambience";
import { BornOverlay } from "./born-overlay";
import { CompanionSheet } from "./companion-sheet";
import { pickLine, pickSpruTap, reviewGiverKey, reviewPrompt } from "./companions";
import { gardenPrompt, pickGardenTap } from "./garden";
import { tileKey } from "./iso";
import { ItemActionSheet } from "./item-action-sheet";
import { NicknameDialog } from "./nickname-dialog";
import { PlacementBar } from "./placement-bar";
import { ReviewCard } from "./review-card";
import { getSeason, getTimeOfDay, isSpruSleepTime } from "./time-of-day";
import type { BornResult, ShopListItem, WorldCompanion, WorldData, WorldGarden, WorldItem, WorldReview } from "./types";
import { WelcomeGift } from "./welcome-gift";
import { WorldHud } from "./world-hud";
import { WorldScene } from "./world-scene";

const WELCOME_AMOUNT = 100;
const TAP_IMAGES = ["shy", "laugh", "cheer"] as const;
// 仲間をタップしたときの吹き出しを出しておく時間
const COMPANION_TALK_MS = 3_000;
// 3回目の水やりで生まれたとき、水やりの動きを見せてからお祝いを出す
const BORN_DELAY_MS = 1_600;

export function WorldScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 最初に開いたときの ?place= だけを使う(配置後に読み直しても配置モードに戻らないようにURLからは消す)
  const initialPlaceParam = useRef(searchParams.get("place"));
  const { play } = useSound();
  const [placingId, setPlacingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<WorldItem | null>(null);
  const [poppedItemId, setPoppedItemId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { profile: sharedProfile, applyPartial, refresh: refreshProfile } = useProfile();
  const [world, setWorld] = useState<WorldData | null>(null);
  const [shop, setShop] = useState<ShopListItem[]>([]);
  const [welcomeBusy, setWelcomeBusy] = useState(false);
  // スプルの出し分け(components/spru/mood.ts)に渡す状態。時刻は1秒ごとに進める
  const [now, setNow] = useState(() => Date.now());
  const [lastInteractionAt, setLastInteractionAt] = useState(() => Date.now());
  const [event, setEvent] = useState<TownEvent | null>(null);
  const [nightWokenAt, setNightWokenAt] = useState<number | null>(null);
  const [companionTalk, setCompanionTalk] = useState<{ key: string; at: number; line: string } | null>(null);
  const [born, setBorn] = useState<BornResult | null>(null);
  // 種まき・水やりの通信中は、続けて押しても送らない
  const [gardenBusy, setGardenBusy] = useState(false);
  // 開いている仲間のカード(仲間のキー)・スプルの復習カード・最初の仲間の名前付け
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const [reviewCardOpen, setReviewCardOpen] = useState(false);
  const [naming, setNaming] = useState<WorldCompanion | null>(null);
  // 相棒の変更の通信中は、続けて押しても送らない
  const [partnerBusy, setPartnerBusy] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // プロフィール選択直後はここに来るため、アプリ起動時(未選択)のままの共有プロフィールを取り直す
    refreshProfile();
    apiFetch("/api/world").then(async (res) => {
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (res.status === 422) {
        router.replace("/profiles");
        return;
      }
      if (res.ok) {
        const data: WorldData = await res.json();
        setWorld(data);
        applyPartial({ points: data.profile.points });
        setEvent({ kind: "greet", at: Date.now() });

        // ショップやバッグから /?place=ID で来たら、そのアイテムの配置モードにする。
        // 自分のアイテムでないIDや存在しないIDは無視して普通に表示する
        const placeParam = initialPlaceParam.current;
        if (placeParam) {
          initialPlaceParam.current = null;
          const id = Number(placeParam);
          if ([...data.items, ...data.bag].some((item) => item.id === id)) setPlacingId(id);
          router.replace("/");
        }
      }
    });
    apiFetch("/api/shop").then(async (res) => {
      if (res.ok) setShop(await res.json());
    });
  }, [router, applyPartial, refreshProfile]);

  const placingItem = useMemo(
    () => (world && placingId !== null ? [...world.items, ...world.bag].find((item) => item.id === placingId) ?? null : null),
    [world, placingId],
  );

  const validTiles = useMemo(() => {
    const tiles = new Set<string>();
    if (!world || placingId === null) return tiles;
    const blocked = new Set(world.land.blocked.map(([x, y]) => tileKey(x, y)));
    const occupied = new Set(
      world.items.filter((item) => item.id !== placingId).map((item) => tileKey(item.x as number, item.y as number)),
    );
    for (let y = 0; y < world.land.size; y++) {
      for (let x = 0; x < world.land.size; x++) {
        const key = tileKey(x, y);
        if (!blocked.has(key) && !occupied.has(key)) tiles.add(key);
      }
    }
    return tiles;
  }, [world, placingId]);

  const placing = placingItem !== null;
  const growth = world?.spru.growth ?? 0;
  const prompt = world && !placing ? (gardenPrompt(world.garden) ?? reviewPrompt(world.review)) : null;
  const mood = pickTownMood({ now, lastInteractionAt, event, nightWokenAt, placing, prompt });
  const talk = companionTalk && now - companionTalk.at < COMPANION_TALK_MS ? companionTalk : null;

  async function sow() {
    if (gardenBusy) return;
    setGardenBusy(true);
    try {
      const res = await apiFetch("/api/world/garden/sow", { method: "POST" }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res || !res.ok) {
        setMessage(data.message ?? "通信エラーが発生しました。");
        setEvent({ kind: "error", at: Date.now() });
        return;
      }
      const next: { spru: { growth: number }; garden: WorldGarden } = data;
      setWorld((prev) => (prev ? { ...prev, spru: next.spru, garden: next.garden } : prev));
      setMessage(null);
      play("correct");
      setEvent({ kind: "sow", at: Date.now() });
    } finally {
      setGardenBusy(false);
    }
  }

  async function water() {
    if (gardenBusy) return;
    setGardenBusy(true);
    try {
      const res = await apiFetch("/api/world/garden/water", { method: "POST" }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res || !res.ok) {
        setMessage(data.message ?? "通信エラーが発生しました。");
        setEvent({ kind: "error", at: Date.now() });
        return;
      }
      const next: { garden: WorldGarden; born: BornResult | null } = data;
      setWorld((prev) => (prev ? { ...prev, garden: next.garden } : prev));
      setMessage(null);
      setEvent({ kind: "water", at: Date.now() });
      const result = next.born;
      if (result) {
        setTimeout(() => {
          play("allCorrect");
          setBorn(result);
        }, BORN_DELAY_MS);
      }
    } finally {
      setGardenBusy(false);
    }
  }

  // 相棒・名前が変わると、並び・立ち位置・復習を出す人も変わる
  function applyCompanions(data: { companions: WorldCompanion[]; review: WorldReview }) {
    setWorld((prev) => (prev ? { ...prev, companions: data.companions, review: data.review } : prev));
  }

  // 仲間が生まれた後は、相棒・立ち位置・復習を出す人が変わるため読み直す
  async function reloadCompanions() {
    const res = await apiFetch("/api/world").catch(() => null);
    if (!res || !res.ok) return;
    const data: WorldData = await res.json();
    applyCompanions(data);
  }

  async function renameCompanion(key: string, nickname: string | null): Promise<string | null> {
    const res = await apiFetch(`/api/world/companions/${key}`, {
      method: "PATCH",
      body: JSON.stringify({ nickname }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) return data.errors?.nickname?.[0] ?? data.message ?? "通信エラーが発生しました。";
    applyCompanions(data);
    return null;
  }

  async function makePartner(key: string) {
    if (partnerBusy) return;
    setPartnerBusy(true);
    try {
      const res = await apiFetch("/api/world/partner", { method: "POST", body: JSON.stringify({ key }) }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res || !res.ok) {
        setMessage(data.message ?? "通信エラーが発生しました。");
        setEvent({ kind: "error", at: Date.now() });
        return;
      }
      applyCompanions(data);
      setMessage(null);
      play("correct");
      const partner = (data.companions as WorldCompanion[]).find((c) => c.key === key);
      if (partner) setCompanionTalk({ key, at: Date.now(), line: pickLine(partner.lines, Math.random()) });
    } finally {
      setPartnerBusy(false);
    }
  }

  function startReview() {
    router.push("/review");
  }

  // スプル以外をさわったとき。昼に座って・寝ていたら起きる(夜の眠りはスプルをタップしたときだけ起きる)
  function handleInteraction(e: { target: EventTarget }) {
    if (e.target instanceof Element && e.target.closest("[data-spru]")) return;
    const at = Date.now();
    if (mood.sleeping && !isSpruSleepTime(new Date(at))) setEvent({ kind: "woke", at });
    setLastInteractionAt(at);
  }

  function handleSpruTap() {
    if (!world) return;
    const at = Date.now();
    setLastInteractionAt(at);
    if (mood.sleeping) {
      if (isSpruSleepTime(new Date(at))) setNightWokenAt(at);
      setEvent({ kind: "woke", at });
      return;
    }
    const tap = pickSpruTap({ canSow: world.garden.can_sow, review: world.review });
    if (tap === "sow") {
      sow();
      return;
    }
    if (tap === "review") {
      setReviewCardOpen(true);
      return;
    }
    setEvent({
      kind: "tap",
      at,
      image: TAP_IMAGES[Math.floor(Math.random() * TAP_IMAGES.length)],
      hint: pickTownHint({
        bag: world.bag,
        points: world.profile.points,
        level: world.profile.level,
        shop,
        canWater: world.garden.can_water,
      }),
    });
  }

  function handleGardenTap() {
    if (!world || gardenBusy) return;
    const tap = pickGardenTap(world.garden);
    if (tap.action === "sow") sow();
    else if (tap.action === "water") water();
    else setEvent({ kind: "say", at: Date.now(), image: tap.image, line: tap.line });
  }

  function handleCompanionTap(key: string) {
    const companion = world?.companions.find((c) => c.key === key);
    if (!companion) return;
    setCompanionTalk({ key, at: Date.now(), line: pickLine(companion.lines, Math.random()) });
    setSheetKey(key);
  }

  function handleBornClose() {
    if (!born) return;
    const result = born;
    setBorn(null);
    if (result.kind === "item") {
      setWorld((prev) => (prev ? { ...prev, bag: [...prev.bag, result.world_item] } : prev));
      return;
    }
    reloadCompanions();
    setCompanionTalk({ key: result.key, at: Date.now(), line: result.lines[0] ?? "" });
    if (result.is_partner) setNaming(result);
  }

  // 画面を先に更新し、APIが失敗したら元に戻す
  async function moveItem(item: WorldItem, x: number | null, y: number | null): Promise<boolean> {
    if (!world) return false;
    const previous = world;
    const updated = { ...item, x, y };
    const others = (list: WorldItem[]) => list.filter((i) => i.id !== item.id);
    setWorld({
      ...world,
      items: x === null ? others(world.items) : [...others(world.items), updated],
      bag: x === null ? [...others(world.bag), updated] : others(world.bag),
    });

    const res = await apiFetch(`/api/world/items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ x, y }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => ({})) : {};
      setWorld(previous);
      setMessage(data.message ?? "通信エラーが発生しました。");
      setEvent({ kind: "error", at: Date.now() });
      return false;
    }
    return true;
  }

  async function placeAt(x: number, y: number) {
    if (!placingItem) return;
    const item = placingItem;
    setPlacingId(null);
    setMessage(null);
    if (await moveItem(item, x, y)) {
      play("correct");
      setPoppedItemId(item.id);
      setEvent({ kind: "placed", at: Date.now(), itemName: item.name });
    }
  }

  async function putAway(item: WorldItem) {
    setSelected(null);
    setMessage(null);
    if (await moveItem(item, null, null)) {
      setEvent({ kind: "stored", at: Date.now(), itemName: item.name });
    }
  }

  async function receiveWelcome() {
    setWelcomeBusy(true);
    try {
      const res = await apiFetch("/api/world/welcome", { method: "POST" });
      if (!res.ok) return;
      const data: { granted: boolean; points: number } = await res.json();
      setWorld((prev) => (prev ? { ...prev, welcome_available: false, profile: { ...prev.profile, points: data.points } } : prev));
      applyPartial({ points: data.points });
      setEvent({ kind: "welcome", at: Date.now() });
    } finally {
      setWelcomeBusy(false);
    }
  }

  const timeOfDay = getTimeOfDay(new Date(now));
  const season = getSeason(new Date(now));

  if (!world) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#8fd4e9] text-sm text-[#3b3226]">
        読み込み中...
      </div>
    );
  }

  const nextLocked = shop
    .filter((item) => item.type === "decoration" && item.min_level > world.profile.level)
    .sort((a, b) => a.min_level - b.min_level)[0];
  const nextUnlock = nextLocked ? `Lv.${nextLocked.min_level}で ${nextLocked.name}` : null;
  const continueHref = world.continue_stage_id ? `/quiz/${world.continue_stage_id}` : "/learn";
  const sheetCompanion = sheetKey ? (world.companions.find((c) => c.key === sheetKey) ?? null) : null;

  return (
    <div
      className="min-h-screen transition-[background] duration-700"
      style={{ background: TIME_THEME[timeOfDay].background }}
      onPointerDown={handleInteraction}
      onKeyDown={handleInteraction}
    >
      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col pb-28 text-[#3b3226]">
        <WorldHud name={sharedProfile?.name ?? ""} profile={world.profile} growth={growth} nextUnlock={nextUnlock} />

        {placingItem && <PlacementBar item={placingItem} onCancel={() => setPlacingId(null)} />}

        {message && (
          <p role="alert" className="mx-4 mt-3 rounded-xl bg-[#fdebe5] px-3 py-2 text-sm font-bold text-[#a33a22]">
            {message}
          </p>
        )}

        <p className="mx-auto mt-3 rounded-full bg-[rgba(255,250,240,0.94)] px-3 py-1 text-[12.5px] font-black shadow-[0_2px_6px_rgba(59,50,38,0.12)]">
          日本 · はじまりの町
        </p>

        <div className="relative mt-2 px-1">
          <WorldScene
            land={world.land}
            items={world.items}
            validTiles={validTiles}
            placing={placing}
            onTileTap={placeAt}
            onItemTap={setSelected}
            spru={mood}
            bloom={bloomOf(growth)}
            onSpruTap={handleSpruTap}
            timeOfDay={timeOfDay}
            poppedItemId={poppedItemId}
            garden={world.garden}
            onGardenTap={handleGardenTap}
            companions={world.companions}
            onCompanionTap={handleCompanionTap}
            companionTalk={talk}
            reviewGiver={placing ? null : reviewGiverKey(world.review)}
            quiet={isSpruSleepTime(new Date(now))}
          />
          <Ambience timeOfDay={timeOfDay} season={season} />
        </div>

        {!placingItem && (
          <Link
            href={continueHref}
            className="mx-auto mt-4 flex h-[52px] items-center gap-2 rounded-full bg-[#3b7f26] px-6 text-base font-black text-white shadow-[0_5px_0_#285a19,0_10px_18px_rgba(40,90,25,0.28)]"
          >
            <BookOpen className="h-5 w-5" aria-hidden />
            つづきから学ぶ
          </Link>
        )}
      </div>

      <BottomNav />

      {selected && (
        <ItemActionSheet
          item={selected}
          onMove={() => {
            setPlacingId(selected.id);
            setSelected(null);
          }}
          onPutAway={() => putAway(selected)}
          onClose={() => setSelected(null)}
        />
      )}

      {sheetCompanion && (
        <CompanionSheet
          companion={sheetCompanion}
          reviewCount={world.review.available && world.review.giver.key === sheetCompanion.key ? world.review.count : null}
          busy={partnerBusy}
          onStartReview={startReview}
          onMakePartner={() => makePartner(sheetCompanion.key)}
          onRename={(nickname) => renameCompanion(sheetCompanion.key, nickname)}
          onClose={() => setSheetKey(null)}
        />
      )}

      {reviewCardOpen && world.review.available && (
        <ReviewCard count={world.review.count} onStart={startReview} onClose={() => setReviewCardOpen(false)} />
      )}

      {world.welcome_available && (
        <WelcomeGift amount={WELCOME_AMOUNT} busy={welcomeBusy} onReceive={receiveWelcome} />
      )}

      {born && <BornOverlay born={born} onClose={handleBornClose} />}

      {naming && (
        <NicknameDialog
          companion={naming}
          onSubmit={async (nickname) => {
            const error = await renameCompanion(naming.key, nickname);
            if (error === null) setNaming(null);
            return error;
          }}
          onSkip={() => setNaming(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: 型・lint・テスト・ビルド**

Run: `cd frontend && npx tsc --noEmit && npx eslint src && npm test && npm run build`
Expected: エラーなし、テスト86件PASS、ビルド成功

- [ ] **Step 6: ブラウザで確認する（スマホ幅390pxとPC幅）**

以下、`$p` は `App\Models\UserProfile::where("name","町テスト")->first()`。確認の途中は `tinker --execute` で値を変え、町を読み直す。復習に出る問題が1問以上あること（Task 6の確認の続き）。

- 最初の仲間: `$p->companions()->delete(); $p->seeds()->delete(); $p->update(["partner_companion_key"=>null,"last_review_on"=>null,"last_correct_on"=>now("Asia/Tokyo")->toDateString()]); $p->seeds()->create(["result_key"=>"momo","waterings"=>2,"last_watered_on"=>now("Asia/Tokyo")->subDay()->toDateString()]);`
  - 町を開く: スプルの頭の右上に「！」が跳ねている。吹き出しは「芽に水をあげよう！」（水やりが先）
  - 畑をタップ → 水やり → お祝い「Momoが生まれた！」「お花、きれいだね」。「町でタップすると…」は出ない →「町にむかえる」→ 名前を付ける画面「相棒になってくれるって！名前をつけよう」
  - 「あいうえおかきくけ」→「決める」→「8文字までにしてね」が出て、送らない（開発者ツールのネットワークにPATCHが無い）
  - 「　モモちゃん 」→「決める」→ 画面が閉じ、Momoが道の左端 (0,3) に立ち、足元に「相棒」の札。「！」がMomoの頭の上に移り、スプルの吹き出しが「モモちゃんが復習を用意してるよ」
- 仲間のカード: Momoをタップ → 跳ねて吹き出し（名前とひとこと）、下からカード。一番上に「この前まちがえた問題、いっしょにやってみよう！（N問）」と「やってみる」、名前「モモちゃん」と「相棒」の札、「元の名前: Momo」「花・やさしさ」「♥♡♡♡♡ はじめまして ・ ハート2つまで あと20」、「名前を変える」。「相棒にする」は出ない
- 名前を変える（レビューで特に見る点4）:「あいうえおかきく」（8文字）にする → カード・吹き出し・スプルのひとことが崩れない。`/review` の見出し「あいうえおかきくからの復習」も崩れない（開いて確かめたら町へ戻る。まだ答えない）。確かめたら「モモちゃん」に戻す。空にして「決める」→「Momo」に戻る → もう一度「モモちゃん」にする
- 2人目: `$p->companions()->create(["companion_key"=>"kuru"]);` → 町を読み直す → Kuruが (3,2) に札なしで立つ。Kuruをタップ → 復習の誘いは出ない。「相棒にする」をすばやく2回押す → 送るのは1回（`partnerBusy`）。札がKuruへ移り、Kuruが (0,3)、Momoが (3,2) に入れ替わる。「！」がKuruの上に移り、スプルの吹き出しが「Kuruが復習を用意してるよ」（レビューで特に見る点5）
- 相棒から復習: Kuruのカードの「やってみる」→ `/review` の見出し「Kuruからの復習」→ 最後まで答える →「町にもどる」→「！」が消え、スプルの吹き出しがふだんのあいさつ（レビューで特に見る点3）
- 2人目からの誕生: `$p->update(["last_correct_on"=>now("Asia/Tokyo")->toDateString()]); $p->seeds()->create(["result_key"=>"piko","waterings"=>2,"last_watered_on"=>now("Asia/Tokyo")->subDay()->toDateString()]);` → 水やり → お祝いに「町でタップすると、相棒にできるよ」。「町にむかえる」の後に名前を付ける画面は出ず、相棒はKuruのまま
- スプルの復習カード: `$p->companions()->delete(); $p->update(["partner_companion_key"=>null,"last_review_on"=>null]);` → 町を読み直す →「！」がスプルの上。吹き出しが「この前の問題、いっしょに復習しよう！」。スプルをタップ →「スプルからの復習」のカード →「あとで」で閉じる → もう一度タップ →「やってみる」で `/review`（見出し「スプルからの復習」）
- 置く場所を選んでいる間（バッグから置く）: 「！」が消え、仲間とスプルが押せない
- 夜: `page.clock.install({ time: new Date(2026, 8, 27, 22, 30) })` で開くと「！」が跳ねない。動きを減らす設定（`page.emulateMedia({ reducedMotion: "reduce" })`）でも跳ねない

確認が終わったら元に戻す（Task 5で控えた値に戻し、確認で作った仲間・種を消す。クイズの回答・ステージの記録・台帳の行はB回と同じく残す）:

```bash
./vendor/bin/sail artisan tinker --execute='$p=App\Models\UserProfile::where("name","町テスト")->first(); $p->seeds()->delete(); $p->companions()->delete(); $p->update(["level"=>控えた値,"xp"=>控えた値,"hp"=>控えた値,"hp_updated_at"=>控えた値,"coins"=>控えた値,"points"=>控えた値,"bloom_base_level"=>控えた値,"last_correct_on"=>控えた値,"combo"=>控えた値,"best_combo"=>控えた値,"current_streak"=>控えた値,"best_streak"=>控えた値,"last_played_date"=>控えた値,"partner_companion_key"=>null,"last_review_on"=>null]); echo json_encode($p->fresh()->only(["level","xp","hp","coins","points","partner_companion_key","last_review_on"])), PHP_EOL;'
```

（`控えた値` はTask 5で控えたJSONの値に置き換える。null だったものは `null`、日付は `"2026-09-27"` のような文字列）

- [ ] **Step 7: コミット**

```bash
git add frontend/src/components/world/nickname-form.tsx frontend/src/components/world/nickname-dialog.tsx frontend/src/components/world/review-card.tsx frontend/src/components/world/companion-sheet.tsx frontend/src/components/world/born-overlay.tsx frontend/src/components/world/world-scene.tsx frontend/src/components/world/world-screen.tsx
git commit -m "$(cat <<'EOF'
#NNNNN: feature:町に相棒の札・復習の「！」・仲間のカードを出し、最初の仲間の名前付けと相棒の変更をつなぐ

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: ドキュメントと通しの確認

**Files:**
- Modify: `SPEC.md`、`TASKS.md`、`app/Support/ContinueStage.php`（コメント）

**Interfaces:**
- Consumes: Task 1〜7 のすべて

- [ ] **Step 1: 「つづきから学ぶ」のコメントを今に合わせる**

`app/Support/ContinueStage.php` のクラスのコメントを次にする:

```php
/**
 * 町の画面の「つづきから学ぶ」の行き先。復習は、仲間からの復習(C回、app/Support/Review.php)で行う。
 */
```

- [ ] **Step 2: SPEC.md を更新する**

- 1章 16行目の `③復習を混ぜた出題（「今日のレッスン」）` を `③復習を混ぜた出題（「今日のレッスン」。C回の「仲間からの復習」で代わりにした）` にする
- 1章 17行目の `C: 相棒・仲間の成長・仲間からの復習問題、` を ``C: 相棒・仲間の成長・仲間からの復習問題（実装済み、`docs/design/2026-09-27-spru-wave-c-design.md`）、`` にする
- 4-9 の「つづきから学ぶ」の行の `（③「今日のレッスン」ができるまでの代わり）` を `（復習はC回の「仲間からの復習」で行う）` にする
- 4-9 の `- ✅（B回）レベルの上がり方: ...` の行の次に足す:

```markdown
- ✅（2026-09-27、C回）相棒と名前: 生まれた仲間から相棒を1人選ぶ（最初の仲間は自動で相棒になり、名前を付ける画面が出る）。相棒はスプルの隣に「相棒」の札を付けて立つ。町で仲間をタップすると仲間のカード（名前・ハート・「相棒にする」「名前を変える」）。名前は1〜8文字で、同じ家族アカウントの中だけで見える（`app/Support/Garden.php`、`PATCH /api/world/companions/{key}`・`POST /api/world/partner`）
- ✅（C回）なかよし度: 相棒でいる間の正解1問で+1、仲間の復習をやりきると+5。ハートは最大5つ（20/50/100/180で増える）で、増えるたびに新しいひとことを覚える（`app/Support/Bond.php`、`config/companions.php`）
- ✅（C回）仲間からの復習: まちがえて、その後にまだ正解していない問題（答えの記録で問題ごとの最新が `answer_wrong`）を、古い順に最大5問、1日1回（日本時間）。相棒（いなければスプル）の上に「！」が出て、`/review` で解く（`app/Support/Review.php`、`GET /api/review`・`POST /api/review/complete`）
- ✅（C回）解いた直後のやり直し: ステージと復習の結果の画面から、まちがえた問題だけをもう一度解ける。練習なので記録・HP・XPなどは変わらない（回答APIの `practice: true`）。クイズ画面の出題部分は `components/quiz/quiz-session.tsx` に共通化した
```

- 4-9 の `- ⚠️ 仲間の絵は1人1枚（mascot-6）で、表情・ポーズは無い。` を `- ⚠️ 仲間の絵は1人1枚（mascot-6）で、表情・ポーズは無く、ハートが増えても絵は変わらない。` にする
- 4-9 の最後の行の `復習を混ぜた出題（③）、` を消す
- 6-1 のフロントエンドのテスト件数 `2026-09-26時点で42件` を、Step 4 で数えた件数と今日の日付に直す（例: `2026-09-27時点で86件`）

- [ ] **Step 3: TASKS.md を更新する**

- `- [ ] **C回: 相棒えらび（名前つき）、仲間ごとの成長、仲間からの復習問題**（「今日のレッスン」の代わりになる。間違えた問題は ... から探せる）` の行を次にする:

```markdown
- [x] **C回: 相棒えらび（名前つき）、相棒のなかよし度（ハート）、仲間からの復習問題（1日1回・最大5問）、解いた直後のやり直し**（2026-09-27。設計書 `docs/design/2026-09-27-spru-wave-c-design.md`、実装計画 `docs/design/2026-09-27-spru-wave-c-plan.md`。「今日のレッスン」の代わり。クイズ画面の出題部分を `components/quiz/quiz-session.tsx` に共通化）
```

- `- [ ] 仲間ごとの表情・ポーズ集ができたら、...` の行の最後に `。ハートが増えたときの絵の変化（C回は絵を変えていない）もそのときに足す` を足す
- その次に足す:

```markdown
- [ ] 名前の不適切な言葉のチェック（家族アカウントの外に仲間の名前が見えるようにするとき。C回は家族の中だけなので入れていない）
```

- [ ] **Step 4: すべてのテストとビルド**

Run: `./vendor/bin/sail artisan test`
Expected: 226件PASS

Run: `cd frontend && npx tsc --noEmit && npx eslint src && npm test && npm run build`
Expected: エラーなし、テスト86件PASS、ビルド成功

- [ ] **Step 5: 通しのブラウザ確認（スマホ幅390px）**

開発DBを戻した「町テスト」で、町を開く → 「つづきから学ぶ」でステージを1つ解く（わざと1問まちがえる）→ 結果の画面から「もう一度チャレンジ」→ 町に戻ると、スプルの上に「！」（相棒がいないため）→ スプルをタップ →「やってみる」→ 復習を最後まで →「町にもどる」→「！」が消えている。コンソールにエラーが無い。確かめたら、Task 7の最後の手順で開発DBを戻す（控えた値は同じ）

- [ ] **Step 6: コミット**

```bash
git add SPEC.md TASKS.md app/Support/ContinueStage.php
git commit -m "$(cat <<'EOF'
#NNNNN: docs:スプルのC回(相棒・なかよし度・仲間からの復習・やり直し)をSPEC/TASKSに反映

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```
