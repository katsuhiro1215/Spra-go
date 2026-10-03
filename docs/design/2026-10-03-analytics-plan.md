# 分析とOwner管理画面の充実 実装計画

> **実行する人へ:** 実行方法はネイティブ（サブエージェントは使わない決まりなので、インラインで1人が実装し、最後に自分で見直す）。テストを先に書き、失敗を見てから実装する。

**目標:** Owner管理画面に「分析」のページ（遊んだ人数・また来た割合・登録した週ごとの続き具合・どこでやめたか・まちがいの多い問題・よく使われる遊び・遊んだ時間）とCSVの書き出しを作り、日ごとの集計の表と毎日の集計、遊んだ時間の記録を足す。

**進め方:** サーバー（遊んだ時間の記録 → 日ごとの集計 → 集計コマンド → 続き具合 → 段階 → 問題と遊び → API → CSV）を先に作り、そのうえに画面（整形の関数 → 遊んだ時間の送り出し → 分析のページ）をのせる。

**技術:** Laravel 13（Pest・MySQL・Sail）、Next.js 16・React 19・TypeScript・Tailwind、Vitest（画面の計算だけ。`environment: "node"`）、recharts（新規）。

**設計書:** `docs/design/2026-10-03-analytics-design.md`

## 守ること（全タスク共通）

- 返答・ドキュメント・コミットは日本語。コミットは `#NNNNN: type:要約` と `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`。番号は **#00314 から**（計画の#00313の続き）。
- ブランチは `feature/analytics`。mainへのマージは Owner に確認してから（`git merge --no-ff`）。pushはOwnerが行う（自動の許可判定で止められるため）。
- バックエンドのテストは `./vendor/bin/sail test`（`--parallel` なし）。結果のJSONで `"tool":"pest","result"` を探す。
- `.env` は読まない・変えない・コミットしない。`migrate:fresh` は禁止（足すだけの `migrate` は可）。
- ブラウザ確認の画像は `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` の下だけに、**ファイル名を `.playwright-mcp/○○.png` のように、フォルダ名から書いて**保存し、見たら消す（相対名だけだとSmartSproutsの直下に保存される）。確認用のログインは、利用者が `test@example.com` / `password`（プロフィール 町テスト id 7）、Ownerが `owner@example.com` / `password`。確認のあとは、確認用のデータを消す（9章）。
- 画面の文は、Owner管理画面なのでふりがなは付けない。
- 画面の部品（グラフ）を書く前に、`dataviz` スキルを読み、その方針（色・凡例・軸・ライト／ダーク）に従う。
- 日付は、日本時間（`Asia/Tokyo`）の0時で区切る。データベースの時刻は世界標準時で保存されている。

## 見直しの観点（テストでは見にくい所を、最後に自分で確かめる）

1. 日本時間の0時（世界標準時の15:00）の前後で、答えと遊んだ時間が正しい日に入るか
2. 母数が0のとき、0で割って壊れず、画面に「まだデータがありません」が出るか
3. プレイヤーを消したあとも、集計の表の過去の数字が残るか
4. CSVで、`=` `+` `-` `@` で始まる文字（問題文など）が、Excelで式として動かないか。BOMで文字化けしないか
5. 遊んだ時間が、水増しされないか（画面が隠れている間・何回も連続で送られたとき・時計のずれ）

## 決めたこと（計画で確定）

- 設計書で「実装時に確かめる」とした復習は、答えの行に `stage_id` が付かないため、**クイズ（ステージ・復習の答え）を1つに数える**ことで確定した（設計書4-6に反映済み）。
- 「まちがいの多い問題」は、期間にかかわらず**全期間**で数える（期間を絞ると、7日では5回以上の問題がほとんど出ないため）。
- 「また来た割合」と「登録した週ごとの続き具合」は、期間の選択に関係なく、全プレイヤーで数える。「どこでやめたか」と「よく使われる遊び」は、選んだ期間で数える。
- `Analytics` は**インスタンスで使う**（1回のAPI呼び出しの中で、答えた日の一覧を何度も取らないように、結果をインスタンスに覚えさせるため。`static` にすると、テストの間で覚えた値が残ってしまう）。
- 登録した週の続き具合は、**始まった週は、その週のそこまでのデータで数える**（まだ始まっていない週だけ `null`）。
- User一覧のCSVに、メールアドレスは入れない（個人情報を、システムの外に持ち出さないため。画面の一覧には今までどおり出る）。
- 遊んだ時間の最初の送信は、30秒まで数える（前回が無いため）。

## ファイルの全体像

**サーバー（新規）**
- `database/migrations/2026_10_03_000003_create_profile_play_days_table.php`
- `database/migrations/2026_10_03_000004_create_analytics_daily_table.php`
- `database/migrations/2026_10_03_000005_add_answer_index_to_profile_currency_ledger_table.php`
- `app/Models/ProfilePlayDay.php`、`app/Models/AnalyticsDaily.php`
- `app/Support/PlayTime.php`、`app/Support/Analytics.php`、`app/Support/Csv.php`
- `app/Console/Commands/AnalyticsAggregateCommand.php`
- `tests/Feature/PlayTimeTest.php`、`AnalyticsDailyTest.php`、`AnalyticsAggregateCommandTest.php`、`AnalyticsRetentionTest.php`、`AnalyticsFunnelTest.php`、`AnalyticsQuestionsActivitiesTest.php`、`OwnerAnalyticsApiTest.php`、`OwnerAnalyticsExportTest.php`

**サーバー（変更）**
- `routes/api.php`（遊んだ時間・分析API・書き出し・User一覧）、`routes/console.php`（スケジュール）、`tests/Pest.php`（テスト用の補助関数）

**画面（新規）**
- `frontend/src/lib/analytics.ts`（+test）、`lib/play-time.ts`（+test）
- `frontend/src/components/app/play-time-tracker.tsx`
- `frontend/src/components/owner/analytics/`（グラフと表の部品）
- `frontend/src/app/owner/dashboard/analytics/page.tsx`

**画面（変更）**
- `frontend/src/app/layout.tsx`、`app/owner/dashboard/layout.tsx`（メニュー）、`app/owner/dashboard/users/page.tsx`、`frontend/package.json`・`package-lock.json`（recharts）

---

### タスク0: テスト用の補助関数（#00314 に含める。単独のコミットにしない）

`tests/Pest.php` の関数の並びの末尾に、次を足す。タスク1の最初のコミットに入れる。

```php
/** 答えの記録(体力の行)を、指定した時刻(世界標準時)に作る。分析のテストで使う */
function answerAt(UserProfile $profile, string $utc, bool $correct = true, ?int $questionId = null): void
{
    App\Models\ProfileCurrencyLedger::forceCreate([
        'user_profile_id' => $profile->id,
        'type' => 'hp',
        'delta' => $correct ? -1 : -2,
        'reason' => $correct ? 'answer_correct' : 'answer_wrong',
        'question_id' => $questionId,
        'created_at' => $utc,
    ]);
}

/** 家族アカウントとプレイヤーを、指定した時刻(世界標準時)に作る。ログインはしない */
function makePlayerAt(string $utc, string $name = 'プレイヤー'): UserProfile
{
    $user = User::factory()->create(['created_at' => $utc]);
    $schema = $user->schema()->create(['name' => '家族']);
    $profile = $schema->profiles()->create(['name' => $name]);
    $profile->forceFill(['created_at' => $utc])->save();

    return $profile;
}
```

---

### タスク1: 遊んだ時間の受け取り（#00314）

**ファイル**
- 新規: `database/migrations/2026_10_03_000003_create_profile_play_days_table.php`、`app/Models/ProfilePlayDay.php`、`app/Support/PlayTime.php`、`tests/Feature/PlayTimeTest.php`
- 変更: `routes/api.php`、`tests/Pest.php`（タスク0）

**渡すもの:** `PlayTime::record(UserProfile $profile, int $seconds): int`（その日の合計秒数を返す）、`POST /api/play-time`、`ProfilePlayDay`（`user_profile_id`・`played_on`・`seconds`・`last_beat_at`）。

- [ ] **手順1: 補助関数（タスク0）を足し、失敗するテストを書く**（`tests/Feature/PlayTimeTest.php`）

```php
<?php

use App\Models\ProfilePlayDay;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 遊んだ時間の記録(docs/design/2026-10-03-analytics-design.md 5章)
|--------------------------------------------------------------------------
*/

it('最初の送信は、30秒まで数える', function () {
    $this->travelTo(Carbon::parse('2026-10-10 03:00:00', 'UTC')); // 日本時間 12:00
    $profile = createActiveProfile();

    $this->postJson('/api/play-time', ['seconds' => 30])->assertOk()->assertJsonPath('seconds', 30);

    $row = ProfilePlayDay::firstOrFail();
    expect($row->user_profile_id)->toBe($profile->id)
        ->and($row->played_on->toDateString())->toBe('2026-10-10')
        ->and($row->seconds)->toBe(30);
});

it('前回から経った秒数を超えては増えない(連続して送られても水増しされない)', function () {
    $this->travelTo(Carbon::parse('2026-10-10 03:00:00', 'UTC'));
    createActiveProfile();

    $this->postJson('/api/play-time', ['seconds' => 30])->assertOk();
    $this->postJson('/api/play-time', ['seconds' => 30])->assertOk()->assertJsonPath('seconds', 30); // 0秒しか経っていない

    $this->travelTo(Carbon::parse('2026-10-10 03:00:10', 'UTC'));
    $this->postJson('/api/play-time', ['seconds' => 30])->assertOk()->assertJsonPath('seconds', 40); // 10秒だけ

    $this->travelTo(Carbon::parse('2026-10-10 03:05:10', 'UTC'));
    $this->postJson('/api/play-time', ['seconds' => 60])->assertOk()->assertJsonPath('seconds', 100); // 60秒まで
});

it('日本時間で日をまたぐと、別の行になる', function () {
    $this->travelTo(Carbon::parse('2026-10-10 14:59:30', 'UTC')); // 日本時間 23:59:30
    $profile = createActiveProfile();
    $this->postJson('/api/play-time', ['seconds' => 30])->assertOk();

    $this->travelTo(Carbon::parse('2026-10-10 15:00:30', 'UTC')); // 日本時間 翌日 0:00:30
    $this->postJson('/api/play-time', ['seconds' => 30])->assertOk()->assertJsonPath('seconds', 30);

    expect(ProfilePlayDay::where('user_profile_id', $profile->id)->orderBy('played_on')->pluck('played_on')->map->toDateString()->all())
        ->toBe(['2026-10-10', '2026-10-11']);
});

it('秒数は1〜60の整数。範囲外は422', function (mixed $seconds) {
    createActiveProfile();

    $this->postJson('/api/play-time', ['seconds' => $seconds])->assertStatus(422);

    expect(ProfilePlayDay::count())->toBe(0);
})->with([0, 61, -5, 'たくさん', null]);

it('プロフィールを選んでいないと422、ログインしていないと401', function () {
    $this->postJson('/api/play-time', ['seconds' => 30])->assertStatus(401);

    $this->actingAs(App\Models\User::factory()->create())->withHeader('Referer', 'http://localhost');
    $this->postJson('/api/play-time', ['seconds' => 30])->assertStatus(422);
});

it('1分に7回目の送信は429', function () {
    $this->travelTo(Carbon::parse('2026-10-10 03:00:00', 'UTC'));
    createActiveProfile();

    foreach (range(1, 6) as $i) {
        $this->postJson('/api/play-time', ['seconds' => 1])->assertOk();
    }

    $this->postJson('/api/play-time', ['seconds' => 1])->assertStatus(429);
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/PlayTimeTest.php`
期待: 失敗（ルートがない）。

- [ ] **手順3: 表・モデル・係・ルートを作る**

`database/migrations/2026_10_03_000003_create_profile_play_days_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_play_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->date('played_on');
            $table->unsignedInteger('seconds')->default(0);
            $table->timestamp('last_beat_at')->nullable();
            $table->timestamps();

            $table->unique(['user_profile_id', 'played_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_play_days');
    }
};
```

`app/Models/ProfilePlayDay.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** プレイヤーと1日ごとの、遊んだ時間の合計秒数(docs/design/2026-10-03-analytics-design.md 4-1) */
class ProfilePlayDay extends Model
{
    protected $fillable = ['user_profile_id', 'played_on', 'seconds', 'last_beat_at'];

    protected function casts(): array
    {
        return [
            'played_on' => 'date',
            'last_beat_at' => 'datetime',
        ];
    }
}
```

`app/Support/PlayTime.php`:

