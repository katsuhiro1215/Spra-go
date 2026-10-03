# 限定公開の準備 実装計画

> **実行する人へ:** 実行方法はネイティブ（サブエージェントは使わない決まりなので、インラインで1人が実装し、最後に自分で見直す）。手順はチェックボックスで進める。テストを先に書き、失敗を見てから実装する。

**目標:** 無料・招待制の試験公開に必要な、招待コード・コイン購入のOFF・保護者のご意見と問題の「へん」報告・PWAの仕上げ・Owner管理画面の「公開設定」と「ご意見」を作る。

**進め方:** サーバーの小さな部品（公開設定 → 登録 → コイン購入 → ご意見）から順に作り、その上に画面（登録・ショップ・Owner・ご意見・PWA）をのせる。毎タスク、テストを書いて確かめてからコミットする。

**技術:** Laravel 13（Pest・MySQL・Sail）、Next.js 16・React 19・TypeScript・Tailwind、Vitest（画面の計算だけをテスト。`environment: "node"` で、画面そのものは描かない）。

**設計書:** `docs/design/2026-10-03-closed-beta-design.md`

## 守ること（全タスク共通）

- 返答・ドキュメント・コミットは日本語。コミットは `#NNNNN: type:要約` と `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`。番号は **#00298 から**（計画の#00297の続き）。
- ブランチは `feature/closed-beta`。mainへのマージは Owner に確認してから（`git merge --no-ff`）。pushは頼まれたときだけ。
- バックエンドのテストは `./vendor/bin/sail test`（`--parallel` なし）。結果は JSON に出して `"tool":"pest","result"` を探す。
- `.env` は読まない・変えない・コミットしない。招待コードも `.env` に書かない（データベースに入れる）。
- `migrate:fresh` は禁止。足すだけの `migrate` は可。
- ブラウザ確認の画像は `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` の下だけに保存し、見たら消す。確認用のログインは `test@example.com` / `password`（プロフィール 町テスト id 7）。確認のあとは、開発データベースを元に戻す（9章）。
- 画面の文は、子どもが読む所は自動ふりがな（`AutoFurigana`）に通す。保護者向けの文章は漢字のままでよい。
- 有料の素材は使わない。外部の分析サービスは使わない。

## 見直しの観点（テストでは見にくい所を、最後に自分で確かめる）

1. 招待コードが空のままの本番は誰でも登録できる → Ownerダッシュボードの警告が出ているか
2. `registration_open` を偽にしたあと、すでに登録した人のログインは影響を受けないか
3. コイン購入OFFでも、ショップの「コインで買う」アイテムは今までどおり買えるか
4. 問題の「へん」報告は、同じ子が同じ問題を重ねても1件のままか。問題が消えたあと、一覧が壊れないか
5. サービスワーカーが、API・画像・音の通信に一切さわらないか（古い画面が残らないか）

## ファイルの全体像

**サーバー（新規）**
- `database/migrations/2026_10_03_000001_create_app_settings_table.php`
- `database/migrations/2026_10_03_000002_create_feedbacks_table.php`
- `app/Models/AppSetting.php`、`app/Models/Feedback.php`
- `app/Support/AppSettings.php`
- `tests/Feature/AppSettingsTest.php`、`RegistrationInviteTest.php`、`FeedbackTest.php`、`OwnerFeedbackTest.php`

**サーバー（変更）**
- `app/Http/Controllers/Auth/RegisteredUserController.php`、`routes/auth.php`
- `routes/api.php`（登録の問い合わせ・Owner設定・コイン購入・ご意見・問題の報告・Owner一覧・要約の警告）
- `tests/Feature/CoinPurchaseTest.php`、`tests/Feature/OwnerDashboardSummaryTest.php`

**画面（新規）**
- `frontend/src/lib/registration.ts`（+test）、`lib/coin-packages.ts`（+test）、`lib/feedback.ts`（+test）、`lib/pwa.ts`（+test）
- `frontend/src/components/app/feedback-form.tsx`、`components/app/install-guide.tsx`、`components/app/service-worker-register.tsx`、`components/quiz/report-question.tsx`
- `frontend/src/app/owner/dashboard/settings/page.tsx`、`app/owner/dashboard/feedbacks/page.tsx`
- `frontend/public/sw.js`、`frontend/public/offline.html`

**画面（変更）**
- `frontend/src/app/register/page.tsx`、`app/shop/page.tsx`、`app/profiles/page.tsx`、`app/layout.tsx`
- `frontend/src/components/quiz/quiz-session.tsx`
- `frontend/src/app/owner/dashboard/layout.tsx`（メニュー）、`app/owner/dashboard/page.tsx`（警告）

## 決めたこと（計画で確定）

- 「へん？」ボタンは `quiz-session.tsx` に置く。ステージのクイズと復習の両方が、この部品を使っているため。スプルキャッチは、問題の画面が別なので、今回は入れない（公開後に随時）。
- 問題の報告の一覧からは、問題の編集画面へのリンクは付けない（編集画面が問題の番号で開けるか未確認のため）。問題の番号と本文だけ出す。
- 公開設定は、`app_settings` 表に値を文字で保存し、真偽は `"1"`/`"0"` で持つ。

---

### タスク1: 公開設定の部品とOwnerの設定API（#00298）

**ファイル**
- 新規: `database/migrations/2026_10_03_000001_create_app_settings_table.php`、`app/Models/AppSetting.php`、`app/Support/AppSettings.php`、`tests/Feature/AppSettingsTest.php`
- 変更: `routes/api.php`（Owner設定・要約）、`tests/Feature/OwnerDashboardSummaryTest.php`

**渡すもの:** `AppSettings::all(): array`（`invite_code` 文字・`registration_open` 真偽・`coin_purchase_enabled` 真偽）、`inviteCode(): string`、`registrationOpen(): bool`、`coinPurchaseEnabled(): bool`、`update(array): void`、`inviteCodeMatches(string): bool`。`GET/PUT /api/owner/settings`。要約に `invite_code_empty`（真偽）。

- [ ] **手順1: 失敗するテストを書く**（`tests/Feature/AppSettingsTest.php`）

```php
<?php

use App\Models\Owner;
use App\Support\AppSettings;

/*
|--------------------------------------------------------------------------
| 公開設定(docs/design/2026-10-03-closed-beta-design.md 3-1・7)
|--------------------------------------------------------------------------
*/

it('初期値は、コードなし・登録を受け付ける・コイン購入はOFF', function () {
    expect(AppSettings::all())->toBe([
        'invite_code' => '',
        'registration_open' => true,
        'coin_purchase_enabled' => false,
    ]);
});

it('設定を保存して読み戻せる。コードの前後の空白は取る', function () {
    AppSettings::update(['invite_code' => '  Spra2026 ', 'registration_open' => false, 'coin_purchase_enabled' => true]);

    expect(AppSettings::inviteCode())->toBe('Spra2026')
        ->and(AppSettings::registrationOpen())->toBeFalse()
        ->and(AppSettings::coinPurchaseEnabled())->toBeTrue();
});

it('コードを空(null)にすると、コードなしに戻る', function () {
    AppSettings::update(['invite_code' => 'abc']);
    AppSettings::update(['invite_code' => null]);

    expect(AppSettings::inviteCode())->toBe('');
});

it('コードの照合は、前後の空白と大文字小文字を区別しない。コードが空なら一致しない', function () {
    AppSettings::update(['invite_code' => 'Spra2026']);

    expect(AppSettings::inviteCodeMatches(' spra2026 '))->toBeTrue()
        ->and(AppSettings::inviteCodeMatches('spra2027'))->toBeFalse()
        ->and(AppSettings::inviteCodeMatches(''))->toBeFalse();

    AppSettings::update(['invite_code' => '']);
    expect(AppSettings::inviteCodeMatches(''))->toBeFalse();
});

it('Owner以外は設定を見ることも変えることもできない', function () {
    $this->getJson('/api/owner/settings')->assertStatus(401);
    $this->putJson('/api/owner/settings', [])->assertStatus(401);
});

it('Ownerは設定を見て、変えられる', function () {
    $owner = Owner::factory()->create();

    $this->actingAs($owner, 'owner')->getJson('/api/owner/settings')->assertOk()
        ->assertExactJson(['invite_code' => '', 'registration_open' => true, 'coin_purchase_enabled' => false]);

    $this->actingAs($owner, 'owner')->putJson('/api/owner/settings', [
        'invite_code' => 'みんなでスプラ',
        'registration_open' => false,
        'coin_purchase_enabled' => true,
    ])->assertOk()->assertJsonPath('invite_code', 'みんなでスプラ');

    expect(AppSettings::inviteCode())->toBe('みんなでスプラ')
        ->and(AppSettings::registrationOpen())->toBeFalse()
        ->and(AppSettings::coinPurchaseEnabled())->toBeTrue();
});

it('設定の値がおかしいと422(コードは64文字まで、スイッチは真偽)', function () {
    $owner = Owner::factory()->create();

    $this->actingAs($owner, 'owner')->putJson('/api/owner/settings', [
        'invite_code' => str_repeat('あ', 65),
        'registration_open' => 'たぶん',
    ])->assertStatus(422)->assertJsonValidationErrors(['invite_code', 'registration_open', 'coin_purchase_enabled']);
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/AppSettingsTest.php`
期待: 失敗（`AppSettings` クラスがない）。

