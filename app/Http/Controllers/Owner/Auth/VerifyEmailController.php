<?php

namespace App\Http\Controllers\Owner\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;

class VerifyEmailController extends Controller
{
    /**
     * Mark the authenticated owner's email address as verified.
     */
    public function __invoke(EmailVerificationRequest $request): RedirectResponse
    {
        if ($request->user('owner')->hasVerifiedEmail()) {
            return redirect()->intended(
                config('app.frontend_url').'/owner/dashboard?verified=1'
            );
        }

        if ($request->user('owner')->markEmailAsVerified()) {
            event(new Verified($request->user('owner')));
        }

        return redirect()->intended(
            config('app.frontend_url').'/owner/dashboard?verified=1'
        );
    }
}