```php
<?php

namespace App\Support;

use App\Models\ProfilePlayDay;
use App\Models\UserProfile;
use Illuminate\Support\Carbon;

/**
 * 遊んだ時間の記録(docs/design/2026-10-03-analytics-design.md 5章)。プレイヤーと1日ごとの合計秒数だけを持つ。
 * 増やす秒数は、送られた秒数・前回から経った秒数・60秒のうち、いちばん小さいもの(連続して送られても、
 * 時計がずれても、実際より多くは増えない)。最初の送信は30秒まで
 */
class PlayTime
{
    private const MAX_BEAT = 60;

    private const FIRST_BEAT = 30;

    public static function record(UserProfile $profile, int $seconds): int
    {
        $now = Carbon::now();

        $row = ProfilePlayDay::query()->firstOrCreate(
            ['user_profile_id' => $profile->id, 'played_on' => Garden::today()],
            ['seconds' => 0],
        );

        $elapsed = $row->last_beat_at
            ? max(0, $now->getTimestamp() - $row->last_beat_at->getTimestamp())
            : self::FIRST_BEAT;

        $row->seconds += min($seconds, $elapsed, self::MAX_BEAT);
        $row->last_beat_at = $now;
        $row->save();

        return $row->seconds;
    }
}
```

`routes/api.php`（`/feedback` の近く。`use App\Support\PlayTime;` を use の並びに足す）:

```php
// 遊んだ時間(docs/design/2026-10-03-analytics-design.md 5章)。画面が見えていて操作があるあいだ、30秒ごとに送られる
Route::middleware(['auth:sanctum', 'throttle:6,1'])->post('/play-time', function (Request $request) {
    $data = $request->validate(['seconds' => ['required', 'integer', 'min:1', 'max:60']]);

    return ['seconds' => PlayTime::record(ActiveProfile::require($request), $data['seconds'])];
})->name('play-time.store');
```

- [ ] **手順4: 通す**

実行: `./vendor/bin/sail artisan migrate` のあと `./vendor/bin/sail test tests/Feature/PlayTimeTest.php`
期待: すべて通る。

- [ ] **手順5: コミット**

```bash
git add database/migrations/2026_10_03_000003_create_profile_play_days_table.php app/Models/ProfilePlayDay.php app/Support/PlayTime.php routes/api.php tests/Pest.php tests/Feature/PlayTimeTest.php
git commit -m "#00314: feat:遊んだ時間(プレイヤーと1日ごとの合計秒数)を記録する窓口を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク2: 日ごとの集計（物差し・集計の表・概要）（#00315）

**ファイル**
- 新規: `database/migrations/2026_10_03_000004_create_analytics_daily_table.php`、`database/migrations/2026_10_03_000005_add_answer_index_to_profile_currency_ledger_table.php`、`app/Models/AnalyticsDaily.php`、`app/Support/Analytics.php`、`tests/Feature/AnalyticsDailyTest.php`

**渡すもの（`App\Support\Analytics`、インスタンスで使う）:** `aggregateDay(string $date): array`、`daily(string $from, string $to): array`、`summary(): array`、`activeDays(): array`（プレイヤーの番号 => 答えた日の一覧。後のタスクで使う）、`today(): string`。

- [ ] **手順1: 失敗するテストを書く**（`tests/Feature/AnalyticsDailyTest.php`）

```php
<?php

use App\Models\AnalyticsDaily;
use App\Models\ProfilePlayDay;
use App\Support\Analytics;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 日ごとの集計(docs/design/2026-10-03-analytics-design.md 3章・4-2)
|--------------------------------------------------------------------------
*/

it('答えは、日本時間の0時で区切って数える(14:59 UTCは前の日、15:00 UTCは次の日)', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    answerAt($profile, '2026-10-05 14:59:00');
    answerAt($profile, '2026-10-05 15:00:00', false);

    $analytics = new Analytics;

    expect($analytics->aggregateDay('2026-10-05'))->toMatchArray(['answers' => 1, 'correct_answers' => 1, 'active_players' => 1])
        ->and($analytics->aggregateDay('2026-10-06'))->toMatchArray(['answers' => 1, 'correct_answers' => 0, 'active_players' => 1]);
});

it('1日の答え・正解・遊んだ人数を数える', function () {
    $a = makePlayerAt('2026-10-01 00:00:00', 'A');
    $b = makePlayerAt('2026-10-01 00:00:00', 'B');
    $c = makePlayerAt('2026-10-01 00:00:00', 'C');
    answerAt($a, '2026-10-05 01:00:00');
    answerAt($a, '2026-10-05 02:00:00', false);
    answerAt($b, '2026-10-05 03:00:00');
    answerAt($c, '2026-10-04 03:00:00'); // 別の日

    expect((new Analytics)->aggregateDay('2026-10-05'))
        ->toMatchArray(['answers' => 3, 'correct_answers' => 2, 'active_players' => 2]);
});

it('新しいアカウント・プレイヤーを、作った日(日本時間)で数える', function () {
    makePlayerAt('2026-10-05 14:59:00'); // 日本時間 10/5 23:59
    makePlayerAt('2026-10-05 15:00:00'); // 日本時間 10/6 0:00

    expect((new Analytics)->aggregateDay('2026-10-05'))->toMatchArray(['new_accounts' => 1, 'new_players' => 1])
        ->and((new Analytics)->aggregateDay('2026-10-06'))->toMatchArray(['new_accounts' => 1, 'new_players' => 1]);
});

it('開いた人数は10秒以上。遊んだ時間は全員の秒数の合計', function () {
    $a = makePlayerAt('2026-10-01 00:00:00');
    $b = makePlayerAt('2026-10-01 00:00:00');
    ProfilePlayDay::create(['user_profile_id' => $a->id, 'played_on' => '2026-10-05', 'seconds' => 9]);
    ProfilePlayDay::create(['user_profile_id' => $b->id, 'played_on' => '2026-10-05', 'seconds' => 600]);

    expect((new Analytics)->aggregateDay('2026-10-05'))->toMatchArray(['opened_players' => 1, 'play_seconds' => 609]);
});

it('解いた直後のやり直し(練習)は、記録されないので数えない', function () {
    $this->travelTo(Carbon::parse('2026-10-05 03:00:00', 'UTC'));
    createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])->assertOk();

    expect((new Analytics)->aggregateDay('2026-10-05'))->toMatchArray(['answers' => 0, 'active_players' => 0]);
});

it('日ごとの一覧は、表の行を使い、無い日はそのつど数えて補い、古い順に全日を並べる', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    answerAt($profile, '2026-10-07 03:00:00'); // 表に無い日(そのつど数える)
    AnalyticsDaily::create([
        'date' => '2026-10-06', 'new_accounts' => 0, 'new_players' => 0, 'active_players' => 7, 'opened_players' => 7,
        'answers' => 70, 'correct_answers' => 35, 'play_seconds' => 3600,
    ]); // 表の行(実際の記録とは違う数字にして、表を読んでいることを確かめる)

    $rows = (new Analytics)->daily('2026-10-05', '2026-10-07');

    expect(array_column($rows, 'date'))->toBe(['2026-10-05', '2026-10-06', '2026-10-07'])
        ->and($rows[0])->toMatchArray(['answers' => 0, 'accuracy' => null, 'play_minutes' => 0])
        ->and($rows[1])->toMatchArray(['active_players' => 7, 'answers' => 70, 'accuracy' => 0.5, 'play_minutes' => 60])
        ->and($rows[2])->toMatchArray(['active_players' => 1, 'answers' => 1, 'accuracy' => 1.0]);
});

it('概要は、今日・7日・30日に遊んだ人数と、今日の答えと遊んだ時間を出す', function () {
    $this->travelTo(Carbon::parse('2026-10-10 03:00:00', 'UTC')); // 日本時間 10/10 12:00
    $today = makePlayerAt('2026-09-01 00:00:00');
    $week = makePlayerAt('2026-09-01 00:00:00');
    $month = makePlayerAt('2026-09-01 00:00:00');
    $old = makePlayerAt('2026-09-01 00:00:00');
    answerAt($today, '2026-10-10 01:00:00');
    answerAt($today, '2026-10-10 02:00:00', false);
    answerAt($week, '2026-10-04 03:00:00');   // 7日前(10/4)は、直近7日(10/4〜10/10)に入る
    answerAt($month, '2026-09-11 03:00:00');  // 直近30日(9/11〜10/10)に入る
    answerAt($old, '2026-09-10 03:00:00');    // 30日より前
    ProfilePlayDay::create(['user_profile_id' => $today->id, 'played_on' => '2026-10-10', 'seconds' => 3150]);

    expect((new Analytics)->summary())->toMatchArray([
        'accounts' => 4, 'players' => 4,
        'active_today' => 1, 'active_7d' => 2, 'active_30d' => 3,
        'answers_today' => 2, 'play_minutes_today' => 53,
    ]);
});

it('プレイヤーを消しても、集計の表の過去の数字は残る', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    answerAt($profile, '2026-10-05 03:00:00');
    $row = (new Analytics)->aggregateDay('2026-10-05');
    AnalyticsDaily::create(['date' => '2026-10-05'] + array_intersect_key($row, array_flip([
        'new_accounts', 'new_players', 'active_players', 'opened_players', 'answers', 'correct_answers', 'play_seconds',
    ])));

    $profile->delete();

    expect((new Analytics)->daily('2026-10-05', '2026-10-05')[0])->toMatchArray(['answers' => 1, 'active_players' => 1]);
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/AnalyticsDailyTest.php`
期待: 失敗（`Analytics` がない）。

- [ ] **手順3: 表・モデル・索引を作る**

`database/migrations/2026_10_03_000004_create_analytics_daily_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analytics_daily', function (Blueprint $table) {
            $table->date('date')->primary();
            $table->unsignedInteger('new_accounts')->default(0);
            $table->unsignedInteger('new_players')->default(0);
            $table->unsignedInteger('active_players')->default(0);
            $table->unsignedInteger('opened_players')->default(0);
            $table->unsignedInteger('answers')->default(0);
            $table->unsignedInteger('correct_answers')->default(0);
            $table->unsignedBigInteger('play_seconds')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_daily');
    }
};
```

`database/migrations/2026_10_03_000005_add_answer_index_to_profile_currency_ledger_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** 答えの行(type = hp・reason が answer_*)を日時で速く探す(docs/design/2026-10-03-analytics-design.md 4-1)。足すだけで、データは変わらない */
    public function up(): void
    {
        Schema::table('profile_currency_ledger', function (Blueprint $table) {
            $table->index(['type', 'reason', 'created_at'], 'ledger_type_reason_created_index');
        });
    }

    public function down(): void
    {
        Schema::table('profile_currency_ledger', function (Blueprint $table) {
            $table->dropIndex('ledger_type_reason_created_index');
        });
    }
};
```

`app/Models/AnalyticsDaily.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** 日ごとの集計(docs/design/2026-10-03-analytics-design.md 4-1)。プレイヤーを消しても過去の数字が残る */
class AnalyticsDaily extends Model
{
    protected $table = 'analytics_daily';

    protected $primaryKey = 'date';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'date', 'new_accounts', 'new_players', 'active_players', 'opened_players', 'answers', 'correct_answers', 'play_seconds',
    ];

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d'];
    }
}
```

- [ ] **手順4: 集計の係を作る**（`app/Support/Analytics.php`。後のタスクで、メソッドを足していく）

```php
<?php

namespace App\Support;

use App\Models\AnalyticsDaily;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * 分析の数え方(docs/design/2026-10-03-analytics-design.md 3章・4-2)。
 * 「遊んだ(答えた)」は、答えの体力の行(type = hp、reason が answer_correct か answer_wrong)。1日の区切りは日本時間の0時。
 * 1回のAPI呼び出しの中で、答えた日の一覧を何度も取らないよう、結果をインスタンスに覚える
 */
class Analytics
{
    public const TIMEZONE = 'Asia/Tokyo';

    /** @var array<int, list<string>>|null */
    private ?array $activeDays = null;

    /** 日本時間の日付を取るSQLの式 */
    public static function jst(string $column): string
    {
        return "DATE(CONVERT_TZ({$column}, '+00:00', '+09:00'))";
    }

    /** 日本時間の今日(Y-m-d) */
    public function today(): string
    {
        return Garden::today();
    }

    /** 日本時間の1日を、世界標準時の「始まり」と「次の日の始まり」(DBの文字)にする */
    public static function utcRange(string $from, ?string $to = null): array
    {
        $start = Carbon::parse($from, self::TIMEZONE)->startOfDay()->utc();
        $end = Carbon::parse($to ?? $from, self::TIMEZONE)->startOfDay()->addDay()->utc();

        return [$start->toDateTimeString(), $end->toDateTimeString()];
    }

    /** 答えの行(体力)。解いた直後のやり直しは記録されないので入らない */
    public function answers(): Builder
    {
        return DB::table('profile_currency_ledger')
            ->where('type', 'hp')
            ->whereIn('reason', ['answer_correct', 'answer_wrong']);
    }

    /**
     * プレイヤーの番号 => 答えた日(日本時間・古い順)の一覧。
     * 人数が増えて重くなったら、SQLでの集計や集計の表に切り替える
     *
     * @return array<int, list<string>>
     */
    public function activeDays(): array
    {
        return $this->activeDays ??= $this->answers()
            ->selectRaw('user_profile_id, '.self::jst('created_at').' as d')
            ->distinct()
            ->orderBy('d')
            ->get()
            ->groupBy('user_profile_id')
            ->map(fn ($rows) => $rows->pluck('d')->all())
            ->all();
    }