- [ ] **手順3: 表・モデル・係を作る**

`database/migrations/2026_10_03_000001_create_app_settings_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_settings', function (Blueprint $table) {
            $table->string('key', 64)->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
    }
};
```

`app/Models/AppSetting.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** 公開設定の1行(名前と値)。読み書きは App\Support\AppSettings を通す */
class AppSetting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];
}
```

`app/Support/AppSettings.php`:

```php
<?php

namespace App\Support;

use App\Models\AppSetting;

/**
 * 公開設定(docs/design/2026-10-03-closed-beta-design.md 3-1)。招待コード・登録の受付・コイン購入のスイッチを、
 * データベースに持ち、Owner管理画面で変える。値は文字で保存し、真偽は "1" / "0"
 */
class AppSettings
{
    /** 初期値。表に行がなければこの値になる */
    private const DEFAULTS = [
        'invite_code' => '',
        'registration_open' => true,
        'coin_purchase_enabled' => false,
    ];

    /** @return array{invite_code: string, registration_open: bool, coin_purchase_enabled: bool} */
    public static function all(): array
    {
        $rows = AppSetting::query()->pluck('value', 'key');

        return [
            'invite_code' => trim((string) ($rows['invite_code'] ?? self::DEFAULTS['invite_code'])),
            'registration_open' => self::bool($rows, 'registration_open'),
            'coin_purchase_enabled' => self::bool($rows, 'coin_purchase_enabled'),
        ];
    }

    public static function inviteCode(): string
    {
        return self::all()['invite_code'];
    }

    public static function registrationOpen(): bool
    {
        return self::all()['registration_open'];
    }

    public static function coinPurchaseEnabled(): bool
    {
        return self::all()['coin_purchase_enabled'];
    }

    /** 渡した項目だけ保存する。コードは前後の空白を取り、null は空にする */
    public static function update(array $values): void
    {
        foreach (array_intersect_key($values, self::DEFAULTS) as $key => $value) {
            $stored = match ($key) {
                'invite_code' => trim((string) $value),
                default => $value ? '1' : '0',
            };

            AppSetting::query()->updateOrCreate(['key' => $key], ['value' => $stored]);
        }
    }

    /** 登録で入れられたコードが合っているか。前後の空白と大文字小文字は区別しない。設定のコードが空なら一致しない */
    public static function inviteCodeMatches(string $given): bool
    {
        $code = mb_strtolower(self::inviteCode());

        return $code !== '' && hash_equals($code, mb_strtolower(trim($given)));
    }

    private static function bool($rows, string $key): bool
    {
        return isset($rows[$key]) ? $rows[$key] === '1' : self::DEFAULTS[$key];
    }
}
```

- [ ] **手順4: Ownerの設定APIを足す**（`routes/api.php` の `owner/admins` の前）

```php
Route::middleware(['auth:owner'])->get('/owner/settings', fn () => AppSettings::all())->name('owner.settings.show');

Route::middleware(['auth:owner'])->put('/owner/settings', function (Request $request) {
    $data = $request->validate([
        'invite_code' => ['nullable', 'string', 'max:64'],
        'registration_open' => ['required', 'boolean'],
        'coin_purchase_enabled' => ['required', 'boolean'],
    ]);

    AppSettings::update($data);

    return AppSettings::all();
})->name('owner.settings.update');
```

`use App\Support\AppSettings;` を `routes/api.php` の先頭の use の並びに足す。

- [ ] **手順5: 要約の警告のテストを足す**（`OwnerDashboardSummaryTest.php` の末尾）

```php
it('招待コードが空かどうかを、要約で知らせる', function () {
    $owner = Owner::factory()->create();

    $this->actingAs($owner, 'owner')->getJson('/api/owner/dashboard/summary')
        ->assertOk()->assertJsonPath('invite_code_empty', true);

    \App\Support\AppSettings::update(['invite_code' => 'abc']);

    $this->actingAs($owner, 'owner')->getJson('/api/owner/dashboard/summary')
        ->assertOk()->assertJsonPath('invite_code_empty', false);
});
```

`routes/api.php` の `owner.dashboard.summary` の配列に `'invite_code_empty' => AppSettings::inviteCode() === '',` を足す。

- [ ] **手順6: 通す**

実行: `./vendor/bin/sail artisan migrate` のあと `./vendor/bin/sail test tests/Feature/AppSettingsTest.php tests/Feature/OwnerDashboardSummaryTest.php`
期待: すべて通る。

- [ ] **手順7: コミット**

```bash
git add database/migrations/2026_10_03_000001_create_app_settings_table.php app/Models/AppSetting.php app/Support/AppSettings.php routes/api.php tests/Feature/AppSettingsTest.php tests/Feature/OwnerDashboardSummaryTest.php
git commit -m "#00298: feat:公開設定(招待コード・登録の受付・コイン購入のスイッチ)とOwnerの設定API" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク2: 招待制の登録（#00299）

**ファイル**
- 新規: `tests/Feature/RegistrationInviteTest.php`
- 変更: `app/Http/Controllers/Auth/RegisteredUserController.php`、`routes/auth.php`、`routes/api.php`

**使うもの:** タスク1の `AppSettings`。**渡すもの:** `GET /api/registration` → `{open: bool, invite_required: bool}`。登録は `invite_code` を受け取る。

- [ ] **手順1: 失敗するテストを書く**（`tests/Feature/RegistrationInviteTest.php`）

```php
<?php

use App\Models\User;
use App\Support\AppSettings;

/*
|--------------------------------------------------------------------------
| 招待制の登録(docs/design/2026-10-03-closed-beta-design.md 3-2・3-3)
|--------------------------------------------------------------------------
*/

