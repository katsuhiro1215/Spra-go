<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AppSettings;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

class RegisteredUserController extends Controller
{
    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): Response
    {
        // 招待制の試験公開(docs/design/2026-10-03-closed-beta-design.md 3-2)。おやすみ中は受け付けず、
        // 招待コードが設定されていれば、合うコードを必須にする
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

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->string('password')),
        ]);

        $user->schema()->create();

        // 確認メールを送る(docs/design/2026-09-29-email-verify-reset-design.md 4-1)。メールのサーバーが止まっていても
        // 登録は成功させ、エラーは記録に残す(アカウントはもうできているので、失敗を返すと登録し直せなくなる。メールは
        // プロフィール選びのお知らせの「もう一度送る」から送り直せる)
        rescue(fn () => event(new Registered($user)));

        Auth::login($user);

        return response()->noContent();
    }
}