    /** 1日分を数える(日本時間の日付) */
    public function aggregateDay(string $date): array
    {
        [$start, $end] = self::utcRange($date);

        $answers = $this->answers()->where('created_at', '>=', $start)->where('created_at', '<', $end)
            ->selectRaw("count(*) as answers, coalesce(sum(reason = 'answer_correct'), 0) as correct, count(distinct user_profile_id) as active")
            ->first();

        $play = DB::table('profile_play_days')->where('played_on', $date)
            ->selectRaw('coalesce(sum(seconds >= 10), 0) as opened, coalesce(sum(seconds), 0) as seconds')
            ->first();

        return [
            'new_accounts' => User::query()->where('created_at', '>=', $start)->where('created_at', '<', $end)->count(),
            'new_players' => UserProfile::query()->where('created_at', '>=', $start)->where('created_at', '<', $end)->count(),
            'active_players' => (int) $answers->active,
            'opened_players' => (int) $play->opened,
            'answers' => (int) $answers->answers,
            'correct_answers' => (int) $answers->correct,
            'play_seconds' => (int) $play->seconds,
        ];
    }

    /**
     * 日ごとの一覧(古い順に全日)。集計の表に行がある日は表を使い、無い日(今日など)は、そのつど数えて補う(保存はしない)
     *
     * @return list<array<string, mixed>>
     */
    public function daily(string $from, string $to): array
    {
        $saved = AnalyticsDaily::query()->whereBetween('date', [$from, $to])->get()->keyBy(fn ($row) => $row->date->toDateString());

        $rows = [];
        for ($day = Carbon::parse($from); $day->toDateString() <= $to; $day->addDay()) {
            $date = $day->toDateString();
            $values = $saved->has($date)
                ? $saved[$date]->only(['new_accounts', 'new_players', 'active_players', 'opened_players', 'answers', 'correct_answers', 'play_seconds'])
                : $this->aggregateDay($date);

            $rows[] = ['date' => $date] + $values + [
                'accuracy' => $values['answers'] > 0 ? round($values['correct_answers'] / $values['answers'], 4) : null,
                'play_minutes' => (int) round($values['play_seconds'] / 60),
            ];
        }

        return $rows;
    }

    /** 概要のカード */
    public function summary(): array
    {
        $today = $this->today();
        $since = fn (int $days) => self::utcRange(Carbon::parse($today)->subDays($days - 1)->toDateString(), $today);
        $active = fn (int $days) => $this->answers()
            ->where('created_at', '>=', $since($days)[0])->where('created_at', '<', $since($days)[1])
            ->distinct()->count('user_profile_id');
        $todayRow = $this->aggregateDay($today);

        return [
            'accounts' => User::query()->count(),
            'players' => UserProfile::query()->count(),
            'active_today' => $active(1),
            'active_7d' => $active(7),
            'active_30d' => $active(30),
            'answers_today' => $todayRow['answers'],
            'play_minutes_today' => (int) round($todayRow['play_seconds'] / 60),
        ];
    }
}
```

- [ ] **手順5: 通す**

実行: `./vendor/bin/sail artisan migrate` のあと `./vendor/bin/sail test tests/Feature/AnalyticsDailyTest.php`
期待: すべて通る。通らなければ、`CONVERT_TZ` の結果が日付の文字になっているか、`utcRange` の境界を確かめる。

- [ ] **手順6: コミット**

```bash
git add database/migrations/2026_10_03_000004_create_analytics_daily_table.php database/migrations/2026_10_03_000005_add_answer_index_to_profile_currency_ledger_table.php app/Models/AnalyticsDaily.php app/Support/Analytics.php tests/Feature/AnalyticsDailyTest.php
git commit -m "#00315: feat:日ごとの集計(答え・遊んだ人数・遊んだ時間)と概要を数える係と、集計の表・答えの索引を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク3: 集計コマンドとスケジュール（#00316）

**ファイル**
- 新規: `app/Console/Commands/AnalyticsAggregateCommand.php`、`tests/Feature/AnalyticsAggregateCommandTest.php`
- 変更: `routes/console.php`

**使うもの:** `Analytics::aggregateDay`、`AnalyticsDaily`。

- [ ] **手順1: 失敗するテストを書く**

```php
<?php

use App\Models\AnalyticsDaily;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| analytics:aggregate(docs/design/2026-10-03-analytics-design.md 4-3)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-10 03:00:00', 'UTC')); // 日本時間 10/10 12:00
});

it('引数なしで、前の日(日本時間)を集計して保存する', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    answerAt($profile, '2026-10-09 03:00:00');
    answerAt($profile, '2026-10-10 01:00:00'); // 今日の分は保存しない

    $this->artisan('analytics:aggregate')->assertSuccessful();

    expect(AnalyticsDaily::count())->toBe(1)
        ->and(AnalyticsDaily::first()->only(['answers', 'active_players']))->toBe(['answers' => 1, 'active_players' => 1])
        ->and(AnalyticsDaily::first()->date->toDateString())->toBe('2026-10-09');
});

it('2回実行しても行は増えず、数字が更新される', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    answerAt($profile, '2026-10-09 03:00:00');
    $this->artisan('analytics:aggregate')->assertSuccessful();

    answerAt($profile, '2026-10-09 04:00:00');
    $this->artisan('analytics:aggregate')->assertSuccessful();

    expect(AnalyticsDaily::count())->toBe(1)->and(AnalyticsDaily::first()->answers)->toBe(2);
});

it('--date で、その日だけを集計する', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    answerAt($profile, '2026-10-05 03:00:00');

    $this->artisan('analytics:aggregate', ['--date' => '2026-10-05'])->assertSuccessful();

    expect(AnalyticsDaily::count())->toBe(1)->and(AnalyticsDaily::first()->date->toDateString())->toBe('2026-10-05');
});

it('--from で、その日から昨日までを集計する', function () {
    $this->artisan('analytics:aggregate', ['--from' => '2026-10-07'])->assertSuccessful();

    expect(AnalyticsDaily::orderBy('date')->get()->map(fn ($row) => $row->date->toDateString())->all())
        ->toBe(['2026-10-07', '2026-10-08', '2026-10-09']);
});

it('--from earliest で、データのいちばん古い日から昨日まで集計する', function () {
    makePlayerAt('2026-10-07 00:00:00'); // 日本時間 10/7 9:00 に登録

    $this->artisan('analytics:aggregate', ['--from' => 'earliest'])->assertSuccessful();

    expect(AnalyticsDaily::orderBy('date')->first()->date->toDateString())->toBe('2026-10-07')
        ->and(AnalyticsDaily::count())->toBe(3);
});

it('日付がおかしいと失敗し、何も保存しない', function () {
    $this->artisan('analytics:aggregate', ['--date' => 'きのう'])->assertFailed();

    expect(AnalyticsDaily::count())->toBe(0);
});

it('毎日、日本時間の0時10分に動くように、スケジュールされている', function () {
    $this->artisan('schedule:list')->assertSuccessful(); // routes/console.php を読み込ませる

    $event = collect(app(Illuminate\Console\Scheduling\Schedule::class)->events())
        ->first(fn ($event) => str_contains($event->command, 'analytics:aggregate'));

    expect($event)->not->toBeNull()
        ->and($event->expression)->toBe('10 0 * * *')
        ->and($event->timezone)->toBe('Asia/Tokyo');
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/AnalyticsAggregateCommandTest.php`
期待: 失敗（コマンドがない）。

- [ ] **手順3: コマンドとスケジュールを作る**

`app/Console/Commands/AnalyticsAggregateCommand.php`:

```php
<?php

namespace App\Console\Commands;

use App\Models\AnalyticsDaily;
use App\Models\User;
use App\Support\Analytics;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/** 日ごとの集計を作る(docs/design/2026-10-03-analytics-design.md 4-3)。引数なしで、前の日(日本時間) */
class AnalyticsAggregateCommand extends Command
{
    protected $signature = 'analytics:aggregate {--date= : この日だけ集計する(Y-m-d、日本時間)} {--from= : この日から昨日まで集計する(Y-m-d、または earliest でデータのいちばん古い日から)}';

    protected $description = '日ごとの分析の数字を集計して、集計の表に保存する';

    public function handle(Analytics $analytics): int
    {
        $yesterday = Carbon::parse($analytics->today())->subDay()->toDateString();

        try {
            $dates = $this->dates($analytics, $yesterday);
        } catch (\InvalidArgumentException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        foreach ($dates as $date) {
            AnalyticsDaily::query()->updateOrCreate(['date' => $date], $analytics->aggregateDay($date));
        }

        $this->info(count($dates).'日分を集計しました。');

        return self::SUCCESS;
    }

    /** @return list<string> */
    private function dates(Analytics $analytics, string $yesterday): array
    {
        if ($this->option('date')) {
            return [$this->parse($this->option('date'))];
        }

        if ($from = $this->option('from')) {
            $start = $from === 'earliest' ? $this->earliest($analytics) : $this->parse($from);
            $dates = [];
            for ($day = Carbon::parse($start); $day->toDateString() <= $yesterday; $day->addDay()) {
                $dates[] = $day->toDateString();
            }

            return $dates;
        }

        return [$yesterday];
    }

    private function parse(string $value): string
    {
        try {
            $date = Carbon::createFromFormat('!Y-m-d', $value, Analytics::TIMEZONE);
        } catch (\Throwable) {
            throw new \InvalidArgumentException("日付が正しくありません: {$value}（Y-m-d で書いてください）");
        }

        if ($date === false || $date->format('Y-m-d') !== $value) {
            throw new \InvalidArgumentException("日付が正しくありません: {$value}（Y-m-d で書いてください）");
        }

        return $value;
    }

    /** データのいちばん古い日(日本時間)。答えか登録のうち古いほう。データが無ければ昨日 */
    private function earliest(Analytics $analytics): string
    {
        $firstAnswer = $analytics->answers()->min('created_at');
        $firstUser = User::query()->min('created_at');
        $first = collect([$firstAnswer, $firstUser])->filter()->min();

        return $first
            ? Carbon::parse($first, 'UTC')->setTimezone(Analytics::TIMEZONE)->toDateString()
            : Carbon::parse($analytics->today())->subDay()->toDateString();
    }
}
```

`routes/console.php` に追記:

```php
use Illuminate\Support\Facades\Schedule;

// 毎日、日本時間の0時10分に、前の日の分析を集計する。本番では、サーバーの cron で `php artisan schedule:run` を毎分動かす
Schedule::command('analytics:aggregate')->dailyAt('00:10')->timezone('Asia/Tokyo');
```

- [ ] **手順4: 通す**

実行: `./vendor/bin/sail test tests/Feature/AnalyticsAggregateCommandTest.php`
期待: すべて通る。

- [ ] **手順5: コミット**

```bash
git add app/Console/Commands/AnalyticsAggregateCommand.php routes/console.php tests/Feature/AnalyticsAggregateCommandTest.php
git commit -m "#00316: feat:日ごとの集計コマンド(analytics:aggregate)と、毎日0時10分のスケジュールを足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク4: また来た割合と、登録した週ごとの続き具合（#00317）

**ファイル**
- 新規: `tests/Feature/AnalyticsRetentionTest.php`
- 変更: `app/Support/Analytics.php`

**渡すもの:** `retention(): array`（`d1`・`d3`・`d7` の `rate`（0〜1または `null`）と `base`）、`cohorts(int $weeks = 8): array`（`week`・`players`・`weeks`（5つ。割合または `null`））。

- [ ] **手順1: 失敗するテストを書く**

```php
<?php

use App\Support\Analytics;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| また来た割合・登録した週ごとの続き具合(docs/design/2026-10-03-analytics-design.md 4-4)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-14 03:00:00', 'UTC')); // 日本時間 10/14(水) 12:00
});

it('1日後・3日後・7日後に、また遊んだ人の割合を出す。その日数が経っていない人は母数に入れない', function () {
    $stay = makePlayerAt('2026-10-01 00:00:00', '続けた人');
    $drop = makePlayerAt('2026-10-01 00:00:00', 'やめた人');
    $new = makePlayerAt('2026-10-13 00:00:00', '昨日の人');
    foreach (['2026-10-05', '2026-10-06', '2026-10-08', '2026-10-12'] as $date) {
        answerAt($stay, "{$date} 03:00:00");
    }
    answerAt($drop, '2026-10-05 03:00:00');
    answerAt($new, '2026-10-13 03:00:00'); // 初日が10/13 → 1日後(10/14)の母数に入る。3日後・7日後はまだ

    $retention = (new Analytics)->retention();

    expect($retention['d1'])->toBe(['rate' => 0.3333, 'base' => 3]) // 続けた人(10/6に来た)だけ
        ->and($retention['d3'])->toBe(['rate' => 0.5, 'base' => 2])  // 続けた人(10/8)・やめた人
        ->and($retention['d7'])->toBe(['rate' => 0.5, 'base' => 2]); // 続けた人(10/12)・やめた人
});

