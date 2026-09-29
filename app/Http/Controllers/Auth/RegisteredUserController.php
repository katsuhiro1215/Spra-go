<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
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
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

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
