<?php

namespace App\Providers;

use App\Models\Admin;
use App\Models\Owner;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            $prefix = match (true) {
                $notifiable instanceof Admin => '/admin',
                $notifiable instanceof Owner => '/owner',
                default => '',
            };

            return config('app.frontend_url')."{$prefix}/password-reset/$token?email={$notifiable->getEmailForPasswordReset()}";
        });

        VerifyEmail::createUrlUsing(function (object $notifiable) {
            $routeName = match (true) {
                $notifiable instanceof Admin => 'admin.verification.verify',
                $notifiable instanceof Owner => 'owner.verification.verify',
                default => 'verification.verify',
            };

            // 利用者の確認のリンクは24時間、運営側は60分(config/auth.php の verification)
            $minutes = $routeName === 'verification.verify'
                ? config('auth.verification.user_expire', 1440)
                : config('auth.verification.expire', 60);

            return URL::temporarySignedRoute($routeName, now()->addMinutes($minutes), [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]);
        });
    }
}