it('答えたことがない人は、母数に入れない', function () {
    makePlayerAt('2026-10-01 00:00:00');

    expect((new Analytics)->retention())->toBe([
        'd1' => ['rate' => null, 'base' => 0],
        'd3' => ['rate' => null, 'base' => 0],
        'd7' => ['rate' => null, 'base' => 0],
    ]);
});

it('登録した週(日本時間の月曜始まり)ごとに、その後の週に遊んだ人の割合を出す', function () {
    // 今週は 10/12(月)〜。先週は 10/5(月)〜
    $a = makePlayerAt('2026-10-06 00:00:00', 'A'); // 先週(10/6 火)に登録
    $b = makePlayerAt('2026-10-07 00:00:00', 'B'); // 先週に登録
    $c = makePlayerAt('2026-10-13 00:00:00', 'C'); // 今週に登録
    answerAt($a, '2026-10-06 03:00:00'); // A: 登録した週に遊ぶ
    answerAt($a, '2026-10-13 03:00:00'); // A: 1週後(今週)にも遊ぶ
    answerAt($b, '2026-10-07 03:00:00'); // B: 登録した週だけ
    // C: 答えていない

    $cohorts = (new Analytics)->cohorts(8);

    expect($cohorts)->toHaveCount(2)
        ->and($cohorts[0])->toBe(['week' => '2026-10-05', 'players' => 2, 'weeks' => [1.0, 0.5, null, null, null]])
        ->and($cohorts[1])->toBe(['week' => '2026-10-12', 'players' => 1, 'weeks' => [0.0, null, null, null, null]]);
});

it('週の区切りは日本時間(日曜 15:00 UTC は月曜の0時)', function () {
    $player = makePlayerAt('2026-10-11 15:00:00'); // 日本時間 10/12(月) 0:00 → 今週
    answerAt($player, '2026-10-12 03:00:00');

    expect((new Analytics)->cohorts(8)[0]['week'])->toBe('2026-10-12');
});

it('古い登録の週は、指定した週数より前を出さない', function () {
    makePlayerAt('2026-07-01 00:00:00');

    expect((new Analytics)->cohorts(8))->toBe([]);
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/AnalyticsRetentionTest.php`
期待: 失敗（メソッドがない）。

- [ ] **手順3: 実装する**（`Analytics.php` にメソッドを足す）

```php
    /**
     * 1日後・3日後・7日後に、また答えたプレイヤーの割合。初めて答えた日から、その日数が経ったプレイヤーだけを母数にする。
     * 期間の選択には関係なく、全プレイヤーで数える
     *
     * @return array<string, array{rate: ?float, base: int}>
     */
    public function retention(): array
    {
        $today = $this->today();
        $result = [];

        foreach ([1, 3, 7] as $n) {
            $base = 0;
            $hit = 0;

            foreach ($this->activeDays() as $days) {
                $target = Carbon::parse($days[0])->addDays($n)->toDateString();
                if ($target > $today) {
                    continue;
                }
                $base++;
                $hit += in_array($target, $days, true) ? 1 : 0;
            }

            $result["d{$n}"] = ['rate' => $base > 0 ? round($hit / $base, 4) : null, 'base' => $base];
        }

        return $result;
    }

    /**
     * 登録した週(プレイヤーを作った週。日本時間の月曜始まり)ごとの続き具合。weeks は、登録した週・1週後〜4週後に、
     * そのプレイヤーのうち遊んだ人の割合。まだ始まっていない週は null(始まった週は、そこまでのデータで数える)。
     * 答えたことのないプレイヤーも、人数に入れる
     *
     * @return list<array{week: string, players: int, weeks: list<?float>}>
     */
    public function cohorts(int $weeks = 8): array
    {
        $thisWeek = Carbon::now(self::TIMEZONE)->startOfWeek(Carbon::MONDAY);
        $firstWeek = $thisWeek->copy()->subWeeks($weeks - 1);
        $days = $this->activeDays();

        $byWeek = DB::table('user_profiles')
            ->where('created_at', '>=', $firstWeek->copy()->utc()->toDateTimeString())
            ->get(['id', 'created_at'])
            ->groupBy(fn ($player) => Carbon::parse($player->created_at, 'UTC')->setTimezone(self::TIMEZONE)->startOfWeek(Carbon::MONDAY)->toDateString());

        $result = [];
        foreach ($byWeek->sortKeys() as $week => $players) {
            $cohortStart = Carbon::parse($week, self::TIMEZONE);
            $rates = [];

            foreach (range(0, 4) as $k) {
                $start = $cohortStart->copy()->addWeeks($k);
                if ($start->greaterThan($thisWeek)) {
                    $rates[] = null;

                    continue;
                }
                [$from, $to] = [$start->toDateString(), $start->copy()->addDays(6)->toDateString()];
                $hit = $players->filter(
                    fn ($player) => collect($days[$player->id] ?? [])->contains(fn ($d) => $d >= $from && $d <= $to),
                )->count();
                $rates[] = round($hit / $players->count(), 4);
            }

            $result[] = ['week' => $week, 'players' => $players->count(), 'weeks' => $rates];
        }

        return $result;
    }
```

- [ ] **手順4: 通す**

実行: `./vendor/bin/sail test tests/Feature/AnalyticsRetentionTest.php tests/Feature/AnalyticsDailyTest.php`
期待: すべて通る。

- [ ] **手順5: コミット**

```bash
git add app/Support/Analytics.php tests/Feature/AnalyticsRetentionTest.php
git commit -m "#00317: feat:また来た割合(1・3・7日後)と、登録した週ごとの続き具合を数える" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク5: どこでやめたか（段階と離れた人の内訳）（#00318）

**ファイル**
- 新規: `tests/Feature/AnalyticsFunnelTest.php`
- 変更: `app/Support/Analytics.php`

**渡すもの:** `funnel(string $from): array`（`key`・`label`・`count`・`rate`）、`dropoff(string $from): array`（`key`・`label`・`count`）。`$from` は日本時間の日付（期間の最初の日）。

- [ ] **手順1: 失敗するテストを書く**

```php
<?php

use App\Models\Category;
use App\Models\ProfileStageProgress;
use App\Models\Stage;
use App\Support\Analytics;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| どこでやめたか(docs/design/2026-10-03-analytics-design.md 4-5)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-20 03:00:00', 'UTC')); // 日本時間 10/20
});

function clearStage(App\Models\UserProfile $profile): void
{
    $stage = Stage::create([
        'category_id' => Category::query()->firstOrCreate(['name' => '段階のテスト'])->id,
        'difficulty' => '初級',
        'stage_number' => Stage::count() + 1,
    ]);
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $stage->id, 'cleared_at' => now()]);
}

it('段階は、前の段階を全部満たした人だけが次に進む', function () {
    $none = makePlayerAt('2026-10-10 00:00:00', '作っただけ');
    $answered = makePlayerAt('2026-10-10 00:00:00', '答えただけ');
    $cleared = makePlayerAt('2026-10-10 00:00:00', 'クリアした');
    $deep = makePlayerAt('2026-10-10 00:00:00', '深く進んだ');
    $skip = makePlayerAt('2026-10-10 00:00:00', '種だけまいた'); // 答えていないので、種まきは段階に入らない

    answerAt($answered, '2026-10-11 03:00:00');
    answerAt($cleared, '2026-10-11 03:00:00');
    clearStage($cleared);
    foreach (['2026-10-11', '2026-10-12', '2026-10-13'] as $date) {
        answerAt($deep, "{$date} 03:00:00");
    }
    clearStage($deep);
    $deep->update(['level' => 5]);
    $deep->seeds()->create(['result_key' => 'lumi']);
    $deep->trips()->create(['destination' => 'id', 'arrived_at' => now()]);
    $skip->seeds()->create(['result_key' => 'momo']);

    $funnel = collect((new Analytics)->funnel('2026-10-01'))->keyBy('key');

    expect($funnel['account']['count'])->toBe(5)->and($funnel['account']['rate'])->toBeNull()
        ->and($funnel['player']['count'])->toBe(5)->and($funnel['player']['rate'])->toBeNull()
        ->and($funnel['first_answer'])->toMatchArray(['count' => 3, 'rate' => 0.6])
        ->and($funnel['first_clear'])->toMatchArray(['count' => 2, 'rate' => 0.6667])
        ->and($funnel['three_days'])->toMatchArray(['count' => 1, 'rate' => 0.5])
        ->and($funnel['level5'])->toMatchArray(['count' => 1, 'rate' => 1.0])
        ->and($funnel['first_seed'])->toMatchArray(['count' => 1, 'rate' => 1.0])
        ->and($funnel['first_trip'])->toMatchArray(['count' => 1, 'rate' => 1.0]);
});

it('期間より前に作ったプレイヤー・アカウントは数えない', function () {
    makePlayerAt('2026-09-01 00:00:00');
    makePlayerAt('2026-10-10 00:00:00');

    $funnel = collect((new Analytics)->funnel('2026-10-01'))->keyBy('key');

    expect($funnel['account']['count'])->toBe(1)->and($funnel['player']['count'])->toBe(1);
});

it('前の段階の人数が0のとき、割合は null', function () {
    makePlayerAt('2026-10-10 00:00:00');

    $funnel = collect((new Analytics)->funnel('2026-10-01'))->keyBy('key');

    expect($funnel['first_answer'])->toMatchArray(['count' => 0, 'rate' => 0.0])
        ->and($funnel['first_clear'])->toMatchArray(['count' => 0, 'rate' => null]);
});

it('離れた人(最後に答えたのが7日以上前)が、最後にどこまで進んだかを数える', function () {
    $never = makePlayerAt('2026-10-10 00:00:00', '答えずに離れた');
    $quit = makePlayerAt('2026-10-10 00:00:00', '1問で離れた');
    $deep = makePlayerAt('2026-10-10 00:00:00', 'クリアして離れた');
    $active = makePlayerAt('2026-10-10 00:00:00', 'まだ遊んでいる');
    $fresh = makePlayerAt('2026-10-18 00:00:00', 'さっき作った'); // 作ってから7日経っていない

    answerAt($quit, '2026-10-11 03:00:00');
    answerAt($deep, '2026-10-11 03:00:00');
    clearStage($deep);
    answerAt($active, '2026-10-19 03:00:00'); // 昨日も遊んだ

    $dropoff = collect((new Analytics)->dropoff('2026-10-01'))->keyBy('key');

    expect($dropoff['player']['count'])->toBe(1)       // 答えずに離れた
        ->and($dropoff['first_answer']['count'])->toBe(1)
        ->and($dropoff['first_clear']['count'])->toBe(1)
        ->and($dropoff['three_days']['count'])->toBe(0)
        ->and(collect((new Analytics)->dropoff('2026-10-01'))->pluck('key')->all())
        ->toBe(['player', 'first_answer', 'first_clear', 'three_days', 'level5', 'first_seed', 'first_trip']);
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/AnalyticsFunnelTest.php`
期待: 失敗（メソッドがない）。

- [ ] **手順3: 実装する**（`Analytics.php` にメソッドを足す）

```php
    /** 段階(2〜8)。1 のアカウント登録は、段階の人数ではなくアカウントの数 */
    private const STEPS = [
        2 => ['player', 'プレイヤーを作る'],
        3 => ['first_answer', '最初の1問'],
        4 => ['first_clear', '最初のステージクリア'],
        5 => ['three_days', '3日以上遊ぶ'],
        6 => ['level5', 'レベル5'],
        7 => ['first_seed', '最初の種まき'],
        8 => ['first_trip', '最初の旅'],
    ];

    /**
     * 期間内($from 以降)に作ったプレイヤーの、到達した段階(2〜8)。前の段階を全部満たした人だけが次に進む。
     *
     * @return array<int, array{step: int, created_on: string, last_day: ?string}> プレイヤーの番号 => …
     */
    private function playerProgress(string $from): array
    {
        $since = self::utcRange($from)[0];
        $players = DB::table('user_profiles')->where('created_at', '>=', $since)->get(['id', 'level', 'created_at']);

        if ($players->isEmpty()) {
            return [];
        }

        $ids = $players->pluck('id');
        $cleared = DB::table('profile_stage_progress')->whereIn('user_profile_id', $ids)->whereNotNull('cleared_at')->pluck('user_profile_id')->flip();
        $seeded = DB::table('profile_seeds')->whereIn('user_profile_id', $ids)->pluck('user_profile_id')->flip();
        $traveled = DB::table('profile_trips')->whereIn('user_profile_id', $ids)->pluck('user_profile_id')->flip();
        $allDays = $this->activeDays();

        return $players->mapWithKeys(function ($player) use ($cleared, $seeded, $traveled, $allDays) {
            $days = $allDays[$player->id] ?? [];
            $conditions = [
                3 => $days !== [],
                4 => $cleared->has($player->id),
                5 => count($days) >= 3,
                6 => $player->level >= 5,
                7 => $seeded->has($player->id),
                8 => $traveled->has($player->id),
            ];

            $step = 2;
            foreach ($conditions as $number => $met) {
                if (! $met) {
                    break;
                }
                $step = $number;
            }

            return [$player->id => [
                'step' => $step,
                'created_on' => Carbon::parse($player->created_at, 'UTC')->setTimezone(self::TIMEZONE)->toDateString(),
                'last_day' => $days === [] ? null : end($days),
            ]];
        })->all();
    }

    /**
     * どこでやめたか。期間内に作ったアカウントとプレイヤーについて、段階ごとの人数と、前の段階からの割合
     * (アカウントとプレイヤーの数は割合を出さない)
     *
     * @return list<array{key: string, label: string, count: int, rate: ?float}>
     */
    public function funnel(string $from): array
    {
        $progress = collect($this->playerProgress($from));
        $accounts = User::query()->where('created_at', '>=', self::utcRange($from)[0])->count();

        $rows = [['key' => 'account', 'label' => 'アカウント登録', 'count' => $accounts, 'rate' => null]];
        $previous = null;

        foreach (self::STEPS as $number => [$key, $label]) {
            $count = $progress->where('step', '>=', $number)->count();
            $rows[] = [
                'key' => $key,
                'label' => $label,
                'count' => $count,
                'rate' => $number === 2 || $previous === 0 ? null : round($count / $previous, 4),
            ];
            $previous = $count;
        }

        return $rows;
    }

    /**
     * 離れた人(最後に答えた日が7日以上前。答えたことがなければ、プレイヤーを作って7日以上経った人)が、
     * 最後にどの段階まで進んだか
     *
     * @return list<array{key: string, label: string, count: int}>
     */
    public function dropoff(string $from): array
    {
        $limit = Carbon::parse($this->today())->subDays(7)->toDateString();

        $lapsed = collect($this->playerProgress($from))
            ->filter(fn ($player) => ($player['last_day'] ?? $player['created_on']) <= $limit);

        return collect(self::STEPS)->map(fn ($step, $number) => [
            'key' => $step[0],
            'label' => $step[1],
            'count' => $lapsed->where('step', $number)->count(),
        ])->values()->all();
    }
```

- [ ] **手順4: 通す**

実行: `./vendor/bin/sail test tests/Feature/AnalyticsFunnelTest.php`
期待: すべて通る。`funnel` の割合のテストで、2番目の人（段階4で 2人・段階3で 3人 → 0.6667）の丸めを確かめる。

- [ ] **手順5: コミット**

```bash
git add app/Support/Analytics.php tests/Feature/AnalyticsFunnelTest.php
git commit -m "#00318: feat:どこでやめたか(段階ごとの人数と、離れた人が最後に進んだ段階)を数える" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク6: まちがいの多い問題・よく使われる遊び・ご意見の件数（#00319）

**ファイル**
- 新規: `tests/Feature/AnalyticsQuestionsActivitiesTest.php`
- 変更: `app/Support/Analytics.php`

**渡すもの:** `hardQuestions(int $limit = 20, int $minAnswers = 5): array`、`activities(string $from, string $to): array`（`key`・`label`・`players`・`count`（なしは `null`））、`feedbackCounts(): array`（`new`・`read`・`done`）。

- [ ] **手順1: 失敗するテストを書く**

```php
<?php

use App\Models\Feedback;
use App\Models\ProfileGreeting;
use App\Models\User;
use App\Support\Analytics;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| まちがいの多い問題・よく使われる遊び(docs/design/2026-10-03-analytics-design.md 4-4・4-6)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-20 03:00:00', 'UTC')); // 日本時間 10/20
});

