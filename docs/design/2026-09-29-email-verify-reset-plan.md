# メール確認・パスワード再設定のページ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 利用者のアカウントをメール確認ありにし（お知らせ＋コインを買う前だけ必須、確認のリンクはログイン不要・24時間）、パスワードを忘れたときから新しいパスワードを決めてログインするまでの画面を作り、開発ではMailpitで実際のメールを確かめられるようにする。

**Architecture:** サーバーは `User` を `MustVerifyEmail` にし、確認のリンク（`GET /verify-email/{id}/{hash}`）をコントローラーの中の署名チェックに変えて、結果を画面の `/verify-email?status=…` に渡す。コインの購入は確認済みのときだけ始められ、パスワードを忘れたときの受付は同じ返事にする。画面は計算だけの部品（`components/auth/auth-flow.ts`）と共通の形（`AuthCard`・もう一度送るボタン・お知らせ）を作り、3つのページとログイン・プロフィール選び・ショップに入れる。

**Tech Stack:** Laravel 13（Pest）/ Next.js 16・React 19・TypeScript・Tailwind CSS（Vitest）/ Laravel Sail・Mailpit

**Spec:** `docs/design/2026-09-29-email-verify-reset-design.md`

**ブランチ:** `feature/email-verify-reset`（作成済み。設計書は #00257、この計画は #00258）。タスクのコミットは #00259 から順に。

## Global Constraints

- 返答・ドキュメント・コミットの要約は日本語。コミットは `git commit -q -m "#NNNNN: type:要約" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`
- 確認のリンクは利用者だけ24時間（1440分）。運営側（Owner・管理者）の確認のリンクとパスワード再設定の流れは変えない（60分のまま）
- 画面全体を止める `verified` のミドルウェアは、利用者の画面に付けない。止めるのはコインの購入だけ
- パスワードを忘れたときの受付は、メールアドレスの形のまちがい（422）以外は、いつも同じ返事（200）
- お知らせはプロフィール選びとショップのコイン購入の欄だけ。町・学ぶなど子どもが遊ぶ画面には出さない
- 画面の文は親に向けた丁寧すぎない言い方。漢字にはふりがな（`AutoFurigana`）。画面の形はログイン画面と同じ（空の背景・スプルの絵・クリーム色のカード）
- `.env` は秘密の情報が入ったファイル。書き換えるのは `APP_NAME`・`MAIL_MAILER`・`MAIL_HOST`・`MAIL_PORT` の4つだけで、Ownerの確認を得てから
- 画面のテストは `frontend/` で `npx vitest run <ファイル>`、全部は `npm test`・`npm run typecheck`・`npm run lint`。サーバーのテストは リポジトリ直下で `./vendor/bin/sail test <ファイル>`（`--parallel` を付けない。結果は JSON の `"tool":"pest","result"` を見る）
- 開発用のデータベースは `migrate:fresh` しない。ブラウザで試しに作ったアカウントは消し、町テストのデータを確認前の状態に戻す
- Next.js 16 のページの `params`・`searchParams` は Promise。クライアントのページでは React の `use()` で受ける（`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`）

## Review Focus

1. 親がスマホのメールアプリで確認のリンクを開く（ログインしていないブラウザ） → 確認でき、結果の画面が出る → Task 1 のテスト「ログインしていなくても確認でき…」
2. 確認のリンクを2回押す・確認したあとにもう一度押す → エラーにならず「確かめました」が出る → Task 1 のテスト「もう確認済みのアカウントは…」
3. パスワードを忘れたときに、同じアドレスで短い間に何度も頼む・登録のないアドレスで頼む → いつも同じ返事で、登録の有無がわからない → Task 2 のテスト（登録のないアドレス・2回頼む）
4. 新しいパスワードの画面で、古いリンクを開いた・メールアドレスを書き換えた → 「リンクが古いか…」と、もう一度メールを送る道が出る → Task 3 の `resetPasswordErrors` のテスト
5. 確認していない人が、画面のボタンを通らずにコインの購入を始めようとする → サーバーが断る → Task 2 のテスト「メールアドレスを確かめていないアカウントは…」

---

## ファイルの構成

| ファイル | 役割 | タスク |
|---|---|---|
| `app/Models/User.php` | `MustVerifyEmail` にする | 1 |
| `routes/auth.php`・`app/Http/Controllers/Auth/VerifyEmailController.php` | ログイン不要の確認のリンク | 1 |
| `app/Http/Controllers/Auth/EmailVerificationNotificationController.php` | 確認済みなら JSON で返す | 1 |
| `config/auth.php`・`app/Providers/AppServiceProvider.php` | 利用者の確認のリンクを24時間に | 1 |
| `tests/Feature/Auth/EmailVerificationTest.php`・`RegistrationTest.php` | 1のテスト | 1 |
| `routes/api.php`（`POST /coin-purchases/checkout`）・`tests/Feature/CoinPurchaseTest.php` | 確認していないと買えない | 2 |
| `app/Http/Controllers/Auth/PasswordResetLinkController.php`・`tests/Feature/Auth/PasswordResetTest.php` | いつも同じ返事 | 2 |
| `frontend/src/components/auth/auth-flow.ts`・`auth-flow.test.ts` | 計算だけの部品 | 3 |
| `frontend/src/components/auth/auth-card.tsx`・`resend-verification.tsx` | 画面の共通の形・もう一度送るボタン | 4 |
| `frontend/src/app/forgot-password/page.tsx`・`password-reset/[token]/page.tsx`・`verify-email/page.tsx`・`login/page.tsx` | 画面 | 4 |
| `frontend/src/components/auth/email-verify-notice.tsx`・`frontend/src/app/profiles/page.tsx`・`frontend/src/app/shop/page.tsx` | お知らせとコインのボタン | 5 |
| `compose.yaml`・`.env`・`.env.example`・`lang/ja.json` | Mailpit・アプリの名前・結びの言葉 | 6 |
| `SPEC.md`・`TASKS.md` | ドキュメント | 6 |

---

### Task 1: メール確認あり・ログイン不要の確認のリンク（サーバー）

**Files:**
- Modify: `app/Models/User.php`・`routes/auth.php`・`app/Http/Controllers/Auth/VerifyEmailController.php`（全体）・`app/Http/Controllers/Auth/EmailVerificationNotificationController.php`・`config/auth.php`・`app/Providers/AppServiceProvider.php`
- Test: `tests/Feature/Auth/EmailVerificationTest.php`（全体）・`tests/Feature/Auth/RegistrationTest.php`

**Interfaces:**
- Produces:
  - `GET /verify-email/{id}/{hash}` → 画面の `{frontend_url}/verify-email?status=verified|expired|invalid` へリダイレクト（ログイン不要）
  - `POST /email/verification-notification` → 200 `{ "status": "verification-link-sent" }`（確認済みなら `{ "status": "already-verified" }`）。短い間に何度も押すと 429
  - `GET /api/user` の `email_verified_at`（今のまま。確認前は null）

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/Auth/EmailVerificationTest.php` を次の内容にする:

```php
<?php

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;