function registrationPayload(array $extra = []): array
{
    return array_merge([
        'name' => '招待ユーザー',
        'email' => 'invited@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ], $extra);
}

it('コードが空なら、コードなしで登録できる', function () {
    $this->postJson('/register', registrationPayload())->assertNoContent();

    $this->assertAuthenticated();
});

it('コードがあるとき、正しいコードで登録できる(前後の空白と大文字小文字は区別しない)', function () {
    AppSettings::update(['invite_code' => 'Spra2026']);

    $this->postJson('/register', registrationPayload(['invite_code' => '  sPRA2026 ']))->assertNoContent();

    expect(User::where('email', 'invited@example.com')->exists())->toBeTrue();
});

it('コードがあるとき、違うコード・コードなしは422で、ユーザーは作られない', function () {
    AppSettings::update(['invite_code' => 'Spra2026']);

    $this->postJson('/register', registrationPayload(['invite_code' => 'ちがう']))
        ->assertStatus(422)->assertJsonPath('errors.invite_code.0', '招待コードが違います');
    $this->postJson('/register', registrationPayload())
        ->assertStatus(422)->assertJsonPath('errors.invite_code.0', '招待コードを入れてください');

    expect(User::where('email', 'invited@example.com')->exists())->toBeFalse();
    $this->assertGuest();
});

it('登録を一時停止すると、正しいコードでも403', function () {
    AppSettings::update(['invite_code' => 'Spra2026', 'registration_open' => false]);

    $this->postJson('/register', registrationPayload(['invite_code' => 'Spra2026']))
        ->assertStatus(403)->assertJsonPath('message', 'いまは登録をおやすみしています');

    expect(User::where('email', 'invited@example.com')->exists())->toBeFalse();
});

it('一時停止中でも、登録済みの人はログインできる', function () {
    $user = User::factory()->create(['email' => 'old@example.com']);
    AppSettings::update(['registration_open' => false]);

    $this->postJson('/login', ['email' => 'old@example.com', 'password' => 'password'])->assertNoContent();
    $this->assertAuthenticatedAs($user);
});

it('登録の問い合わせは、コードを返さず、要るかどうかだけ返す', function () {
    $this->getJson('/api/registration')->assertOk()->assertExactJson(['open' => true, 'invite_required' => false]);

    AppSettings::update(['invite_code' => 'Spra2026', 'registration_open' => false]);

    $response = $this->getJson('/api/registration')->assertOk()
        ->assertExactJson(['open' => false, 'invite_required' => true]);

    expect($response->getContent())->not->toContain('Spra2026');
});

it('登録を1分に11回続けると、429で止まる(コードの総当たり対策)', function () {
    AppSettings::update(['invite_code' => 'Spra2026']);

    foreach (range(1, 10) as $i) {
        $this->postJson('/register', registrationPayload(['invite_code' => "x{$i}"]))->assertStatus(422);
    }

    $this->postJson('/register', registrationPayload(['invite_code' => 'x11']))->assertStatus(429);
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/RegistrationInviteTest.php`
期待: 失敗（コードを見ていない・`/api/registration` がない・429にならない）。

- [ ] **手順3: 登録を変える**（`RegisteredUserController::store` の先頭）

```php
use App\Support\AppSettings;

// …store の先頭
abort_unless(AppSettings::registrationOpen(), 403, 'いまは登録をおやすみしています');

$codeRequired = AppSettings::inviteCode() !== '';

$request->validate([
    'name' => ['required', 'string', 'max:255'],
    'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
    'password' => ['required', 'confirmed', Rules\Password::defaults()],
    'invite_code' => $codeRequired ? ['required', 'string'] : ['nullable'],
], ['invite_code.required' => '招待コードを入れてください']);

if ($codeRequired && ! AppSettings::inviteCodeMatches($request->string('invite_code'))) {
    throw ValidationException::withMessages(['invite_code' => '招待コードが違います']);
}
```

（今ある `validate` の呼び出しは、上のものに置き換える。）

- [ ] **手順4: 回数の制限と問い合わせの窓口を足す**

`routes/auth.php`:

```php
Route::post('/register', [RegisteredUserController::class, 'store'])
    ->middleware(['guest', 'throttle:10,1'])
    ->name('register');
```

`routes/api.php`（ログイン不要。公開のサンプルクイズの近くに置く）:

```php
Route::get('/registration', fn () => [
    'open' => AppSettings::registrationOpen(),
    'invite_required' => AppSettings::inviteCode() !== '',
])->name('registration.info');
```

- [ ] **手順5: 通す。今までの登録・認証のテストも通す**

実行: `./vendor/bin/sail test tests/Feature/RegistrationInviteTest.php tests/Feature/Auth`
期待: すべて通る。

- [ ] **手順6: コミット**

```bash
git add app/Http/Controllers/Auth/RegisteredUserController.php routes/auth.php routes/api.php tests/Feature/RegistrationInviteTest.php
git commit -m "#00299: feat:登録を招待コードで制限し、一時停止と登録回数の制限、登録の問い合わせAPIを足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク3: コイン購入のスイッチ（#00300）

**ファイル**
- 変更: `routes/api.php`（`coin-packages`・`coin-purchases/checkout`）、`tests/Feature/CoinPurchaseTest.php`

**渡すもの:** `GET /api/coin-packages` → `{enabled: bool, packages: [...]}`（形が変わる）。OFFのとき checkout は 403。

- [ ] **手順1: テストを直し、足す**（`CoinPurchaseTest.php`）

先頭に、ONにする準備を足す（ほかのテストを今までどおり通すため）:

```php
use App\Support\AppSettings;

beforeEach(fn () => AppSettings::update(['coin_purchase_enabled' => true]));
```

一覧のテストを新しい形に直す:

```php
it('コインパッケージ一覧を取得できる', function () {
    createActiveProfile();

    $response = $this->getJson('/api/coin-packages');

    $response->assertOk()->assertJsonPath('enabled', true);
    expect($response->json('packages'))->toHaveCount(3);
    expect(collect($response->json('packages'))->pluck('key')->all())
        ->toBe(['small', 'medium', 'large']);
});
```

OFFのテストを足す:

```php
it('コイン購入がOFFのとき、一覧は空で、チェックアウトは403', function () {
    AppSettings::update(['coin_purchase_enabled' => false]);
    createActiveProfile();

    $this->getJson('/api/coin-packages')->assertOk()
        ->assertExactJson(['enabled' => false, 'packages' => []]);

    $this->postJson('/api/coin-purchases/checkout', ['package_key' => 'small'])
        ->assertStatus(403)->assertJsonPath('message', 'コインの購入は、まだ始まっていません。');
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/CoinPurchaseTest.php`
期待: 一覧とOFFのテストが失敗。

- [ ] **手順3: ルートを直す**

`coin-packages`:

```php
Route::middleware(['auth:sanctum'])->get('/coin-packages', function () {
    if (! AppSettings::coinPurchaseEnabled()) {
        return ['enabled' => false, 'packages' => []];
    }

    return [
        'enabled' => true,
        'packages' => collect(config('coin_packages.packages'))
            ->map(fn (array $package, string $key) => [
                'key' => $key,
                'coins' => $package['coins'],
                'amount' => $package['amount'],
                'currency' => $package['currency'],
                'label' => $package['label'],
            ])
            ->values(),
    ];
})->name('coin-packages.index');
```

`coin-purchases/checkout` の最初の行（`validate` の前）に:

```php
abort_unless(AppSettings::coinPurchaseEnabled(), 403, 'コインの購入は、まだ始まっていません。');
```

- [ ] **手順4: 通す。Stripeのwebhookのテストも通ることを確かめる**

実行: `./vendor/bin/sail test tests/Feature/CoinPurchaseTest.php`
期待: すべて通る（webhook は購入OFFでも動く。すでに始まった決済を取りこぼさないため）。

- [ ] **手順5: コミット**

```bash
git add routes/api.php tests/Feature/CoinPurchaseTest.php
git commit -m "#00300: feat:コイン購入を公開設定でOFFにでき、OFFのときは一覧を空にしてチェックアウトを断る" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク4: ご意見の保存（保護者の文章と問題の報告）（#00301）

**ファイル**
- 新規: `database/migrations/2026_10_03_000002_create_feedbacks_table.php`、`app/Models/Feedback.php`、`tests/Feature/FeedbackTest.php`
- 変更: `routes/api.php`

**渡すもの:** `Feedback`（`user()`・`profile()`・`question()` の関連、`Feedback::KINDS`・`REASONS`・`STATUSES`、`toOwnerArray()`）。`POST /api/feedback`、`POST /api/questions/{question}/report`。

- [ ] **手順1: 失敗するテストを書く**（`tests/Feature/FeedbackTest.php`）

```php
<?php

use App\Models\Feedback;

/*
|--------------------------------------------------------------------------
| 保護者のご意見と、問題の「へん」報告(docs/design/2026-10-03-closed-beta-design.md 5章)
|--------------------------------------------------------------------------
*/

it('保護者が、種類と本文でご意見を送れる', function () {
    createActiveProfile();

    $this->postJson('/api/feedback', ['kind' => 'request', 'body' => 'ひらがなの問題がほしいです', 'page' => '/profiles'])
        ->assertCreated()->assertJsonPath('sent', true);

    $feedback = Feedback::firstOrFail();
    expect($feedback->kind)->toBe('request')
        ->and($feedback->body)->toBe('ひらがなの問題がほしいです')
        ->and($feedback->status)->toBe('new')
        ->and($feedback->page)->toBe('/profiles')
        ->and($feedback->user_profile_id)->toBeNull();
});

it('ご意見は、本文が必須・2000字まで・種類は3つのどれか', function () {
    createActiveProfile();

    $this->postJson('/api/feedback', ['kind' => 'request'])->assertStatus(422)->assertJsonValidationErrors('body');
    $this->postJson('/api/feedback', ['kind' => 'request', 'body' => str_repeat('あ', 2001)])->assertStatus(422);
    $this->postJson('/api/feedback', ['kind' => 'question_report', 'body' => 'x'])->assertStatus(422)->assertJsonValidationErrors('kind');

    expect(Feedback::count())->toBe(0);
});

it('ログインしていないとご意見は送れない', function () {
    $this->postJson('/api/feedback', ['kind' => 'bug', 'body' => 'x'])->assertStatus(401);
});

it('ご意見は1時間に10件まで', function () {
    createActiveProfile();

    foreach (range(1, 10) as $i) {
        $this->postJson('/api/feedback', ['kind' => 'other', 'body' => "意見{$i}"])->assertCreated();
    }

    $this->postJson('/api/feedback', ['kind' => 'other', 'body' => '意見11'])->assertStatus(429);
});

it('子どもが問題の「へん」を、理由を選んで報告できる', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/report", ['reason' => 'wrong_answer'])
        ->assertOk()->assertJsonPath('reported', true);

    $feedback = Feedback::firstOrFail();
    expect($feedback->kind)->toBe('question_report')
        ->and($feedback->user_profile_id)->toBe($profile->id)
        ->and($feedback->question_id)->toBe($question->id)
        ->and($feedback->reason)->toBe('wrong_answer')
        ->and($feedback->body)->toBe('答えがまちがっているみたい');
});

it('同じ子が同じ問題を重ねて報告しても、1件のまま', function () {
    createActiveProfile();
    [$question] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/report", ['reason' => 'wrong_answer'])->assertOk();
    $this->postJson("/api/questions/{$question->id}/report", ['reason' => 'unreadable'])->assertOk()->assertJsonPath('reported', true);

    expect(Feedback::count())->toBe(1)->and(Feedback::first()->reason)->toBe('wrong_answer');
});

it('別の子が同じ問題を報告したら、別の1件になる', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    $sister = createFamilyMember($profile);

    $this->postJson("/api/questions/{$question->id}/report", ['reason' => 'other'])->assertOk();
    $this->withSession(['active_profile_id' => $sister->id])
        ->postJson("/api/questions/{$question->id}/report", ['reason' => 'other'])->assertOk();

    expect(Feedback::count())->toBe(2);
});

it('報告の理由が3つ以外・存在しない問題はエラー', function () {
    createActiveProfile();
    [$question] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/report", ['reason' => 'いたずら'])->assertStatus(422);
    $this->postJson('/api/questions/999999/report', ['reason' => 'other'])->assertStatus(404);

    expect(Feedback::count())->toBe(0);
});

it('問題が消えても、報告は残り、問題の番号だけ空になる', function () {
    createActiveProfile();
    [$question] = createQuestionWithChoices();
    $this->postJson("/api/questions/{$question->id}/report", ['reason' => 'other'])->assertOk();

    $question->delete();

    expect(Feedback::firstOrFail()->question_id)->toBeNull();
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/FeedbackTest.php`
期待: 失敗（表・モデル・ルートがない）。

- [ ] **手順3: 表とモデルを作る**

`database/migrations/2026_10_03_000002_create_feedbacks_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedbacks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kind', 20);
            $table->text('body')->nullable();
            $table->foreignId('question_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reason', 20)->nullable();
            $table->string('status', 10)->default('new');
            $table->string('page', 200)->nullable();
            $table->timestamps();

            $table->index(['kind', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedbacks');
    }
};
```

`app/Models/Feedback.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** ご意見(docs/design/2026-10-03-closed-beta-design.md 5章)。保護者の文章と、子どもの問題の「へん」報告 */
class Feedback extends Model
{
    protected $table = 'feedbacks';

    /** 保護者が送れる種類 */
    public const WRITTEN_KINDS = ['bug', 'request', 'other'];

    public const KIND_QUESTION_REPORT = 'question_report';

    public const STATUSES = ['new', 'read', 'done'];

    /** 問題の報告の理由と、一覧に出す文 */
    public const REASONS = [
        'wrong_answer' => '答えがまちがっているみたい',
        'unreadable' => 'よめない・わからない',
        'other' => 'そのほか',
    ];

    protected $fillable = ['user_id', 'user_profile_id', 'kind', 'body', 'question_id', 'reason', 'status', 'page'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    /** Owner管理画面の一覧に出す形。メールアドレスは出さない */
    public function toOwnerArray(): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'status' => $this->status,
            'body' => $this->body,
            'reason' => $this->reason,
            'page' => $this->page,
            'question_id' => $this->question_id,
            'question_prompt' => $this->question?->prompt,
            'user_name' => $this->user?->name,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
```

- [ ] **手順4: ルートを足す**（`routes/api.php`、`coin-packages` の前あたり）

```php
Route::middleware(['auth:sanctum', 'throttle:10,60'])->post('/feedback', function (Request $request) {
    $data = $request->validate([
        'kind' => ['required', Rule::in(Feedback::WRITTEN_KINDS)],
        'body' => ['required', 'string', 'max:2000'],
        'page' => ['nullable', 'string', 'max:200'],
    ]);

    Feedback::create($data + ['user_id' => $request->user()->id]);

    return response()->json(['sent' => true], 201);
})->name('feedback.store');

Route::middleware(['auth:sanctum', 'throttle:30,60'])->post('/questions/{question}/report', function (Request $request, Question $question) {
    $data = $request->validate(['reason' => ['required', Rule::in(array_keys(Feedback::REASONS))]]);
    $profile = ActiveProfile::require($request);

    // 同じ子が同じ問題を重ねて報告しても、最初の1件のまま
    Feedback::firstOrCreate(
        ['kind' => Feedback::KIND_QUESTION_REPORT, 'user_profile_id' => $profile->id, 'question_id' => $question->id],
        ['user_id' => $request->user()->id, 'reason' => $data['reason'], 'body' => Feedback::REASONS[$data['reason']]],
    );

    return ['reported' => true];
})->name('questions.report');
```

`use App\Models\Feedback;` を先頭の use に足す（`Rule` が未取り込みなら `use Illuminate\Validation\Rule;` も）。

- [ ] **手順5: 通す**

実行: `./vendor/bin/sail artisan migrate` のあと `./vendor/bin/sail test tests/Feature/FeedbackTest.php`
期待: すべて通る。

- [ ] **手順6: コミット**

```bash
git add database/migrations/2026_10_03_000002_create_feedbacks_table.php app/Models/Feedback.php routes/api.php tests/Feature/FeedbackTest.php
git commit -m "#00301: feat:保護者のご意見と、子どもの問題の「へん」報告を保存する" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク5: Ownerのご意見の一覧と状態変更（#00302）

**ファイル**
- 新規: `tests/Feature/OwnerFeedbackTest.php`
- 変更: `routes/api.php`

**使うもの:** タスク4の `Feedback`。**渡すもの:** `GET /api/owner/feedbacks?kind=&status=&page=`（1ページ30件のページ分け）、`PATCH /api/owner/feedbacks/{feedback}`。

- [ ] **手順1: 失敗するテストを書く**（`tests/Feature/OwnerFeedbackTest.php`）

```php
<?php

use App\Models\Feedback;
use App\Models\Owner;
use App\Models\User;

/*
|--------------------------------------------------------------------------
| Ownerのご意見の一覧(docs/design/2026-10-03-closed-beta-design.md 5-2)
|--------------------------------------------------------------------------
*/

function makeFeedback(array $overrides = []): Feedback
{
    return Feedback::create(array_merge([
        'user_id' => User::factory()->create(['name' => '保護者さん'])->id,
        'kind' => 'request',
        'body' => 'こうしてほしい',
    ], $overrides));
}

it('Owner以外は一覧も状態変更もできない', function () {
    $feedback = makeFeedback();

    $this->getJson('/api/owner/feedbacks')->assertStatus(401);
    $this->patchJson("/api/owner/feedbacks/{$feedback->id}", ['status' => 'read'])->assertStatus(401);
});

it('一覧は新しい順で、アカウント名と問題の本文を出し、メールアドレスは出さない', function () {
    $owner = Owner::factory()->create();
    [$question] = createQuestionWithChoices();
    makeFeedback(['body' => '古い']);
    makeFeedback(['kind' => 'question_report', 'reason' => 'wrong_answer', 'body' => '答えがまちがっているみたい', 'question_id' => $question->id]);

    $response = $this->actingAs($owner, 'owner')->getJson('/api/owner/feedbacks')->assertOk();

    expect($response->json('data.0.kind'))->toBe('question_report')
        ->and($response->json('data.0.question_prompt'))->toBe('テスト問題')
        ->and($response->json('data.0.user_name'))->toBe('保護者さん')
        ->and($response->json('data.1.body'))->toBe('古い')
        ->and($response->getContent())->not->toContain('@');
});

it('種類と状態で絞り込める', function () {
    $owner = Owner::factory()->create();
    makeFeedback(['kind' => 'bug']);
    makeFeedback(['kind' => 'request', 'status' => 'done']);

    $this->actingAs($owner, 'owner')->getJson('/api/owner/feedbacks?kind=bug')
        ->assertOk()->assertJsonCount(1, 'data');
    $this->actingAs($owner, 'owner')->getJson('/api/owner/feedbacks?status=done')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.kind', 'request');
});

it('1ページ30件でページ分けされる', function () {
    $owner = Owner::factory()->create();
    $userId = User::factory()->create()->id;
    foreach (range(1, 31) as $i) {
        Feedback::create(['user_id' => $userId, 'kind' => 'other', 'body' => "意見{$i}"]);
    }

    $this->actingAs($owner, 'owner')->getJson('/api/owner/feedbacks')
        ->assertOk()->assertJsonCount(30, 'data')->assertJsonPath('last_page', 2);
});

it('状態を変えられる。3つ以外は422', function () {
    $owner = Owner::factory()->create();
    $feedback = makeFeedback();

    $this->actingAs($owner, 'owner')->patchJson("/api/owner/feedbacks/{$feedback->id}", ['status' => 'read'])
        ->assertOk()->assertJsonPath('status', 'read');
    expect($feedback->fresh()->status)->toBe('read');

    $this->actingAs($owner, 'owner')->patchJson("/api/owner/feedbacks/{$feedback->id}", ['status' => 'まんぞく'])
        ->assertStatus(422);
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `./vendor/bin/sail test tests/Feature/OwnerFeedbackTest.php`
期待: 失敗（ルートがない）。

- [ ] **手順3: ルートを足す**（`routes/api.php`、Owner設定の近く）

```php
Route::middleware(['auth:owner'])->get('/owner/feedbacks', function (Request $request) {
    $query = Feedback::query()->with(['user:id,name', 'question:id,prompt'])->latest('id');

    if ($request->filled('kind')) {
        $query->where('kind', $request->string('kind'));
    }
    if ($request->filled('status')) {
        $query->where('status', $request->string('status'));
    }

    return $query->paginate(30)->through(fn (Feedback $feedback) => $feedback->toOwnerArray());
})->name('owner.feedbacks.index');

Route::middleware(['auth:owner'])->patch('/owner/feedbacks/{feedback}', function (Request $request, Feedback $feedback) {
    $data = $request->validate(['status' => ['required', Rule::in(Feedback::STATUSES)]]);

    $feedback->update($data);

    return $feedback->load(['user:id,name', 'question:id,prompt'])->toOwnerArray();
})->name('owner.feedbacks.update');
```

- [ ] **手順4: 通す。サーバーのテスト全体も通す**

実行: `./vendor/bin/sail test tests/Feature/OwnerFeedbackTest.php` のあと `./vendor/bin/sail test`（JSONで `"tool":"pest","result"`）
期待: すべて通る。

- [ ] **手順5: コミット**

```bash
git add routes/api.php tests/Feature/OwnerFeedbackTest.php
git commit -m "#00302: feat:Ownerがご意見を一覧(絞り込み・ページ分け)で見て、状態を変えられる" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク6: 登録画面のコード欄（#00303）

**ファイル**
- 新規: `frontend/src/lib/registration.ts`、`frontend/src/lib/registration.test.ts`
- 変更: `frontend/src/app/register/page.tsx`

**渡すもの:** `inviteCodeFromSearch(search: string): string`、`registrationView(info): { showCode: boolean; closed: boolean }`。

- [ ] **手順1: 失敗するテストを書く**（`registration.test.ts`）

```ts
import { describe, expect, it } from "vitest";

import { inviteCodeFromSearch, registrationView } from "./registration";

describe("inviteCodeFromSearch", () => {
  it("?code= の値を取り、前後の空白を取る", () => {
    expect(inviteCodeFromSearch("?code=Spra2026")).toBe("Spra2026");
    expect(inviteCodeFromSearch("?code=%20abc%20")).toBe("abc");
  });

  it("日本語のコードも読める", () => {
    expect(inviteCodeFromSearch("?code=%E3%81%BF%E3%82%93%E3%81%AA")).toBe("みんな");
  });

  it("code がなければ空。長すぎるコードは64文字で切る", () => {
    expect(inviteCodeFromSearch("")).toBe("");
    expect(inviteCodeFromSearch("?other=1")).toBe("");
    expect(inviteCodeFromSearch(`?code=${"a".repeat(80)}`)).toHaveLength(64);
  });
});

describe("registrationView", () => {
  it("コードが要るときはコード欄を出す", () => {
    expect(registrationView({ open: true, invite_required: true })).toEqual({ showCode: true, closed: false });
  });

  it("コードが要らないときは、コード欄を出さない", () => {
    expect(registrationView({ open: true, invite_required: false })).toEqual({ showCode: false, closed: false });
  });

  it("おやすみ中は、閉じた表示にする", () => {
    expect(registrationView({ open: false, invite_required: true })).toEqual({ showCode: true, closed: true });
  });

  it("問い合わせが失敗したときは、コード欄を出して、閉じてはいない(サーバーが最後に判断する)", () => {
    expect(registrationView(null)).toEqual({ showCode: true, closed: false });
  });
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `cd frontend && npx vitest run src/lib/registration.test.ts`
期待: 失敗（`./registration` がない）。

- [ ] **手順3: 実装する**（`registration.ts`）

```ts
// 招待制の登録の画面の計算(docs/design/2026-10-03-closed-beta-design.md 3-3)。画面を描かない部分だけをここに置く

/** GET /api/registration の答え */
export type RegistrationInfo = { open: boolean; invite_required: boolean };

const MAX_CODE_LENGTH = 64;

/** /register?code=○○ のリンクで来たときの、コード欄の初期値 */
export function inviteCodeFromSearch(search: string): string {
  const code = new URLSearchParams(search).get("code") ?? "";
  return code.trim().slice(0, MAX_CODE_LENGTH);
}

/** 登録画面の出し分け。問い合わせが失敗したら、コード欄は出す(登録の可否はサーバーが最後に決める) */
export function registrationView(info: RegistrationInfo | null): { showCode: boolean; closed: boolean } {
  if (!info) return { showCode: true, closed: false };
  return { showCode: info.invite_required, closed: !info.open };
}
```

- [ ] **手順4: 登録画面につなぐ**（`register/page.tsx`）

- `useState` に `inviteCode`（初期値は空）と `info`（`RegistrationInfo | null`）を足す。
- `useEffect` で、`window.location.search` から `inviteCodeFromSearch` でコード欄を埋め、`apiFetch("/api/registration")` で `info` を取る（失敗したら `null` のまま。`useSearchParams` は使わない。静的に作るとき Suspense が要るため）。
- `registrationView(info)` で、`closed` なら、フォームの代わりに「いまは登録をおやすみしています。ひらいたら、またきてね」とスプルの絵を出す。`showCode` なら、名前の欄の下に「招待コード」の欄を足す（`autoComplete="off"`、説明に「教えてもらったコードを入れてください」）。
- 送信の本文に `invite_code: inviteCode` を足す。エラーの出し方は今のままでよい（422 の最初のメッセージが「招待コードが違います」として出る）。403 のときは `data.message` を出す。

- [ ] **手順5: 通す。型・lintも通す**

実行: `cd frontend && npx vitest run src/lib/registration.test.ts && npx tsc --noEmit && npm run lint`
期待: すべて通る。

- [ ] **手順6: コミット**

```bash
git add frontend/src/lib/registration.ts frontend/src/lib/registration.test.ts frontend/src/app/register/page.tsx
git commit -m "#00303: feat:登録画面に招待コード欄(リンクで埋める・おやすみ中の表示)を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク7: ショップのコイン購入を隠す（#00304）

**ファイル**
- 新規: `frontend/src/lib/coin-packages.ts`、`frontend/src/lib/coin-packages.test.ts`
- 変更: `frontend/src/app/shop/page.tsx`

**渡すもの:** `coinPackagesFrom(data: unknown): CoinPackageInfo[]`（`enabled` が真のときだけ中身を返し、それ以外・おかしな形は空）。

- [ ] **手順1: 失敗するテストを書く**（`coin-packages.test.ts`）

```ts
import { describe, expect, it } from "vitest";

import { coinPackagesFrom } from "./coin-packages";

const PACKAGE = { key: "small", coins: 100, amount: 120, currency: "jpy", label: "100コイン" };

describe("coinPackagesFrom", () => {
  it("ONのときだけ、パッケージを返す", () => {
    expect(coinPackagesFrom({ enabled: true, packages: [PACKAGE] })).toEqual([PACKAGE]);
  });

  it("OFFのときは、中身があっても空", () => {
    expect(coinPackagesFrom({ enabled: false, packages: [PACKAGE] })).toEqual([]);
    expect(coinPackagesFrom({ enabled: false, packages: [] })).toEqual([]);
  });

  it("古い形(配列そのもの)やおかしな形は、安全側で空にする", () => {
    expect(coinPackagesFrom([PACKAGE])).toEqual([]);
    expect(coinPackagesFrom(null)).toEqual([]);
    expect(coinPackagesFrom({ enabled: true })).toEqual([]);
  });
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `cd frontend && npx vitest run src/lib/coin-packages.test.ts`
期待: 失敗。

- [ ] **手順3: 実装する**（`coin-packages.ts`）

```ts
// GET /api/coin-packages の答え({ enabled, packages })を、画面に出すパッケージの一覧にする
// (docs/design/2026-10-03-closed-beta-design.md 4章)。購入がOFFのときは空にして、購入の欄を出さない

export type CoinPackageInfo = { key: string; coins: number; amount: number; currency: string; label: string };

export function coinPackagesFrom(data: unknown): CoinPackageInfo[] {
  if (!data || typeof data !== "object") return [];
  const { enabled, packages } = data as { enabled?: unknown; packages?: unknown };
  return enabled === true && Array.isArray(packages) ? (packages as CoinPackageInfo[]) : [];
}
```

- [ ] **手順4: ショップにつなぐ**（`shop/page.tsx`）

`apiFetch("/api/coin-packages")` の `.then` を `setCoinPackages(coinPackagesFrom(await res.json()))` にし、`CoinPackage` 型は `CoinPackageInfo` に寄せる（ページ内の型定義を消して import する）。「コインを購入」の欄は今の `coinPackages && coinPackages.length > 0` の条件のまま（OFFなら空なので出ない）。

- [ ] **手順5: 通す**

実行: `cd frontend && npx vitest run src/lib/coin-packages.test.ts && npx tsc --noEmit && npm run lint`
期待: すべて通る。

- [ ] **手順6: コミット**

```bash
git add frontend/src/lib/coin-packages.ts frontend/src/lib/coin-packages.test.ts frontend/src/app/shop/page.tsx
git commit -m "#00304: feat:コイン購入がOFFのとき、ショップに購入の欄を出さない" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク8: Owner管理画面（公開設定・ご意見・警告）（#00305）

**ファイル**
- 新規: `frontend/src/lib/feedback.ts`、`frontend/src/lib/feedback.test.ts`、`frontend/src/app/owner/dashboard/settings/page.tsx`、`frontend/src/app/owner/dashboard/feedbacks/page.tsx`
- 変更: `frontend/src/app/owner/dashboard/layout.tsx`、`frontend/src/app/owner/dashboard/page.tsx`

**渡すもの（`lib/feedback.ts`）:** `FEEDBACK_KIND_LABELS`、`FEEDBACK_STATUS_LABELS`、`REPORT_REASONS`（`{value, label}` の3つ。子どもの「へん」で使う）、`WRITTEN_KINDS`（保護者フォームの3種類）、`kindLabel(kind)`、`statusLabel(status)`。

- [ ] **手順1: 失敗するテストを書く**（`feedback.test.ts`）

```ts
import { describe, expect, it } from "vitest";

import { kindLabel, REPORT_REASONS, statusLabel, WRITTEN_KINDS } from "./feedback";

describe("ご意見のラベル", () => {
  it("種類と状態を日本語にする。知らない値はそのまま出す", () => {
    expect(kindLabel("bug")).toBe("不具合");
    expect(kindLabel("question_report")).toBe("問題の報告");
    expect(kindLabel("???")).toBe("???");
    expect(statusLabel("new")).toBe("新着");
    expect(statusLabel("done")).toBe("対応済み");
  });

  it("保護者が選べる種類は3つで、問題の報告は含まない", () => {
    expect(WRITTEN_KINDS.map((k) => k.value)).toEqual(["bug", "request", "other"]);
  });

  it("「へん」の理由は、サーバーの3つと同じ", () => {
    expect(REPORT_REASONS.map((r) => r.value)).toEqual(["wrong_answer", "unreadable", "other"]);
  });
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `cd frontend && npx vitest run src/lib/feedback.test.ts`
期待: 失敗。

- [ ] **手順3: ラベルを実装する**（`feedback.ts`）

```ts
// ご意見の種類・状態・理由の名前(docs/design/2026-10-03-closed-beta-design.md 5章)。サーバーの Feedback と同じ値

export const WRITTEN_KINDS = [
  { value: "bug", label: "不具合" },
  { value: "request", label: "こうしてほしい" },
  { value: "other", label: "その他" },
] as const;

export const FEEDBACK_KIND_LABELS: Record<string, string> = {
  bug: "不具合",
  request: "こうしてほしい",
  other: "その他",
  question_report: "問題の報告",
};

export const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  new: "新着",
  read: "確認済み",
  done: "対応済み",
};

/** 子どもが問題の画面で選ぶ「へん」の理由(自由な文章は書けない) */
export const REPORT_REASONS = [
  { value: "wrong_answer", label: "答えがまちがっているみたい" },
  { value: "unreadable", label: "よめない・わからない" },
  { value: "other", label: "そのほか" },
] as const;

export function kindLabel(kind: string): string {
  return FEEDBACK_KIND_LABELS[kind] ?? kind;
}

export function statusLabel(status: string): string {
  return FEEDBACK_STATUS_LABELS[status] ?? status;
}
```

- [ ] **手順4: Owner画面を作る**（既存の `users/page.tsx` の作りと見た目にそろえる。`apiFetch`・`Badge`・Tailwind）

- `settings/page.tsx`: `GET /api/owner/settings` で読み、「招待コード」の入力欄・「登録を受け付ける」「コイン購入を使う」のチェック（`@/components/ui/checkbox` があれば使う）・「保存」ボタン（`PUT`）。コードが空のとき、赤い注意「招待コードが空です。誰でも登録できます」を出す。保存したら「保存しました」を出す。
- `feedbacks/page.tsx`: `GET /api/owner/feedbacks?kind=&status=&page=` で読む。上に種類と状態の絞り込み（`Select` または普通の `select`）、各行に「種類のバッジ・状態・本文・アカウント名・日時・（問題の報告なら）問題の番号と本文」、状態を変えるボタン（新着→確認済み→対応済み）。ページ送り（前へ・次へ）。
- `layout.tsx`: メニューの「システム」の並び（`system`・`admins`・`users` のある所）に、`{ href: "/owner/dashboard/settings", label: "公開設定" }` と `{ href: "/owner/dashboard/feedbacks", label: "ご意見" }` を足す。
- `page.tsx`（ダッシュボード）: `Summary` 型に `invite_code_empty: boolean` を足し、真のとき、見出しの下に注意の帯「招待コードが空です。誰でも登録できます」と「公開設定」へのリンクを出す。

- [ ] **手順5: 通す**

実行: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
期待: すべて通る。

- [ ] **手順6: コミット**

```bash
git add frontend/src/lib/feedback.ts frontend/src/lib/feedback.test.ts frontend/src/app/owner/dashboard
git commit -m "#00305: feat:Owner管理画面に公開設定とご意見の一覧を足し、招待コードが空の警告を出す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク9: 保護者のご意見フォームと、問題の「へん？」ボタン（#00306）

**ファイル**
- 新規: `frontend/src/components/app/feedback-form.tsx`、`frontend/src/components/quiz/report-question.tsx`
- 変更: `frontend/src/app/profiles/page.tsx`、`frontend/src/components/quiz/quiz-session.tsx`

**使うもの:** タスク8の `WRITTEN_KINDS`・`REPORT_REASONS`、タスク4のAPI。この2つの部品は画面だけの部品で、計算はタスク8の `feedback.ts` に出してあるので、新しいテストはなし（見た目と動きはタスク11の前のブラウザ確認で確かめる）。

- [ ] **手順1: 保護者のご意見フォーム**（`feedback-form.tsx`）

`"use client"`。`FeedbackForm({ className })` を作る。
- 閉じた状態: 「ご意見・ご要望をおくる」のボタン（`@/components/app/button` の `Button`）。押すと開く。
- 開いた状態: 種類（`WRITTEN_KINDS` のラジオ。初期値は `request`）、本文の `textarea`（2000字まで・残りの文字数を出す）、「送る」ボタン。本文が空のあいだは押せない。
- 送信: `apiFetch("/api/feedback", { method: "POST", body: JSON.stringify({ kind, body, page: window.location.pathname }) })`。`201` なら「ありがとうございます。いただいたご意見は、今後の改良に役立てます」を出して、フォームを空にして閉じる。`429` は「たくさん送っていただきありがとうございます。しばらくしてからまたお願いします」。それ以外は「送れませんでした。時間をおいて、もう一度お試しください」。
- 保護者向けの文章なので、ふりがなは付けない。

- [ ] **手順2: プロフィールを選ぶ画面に置く**（`profiles/page.tsx`）

プレイヤーの並びの下（芝生の中、「プレイヤーを追加」のあと）に、「保護者のかたへ」の小さな枠を作り、`<FeedbackForm />` を入れる。ホーム画面の案内（タスク10）も同じ枠の上に入る予定なので、枠は `<section aria-label="保護者のかたへ">` として、あとから足せる形にしておく。

- [ ] **手順3: 問題の「へん？」ボタン**（`report-question.tsx`）

`"use client"`。`ReportQuestion({ questionId })` を作る。呼ぶ側が `key={questionId}` を付けて、問題が変わるたびに作り直す。
- 閉じた状態: 小さな「へん？」ボタン（`AutoFurigana` は付けない。ひらがなだけ）。
- 押すと、3つの理由（`REPORT_REASONS`）のボタンと「やめる」が出る。理由を押すと `apiFetch(`/api/questions/${questionId}/report`, { method: "POST", body: JSON.stringify({ reason }) })`。成功したら「おしえてくれて ありがとう」だけを出す（ボタンは消える）。失敗しても、画面は止めない（「いまはおくれなかったよ」を出すだけ）。

- [ ] **手順4: 問題の画面につなぐ**（`quiz-session.tsx`）

問題のカード（`bg-[#fffaf0]` のカード）の右上に、`<ReportQuestion key={question.id} questionId={question.id} />` を置く。「問題 1 / 10」の行を押しのけず、カードの角に小さく出す（`absolute right-3 top-3` とカードに `relative`）。答えを選んだあとにも、そのまま押せる。

- [ ] **手順5: 通す**

実行: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
期待: すべて通る。

- [ ] **手順6: コミット**

```bash
git add frontend/src/components/app/feedback-form.tsx frontend/src/components/quiz/report-question.tsx frontend/src/app/profiles/page.tsx frontend/src/components/quiz/quiz-session.tsx
git commit -m "#00306: feat:保護者のご意見フォームと、問題の「へん？」報告ボタンを足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク10: PWA（ホーム画面の案内・サービスワーカー・つながらない画面）（#00307）

**ファイル**
- 新規: `frontend/src/lib/pwa.ts`、`frontend/src/lib/pwa.test.ts`、`frontend/src/components/app/install-guide.tsx`、`frontend/src/components/app/service-worker-register.tsx`、`frontend/public/sw.js`、`frontend/public/offline.html`
- 変更: `frontend/src/app/layout.tsx`、`frontend/src/app/profiles/page.tsx`

**渡すもの（`lib/pwa.ts`）:** `detectPlatform(userAgent: string): "ios" | "android" | "other"`、`shouldShowInstallGuide({ standalone, dismissed, platform, canPrompt }): boolean`。

- [ ] **手順1: 失敗するテストを書く**（`pwa.test.ts`）

```ts
import { describe, expect, it } from "vitest";

import { detectPlatform, shouldShowInstallGuide } from "./pwa";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP_MODE = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

describe("detectPlatform", () => {
  it("iPhone・Android・それ以外を見分ける", () => {
    expect(detectPlatform(IPHONE)).toBe("ios");
    expect(detectPlatform(ANDROID)).toBe("android");
    expect(detectPlatform(DESKTOP)).toBe("other");
  });

  it("iPad(デスクトップ表示)は、タッチの点が複数あるときだけiOSとみなす", () => {
    expect(detectPlatform(IPAD_DESKTOP_MODE)).toBe("other");
    expect(detectPlatform(IPAD_DESKTOP_MODE, 5)).toBe("ios");
  });
});

describe("shouldShowInstallGuide", () => {
  const base = { standalone: false, dismissed: false, platform: "ios" as const, canPrompt: false };

  it("スマホで、まだ追加していなくて、閉じていなければ出す", () => {
    expect(shouldShowInstallGuide(base)).toBe(true);
    expect(shouldShowInstallGuide({ ...base, platform: "android", canPrompt: true })).toBe(true);
  });

  it("すでにホーム画面から開いている・「あとで」を押した・パソコンのときは出さない", () => {
    expect(shouldShowInstallGuide({ ...base, standalone: true })).toBe(false);
    expect(shouldShowInstallGuide({ ...base, dismissed: true })).toBe(false);
    expect(shouldShowInstallGuide({ ...base, platform: "other" })).toBe(false);
  });
});
```

- [ ] **手順2: 失敗を確かめる**

実行: `cd frontend && npx vitest run src/lib/pwa.test.ts`
期待: 失敗。

- [ ] **手順3: 計算を実装する**（`pwa.ts`）

```ts
// ホーム画面に追加する案内の計算(docs/design/2026-10-03-closed-beta-design.md 6-1)。画面を描かない部分だけをここに置く

export type Platform = "ios" | "android" | "other";

/** 端末の見分け。iPad は「パソコン用の表示」だと Mac を名乗るので、タッチの点が複数あるときだけiOSとみなす */
export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/iPhone|iPad|iPod/.test(userAgent)) return "ios";
  if (/Android/.test(userAgent)) return "android";
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return "ios";
  return "other";
}

/** 案内を出すか。ホーム画面から開いている・「あとで」を押した・パソコンなら出さない。canPrompt は将来の判断用(Androidでボタンを出せるか)で、出す・出さないには使わない */
export function shouldShowInstallGuide(input: {
  standalone: boolean;
  dismissed: boolean;
  platform: Platform;
  canPrompt: boolean;
}): boolean {
  return !input.standalone && !input.dismissed && input.platform !== "other";
}

/** 「あとで」を覚えておく場所の名前 */
export const INSTALL_DISMISSED_KEY = "spra-install-guide-dismissed";
```

- [ ] **手順4: サービスワーカーとつながらない画面**

`frontend/public/offline.html`（自分だけで完結する静的な画面。外部の通信なし。スプルのアイコンは `/icons/icon-192.png`）:

```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#5bb33e">
  <title>つながらないよ — Spra Go</title>
  <style>
    html, body { height: 100%; margin: 0; }
    body { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
      padding: 24px; text-align: center; background: #fffaf0; color: #3b3226;
      font-family: -apple-system, BlinkMacSystemFont, "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif; }
    img { width: 96px; height: 96px; }
    h1 { margin: 0; font-size: 22px; }
    p { margin: 0; font-size: 15px; font-weight: 700; color: #6b5d45; line-height: 1.7; }
  </style>
</head>
<body>
  <img src="/icons/icon-192.png" alt="">
  <h1>つながらないよ</h1>
  <p>ネットにつながったら、<br>もういちど ひらいてね</p>
</body>
</html>
```

`frontend/public/sw.js`:

```js
// 最小のサービスワーカー(docs/design/2026-10-03-closed-beta-design.md 6-2)。
// ページを開こうとして通信が失敗したときだけ、保存した「つながらないよ」の画面を返す。
// API・画像・音などの通信には一切さわらない(古い画面が残らないように、ほかは何も保存しない)。
const CACHE = "spra-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
```

`frontend/src/components/app/service-worker-register.tsx`:

```tsx
"use client";

import { useEffect } from "react";

/** 本番のビルドのときだけ、最小のサービスワーカー(public/sw.js)を登録する。開発中は動かさない */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
```

`app/layout.tsx` の `<body>` の中（`ProfileProvider` の外側の端）に `<ServiceWorkerRegister />` を足す。

- [ ] **手順5: ホーム画面の案内の部品**（`install-guide.tsx`）

`"use client"`。`InstallGuide()`:
- マウント後に、`detectPlatform(navigator.userAgent, navigator.maxTouchPoints)`、`standalone`（`window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true`）、`dismissed`（`localStorage.getItem(INSTALL_DISMISSED_KEY) === "1"`。try/catch で囲み、取れなければ `false`）を読んで state に入れる。
- `window.addEventListener("beforeinstallprompt", ...)` で `preventDefault()` して、イベントを ref/state に持つ（Androidのボタン用）。
- `shouldShowInstallGuide(...)` が偽なら `null`。真なら枠を出す:
  - タイトル「ホーム画面にのせると、すぐ あそべるよ」
  - iOS: 「① 画面の下の 共有（□に↑）を押す ② 『ホーム画面に追加』を押す」の手順
  - Android: ボタン「ホーム画面に追加」（`beforeinstallprompt` を受け取れたときだけ。押すと `prompt()`）。受け取れていないときは「ブラウザのメニュー（⋮）から『ホーム画面に追加』を押してね」の文
  - 「あとで」ボタン: `localStorage.setItem(INSTALL_DISMISSED_KEY, "1")`（try/catch）して消す
- 子どもも見る画面なので、文は `AutoFurigana` に通す。

`profiles/page.tsx` の「保護者のかたへ」の枠（タスク9）の、ご意見フォームの上に `<InstallGuide />` を入れる。

- [ ] **手順6: 通す**

実行: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
期待: すべて通る。サービスワーカーの動きは、タスク11のあとの「ブラウザでの確認」で確かめる。

- [ ] **手順7: コミット**

```bash
git add frontend/src/lib/pwa.ts frontend/src/lib/pwa.test.ts frontend/src/components/app/install-guide.tsx frontend/src/components/app/service-worker-register.tsx frontend/public/sw.js frontend/public/offline.html frontend/src/app/layout.tsx frontend/src/app/profiles/page.tsx
git commit -m "#00307: feat:ホーム画面に追加する案内と、つながらない時の画面(最小のサービスワーカー)を足す" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### タスク11: ドキュメント（#00308）

**ファイル**
- 変更: `SPEC.md`、`TASKS.md`、`docs/design/2026-10-03-closed-beta-design.md`（実装で決めた点の反映があれば）

- [ ] **手順1:** `SPEC.md` に、公開の形（無料・招待制・コイン購入OFF）、公開設定の3つ、ご意見（保護者の文章・問題の「へん」）、PWA（案内・つながらない画面）を書く（既存の章立てに合わせる）。
- [ ] **手順2:** `TASKS.md` の「次にやること」第1段階の1番（限定公開の準備）を完了にし、「公開後に随時」に「スプルキャッチの『へん？』ボタン」を足す。
- [ ] **手順3:** コミット

```bash
git add SPEC.md TASKS.md docs/design
git commit -m "#00308: docs:SPEC・TASKSに限定公開の準備(招待制・コイン購入OFF・ご意見・PWA)を書く" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## ブラウザでの確認（全タスクのあと）

開発サーバーは `http://localhost:3000`（すでに動いている。サービスワーカーの確認のときだけ止めて、本番ビルドで立てる）。サーバー（Sail）も動いていること。

1. **登録**（ブラウザで未ログインの状態）: Owner画面で招待コードを `test-code` に設定 → `/register` にコード欄が出る／違うコードで「招待コードが違います」／`/register?code=test-code` で欄が埋まる／正しいコードで登録できる（確認用のユーザーは、確認後に消す）／「登録を受け付ける」をOFFにして「おやすみ」の表示。
2. **コイン購入**: 初期状態（OFF）で、ショップに「コインを購入」が出ない／ONにすると出る／**確認のあと必ずOFFに戻す**。「コインで買う」アイテムは、どちらでも買える。
3. **ご意見**: `/profiles` で保護者のご意見を送る／問題の画面で「へん？」→理由を選ぶ→「ありがとう」／同じ問題でもう一度押しても増えない／Owner画面の「ご意見」で一覧に出て、状態を変えられる／ダッシュボードの警告（コードが空のとき）。
4. **PWA**: 画面を狭くして `/profiles` に案内が出る（iPhone・Androidの両方のユーザーエージェントで、手順の文が変わる）／「あとで」で消えて、再読み込みしても出ない。
5. **サービスワーカー**（本番ビルド）: 開発サーバーを止め、`cd frontend && npm run build && npm start`（ポート3000）。ページを開いて、サービスワーカーが登録されたことを確かめる（`navigator.serviceWorker.getRegistration()`）。そのあと `next start` を止めて、別のページへ移動すると「つながらないよ」の画面が出る。確認が終わったら `npm start` を止め、`npm run dev -- -p 3000` を立て直す。APIの通信（`/api/...`）が、サービスワーカーを通っていない（Networkで `ServiceWorker` 経由になっていない）ことも確かめる。
6. 画像は `.playwright-mcp/` の下だけに保存し、見たら消す。

## 確認のあとに戻すもの（開発データベース）

- `app_settings` を、確認前の状態（行なし）に戻す
- `feedbacks` の確認用データを消す
- 確認用に作ったユーザーを消す（`test@example.com` は残す）
- 町テスト（id 7）の値は、確認の前後で変わっていないこと（xp 20・coins 60・hp 20・points 95・level 1 など、これまでと同じ基準）

## 最後に

- 計画の全タスクのあと、サーバーとフロントのテストを全部通し、`feature/closed-beta` の差分を**自分で見直す**（サブエージェントは使わない。見直しは作者本人が行うため、独立した目の見直しより弱い。マージの前に、Owner に伝える）。
- 見直しで出たCritical・Importantは1回だけ直す（直す前に、失敗するテストを書く）。軽いものは「あとで直す小さなこと」として最後の報告に書く。
- mainへのマージは、Owner に確認してから行う。