function answersFor(App\Models\UserProfile $profile, int $questionId, int $correct, int $wrong): void
{
    for ($i = 0; $i < $correct; $i++) {
        answerAt($profile, '2026-10-15 03:00:00', true, $questionId);
    }
    for ($i = 0; $i < $wrong; $i++) {
        answerAt($profile, '2026-10-15 03:00:00', false, $questionId);
    }
}

it('まちがいの多い問題を、正解率の低い順に出す。5回未満は出さない', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    [$hard] = createQuestionWithChoices();
    [$easy] = createQuestionWithChoices();
    [$few] = createQuestionWithChoices();
    answersFor($profile, $hard->id, 1, 5);  // 6回・正解率 1/6
    answersFor($profile, $easy->id, 5, 0);  // 5回・正解率 1
    answersFor($profile, $few->id, 0, 4);   // 4回(出さない)

    $rows = (new Analytics)->hardQuestions();

    expect(array_column($rows, 'question_id'))->toBe([$hard->id, $easy->id])
        ->and($rows[0])->toMatchArray(['answers' => 6, 'accuracy' => 0.1667, 'reports' => 0])
        ->and($rows[0]['prompt'])->toBe('テスト問題');
});

it('「へん」の報告の数を並べる', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    [$question] = createQuestionWithChoices();
    answersFor($profile, $question->id, 0, 5);
    $userId = User::factory()->create()->id;
    Feedback::create(['user_id' => $userId, 'user_profile_id' => $profile->id, 'kind' => 'question_report', 'question_id' => $question->id, 'reason' => 'other']);
    Feedback::create(['user_id' => $userId, 'kind' => 'question_report', 'question_id' => $question->id, 'reason' => 'other']);
    Feedback::create(['user_id' => $userId, 'kind' => 'bug', 'body' => '別の種類']);

    expect((new Analytics)->hardQuestions()[0]['reports'])->toBe(2);
});

it('削除された問題は、まちがいの多い問題に出さない', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    [$question] = createQuestionWithChoices();
    answersFor($profile, $question->id, 0, 6);
    $question->delete();

    expect((new Analytics)->hardQuestions())->toBe([]);
});

it('件数の上限(20件)で切る', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    foreach (range(1, 22) as $i) {
        [$question] = createQuestionWithChoices();
        answersFor($profile, $question->id, 0, 5);
    }

    expect(count((new Analytics)->hardQuestions()))->toBe(20);
});

it('よく使われる遊びを、期間内の人数と回数で数える', function () {
    $a = makePlayerAt('2026-10-01 00:00:00', 'A');
    $b = makePlayerAt('2026-10-01 00:00:00', 'B');
    answerAt($a, '2026-10-15 03:00:00');
    answerAt($a, '2026-10-15 04:00:00', false);
    answerAt($b, '2026-10-16 03:00:00');
    answerAt($b, '2026-09-01 03:00:00'); // 期間外
    $a->update(['last_review_on' => '2026-10-15']);
    $a->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => [1], 'finished_at' => '2026-10-15 03:00:00', 'played_on' => '2026-10-15', 'answered_count' => 1, 'correct_count' => 1, 'score' => 1, 'best_combo' => 1]);
    $a->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => [1], 'finished_at' => null, 'score' => 0, 'best_combo' => 0]); // 終えていない
    $b->seeds()->create(['result_key' => 'lumi', 'last_watered_on' => '2026-10-16']);
    $a->trips()->create(['destination' => 'id', 'arrived_at' => '2026-10-15 03:00:00']);
    $a->errands()->create(['errand_on' => '2026-10-15', 'slot' => 1, 'kind' => 'x', 'target' => 1, 'giver' => 'spru', 'claimed_at' => '2026-10-15 03:00:00']);
    ProfileGreeting::create(['from_profile_id' => $a->id, 'to_profile_id' => $b->id, 'stamp' => 'hi', 'greeted_on' => '2026-10-15']);

    $activities = collect((new Analytics)->activities('2026-10-10', '2026-10-20'))->keyBy('key');

    expect($activities['quiz'])->toMatchArray(['players' => 2, 'count' => 3])
        ->and($activities['review'])->toMatchArray(['players' => 1, 'count' => null])
        ->and($activities['catch'])->toMatchArray(['players' => 1, 'count' => 1])
        ->and($activities['water'])->toMatchArray(['players' => 1, 'count' => null])
        ->and($activities['trip'])->toMatchArray(['players' => 1, 'count' => 1])
        ->and($activities['errand'])->toMatchArray(['players' => 1, 'count' => 1])
        ->and($activities['greeting'])->toMatchArray(['players' => 1, 'count' => 1]);
});