/*
|--------------------------------------------------------------------------
| 確認のリンク(docs/design/2026-09-29-email-verify-reset-design.md 4-2)
|--------------------------------------------------------------------------
|
| ログインしていなくても、期限付きの署名とメールアドレスの hash で確かめ、
| 結果を画面の /verify-email?status=… に渡す。
|
*/

function verificationUrlFor(User $user, ?string $hash = null): string
{
    return URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
        'id' => $user->id,
        'hash' => $hash ?? sha1($user->email),
    ]);
}

function verifyResultUrl(string $status): string
{
    return config('app.frontend_url').'/verify-email?status='.$status;
}

test('ログインしていなくても確認でき、結果の画面(verified)へ移る', function () {
    $user = User::factory()->unverified()->create();
    Event::fake();

    $this->get(verificationUrlFor($user))->assertRedirect(verifyResultUrl('verified'));

    Event::assertDispatched(Verified::class);
    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
});

test('期限が切れたリンクは expired へ移り、確認済みにならない', function () {
    $user = User::factory()->unverified()->create();
    $url = verificationUrlFor($user);
    $this->travel(61)->minutes();

    $this->get($url)->assertRedirect(verifyResultUrl('expired'));

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('署名を書き換えたリンクは expired へ移る', function () {
    $user = User::factory()->unverified()->create();

    $this->get(verificationUrlFor($user).'x')->assertRedirect(verifyResultUrl('expired'));

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('hash がメールアドレスと合わないリンクは invalid へ移る', function () {
    $user = User::factory()->unverified()->create();

    $this->get(verificationUrlFor($user, sha1('wrong-email')))->assertRedirect(verifyResultUrl('invalid'));

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('もう確認済みのアカウントは verified へ移り、Verified を出し直さない', function () {
    $user = User::factory()->create();
    Event::fake();

    $this->get(verificationUrlFor($user))->assertRedirect(verifyResultUrl('verified'));

    Event::assertNotDispatched(Verified::class);
});

test('メールのリンクは24時間有効(23時間後は確認できる)', function () {
    $user = User::factory()->unverified()->create();
    $url = (new VerifyEmail)->toMail($user)->actionUrl;
    $this->travel(23)->hours();

    $this->get($url)->assertRedirect(verifyResultUrl('verified'));
});

test('メールのリンクは25時間後には期限切れ', function () {
    $user = User::factory()->unverified()->create();
    $url = (new VerifyEmail)->toMail($user)->actionUrl;
    $this->travel(25)->hours();

    $this->get($url)->assertRedirect(verifyResultUrl('expired'));
});

test('確認メールをもう一度送れる。確認済みなら送らずに already-verified を返す', function () {
    Notification::fake();

    $unverified = User::factory()->unverified()->create();
    $this->actingAs($unverified)
        ->postJson('/email/verification-notification')
        ->assertOk()
        ->assertJson(['status' => 'verification-link-sent']);
    Notification::assertSentTo($unverified, VerifyEmail::class);

    $verified = User::factory()->create();
    $this->actingAs($verified)
        ->postJson('/email/verification-notification')
        ->assertOk()
        ->assertJson(['status' => 'already-verified']);
    Notification::assertNotSentTo($verified, VerifyEmail::class);
});
```

`tests/Feature/Auth/RegistrationTest.php` の `<?php` の次に次の3行を足し:

```php

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;
```

ファイルの最後に足す:

```php

test('登録すると、確認メールが送られる(docs/design/2026-09-29-email-verify-reset-design.md 4-1)', function () {
    Notification::fake();

    $this->post('/register', [
        'name' => 'Verify User',
        'email' => 'verify@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNoContent();

    Notification::assertSentTo(User::where('email', 'verify@example.com')->firstOrFail(), VerifyEmail::class);
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/Auth/EmailVerificationTest.php tests/Feature/Auth/RegistrationTest.php 2>&1 | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`
Expected: `"result":"failed"`（ログインを求めてログイン画面へ移る・`/dashboard` へ移る・確認メールが送られない。25時間後の期限切れと hash のまちがいは、今もリダイレクト先が違うので失敗する）

- [ ] **Step 3: アカウントをメール確認ありにし、確認のリンクを作り直す**

`app/Models/User.php` の

```php
// use Illuminate\Contracts\Auth\MustVerifyEmail;
```

を

```php
use Illuminate\Contracts\Auth\MustVerifyEmail;
```

に、

```php
class User extends Authenticatable
{
```

を

```php
// メール確認あり(docs/design/2026-09-29-email-verify-reset-design.md 4-1)。登録すると確認メールが送られる。
// 画面全体は止めず、止めるのはコインの購入だけ(routes/api.php の checkout)
class User extends Authenticatable implements MustVerifyEmail
{
```

に直す。

`routes/auth.php` の

```php
Route::get('/verify-email/{id}/{hash}', VerifyEmailController::class)
    ->middleware(['auth', 'signed', 'throttle:6,1'])
    ->name('verification.verify');
```

を

```php
// ログイン不要(スマホのメールアプリから開いても確かめられるように)。署名と hash はコントローラーで確かめる
Route::get('/verify-email/{id}/{hash}', VerifyEmailController::class)
    ->middleware(['throttle:6,1'])
    ->name('verification.verify');
```

に直す。

`app/Http/Controllers/Auth/VerifyEmailController.php` を次の内容にする:

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmailController extends Controller
{
    /**
     * 確認のリンク(docs/design/2026-09-29-email-verify-reset-design.md 4-2)。ログインしていなくても、期限付きの署名と
     * メールアドレスの hash で確かめ、結果を画面の /verify-email?status=verified|expired|invalid に渡す。
     * 署名の期限切れで 403 の画面を出さないよう、署名はここで確かめる
     */
    public function __invoke(Request $request, string $id, string $hash): RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            return $this->result('expired');
        }

        $user = User::find($id);
        if (! $user || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return $this->result('invalid');
        }

        if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return $this->result('verified');
    }

    private function result(string $status): RedirectResponse
    {
        return redirect()->away(config('app.frontend_url').'/verify-email?status='.$status);
    }
}
```

`app/Http/Controllers/Auth/EmailVerificationNotificationController.php` の

```php
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended('/dashboard');
        }
```

を

```php
        // 画面から呼ぶので、確認済みでもリダイレクトせず JSON で返す(docs/design/2026-09-29-email-verify-reset-design.md 3-5)
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json(['status' => 'already-verified']);
        }
```

に直す。

`config/auth.php` の `'passwords' => [ … ],` の直後（`'owners'` の `'throttle' => 60,` とそれを閉じる2つの `],` のあと）に足す。書き換える前の該当部分:

```php
            'throttle' => 60,
        ],
    ],

```

を

```php
            'throttle' => 60,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Email Verification
    |--------------------------------------------------------------------------
    |
    | 確認のリンクの有効期限(分)。利用者は親が後で開いても間に合うよう24時間
    | (docs/design/2026-09-29-email-verify-reset-design.md 4-2)。運営側は今のまま60分。
    |
    */

    'verification' => [
        'expire' => 60,
        'user_expire' => 1440,
    ],

```

に直す（この3行の並びはファイルの中に1か所だけ）。

`app/Providers/AppServiceProvider.php` の

```php
            return URL::temporarySignedRoute($routeName, now()->addMinutes(config('auth.verification.expire', 60)), [
```

を

```php
            // 利用者の確認のリンクは24時間、運営側は60分(config/auth.php の verification)
            $minutes = $routeName === 'verification.verify'
                ? config('auth.verification.user_expire', 1440)
                : config('auth.verification.expire', 60);

            return URL::temporarySignedRoute($routeName, now()->addMinutes($minutes), [
```

に直す。

- [ ] **Step 4: テストが通るのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/Auth/EmailVerificationTest.php tests/Feature/Auth/RegistrationTest.php 2>&1 | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`
Expected: `"result":"passed","tests":10,"passed":10`

- [ ] **Step 5: 認証まわりのテスト全部を確かめる**

Run: `./vendor/bin/sail test tests/Feature/Auth 2>&1 | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`
Expected: `"result":"passed"`

- [ ] **Step 6: コミット**

```bash
git add app/Models/User.php routes/auth.php app/Http/Controllers/Auth/VerifyEmailController.php app/Http/Controllers/Auth/EmailVerificationNotificationController.php config/auth.php app/Providers/AppServiceProvider.php tests/Feature/Auth/EmailVerificationTest.php tests/Feature/Auth/RegistrationTest.php
git commit -q -m "#00259: feat:利用者のアカウントをメール確認ありにし、確認のリンクをログイン不要・24時間にして結果を画面に渡す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: コインの購入の前に確かめ、パスワードを忘れたときは同じ返事にする（サーバー）

**Files:**
- Modify: `routes/api.php`（`POST /coin-purchases/checkout`）・`app/Http/Controllers/Auth/PasswordResetLinkController.php`
- Test: `tests/Feature/CoinPurchaseTest.php`・`tests/Feature/Auth/PasswordResetTest.php`

**Interfaces:**
- Produces:
  - `POST /api/coin-purchases/checkout`: 確認していなければ 403 `{ "message": "メールアドレスを確かめると、コインを買えるようになります。", "code": "email_unverified" }`
  - `POST /forgot-password`: 形のまちがいは 422、それ以外は 200 `{ "status": "入力したメールアドレスが登録されていれば、パスワードを決め直すためのメールを送りました。" }`

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/CoinPurchaseTest.php` の最後に足す:

```php

it('メールアドレスを確かめていないアカウントはコインを買えない(403・email_unverified)', function () {
    createActiveProfile();
    auth()->user()->forceFill(['email_verified_at' => null])->save();

    $this->postJson('/api/coin-purchases/checkout', ['package_key' => 'small'])
        ->assertForbidden()
        ->assertJson([
            'message' => 'メールアドレスを確かめると、コインを買えるようになります。',
            'code' => 'email_unverified',
        ]);

    expect(CoinPurchase::count())->toBe(0);
});
```

`tests/Feature/Auth/PasswordResetTest.php` の最後に足す:

```php

test('登録のないアドレスでも、登録のあるアドレスと同じ返事になり、メールは送られない', function () {
    Notification::fake();
    $user = User::factory()->create();

    $known = $this->postJson('/forgot-password', ['email' => $user->email])->assertOk()->json();
    $unknown = $this->postJson('/forgot-password', ['email' => 'nobody@example.com'])->assertOk()->json();

    expect($unknown)->toBe($known);
    Notification::assertSentTo($user, ResetPassword::class);
    Notification::assertCount(1);
});

test('短い間に同じアドレスで2回頼んでも同じ返事になり、メールは1通だけ', function () {
    Notification::fake();
    $user = User::factory()->create();

    $first = $this->postJson('/forgot-password', ['email' => $user->email])->assertOk()->json();
    $second = $this->postJson('/forgot-password', ['email' => $user->email])->assertOk()->json();

    expect($second)->toBe($first);
    Notification::assertSentToTimes($user, ResetPassword::class, 1);
});

test('メールアドレスの形がおかしいときは 422', function () {
    $this->postJson('/forgot-password', ['email' => 'not-an-email'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('email');
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/CoinPurchaseTest.php tests/Feature/Auth/PasswordResetTest.php 2>&1 | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`
Expected: `"result":"failed"`（コインは Stripe の設定がないので 503、登録のないアドレスと2回目は 422。形のまちがいのテストは今も通る）

- [ ] **Step 3: コインの購入の前に確かめる**

`routes/api.php` の `coin-purchases/checkout` の route の

```php
    abort_unless($profile && $profile->user_schema_id === $request->user()->schema?->id, 422);

    abort_unless(config('services.stripe.secret_key'), 503, 'Stripeが設定されていません。');
```

を

```php
    abort_unless($profile && $profile->user_schema_id === $request->user()->schema?->id, 422);

    // メールアドレスを確かめるまでは買えない(docs/design/2026-09-29-email-verify-reset-design.md 4-3)
    if (! $request->user()->hasVerifiedEmail()) {
        return response()->json([
            'message' => 'メールアドレスを確かめると、コインを買えるようになります。',
            'code' => 'email_unverified',
        ], 403);
    }

    abort_unless(config('services.stripe.secret_key'), 503, 'Stripeが設定されていません。');
```

に直す。

- [ ] **Step 4: パスワードを忘れたときの受付を同じ返事にする**

`app/Http/Controllers/Auth/PasswordResetLinkController.php` の `use Illuminate\Validation\ValidationException;` の行を消し、

```php
        // We will send the password reset link to this user. Once we have attempted
        // to send the link, we will examine the response then see the message we
        // need to show to the user. Finally, we'll send out a proper response.
        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status != Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['status' => __($status)]);
```

を

```php
        // 登録のないアドレス・短い間の頼み直しでも、送れたときと同じ返事にする(登録されているアドレスかを知られないため。
        // docs/design/2026-09-29-email-verify-reset-design.md 4-4)。送るかどうかは Laravel の仕組みに任せる
        Password::sendResetLink($request->only('email'));

        return response()->json(['status' => '入力したメールアドレスが登録されていれば、パスワードを決め直すためのメールを送りました。']);
```

に直す（`store` の上の `@throws ValidationException` はメールアドレスの形のチェックで今も起きるので残す）。

- [ ] **Step 5: テストが通るのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/CoinPurchaseTest.php tests/Feature/Auth/PasswordResetTest.php 2>&1 | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`
Expected: `"result":"passed"`

- [ ] **Step 6: コミット**

```bash
git add routes/api.php app/Http/Controllers/Auth/PasswordResetLinkController.php tests/Feature/CoinPurchaseTest.php tests/Feature/Auth/PasswordResetTest.php
git commit -q -m "#00260: feat:メールアドレスを確かめるまでコインを買えないようにし、パスワードを忘れたときの受付をいつも同じ返事にする" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 画面の計算だけの部品

**Files:**
- Create: `frontend/src/components/auth/auth-flow.ts`
- Test: `frontend/src/components/auth/auth-flow.test.ts`

**Interfaces:**
- Consumes: Task 1・2 の返事の形（`status`・`email_verified_at`・429）
- Produces（`@/components/auth/auth-flow`）:
  - `type VerifyResultView = { ok: boolean; title: string; body: string }`
  - `verifyResultView(status: string | null | undefined): VerifyResultView`
  - `isEmailVerified(user: { email_verified_at?: string | null } | null | undefined): boolean`
  - `RESET_LINK_ERROR: string`
  - `resetPasswordErrors(errors: Record<string, string[] | undefined> | undefined): { link: string | null; password: string | null }`
  - `resendMessage(httpStatus: number): string`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/auth/auth-flow.test.ts` を作る:

```ts
import { describe, expect, it } from "vitest";

import { RESET_LINK_ERROR, isEmailVerified, resendMessage, resetPasswordErrors, verifyResultView } from "./auth-flow";

describe("メール確認・パスワード再設定の画面(設計書 2026-09-29-email-verify-reset 3章)", () => {
  it("確認の結果は verified・expired・それ以外で出し分ける", () => {
    expect(verifyResultView("verified")).toEqual({
      ok: true,
      title: "メールアドレスを確かめました",
      body: "これでコインも買えるようになりました",
    });
    expect(verifyResultView("expired")).toMatchObject({ ok: false, title: "リンクの期限が切れています" });
    expect(verifyResultView("invalid")).toMatchObject({ ok: false, title: "リンクが正しくありません" });
    expect(verifyResultView("something")).toMatchObject({ ok: false, title: "リンクが正しくありません" });
    expect(verifyResultView(null)).toMatchObject({ ok: false, title: "リンクが正しくありません" });
  });

  it("確かめ済みかは email_verified_at があるかで決める", () => {
    expect(isEmailVerified({ email_verified_at: "2026-09-29T00:00:00.000000Z" })).toBe(true);
    expect(isEmailVerified({ email_verified_at: null })).toBe(false);
    expect(isEmailVerified(null)).toBe(false);
  });

  it("新しいパスワードのエラーは、リンクのまちがいとパスワードのまちがいに分ける", () => {
    expect(resetPasswordErrors({ email: ["このパスワード再設定トークンは無効です。"] })).toEqual({
      link: RESET_LINK_ERROR,
      password: null,
    });
    expect(resetPasswordErrors({ token: ["tokenは必須です。"] })).toEqual({ link: RESET_LINK_ERROR, password: null });
    expect(resetPasswordErrors({ password: ["パスワードは8文字以上にしてください。"] })).toEqual({
      link: null,
      password: "パスワードは8文字以上にしてください。",
    });
    expect(resetPasswordErrors(undefined)).toEqual({ link: null, password: null });
  });

  it("もう一度送ったあとの文は、送れた・待ってね・送れなかったで出し分ける", () => {
    expect(resendMessage(200)).toBe("メールを送りました");
    expect(resendMessage(429)).toBe("少し時間をおいてから、もう一度押してね");
    expect(resendMessage(500)).toBe("送れませんでした。時間をおいて、もう一度押してね");
    expect(resendMessage(0)).toBe("送れませんでした。時間をおいて、もう一度押してね");
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/auth/auth-flow.test.ts`
Expected: FAIL（`./auth-flow` がない）

- [ ] **Step 3: 部品を作る**

`frontend/src/components/auth/auth-flow.ts` を作る:

```ts
// メール確認・パスワード再設定の画面の計算(docs/design/2026-09-29-email-verify-reset-design.md 3章)。画面を描かない部分だけをここに置く

/** 確認の結果の画面(/verify-email?status=…)に出すもの */
export type VerifyResultView = { ok: boolean; title: string; body: string };

const RETRY_BODY = "もう一度メールを送って、新しいメールのリンクを押してね";

/** 確認の結果の出し分け。verified 以外は、もう一度送る道を出す */
export function verifyResultView(status: string | null | undefined): VerifyResultView {
  if (status === "verified") {
    return { ok: true, title: "メールアドレスを確かめました", body: "これでコインも買えるようになりました" };
  }
  if (status === "expired") {
    return { ok: false, title: "リンクの期限が切れています", body: RETRY_BODY };
  }
  return { ok: false, title: "リンクが正しくありません", body: RETRY_BODY };
}

/** メールアドレスを確かめ済みか(GET /api/user の email_verified_at) */
export function isEmailVerified(user: { email_verified_at?: string | null } | null | undefined): boolean {
  return Boolean(user?.email_verified_at);
}

/** 新しいパスワードの画面で、リンク(token・メールアドレス)がまちがっているときの文 */
export const RESET_LINK_ERROR = "リンクが古いか、正しくありません。もう一度メールを送ってね";

/** POST /reset-password の 422 のエラーを、リンクのまちがいとパスワードのまちがいに分ける */
export function resetPasswordErrors(
  errors: Record<string, string[] | undefined> | undefined,
): { link: string | null; password: string | null } {
  const linkBroken = Boolean(errors?.email?.length || errors?.token?.length);
  return { link: linkBroken ? RESET_LINK_ERROR : null, password: errors?.password?.[0] ?? null };
}

/** 確認メールをもう一度送ったあとの文(POST /email/verification-notification の HTTP の状態から) */
export function resendMessage(httpStatus: number): string {
  if (httpStatus >= 200 && httpStatus < 300) return "メールを送りました";
  if (httpStatus === 429) return "少し時間をおいてから、もう一度押してね";
  return "送れませんでした。時間をおいて、もう一度押してね";
}
```

- [ ] **Step 4: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/auth/auth-flow.test.ts`
Expected: PASS（4件）

- [ ] **Step 5: コミット**

```bash
git add frontend/src/components/auth/auth-flow.ts frontend/src/components/auth/auth-flow.test.ts
git commit -q -m "#00261: feat:メール確認・パスワード再設定の画面の計算(結果の出し分け・確かめ済みか・エラーの分け方・もう一度送ったあとの文)を足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: パスワードを忘れたとき・新しいパスワード・確認の結果の画面と、ログイン画面のリンク

**Files:**
- Create: `frontend/src/components/auth/auth-card.tsx`・`frontend/src/components/auth/resend-verification.tsx`
- Modify: `frontend/src/app/forgot-password/page.tsx`（全体）・`frontend/src/app/password-reset/[token]/page.tsx`（全体）・`frontend/src/app/verify-email/page.tsx`（全体）・`frontend/src/app/login/page.tsx`

**Interfaces:**
- Consumes: Task 3 の `verifyResultView`・`resetPasswordErrors`・`resendMessage`、Task 1・2 のサーバー
- Produces:
  - `AuthCard({ icon: SpruIconKey; title: string; lead?: ReactNode; children: ReactNode; footer?: ReactNode })`、`AUTH_LABEL_CLASS`・`AUTH_INPUT_CLASS`・`AUTH_LINK_CLASS`・`AUTH_PRIMARY_LINK_CLASS`（`@/components/auth/auth-card`）
  - `ResendVerificationButton({ className?: string })`（`@/components/auth/resend-verification`）

見た目の部品とページなので、見た目はTask 6のブラウザで確かめる。計算はTask 3のテストで確かめてある。

- [ ] **Step 1: 画面の共通の形ともう一度送るボタンを作る**

`frontend/src/components/auth/auth-card.tsx` を作る:

```tsx
import type { ReactNode } from "react";

import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { SkyPage } from "@/components/app/sky-page";
import { SPRU_ICONS, type SpruIconKey } from "@/components/spru/spru-assets";

// メール確認・パスワード再設定の画面の共通の形(docs/design/2026-09-29-email-verify-reset-design.md 3章)。
// ログイン画面と同じ、空の背景・スプルの絵・クリーム色のカード
export const AUTH_LABEL_CLASS = "text-sm font-black text-[#3b3226]";
export const AUTH_INPUT_CLASS =
  "h-11 rounded-xl border-2 border-[#e8dfcf] bg-white px-3 text-sm text-[#3b3226] outline-none focus-visible:border-[#2b6fa3]";
export const AUTH_LINK_CLASS =
  "rounded-full bg-[#fffaf0] px-3 py-1.5 text-sm font-black text-[#2b5d7a] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white";
export const AUTH_PRIMARY_LINK_CLASS =
  "flex h-12 w-full items-center justify-center rounded-2xl bg-[#3b7f26] px-6 text-base font-black text-white shadow-[0_4px_0_#285a19] hover:bg-[#438b2d]";

export function AuthCard({
  icon,
  title,
  lead,
  children,
  footer,
}: {
  icon: SpruIconKey;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <SkyPage className="items-center justify-center px-6 py-12">
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-4">
        <AssetImage asset={SPRU_ICONS[icon]} size={104} alt="" />
        <div className="w-full rounded-3xl bg-[#fffaf0] p-6 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
          <h1 className="text-center text-2xl font-black text-[#3b3226]">
            <AutoFurigana text={title} />
          </h1>
          {lead && <p className="mt-1 text-center text-sm font-bold text-[#6b5d45]">{lead}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer}
      </div>
    </SkyPage>
  );
}
```

`frontend/src/components/auth/resend-verification.tsx` を作る:

```tsx
"use client";

import { useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { apiFetch } from "@/lib/api";

import { resendMessage } from "./auth-flow";

/** 確認メールをもう一度送るボタン(docs/design/2026-09-29-email-verify-reset-design.md 3-4・3-5)。送ったあとは結果の文を出す */
export function ResendVerificationButton({ className }: { className?: string }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    setSending(true);
    setMessage(null);
    try {
      const res = await apiFetch("/email/verification-notification", { method: "POST" });
      setMessage(resendMessage(res.status));
    } catch {
      setMessage(resendMessage(0));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <AppButton type="button" variant="primary" size="sm" disabled={sending} onClick={resend} className="normal-case">
        {sending ? "送っています..." : "メールをもう一度送る"}
      </AppButton>
      {message && (
        <p role="status" className="text-xs font-bold text-[#6b5d45]">
          <AutoFurigana text={message} />
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: パスワードを忘れたときの画面**

`frontend/src/app/forgot-password/page.tsx` を次の内容にする:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { AUTH_INPUT_CLASS, AUTH_LABEL_CLASS, AUTH_LINK_CLASS, AuthCard } from "@/components/auth/auth-card";
import { apiFetch } from "@/lib/api";

/** パスワードを忘れたとき(docs/design/2026-09-29-email-verify-reset-design.md 3-2)。登録のないアドレスでも同じ「送りました」を出す */
export default function Page() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiFetch("/forgot-password", { method: "POST", body: JSON.stringify({ email }) });

      if (res.ok) {
        setSent(true);
        return;
      }

      if (res.status === 422) {
        const data = await res.json();
        setError(data.errors?.email?.[0] ?? "メールアドレスを確かめてね");
      } else {
        setError("メールを送れませんでした。時間をおいて、もう一度試してね");
      }
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      icon="letter"
      title="パスワードを忘れたとき"
      lead={
        sent ? undefined : (
          <AutoFurigana text="登録したメールアドレスを入れてね。パスワードを決め直すためのメールを送ります" />
        )
      }
      footer={
        <Link href="/login" className={AUTH_LINK_CLASS}>
          ログインにもどる
        </Link>
      }
    >
      {sent ? (
        <p role="status" className="text-center text-sm font-bold text-[#3b3226]">
          <AutoFurigana text="メールを送りました。届いたメールのリンクから、新しいパスワードを決めてね。メールが届かないときは、迷惑メールのフォルダも見てね" />
        </p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className={AUTH_LABEL_CLASS}>
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={AUTH_INPUT_CLASS}
            />
          </div>

          {error && <p className="text-sm font-medium text-[#c2402c]">{error}</p>}

          <AppButton type="submit" variant="primary" size="lg" disabled={submitting} className="mt-2 w-full normal-case">
            {submitting ? "送っています..." : "メールを送る"}
          </AppButton>
        </form>
      )}
    </AuthCard>
  );
}
```

- [ ] **Step 3: 新しいパスワードの画面**

`frontend/src/app/password-reset/[token]/page.tsx` を次の内容にする:

```tsx
"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { AUTH_INPUT_CLASS, AUTH_LABEL_CLASS, AUTH_LINK_CLASS, AuthCard } from "@/components/auth/auth-card";
import { resetPasswordErrors } from "@/components/auth/auth-flow";
import { apiFetch } from "@/lib/api";

type Errors = { link: string | null; password: string | null };

/** 新しいパスワード(docs/design/2026-09-29-email-verify-reset-design.md 3-3)。メールのリンク(/password-reset/{token}?email=…)から来る */
export default function Page(props: PageProps<"/password-reset/[token]">) {
  const { token } = use(props.params);
  const query = use(props.searchParams);
  const router = useRouter();
  const [email, setEmail] = useState(typeof query.email === "string" ? query.email : "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Errors>({ link: null, password: null });
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({ link: null, password: null });
    setFailure(null);
    setSubmitting(true);

    try {
      const res = await apiFetch("/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, email, password, password_confirmation: confirmation }),
      });

      if (res.ok) {
        router.push("/login?reset=1");
        return;
      }

      if (res.status === 422) {
        const data = await res.json();
        setErrors(resetPasswordErrors(data.errors));
      } else {
        setFailure("パスワードを決められませんでした。時間をおいて、もう一度試してね");
      }
    } catch {
      setFailure("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      icon="key"
      title="新しいパスワード"
      footer={
        <Link href="/login" className={AUTH_LINK_CLASS}>
          ログインにもどる
        </Link>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {errors.link && (
          <div role="alert" className="flex flex-col gap-2 rounded-xl bg-[#fdecea] p-3 text-sm font-bold text-[#c2402c]">
            <AutoFurigana text={errors.link} />
            <Link href="/forgot-password" className="self-start text-[#2b5d7a] underline">
              もう一度メールを送る
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={AUTH_LABEL_CLASS}>
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={AUTH_INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={AUTH_LABEL_CLASS}>
            新しいパスワード
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={AUTH_INPUT_CLASS}
          />
          <p className="text-xs font-bold text-[#6b5d45]">8文字以上</p>
          {errors.password && <p className="text-sm font-medium text-[#c2402c]">{errors.password}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password_confirmation" className={AUTH_LABEL_CLASS}>
            もう一度入れる
          </label>
          <input
            id="password_confirmation"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className={AUTH_INPUT_CLASS}
          />
        </div>

        {failure && <p className="text-sm font-medium text-[#c2402c]">{failure}</p>}

        <AppButton type="submit" variant="primary" size="lg" disabled={submitting} className="mt-2 w-full normal-case">
          {submitting ? "決めています..." : "パスワードを決める"}
        </AppButton>
      </form>
    </AuthCard>
  );
}
```

- [ ] **Step 4: 確認の結果の画面**

`frontend/src/app/verify-email/page.tsx` を次の内容にする:

```tsx
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { AUTH_PRIMARY_LINK_CLASS, AuthCard } from "@/components/auth/auth-card";
import { verifyResultView } from "@/components/auth/auth-flow";
import { ResendVerificationButton } from "@/components/auth/resend-verification";
import { apiFetch } from "@/lib/api";

/** メール確認の結果(docs/design/2026-09-29-email-verify-reset-design.md 3-4)。確認のリンクを押すと、サーバーが確かめたあとここに来る */
export default function Page(props: PageProps<"/verify-email">) {
  const { status } = use(props.searchParams);
  const view = verifyResultView(typeof status === "string" ? status : null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch("/api/user")
      .then((res) => {
        if (active) setLoggedIn(res.ok);
      })
      .catch(() => {
        if (active) setLoggedIn(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthCard icon="letter" title={view.title} lead={<AutoFurigana text={view.body} />}>
      {loggedIn === null ? null : view.ok ? (
        <Link href={loggedIn ? "/profiles" : "/login"} className={AUTH_PRIMARY_LINK_CLASS}>
          {loggedIn ? "つづける" : "ログイン"}
        </Link>
      ) : loggedIn ? (
        <ResendVerificationButton className="items-center text-center" />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-center text-sm font-bold text-[#6b5d45]">
            <AutoFurigana text="ログインすると、もう一度送れます" />
          </p>
          <Link href="/login" className={AUTH_PRIMARY_LINK_CLASS}>
            ログイン
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
```

- [ ] **Step 5: ログイン画面にリンクと知らせを足す**

`frontend/src/app/login/page.tsx` で:

1. `import { useState, type FormEvent } from "react";` を `import { use, useState, type FormEvent } from "react";` にする
2. `export default function Page() {` を `export default function Page(props: PageProps<"/login">) {` にし、その次の行（`const router = useRouter();` の前）に次を足す:

```tsx
  // 新しいパスワードを決めたあとに来たとき(docs/design/2026-09-29-email-verify-reset-design.md 3-1)
  const { reset } = use(props.searchParams);
```

3. `<form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>` の直前に足す:

```tsx
          {reset === "1" && (
            <p role="status" className="mt-4 rounded-xl bg-[#e8f5dc] px-3 py-2 text-center text-sm font-bold text-[#2f6b1f]">
              新しいパスワードでログインしてね
            </p>
          )}
```

4. パスワードの欄の

```tsx
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl border-2 border-[#e8dfcf] bg-white px-3 text-sm text-[#3b3226] outline-none focus-visible:border-[#2b6fa3]"
              />
            </div>
```

を

```tsx
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl border-2 border-[#e8dfcf] bg-white px-3 text-sm text-[#3b3226] outline-none focus-visible:border-[#2b6fa3]"
              />
              <Link href="/forgot-password" className="self-end text-xs font-black text-[#2b5d7a] underline">
                パスワードを忘れたら
              </Link>
            </div>
```

にする（パスワードの `input` のすぐ下に、右寄せで出る）

- [ ] **Step 6: 型・lint・画面のテスト全部を確かめる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: エラーなし。テストは全部 PASS

- [ ] **Step 7: コミット**

```bash
git add frontend/src/components/auth/auth-card.tsx frontend/src/components/auth/resend-verification.tsx frontend/src/app/forgot-password/page.tsx "frontend/src/app/password-reset/[token]/page.tsx" frontend/src/app/verify-email/page.tsx frontend/src/app/login/page.tsx
git commit -q -m "#00262: feat:パスワードを忘れたとき・新しいパスワード・メール確認の結果の画面を作り、ログイン画面からつなぐ" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 確認していないときのお知らせと、コインのボタン

**Files:**
- Create: `frontend/src/components/auth/email-verify-notice.tsx`
- Modify: `frontend/src/app/profiles/page.tsx`・`frontend/src/app/shop/page.tsx`

**Interfaces:**
- Consumes: Task 3 の `isEmailVerified`、Task 4 の `ResendVerificationButton`
- Produces: `EmailVerifyNotice({ className?: string })`（`@/components/auth/email-verify-notice`）

- [ ] **Step 1: お知らせを作る**

`frontend/src/components/auth/email-verify-notice.tsx` を作る:

```tsx
import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { SPRU_ICONS } from "@/components/spru/spru-assets";

import { ResendVerificationButton } from "./resend-verification";

/** 確認していないときのお知らせ(docs/design/2026-09-29-email-verify-reset-design.md 3-5)。プロフィール選びとショップのコイン購入の欄にだけ出す */
export function EmailVerifyNotice({ className }: { className?: string }) {
  return (
    <div
      className={`flex w-full max-w-md items-start gap-3 rounded-2xl bg-[#fffaf0] p-4 text-left text-[#3b3226] shadow-lg ${className ?? ""}`}
    >
      <AssetImage asset={SPRU_ICONS.letter} size={48} alt="" className="shrink-0" />
      <div className="flex flex-1 flex-col gap-2">
        <p className="text-sm font-black">
          <AutoFurigana text="メールアドレスを確かめてね" />
        </p>
        <p className="text-xs font-bold text-[#6b5d45]">
          <AutoFurigana text="登録したメールアドレスに届いたメールのリンクを押すと、コインを買えるようになります" />
        </p>
        <ResendVerificationButton className="items-start" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: プロフィール選びに出す**

`frontend/src/app/profiles/page.tsx` で:

1. import に次の2行を足す（`@/components/app/sky-page` の import の前後の並びに合わせ、`@/components/auth/…` は `@/components/app/…` の次に置く）:

```tsx
import { isEmailVerified } from "@/components/auth/auth-flow";
import { EmailVerifyNotice } from "@/components/auth/email-verify-notice";
```

2. `const [sheet, setSheet] = useState<SheetState>({ open: false, target: null, key: 0 });` の次に足す:

```tsx
  // メールアドレスを確かめたか。確かめていなければお知らせを出す(docs/design/2026-09-29-email-verify-reset-design.md 3-5)
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
```

3. `useEffect` の中の

```tsx
        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const profilesRes = await apiFetch("/api/profiles");
```

を

```tsx
        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const user = await res.json();
        if (!active) return;
        setEmailVerified(isEmailVerified(user));

        const profilesRes = await apiFetch("/api/profiles");
```

に直す。

4. 見出しを包む `<div className="relative z-10 flex flex-col items-center gap-1 px-6 pt-10">` の閉じる `</div>` の直前（「プロフィールを編集」のボタンの `)}` のあと）に足す:

```tsx
        {emailVerified === false && <EmailVerifyNotice className="mt-3" />}
```

- [ ] **Step 3: ショップのコイン購入の欄に出し、ボタンを止める**

`frontend/src/app/shop/page.tsx` で:

1. import に次の2行を足す（`@/components/app/…` の import の次に置く）:

```tsx
import { isEmailVerified } from "@/components/auth/auth-flow";
import { EmailVerifyNotice } from "@/components/auth/email-verify-notice";
```

2. `const [message, setMessage] = useState<string | null>(null);` の次に足す:

```tsx
  // メールアドレスを確かめたか。確かめるまではコインを買えない(docs/design/2026-09-29-email-verify-reset-design.md 3-6)
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
```

3. 最初の `useEffect` の中の

```tsx
    apiFetch("/api/coin-packages").then(async (res) => {
      if (res.ok) setCoinPackages(await res.json());
    });
```

の次に足す:

```tsx

    apiFetch("/api/user").then(async (res) => {
      if (res.ok) setEmailVerified(isEmailVerified(await res.json()));
    });
```

4. コイン購入の欄の

```tsx
                コインを<Furigana text="購入" reading="こうにゅう" />
              </SkyText>
            </h2>
```

の次に足す:

```tsx
            {emailVerified === false && <EmailVerifyNotice />}
```

5. コインのパックのボタンの

```tsx
                  <AppButton
                    variant="warning"
                    size="sm"
                    disabled={purchasingPackageKey === pkg.key}
```

を

```tsx
                  <AppButton
                    variant={emailVerified === false ? "locked" : "warning"}
                    size="sm"
                    disabled={purchasingPackageKey === pkg.key || emailVerified === false}
```

に直す。

- [ ] **Step 4: 型・lint・画面のテスト全部を確かめる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: エラーなし。テストは全部 PASS

- [ ] **Step 5: コミット**

```bash
git add frontend/src/components/auth/email-verify-notice.tsx frontend/src/app/profiles/page.tsx frontend/src/app/shop/page.tsx
git commit -q -m "#00263: feat:メールアドレスを確かめていないとき、プロフィール選びとショップにお知らせを出し、コインの購入ボタンを止める" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Mailpit・アプリの名前を整え、ブラウザで通して確かめ、ドキュメントを直す

**Files:**
- Modify: `compose.yaml`・`.env`（コミットしない）・`.env.example`・`lang/ja.json`・`SPEC.md`・`TASKS.md`

**Interfaces:**
- Consumes: Task 1〜5 のすべて
- Produces: なし

- [ ] **Step 1: Mailpit を足して動かす**

`compose.yaml` の、最後のサービスのあと・いちばん外の `networks:` の前に足す。書き換える前の該当部分:

```yaml
networks:
    sail:
        driver: bridge
```

を

```yaml
    mailpit:
        image: 'axllent/mailpit:latest'
        ports:
            - '${FORWARD_MAILPIT_PORT:-1025}:1025'
            - '${FORWARD_MAILPIT_DASHBOARD_PORT:-8025}:8025'
        networks:
            - sail
networks:
    sail:
        driver: bridge
```

に直す（Sail の `stubs/mailpit.stub` と同じ中身）。

Run: `./vendor/bin/sail up -d mailpit`
Expected: mailpit のコンテナが動く。`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8025` が `200`

- [ ] **Step 2: `.env` と `.env.example` を直す（`.env` はOwnerの確認を得てから）**

`.env` の4つの項目だけを書き換える（ほかの行は読まない・変えない）:

```bash
python3 - <<'EOF'
import re
from pathlib import Path
for path in (Path(".env"), Path(".env.example")):
    s = path.read_text(encoding="utf-8")
    for key, value in (("APP_NAME", '"Spra Go"'), ("MAIL_MAILER", "smtp"), ("MAIL_HOST", "mailpit"), ("MAIL_PORT", "1025")):
        s, n = re.subn(rf"^{key}=.*$", f"{key}={value}", s, count=1, flags=re.M)
        assert n == 1, (path, key)
    path.write_text(s, encoding="utf-8")
    print(path, "ok")
EOF
./vendor/bin/sail artisan config:clear
./vendor/bin/sail artisan tinker --execute='echo config("app.name"), " | ", config("mail.from.name"), " | ", config("mail.default"), " | ", config("mail.mailers.smtp.host"), PHP_EOL;'
```

Expected: `.env ok`・`.env.example ok`、最後の行が `Spra Go | Spra Go | smtp | mailpit`（アプリの名前が変わるので、開発のブラウザのログインはいったん切れる）

`lang/ja.json` の `"Regards,": "よろしくお願いします,",` を `"Regards,": "よろしくお願いします。",` に直す。

- [ ] **Step 3: 開発用のデータの確認前の状態を記録する**

Run:

```bash
./vendor/bin/sail artisan tinker --execute='$p=App\Models\UserProfile::find(7); echo json_encode([$p->only(["current_streak","best_streak","last_played_date","xp","coins","hp","points","avatar","level","last_review_on"]), DB::table("profile_errands")->where("user_profile_id",7)->pluck("id"), DB::table("profile_world_items")->where("user_profile_id",7)->count(), DB::table("profile_stage_progress")->where("user_profile_id",7)->count(), DB::table("profile_currency_ledger")->max("id"), App\Models\User::count()]), PHP_EOL;'
```

Expected: 1行のJSON。これを確認前の状態として控える

- [ ] **Step 4: 登録からメール確認までをブラウザで通す（幅390px）**

1. `/register` で、名前「確認テスト」、メールアドレス `mail-check@example.com`、パスワード `password1` で登録する → プロフィール選びに移り、見出しの下にお知らせ「メールアドレスを確かめてね」が出る
2. 「追加」でプレイヤー（名前「かくにん」）を作って選ぶ → `/shop` のコイン購入の欄にお知らせが出て、3つの「購入する」が押せない（薄い）
3. お知らせの「メールをもう一度送る」を押す → 「メールを送りました」
4. `http://localhost:8025` を開く → 「メールアドレスの確認」のメールが2通（登録のときと、もう一度送ったとき）あり、差出人が「Spra Go」、結びが「よろしくお願いします。」。新しい方のメールの「メールアドレスの確認」のリンクの行き先を読み、そのURLを開く
5. `/verify-email?status=verified` に移り、「メールアドレスを確かめました」と「つづける」が出る → 「つづける」でプロフィール選びに移り、お知らせが消えている
6. `/shop` のコイン購入の欄のお知らせが消え、「購入する」が押せる（押さない。Stripe の画面へは進まない）
7. 同じリンクをもう一度開く → また「メールアドレスを確かめました」
8. `/verify-email?status=expired` を開く → 「リンクの期限が切れています」と「メールをもう一度送る」

- [ ] **Step 5: パスワードを忘れたときからログインまでをブラウザで通す（幅390px）**

1. 「じぶん」のパネルからログアウトする
2. `/login` の「パスワードを忘れたら」→ `/forgot-password` で `mail-check@example.com` を入れて「メールを送る」→「メールを送りました…」
3. Mailpit で「パスワード再設定」のメールを開き、リンクの行き先（`http://localhost:3000/password-reset/{token}?email=…`）を開く → メールアドレスが入っている
4. 新しいパスワードを `short` と入れて送る → ブラウザが8文字以上を求める。`password2` と `password3` を入れて送る → 「もう一度入れる」と違うことが、パスワードの欄の下に出る
5. 両方 `password2` にして送る → `/login?reset=1` に移り「新しいパスワードでログインしてね」
6. `mail-check@example.com`・`password2` でログインできる。ログアウトする
7. 使い終わった同じリンクをもう一度開いて `password4` で送る → 「リンクが古いか、正しくありません…」と「もう一度メールを送る」
8. `/forgot-password` で `nobody@example.com` を入れる → 同じ「メールを送りました…」（Mailpit には届かない）

- [ ] **Step 6: 幅320pxと1280pxでも確かめる**

- 320px: `/forgot-password`・`/password-reset/…`・`/verify-email?status=expired`・`/login` が横にはみ出さない（`document.documentElement.scrollWidth` が320）。プロフィール選びのお知らせがはみ出さない
- 1280px: 同じ画面が真ん中に、幅384px（`max-w-sm`）のカードでおさまる

合わないところは直し、Ruling として記録する。

- [ ] **Step 7: 試しに作ったアカウントを消し、開発用のデータを確かめる**

```bash
./vendor/bin/sail artisan tinker --execute='$u=App\Models\User::where("email","mail-check@example.com")->first(); if ($u) { DB::table("password_reset_tokens")->where("email",$u->email)->delete(); $u->delete(); } echo App\Models\User::where("email","mail-check@example.com")->count(), PHP_EOL;'
```

Expected: `0`（家族・プレイヤー・プレイヤーの記録は、データベースの決まりで一緒に消える）。Step 3 のコマンドをもう一度流し、Step 3 と同じ（町を開いておつかいが増えていたら、町テスト＝id 7 の増えた `profile_errands` の行を消す）。Mailpit の試しのメールは、Mailpit の画面の「Delete all」で消す

- [ ] **Step 8: ドキュメントを直す**

リポジトリ直下で:

```bash
python3 - <<'EOF'
from pathlib import Path
p = Path("SPEC.md")
s = p.read_text(encoding="utf-8")
anchor = "- ✅ プロフィールの作成・選択・**編集・削除**（2026-07-29追加）\n"
assert s.count(anchor) == 1
line = "- ✅（2026-09-29）**メール確認とパスワード再設定の画面**: 利用者のアカウントはメール確認あり。登録すると確認メールを送り、確かめるまではプロフィール選びとショップのコイン購入の欄にお知らせを出す（町・学ぶは止めない）。コインの購入だけは確かめるまでできない（`POST /api/coin-purchases/checkout` が403・`email_unverified`）。確認のリンクはログイン不要で24時間有効、結果は `/verify-email?status=verified|expired|invalid`。ログイン画面の「パスワードを忘れたら」から `/forgot-password`（登録の有無に関係なく同じ返事）→ メールのリンク → `/password-reset/{token}` → `/login?reset=1`。開発ではMailpit（`http://localhost:8025`）でメールを見る。本番のメールの送り先は本番デプロイの設計で決める（`docs/design/2026-09-29-email-verify-reset-design.md`）\n"
# 4-1(認証・アカウント)のプロフィールの行の次に足す
s = s.replace(anchor, anchor + line, 1)
p.write_text(s, encoding="utf-8")

p = Path("TASKS.md")
s = p.read_text(encoding="utf-8")
old = "- [ ] **メール確認・パスワード再設定のページを作る**（公開前必須、2026-09-29追加）"
assert s.count(old) == 1
s = s.replace(old, "- [x] **メール確認・パスワード再設定のページを作る**（公開前必須、2026-09-29追加。2026-09-29実装。設計書 `docs/design/2026-09-29-email-verify-reset-design.md`、実装計画 `docs/design/2026-09-29-email-verify-reset-plan.md`）", 1)
old2 = "- [ ] **本番デプロイの大枠設計**: AWS構成・ドメイン・HTTPS・Stripe本番キー切替の計画を立てる"
assert s.count(old2) == 1
s = s.replace(old2, "- [ ] **本番デプロイの大枠設計**: AWS構成・ドメイン・HTTPS・Stripe本番キー切替・メールの送り先（Amazon SES など）と差出人のアドレスの計画を立てる", 1)
p.write_text(s, encoding="utf-8")
print("ok")
EOF
```

Expected: `ok`。`git diff SPEC.md` で、足した行が4-1（認証・アカウント）のプロフィールの行の次にあることを目で確かめる

- [ ] **Step 9: サーバーと画面のテスト全部・型・lint を確かめる**

Run: `./vendor/bin/sail test 2>&1 | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`（2分を超えるので長く待てる形で）と `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: サーバーは `"result":"passed"`、画面は全部 PASS、エラーなし

- [ ] **Step 10: コミット**

```bash
git add compose.yaml .env.example lang/ja.json SPEC.md TASKS.md
git commit -q -m "#00264: chore:開発用にMailpitを足し、アプリの名前をSpra Goにして、メール確認・パスワード再設定をSPEC/TASKSに反映する" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

（`.env` はコミットしない。Step 4〜6 で直したところがあれば、そのファイルも `git add` する）