it('ステージクリアを、期間内の人数と回数で数える', function () {
    $a = makePlayerAt('2026-10-01 00:00:00');
    $category = App\Models\Category::create(['name' => '遊びのテスト']);
    foreach ([1, 2] as $n) {
        $stage = App\Models\Stage::create(['category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => $n]);
        App\Models\ProfileStageProgress::create(['user_profile_id' => $a->id, 'stage_id' => $stage->id, 'cleared_at' => '2026-10-15 03:00:00']);
    }

    expect(collect((new Analytics)->activities('2026-10-10', '2026-10-20'))->keyBy('key')['clear'])->toMatchArray(['players' => 1, 'count' => 2]);
});

it('ご意見の件数を、状態ごとに出す(無い状態は0)', function () {
    $userId = User::factory()->create()->id;
    Feedback::create(['user_id' => $userId, 'kind' => 'bug', 'body' => 'a']);
    Feedback::create(['user_id' => $userId, 'kind' => 'bug', 'body' => 'b', 'status' => 'done']);

    expect((new Analytics)->feedbackCounts())->toBe(['new' => 1, 'read' => 0, 'done' => 1]);
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/AnalyticsQuestionsActivitiesTest.php`
期待: 失敗（メソッドがない）。

- [ ] **手順3: 実装する**（`Analytics.php` にメソッドを足す。`use App\Models\Feedback;` を足す）

```php
    /**
     * まちがいの多い問題。期間にかかわらず全期間で、$minAnswers 回以上答えられた問題を、正解率の低い順に $limit 件。
     * 削除された問題は出さない
     *
     * @return list<array{question_id: int, prompt: string, answers: int, accuracy: float, reports: int}>
     */
    public function hardQuestions(int $limit = 20, int $minAnswers = 5): array
    {
        $rows = $this->answers()
            ->join('questions', 'questions.id', '=', 'profile_currency_ledger.question_id')
            ->groupBy('questions.id', 'questions.prompt')
            ->havingRaw('count(*) >= ?', [$minAnswers])
            ->orderByRaw("sum(profile_currency_ledger.reason = 'answer_correct') / count(*) asc")
            ->orderByDesc(DB::raw('count(*)'))
            ->limit($limit)
            ->get([
                'questions.id as question_id',
                'questions.prompt',
                DB::raw('count(*) as answers'),
                DB::raw("sum(profile_currency_ledger.reason = 'answer_correct') as correct"),
            ]);

        $reports = Feedback::query()
            ->where('kind', Feedback::KIND_QUESTION_REPORT)
            ->whereIn('question_id', $rows->pluck('question_id'))
            ->groupBy('question_id')
            ->selectRaw('question_id, count(*) as total')
            ->pluck('total', 'question_id');

        return $rows->map(fn ($row) => [
            'question_id' => (int) $row->question_id,
            'prompt' => $row->prompt,
            'answers' => (int) $row->answers,
            'accuracy' => round($row->correct / $row->answers, 4),
            'reports' => (int) ($reports[$row->question_id] ?? 0),
        ])->all();
    }

    /**
     * よく使われる遊び(期間内。日本時間の日付 $from〜$to)。回数を持たない遊び(復習・水やり)は count が null。
     * 「クイズ」は、ステージと復習の答え(答えの行にステージの番号が付かないため、分けずに数える)
     *
     * @return list<array{key: string, label: string, players: int, count: ?int}>
     */
    public function activities(string $from, string $to): array
    {
        [$start, $end] = self::utcRange($from, $to);
        $inRange = fn (Builder $query, string $column) => $query->where($column, '>=', $start)->where($column, '<', $end);
        $between = fn (Builder $query, string $column) => $query->whereBetween($column, [$from, $to]);

        $quiz = $inRange($this->answers(), 'created_at');
        $clear = $inRange(DB::table('profile_stage_progress')->whereNotNull('cleared_at'), 'cleared_at');
        $review = $between(DB::table('user_profiles')->whereNotNull('last_review_on'), 'last_review_on');
        $catch = $between(DB::table('profile_game_plays')->where('game', 'catch')->whereNotNull('finished_at'), 'played_on');
        $water = $between(DB::table('profile_seeds')->whereNotNull('last_watered_on'), 'last_watered_on');
        $trip = $inRange(DB::table('profile_trips'), 'arrived_at');
        $errand = $inRange(DB::table('profile_errands')->whereNotNull('claimed_at'), 'claimed_at');
        $greeting = $between(DB::table('profile_greetings'), 'greeted_on');

        $row = fn (string $key, string $label, Builder $query, string $playerColumn, bool $hasCount = true) => [
            'key' => $key,
            'label' => $label,
            'players' => (clone $query)->distinct()->count($playerColumn),
            'count' => $hasCount ? (clone $query)->count() : null,
        ];

        return [
            $row('quiz', 'クイズ(ステージ・復習の答え)', $quiz, 'user_profile_id'),
            $row('clear', 'ステージクリア', $clear, 'user_profile_id'),
            $row('review', '復習をやりきった', $review, 'id', false),
            $row('catch', 'スプルキャッチ', $catch, 'user_profile_id'),
            $row('water', '水やり', $water, 'user_profile_id', false),
            $row('trip', '旅', $trip, 'user_profile_id'),
            $row('errand', 'おつかい', $errand, 'user_profile_id'),
            $row('greeting', 'あいさつ', $greeting, 'from_profile_id'),
        ];
    }

    /** ご意見の件数(状態ごと。無い状態は0) */
    public function feedbackCounts(): array
    {
        $counts = Feedback::query()->groupBy('status')->selectRaw('status, count(*) as total')->pluck('total', 'status');

        return collect(Feedback::STATUSES)->mapWithKeys(fn ($status) => [$status => (int) ($counts[$status] ?? 0)])->all();
    }
```

- [ ] **手順4: 通す**

実行: `./vendor/bin/sail test tests/Feature/AnalyticsQuestionsActivitiesTest.php`
期待: すべて通る。通らないときは、`orderByRaw` の割り算と、`profile_errands` の必須列（`errand_on`・`kind`・`giver` 以外に必須があれば足す）を確かめる。

- [ ] **手順5: コミット**

```bash
git add app/Support/Analytics.php tests/Feature/AnalyticsQuestionsActivitiesTest.php
git commit -m "#00319: feat:まちがいの多い問題・よく使われる遊び・ご意見の件数を数える" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク7: 分析のAPIとUser一覧の項目（#00320）

**ファイル**
- 新規: `tests/Feature/OwnerAnalyticsApiTest.php`
- 変更: `routes/api.php`、`app/Support/Analytics.php`

**渡すもの:** `GET /api/owner/analytics?days=14`（4-4の形）、`Analytics::userStats(): Collection`（ユーザーの番号 => `players`・`last_played_on`・`answers`・`play_minutes`）、`GET /api/owner/users` の追加項目（`registered_on`・`players`・`last_played_on`・`answers`・`play_minutes`）。

- [ ] **手順1: 失敗するテストを書く**

```php
<?php

use App\Models\Owner;
use App\Models\ProfilePlayDay;
use App\Models\User;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 分析のAPI(docs/design/2026-10-03-analytics-design.md 4-4)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-20 03:00:00', 'UTC')); // 日本時間 10/20
});

it('Owner以外は見られない', function () {
    $this->getJson('/api/owner/analytics')->assertStatus(401);

    $this->actingAs(User::factory()->create())->getJson('/api/owner/analytics')->assertStatus(401);
});

it('分析の7つの塊と、ご意見の件数を返す', function () {
    $owner = Owner::factory()->create();
    $profile = makePlayerAt('2026-10-15 00:00:00');
    answerAt($profile, '2026-10-19 03:00:00');
    answerAt($profile, '2026-10-20 01:00:00', false);

    $response = $this->actingAs($owner, 'owner')->getJson('/api/owner/analytics?days=7')->assertOk();

    expect(array_keys($response->json()))->toBe(['days', 'summary', 'daily', 'retention', 'cohorts', 'funnel', 'dropoff', 'hard_questions', 'activities', 'feedback'])
        ->and($response->json('days'))->toBe(7)
        ->and($response->json('daily'))->toHaveCount(7)
        ->and($response->json('daily.6.date'))->toBe('2026-10-20')
        ->and($response->json('daily.6.answers'))->toBe(1)
        ->and($response->json('summary.active_today'))->toBe(1)
        ->and($response->json('feedback'))->toBe(['new' => 0, 'read' => 0, 'done' => 0]);
});

it('期間は 7・14・30・90 のどれか。それ以外は14', function (mixed $days, int $expected) {
    $owner = Owner::factory()->create();

    $response = $this->actingAs($owner, 'owner')->getJson('/api/owner/analytics'.($days === null ? '' : "?days={$days}"))->assertOk();

    expect($response->json('days'))->toBe($expected)->and($response->json('daily'))->toHaveCount($expected);
})->with([[7, 7], [30, 30], [90, 90], [null, 14], [5, 14], ['abc', 14], [365, 14]]);

it('データが何も無くても、割合は null になり、壊れない', function () {
    $owner = Owner::factory()->create();

    $response = $this->actingAs($owner, 'owner')->getJson('/api/owner/analytics')->assertOk();

    expect($response->json('retention.d1'))->toBe(['rate' => null, 'base' => 0])
        ->and($response->json('cohorts'))->toBe([])
        ->and($response->json('hard_questions'))->toBe([])
        ->and($response->json('daily.0.accuracy'))->toBeNull()
        ->and($response->json('funnel.0.rate'))->toBeNull();
});

it('User一覧に、登録日・プレイヤー数・最後に遊んだ日・解いた問題数・遊んだ時間を足し、今までの項目は残す', function () {
    $owner = Owner::factory()->create();
    $a = makePlayerAt('2026-10-14 15:00:00', 'A'); // 日本時間 10/15 0:00 に登録
    $a2 = $a->schema->profiles()->create(['name' => 'A2']);
    $quiet = makePlayerAt('2026-10-14 00:00:00', '遊んでいない');
    answerAt($a, '2026-10-16 03:00:00');
    answerAt($a2, '2026-10-18 03:00:00');
    answerAt($a2, '2026-10-18 04:00:00', false);
    ProfilePlayDay::create(['user_profile_id' => $a->id, 'played_on' => '2026-10-16', 'seconds' => 300]);
    ProfilePlayDay::create(['user_profile_id' => $a2->id, 'played_on' => '2026-10-18', 'seconds' => 360]);

    $rows = collect($this->actingAs($owner, 'owner')->getJson('/api/owner/users')->assertOk()->json())->keyBy('name');
    $userA = $rows[$a->schema->user->name];

    expect($userA)->toHaveKeys(['id', 'name', 'email', 'email_verified_at', 'created_at'])
        ->and($userA)->toMatchArray(['registered_on' => '2026-10-15', 'players' => 2, 'last_played_on' => '2026-10-18', 'answers' => 3, 'play_minutes' => 11])
        ->and($rows[$quiet->schema->user->name])->toMatchArray(['players' => 1, 'last_played_on' => null, 'answers' => 0, 'play_minutes' => 0]);
});
```

このテストでは、`UserProfile` から `schema`・`schema->user` をたどる（`UserProfile::schema()`・`UserSchema::user()` を確認済み）。ユーザー名は `User::factory()` が作るので、同名が出るとテストが不安定になる。その場合は `keyBy` を `id` に直す。

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/OwnerAnalyticsApiTest.php`
期待: 失敗（ルートがない・項目がない）。

- [ ] **手順3: ユーザーごとの数字を足す**（`Analytics.php` にメソッドを足す）

```php
    /**
     * ユーザー(アカウント)ごとの数字。プレイヤー数・最後に答えた日・解いた問題数・遊んだ時間(分)
     *
     * @return \Illuminate\Support\Collection<int, array{players: int, last_played_on: ?string, answers: int, play_minutes: int}>
     */
    public function userStats(): \Illuminate\Support\Collection
    {
        $players = DB::table('user_profiles as p')->join('user_schemas as s', 's.id', '=', 'p.user_schema_id')
            ->groupBy('s.user_id')->selectRaw('s.user_id, count(*) as total')->pluck('total', 'user_id');

        $answers = $this->answers()
            ->join('user_profiles as p', 'p.id', '=', 'profile_currency_ledger.user_profile_id')
            ->join('user_schemas as s', 's.id', '=', 'p.user_schema_id')
            ->groupBy('s.user_id')
            ->selectRaw('s.user_id, count(*) as total, max('.self::jst('profile_currency_ledger.created_at').') as last_day')
            ->get()->keyBy('user_id');

        $seconds = DB::table('profile_play_days as d')
            ->join('user_profiles as p', 'p.id', '=', 'd.user_profile_id')
            ->join('user_schemas as s', 's.id', '=', 'p.user_schema_id')
            ->groupBy('s.user_id')->selectRaw('s.user_id, sum(d.seconds) as total')->pluck('total', 'user_id');

        return User::query()->pluck('id')->mapWithKeys(fn ($id) => [$id => [
            'players' => (int) ($players[$id] ?? 0),
            'last_played_on' => $answers[$id]->last_day ?? null,
            'answers' => (int) ($answers[$id]->total ?? 0),
            'play_minutes' => (int) round(($seconds[$id] ?? 0) / 60),
        ]]);
    }
```

- [ ] **手順4: APIを作る**（`routes/api.php`。`owner/users` を置き換え、分析のルートを足す。`use App\Support\Analytics;` を足す）

```php
Route::middleware(['auth:owner'])->get('/owner/analytics', function (Request $request) {
    $days = in_array((int) $request->query('days'), [7, 14, 30, 90], true) ? (int) $request->query('days') : 14;
    $analytics = new Analytics;
    $today = $analytics->today();
    $from = Carbon::parse($today)->subDays($days - 1)->toDateString();

    return [
        'days' => $days,
        'summary' => $analytics->summary(),
        'daily' => $analytics->daily($from, $today),
        'retention' => $analytics->retention(),
        'cohorts' => $analytics->cohorts(8),
        'funnel' => $analytics->funnel($from),
        'dropoff' => $analytics->dropoff($from),
        'hard_questions' => $analytics->hardQuestions(),
        'activities' => $analytics->activities($from, $today),
        'feedback' => $analytics->feedbackCounts(),
    ];
})->name('owner.analytics');

Route::middleware(['auth:owner'])->get('/owner/users', function () {
    $stats = (new Analytics)->userStats();

    return User::query()->latest()->get()->map(fn (User $user) => array_merge($user->toArray(), [
        'registered_on' => $user->created_at->copy()->setTimezone(Analytics::TIMEZONE)->toDateString(),
    ], $stats[$user->id]));
})->name('owner.users');
```

`Carbon` の use（`Illuminate\Support\Carbon`）が `routes/api.php` に無ければ足す。

- [ ] **手順5: 通す**

実行: `./vendor/bin/sail test tests/Feature/OwnerAnalyticsApiTest.php`
期待: すべて通る。

- [ ] **手順6: コミット**

```bash
git add app/Support/Analytics.php routes/api.php tests/Feature/OwnerAnalyticsApiTest.php
git commit -m "#00320: feat:Owner用の分析API(期間・概要・日ごと・続き具合・段階・問題・遊び)とUser一覧の項目を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク8: CSVの書き出し（#00321）

**ファイル**
- 新規: `app/Support/Csv.php`、`tests/Feature/OwnerAnalyticsExportTest.php`
- 変更: `routes/api.php`

**渡すもの:** `Csv::make(array $header, iterable $rows): string`（先頭にBOM、式として動かない文字の無害化、ダブルクォート・改行のエスケープ）、`GET /api/owner/analytics/export/{kind}`（`daily`・`cohorts`・`hard-questions`・`users`）。

- [ ] **手順1: 失敗するテストを書く**

```php
<?php

use App\Models\Owner;
use App\Models\User;
use App\Support\Csv;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| CSVの書き出し(docs/design/2026-10-03-analytics-design.md 4-4・6-3)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-20 03:00:00', 'UTC'));
});

it('CSVは、先頭にBOMを付け、改行・ダブルクォート・カンマをエスケープする', function () {
    $csv = Csv::make(['名前', 'メモ'], [['山田', "1行目\n2行目"], ['"引用"', 'a,b']]);

    expect(str_starts_with($csv, "\xEF\xBB\xBF"))->toBeTrue()
        ->and($csv)->toContain("名前,メモ\r\n")
        ->and($csv)->toContain("山田,\"1行目\n2行目\"\r\n")
        ->and($csv)->toContain("\"\"\"引用\"\"\",\"a,b\"\r\n");
});

it('= + - @ で始まる文字は、Excelで式として動かないように、先頭に印を付ける', function (string $value) {
    expect(Csv::make(['x'], [[$value]]))->toContain("'{$value}");
})->with(['=1+1', '+81', '-2', '@SUM(A1)', "\t=1", "\r=1"]);

it('数字や普通の文字には、印を付けない。負の数字の列も、そのまま', function () {
    $csv = Csv::make(['x'], [[12], [0.5], ['こんにちは'], [null]]);

    expect($csv)->toContain("\r\n12\r\n")->toContain("0.5\r\n")->toContain("こんにちは\r\n")->not->toContain("'");
});

it('Owner以外は書き出せない', function () {
    $this->getJson('/api/owner/analytics/export/daily')->assertStatus(401);
});

it('日ごとのCSVを書き出す(ヘッダー・BOM・種類)', function () {
    $owner = Owner::factory()->create();
    $profile = makePlayerAt('2026-10-15 00:00:00');
    answerAt($profile, '2026-10-19 03:00:00');

    $response = $this->actingAs($owner, 'owner')->get('/api/owner/analytics/export/daily?days=7')->assertOk();

    $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    expect(str_starts_with($response->getContent(), "\xEF\xBB\xBF"))->toBeTrue()
        ->and($response->getContent())->toContain('日付,新規アカウント,新規プレイヤー,開いた人数,遊んだ人数,解いた問題数,正解数,正解率,遊んだ時間(分)')
        ->and($response->getContent())->toContain('2026-10-19,0,0,0,1,1,1,1,0')
        ->and(substr_count($response->getContent(), "\r\n"))->toBe(8); // ヘッダー+7日
});

it('登録した週ごと・まちがいの多い問題・Userの書き出し', function () {
    $owner = Owner::factory()->create();
    $profile = makePlayerAt('2026-10-15 00:00:00');
    [$question] = createQuestionWithChoices();
    $question->update(['prompt' => '=HYPERLINK("http://example.com")']);
    foreach (range(1, 5) as $i) {
        answerAt($profile, '2026-10-19 03:00:00', false, $question->id);
    }

    $cohorts = $this->actingAs($owner, 'owner')->get('/api/owner/analytics/export/cohorts')->assertOk()->getContent();
    $hard = $this->actingAs($owner, 'owner')->get('/api/owner/analytics/export/hard-questions')->assertOk()->getContent();
    $users = $this->actingAs($owner, 'owner')->get('/api/owner/analytics/export/users')->assertOk()->getContent();

    expect($cohorts)->toContain('登録した週,人数,登録した週,1週後,2週後,3週後,4週後')
        ->and($hard)->toContain('問題番号,問題文,回答数,正解率,へん報告数')
        ->and($hard)->toContain("\"'=HYPERLINK(\"\"http://example.com\"\")\"")
        ->and($users)->toContain('ID,名前,登録日,メール確認,プレイヤー数,最後に遊んだ日,解いた問題数,遊んだ時間(分)')
        ->and($users)->not->toContain('@'); // メールアドレスは書き出さない
});

it('知らない種類は404', function () {
    $owner = Owner::factory()->create();

    $this->actingAs($owner, 'owner')->get('/api/owner/analytics/export/secrets')->assertNotFound();
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/OwnerAnalyticsExportTest.php`
期待: 失敗。

- [ ] **手順3: CSVの係とルートを作る**

`app/Support/Csv.php`:

```php
<?php

namespace App\Support;

/**
 * CSVを作る(docs/design/2026-10-03-analytics-design.md 6-3)。先頭にBOMを付けて、Excelで文字化けしないようにする。
 * `=` `+` `-` `@`・タブ・改行で始まる文字は、Excelで式として動かないように、先頭に `'` を付ける。数字はそのまま
 */
class Csv
{
    /**
     * @param  list<string>  $header
     * @param  iterable<list<mixed>>  $rows
     */
    public static function make(array $header, iterable $rows): string
    {
        $stream = fopen('php://temp', 'r+');
        fwrite($stream, "\xEF\xBB\xBF");

        foreach ([$header, ...$rows] as $row) {
            fputcsv($stream, array_map(self::cell(...), $row), ',', '"', '\\', "\r\n");
        }

        rewind($stream);

        return stream_get_contents($stream);
    }

    private static function cell(mixed $value): string|int|float
    {
        if ($value === null) {
            return '';
        }
        if (is_int($value) || is_float($value)) {
            return $value;
        }

        $text = (string) $value;

        return preg_match('/^[=+\-@\t\r]/u', $text) ? "'".$text : $text;
    }
}
```

`routes/api.php`（分析APIの近く。`use App\Support\Csv;` を足す）:

```php
Route::middleware(['auth:owner'])->get('/owner/analytics/export/{kind}', function (Request $request, string $kind) {
    abort_unless(in_array($kind, ['daily', 'cohorts', 'hard-questions', 'users'], true), 404);

    $analytics = new Analytics;
    $today = $analytics->today();

    $csv = match ($kind) {
        'daily' => (function () use ($request, $analytics, $today) {
            $days = in_array((int) $request->query('days'), [7, 14, 30, 90], true) ? (int) $request->query('days') : 14;
            $rows = $analytics->daily(Carbon::parse($today)->subDays($days - 1)->toDateString(), $today);

            return Csv::make(
                ['日付', '新規アカウント', '新規プレイヤー', '開いた人数', '遊んだ人数', '解いた問題数', '正解数', '正解率', '遊んだ時間(分)'],
                array_map(fn ($r) => [$r['date'], $r['new_accounts'], $r['new_players'], $r['opened_players'], $r['active_players'], $r['answers'], $r['correct_answers'], $r['accuracy'], $r['play_minutes']], $rows),
            );
        })(),
        'cohorts' => Csv::make(
            ['登録した週', '人数', '登録した週', '1週後', '2週後', '3週後', '4週後'],
            array_map(fn ($c) => [$c['week'], $c['players'], ...$c['weeks']], $analytics->cohorts(8)),
        ),
        'hard-questions' => Csv::make(
            ['問題番号', '問題文', '回答数', '正解率', 'へん報告数'],
            array_map(fn ($q) => [$q['question_id'], $q['prompt'], $q['answers'], $q['accuracy'], $q['reports']], $analytics->hardQuestions()),
        ),
        'users' => (function () use ($analytics) {
            $stats = $analytics->userStats();

            return Csv::make(
                ['ID', '名前', '登録日', 'メール確認', 'プレイヤー数', '最後に遊んだ日', '解いた問題数', '遊んだ時間(分)'],
                User::query()->latest()->get()->map(fn (User $user) => [
                    $user->id, $user->name,
                    $user->created_at->copy()->setTimezone(Analytics::TIMEZONE)->toDateString(),
                    $user->email_verified_at ? '確認済み' : '未確認',
                    $stats[$user->id]['players'], $stats[$user->id]['last_played_on'], $stats[$user->id]['answers'], $stats[$user->id]['play_minutes'],
                ])->all(),
            );
        })(),
    };

    return response($csv, 200, ['Content-Type' => 'text/csv; charset=UTF-8']);
})->name('owner.analytics.export');
```

- [ ] **手順4: 通す。サーバー全体も通す**

実行: `./vendor/bin/sail test tests/Feature/OwnerAnalyticsExportTest.php` のあと `./vendor/bin/sail test`
期待: すべて通る。通らないときは、`fputcsv` の `eol` 引数が使えるか（PHP 8.1以降）と、`daily` の `accuracy` が `null` のとき空の欄になるかを確かめる。

- [ ] **手順5: コミット**

```bash
git add app/Support/Csv.php routes/api.php tests/Feature/OwnerAnalyticsExportTest.php
git commit -m "#00321: feat:分析とUser一覧をCSVで書き出す(BOM・式として動かない無害化・メールは入れない)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク9: 画面の計算（整形・遊んだ時間の判断）と、送り出しの部品（#00322）

**ファイル**
- 新規: `frontend/src/lib/analytics.ts`、`frontend/src/lib/analytics.test.ts`、`frontend/src/lib/play-time.ts`、`frontend/src/lib/play-time.test.ts`、`frontend/src/components/app/play-time-tracker.tsx`
- 変更: `frontend/src/app/layout.tsx`

**渡すもの（`lib/analytics.ts`）:** 型 `AnalyticsData`（4-4の形）、`formatRate(rate: number | null): string`、`formatCount(value: number | null): string`、`formatMinutes(minutes: number): string`、`formatDay(date: string): string`（`10/3`）、`cohortLevel(rate: number | null): 0 | 1 | 2 | 3 | 4`（色の濃さの段階。null は 0）、`exportFileName(kind: string, today: string): string`。**（`lib/play-time.ts`）:** `shouldSendBeat(input): boolean`、`BEAT_SECONDS = 30`、`IDLE_LIMIT_MS = 60_000`。

- [ ] **手順1: 失敗するテストを書く**

`analytics.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { cohortLevel, exportFileName, formatCount, formatDay, formatMinutes, formatRate } from "./analytics";

describe("formatRate", () => {
  it("0〜1の割合を、整数の%にする。null は「—」", () => {
    expect(formatRate(0.7333)).toBe("73%");
    expect(formatRate(1)).toBe("100%");
    expect(formatRate(0)).toBe("0%");
    expect(formatRate(0.005)).toBe("1%");
    expect(formatRate(null)).toBe("—");
  });
});

describe("formatCount", () => {
  it("数は桁区切り。null(回数を持たない遊び)は「—」", () => {
    expect(formatCount(1234)).toBe("1,234");
    expect(formatCount(0)).toBe("0");
    expect(formatCount(null)).toBe("—");
  });
});

describe("formatMinutes", () => {
  it("60分未満は「分」、以上は「時間分」", () => {
    expect(formatMinutes(0)).toBe("0分");
    expect(formatMinutes(52)).toBe("52分");
    expect(formatMinutes(60)).toBe("1時間");
    expect(formatMinutes(65)).toBe("1時間5分");
  });
});

describe("formatDay", () => {
  it("Y-m-d を「月/日」にする(0を付けない)", () => {
    expect(formatDay("2026-10-03")).toBe("10/3");
    expect(formatDay("2026-01-15")).toBe("1/15");
  });
});

describe("cohortLevel", () => {
  it("割合を、色の濃さ(0〜4)の段階にする。null は 0", () => {
    expect(cohortLevel(null)).toBe(0);
    expect(cohortLevel(0)).toBe(1);
    expect(cohortLevel(0.24)).toBe(1);
    expect(cohortLevel(0.25)).toBe(2);
    expect(cohortLevel(0.5)).toBe(3);
    expect(cohortLevel(0.75)).toBe(4);
    expect(cohortLevel(1)).toBe(4);
  });
});

describe("exportFileName", () => {
  it("種類と日付を入れた名前にする", () => {
    expect(exportFileName("daily", "2026-10-03")).toBe("spra-analytics-daily-2026-10-03.csv");
    expect(exportFileName("hard-questions", "2026-10-03")).toBe("spra-analytics-hard-questions-2026-10-03.csv");
  });
});
```

`play-time.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { IDLE_LIMIT_MS, shouldSendBeat } from "./play-time";

const base = { hasProfile: true, visible: true, lastActivityAt: 1_000_000, now: 1_030_000 };

describe("shouldSendBeat", () => {
  it("プロフィールがあり、画面が見えていて、直近60秒以内に操作があれば送る", () => {
    expect(shouldSendBeat(base)).toBe(true);
    expect(shouldSendBeat({ ...base, now: base.lastActivityAt + IDLE_LIMIT_MS })).toBe(true);
  });

  it("画面が隠れている・操作が60秒より前・プロフィールが無いときは送らない", () => {
    expect(shouldSendBeat({ ...base, visible: false })).toBe(false);
    expect(shouldSendBeat({ ...base, now: base.lastActivityAt + IDLE_LIMIT_MS + 1 })).toBe(false);
    expect(shouldSendBeat({ ...base, hasProfile: false })).toBe(false);
  });
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `cd frontend && npx vitest run src/lib/analytics.test.ts src/lib/play-time.test.ts`
期待: 失敗（モジュールがない）。

- [ ] **手順3: 実装する**

`lib/analytics.ts`:

```ts
// 分析のページの計算(docs/design/2026-10-03-analytics-design.md 6章)。画面を描かない部分だけをここに置く

export type DailyRow = {
  date: string;
  new_accounts: number;
  new_players: number;
  active_players: number;
  opened_players: number;
  answers: number;
  correct_answers: number;
  accuracy: number | null;
  play_minutes: number;
};

export type AnalyticsData = {
  days: number;
  summary: {
    accounts: number;
    players: number;
    active_today: number;
    active_7d: number;
    active_30d: number;
    answers_today: number;
    play_minutes_today: number;
  };
  daily: DailyRow[];
  retention: Record<"d1" | "d3" | "d7", { rate: number | null; base: number }>;
  cohorts: { week: string; players: number; weeks: (number | null)[] }[];
  funnel: { key: string; label: string; count: number; rate: number | null }[];
  dropoff: { key: string; label: string; count: number }[];
  hard_questions: { question_id: number; prompt: string; answers: number; accuracy: number; reports: number }[];
  activities: { key: string; label: string; players: number; count: number | null }[];
  feedback: { new: number; read: number; done: number };
};

export const PERIODS = [7, 14, 30, 90] as const;

const EMPTY = "—";

/** 0〜1の割合を、整数の%にする。null(母数が0)は「—」 */
export function formatRate(rate: number | null): string {
  return rate === null ? EMPTY : `${Math.round(rate * 100)}%`;
}

/** 数は桁区切り。null(回数を持たない遊び)は「—」 */
export function formatCount(value: number | null): string {
  return value === null ? EMPTY : value.toLocaleString("en-US");
}

/** 60分未満は「分」、以上は「時間分」 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}時間` : `${hours}時間${rest}分`;
}

/** Y-m-d を「月/日」にする(0を付けない) */
export function formatDay(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

/** 登録した週ごとの表の、色の濃さの段階(0: データなし、1〜4: 割合が高いほど濃い) */
export function cohortLevel(rate: number | null): 0 | 1 | 2 | 3 | 4 {
  if (rate === null) return 0;
  if (rate >= 0.75) return 4;
  if (rate >= 0.5) return 3;
  if (rate >= 0.25) return 2;
  return 1;
}

/** CSVの保存名 */
export function exportFileName(kind: string, today: string): string {
  return `spra-analytics-${kind}-${today}.csv`;
}
```

`lib/play-time.ts`:

```ts
// 遊んだ時間の送り出しの判断(docs/design/2026-10-03-analytics-design.md 5-2)。画面を描かない部分だけをここに置く

/** 送る間隔(秒)と、1回で送る秒数 */
export const BEAT_SECONDS = 30;

/** 最後の操作から、この時間(ミリ秒)を過ぎたら、遊んでいないとみなす */
export const IDLE_LIMIT_MS = 60_000;

/** 送るか。プレイヤーがいて、画面が見えていて、直近60秒以内に操作があるときだけ */
export function shouldSendBeat(input: {
  hasProfile: boolean;
  visible: boolean;
  lastActivityAt: number;
  now: number;
}): boolean {
  return input.hasProfile && input.visible && input.now - input.lastActivityAt <= IDLE_LIMIT_MS;
}
```

`components/app/play-time-tracker.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

import { useProfile } from "@/components/app/profile-provider";
import { apiFetch } from "@/lib/api";
import { BEAT_SECONDS, shouldSendBeat } from "@/lib/play-time";

/**
 * 遊んだ時間を送る(docs/design/2026-10-03-analytics-design.md 5-2)。プレイヤーを選んでいて、画面が見えていて、
 * 直近60秒以内に操作があるときだけ、30秒ごとに送る。どの画面かは送らない。送れなくても、何も言わない
 */
export function PlayTimeTracker() {
  const { profile } = useProfile();
  const hasProfile = profile !== null;
  const lastActivityAt = useRef(0);

  useEffect(() => {
    if (!hasProfile) return;

    lastActivityAt.current = Date.now();
    const touch = () => {
      lastActivityAt.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((name) => window.addEventListener(name, touch, { passive: true }));

    const timer = window.setInterval(() => {
      const send = shouldSendBeat({
        hasProfile: true,
        visible: document.visibilityState === "visible",
        lastActivityAt: lastActivityAt.current,
        now: Date.now(),
      });
      if (send) apiFetch("/api/play-time", { method: "POST", body: JSON.stringify({ seconds: BEAT_SECONDS }) }).catch(() => {});
    }, BEAT_SECONDS * 1000);

    return () => {
      window.clearInterval(timer);
      events.forEach((name) => window.removeEventListener(name, touch));
    };
  }, [hasProfile]);

  return null;
}
```

`app/layout.tsx` の `<ServiceWorkerRegister />` の下に `<PlayTimeTracker />` を足す（`import { PlayTimeTracker } from "@/components/app/play-time-tracker";`）。`ProfileProvider` の中に置くこと。

- [ ] **手順4: 通す**

実行: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
期待: すべて通る。

- [ ] **手順5: コミット**

```bash
git add frontend/src/lib/analytics.ts frontend/src/lib/analytics.test.ts frontend/src/lib/play-time.ts frontend/src/lib/play-time.test.ts frontend/src/components/app/play-time-tracker.tsx frontend/src/app/layout.tsx
git commit -m "#00322: feat:分析の数字の整形と、遊んだ時間を30秒ごとに送る部品を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク10: 分析のページとUser一覧（グラフ・表・CSV）（#00323）

**ファイル**
- 新規: `frontend/src/app/owner/dashboard/analytics/page.tsx`、`frontend/src/components/owner/analytics/`（下の部品）
- 変更: `frontend/src/app/owner/dashboard/layout.tsx`、`frontend/src/app/owner/dashboard/users/page.tsx`、`frontend/package.json`・`package-lock.json`

**使うもの:** タスク9の `lib/analytics.ts`。この画面は、見た目と動きの確認が中心なので、新しいテストは足さない（計算は `lib/analytics.ts` でテスト済み。確認は、ブラウザでの確認で行う）。

- [ ] **手順1: `dataviz` スキルを読む**（`Skill` で `dataviz` を呼ぶ）。色・凡例・軸・ライト／ダークの方針を、このタスクの部品に使う。

- [ ] **手順2: グラフの部品を入れる**

実行: `cd frontend && npm install recharts`
期待: `package.json` と `package-lock.json` が変わる。React 19 で、型・lint が通ること（`npx tsc --noEmit && npm run lint`）を確かめる。

- [ ] **手順3: 部品を作る**（`components/owner/analytics/`。どれも `"use client"`。見た目は既存のOwner画面にそろえ、`rounded-lg border border-border` の枠）

- `kpi-cards.tsx`: 概要のカード（登録アカウント数・プレイヤー数・今日／7日／30日に遊んだ人数・今日解かれた問題数・今日遊んだ時間）。既存ダッシュボードの `KpiCard` と同じ見た目。`formatMinutes` を使う。
- `daily-chart.tsx`: recharts の `ComposedChart`。棒＝解いた問題数、折れ線＝遊んだ人数と開いた人数。X軸は `formatDay`。凡例とツールチップ付き。下に、同じ数字の表（日付・遊んだ人数・開いた人数・解いた問題数・正解率・遊んだ時間）を、折りたたみで見られるようにする。データが全部0なら、グラフの代わりに「まだデータがありません」。
- `retention-cards.tsx`: 1日後・3日後・7日後の割合（`formatRate`）と、母数（「母数 N人」）。割合が `null` なら「まだデータがありません」。
- `cohort-table.tsx`: 行＝登録した週（`formatDay` で「10/5の週」）、列＝登録した週・1週後〜4週後。セルに `formatRate` の数字を出し、背景の濃さは `cohortLevel` の段階（0〜4）で変える（色だけに頼らず、数字を必ず出す）。`null` は「—」。人数の列も出す。
- `funnel-chart.tsx`: 横棒（recharts の `BarChart` の `layout="vertical"`）で、段階ごとの人数。右に、前の段階からの割合（`formatRate`）。続けて「離れた人が最後に進んだ段階」の内訳を、小さな表で出す。
- `hard-questions-table.tsx`: 表（問題番号・問題文（長いときは省略）・回答数・正解率・へん報告数）。0件なら「5回以上答えられた問題が、まだありません」。
- `activities-table.tsx`: 表（遊び・人数・回数）。回数が `null` は「—」。
- `export-button.tsx`: `ExportButton({ kind, days })`。押すと `apiFetch(`/api/owner/analytics/export/${kind}?days=${days}`)` で取り、`res.blob()` から `URL.createObjectURL` で保存する（`<a download={exportFileName(kind, today)}>` を作ってクリックし、すぐ `revokeObjectURL`）。失敗したら、ボタンの近くに「書き出せませんでした」。日付 `today` は、ブラウザの現在日時を日本時間で `YYYY-MM-DD` にして渡す（`new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })`）。

- [ ] **手順4: ページを作る**（`app/owner/dashboard/analytics/page.tsx`）

`"use client"`。上に、見出し「分析」と期間の選択（`PERIODS` のボタン。選んだものを強調）。`apiFetch(`/api/owner/analytics?days=${days}`)` で取り、読み込み中・失敗（「分析の取得に失敗しました。」）・データの3つの状態を出す。上から: 概要のカード → 日ごとの推移（＋「日ごとをCSVで書き出す」）→ また来た割合 → 登録した週ごとの続き具合（＋CSV。「期間の選択に関係なく、全プレイヤー」と小さく書く）→ どこでやめたか → まちがいの多い問題（＋CSV。「全期間」と小さく書く）→ よく使われる遊び → ご意見の件数（新着・確認済み・対応済みと、`/owner/dashboard/feedbacks` へのリンク）。

`layout.tsx` のメニュー「収益・運営」に `{ href: "/owner/dashboard/analytics", label: "分析" }` を足す。

- [ ] **手順5: User一覧を充実させる**（`users/page.tsx`）

`User` 型に `registered_on: string`・`players: number`・`last_played_on: string | null`・`answers: number`・`play_minutes: number` を足し、各行に、登録日・プレイヤー数・最後に遊んだ日（無ければ「—」）・解いた問題数・遊んだ時間（`formatMinutes`）を並べる（今のメール確認のバッジは残す）。見出しの右に `<ExportButton kind="users" days={14} />` を置く。

- [ ] **手順6: 通す**

実行: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
期待: すべて通る。

- [ ] **手順7: コミット**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/components/owner frontend/src/app/owner/dashboard
git commit -m "#00323: feat:Owner管理画面に分析のページ(グラフ・表・CSV)を足し、User一覧に登録日・遊んだ時間などを足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク11: ドキュメント（#00324）

**ファイル**
- 変更: `SPEC.md`、`TASKS.md`、`docs/legal/` のプライバシーポリシーの下書き（追記）

- [ ] **手順1:** `SPEC.md` の 4-8（Owner管理画面）に、分析のページ（物差し・画面・CSV）、遊んだ時間の記録（5章の要点）、集計の表と毎日の集計（0時10分・本番では cron で `schedule:run`）を書く。`SPEC.md` 4-1 の末尾か 4-8a に、遊んだ時間の記録の注意（記録するのは合計秒数だけ）を書く。
- [ ] **手順2:** `TASKS.md` の「次にやること」第1段階の2番を完了にする（設計書・計画書へのリンクと日付を付ける）。3番（本番環境）に、「サーバーの cron で `php artisan schedule:run` を毎分」を足す。「公開後に随時」に、「分析の追加（招待コードごとの比較など。公開後の要望で）」を足す。
- [ ] **手順3:** `docs/legal/` の中から、プライバシーポリシーの下書きのファイル名を確かめて（`ls docs/legal`）、末尾に「遊んだ時間の記録」の項を**追記**する（既存の文は変えない）: 「サービスの改善のため、プレイヤーごとに、1日に遊んだ時間の合計（秒数）を記録します。どの画面を見たか、何をしたかは記録しません。」。法務の【要入力】が残る箇所は、そのままにする。
- [ ] **手順4:** コミット

```bash
git add SPEC.md TASKS.md docs/legal
git commit -m "#00324: docs:SPEC・TASKS・プライバシーポリシー下書きに分析と遊んだ時間の記録を書く" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## ブラウザでの確認（全タスクのあと）

Sail（`./vendor/bin/sail up -d`）と、開発サーバー（`cd frontend && npm run dev -- -p 3000`）を立てておく。

1. **分析のページ**: Owner（`owner@example.com`）でログインし、`/owner/dashboard/analytics` が崩れず出る。期間（7・14・30・90）を切り替えられる。データが少ない・無い所は「まだデータがありません」や「—」が出る。ライトとダークの両方で読める。
2. **CSV**: 「日ごと」「登録した週ごと」「まちがいの多い問題」「User」を保存し、中身（BOM・日本語・メールが入っていないこと）を確かめる。
3. **遊んだ時間**: 利用者（`test@example.com`、町テスト id 7）でログインして、画面を開いたまま操作を続け、1〜2分後に `profile_play_days` の秒数が増える。別のタブに切り替えて隠している間、または操作を止めて60秒たったあとは増えない。
4. **集計コマンド**: `./vendor/bin/sail artisan analytics:aggregate --from=earliest` を実行し、`analytics_daily` に行ができる。ページの数字が、表を使って同じになる。
5. **User一覧**: 登録日・プレイヤー数・最後に遊んだ日・解いた問題数・遊んだ時間が出る。
6. 画像は `.playwright-mcp/` の下だけに、フォルダ名から書いて保存し、見たら消す。

## 確認のあとに戻すもの（開発データベース）

- `profile_play_days` と `analytics_daily` の確認用の行を消す（この機能で作った表なので、全部消してよい）
- 町テスト（id 7）の値は変わっていないこと（xp 20・coins 60・hp 20・points 95・level 1・best_streak 2・current_streak 2・last_played_date 2026-09-27・plays 0・ledger 最大 668・users 4）。答えを送っていないので、変わらないはず。変わっていたら、戻す前にOwnerに伝える
- ブラウザのサービスワーカー・保存は、この作業では登録しないので、戻す作業はない

## 最後に

- 全タスクのあと、サーバーとフロントのテストを全部通し、`feature/analytics` の差分を**自分で見直す**（サブエージェントは使わない。見直しは作者本人が行うため、独立した目の見直しより弱い。マージの前に、Owner に伝える）。
- 見直しで出たCritical・Importantは1回だけ直す（直す前に、失敗するテストを書く）。軽いものは「あとで直す小さなこと」として最後の報告に書く。
- mainへのマージは、Owner に確認してから行う。pushはOwnerが行う。
