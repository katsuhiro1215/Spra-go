<?php

namespace App\Http\Controllers\Owner\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationNotificationController extends Controller
{
    /**
     * Send a new email verification notification.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        if ($request->user('owner')->hasVerifiedEmail()) {
            return redirect()->intended('/owner/dashboard');
        }

        $request->user('owner')->sendEmailVerificationNotification();

        return response()->json(['status' => 'verification-link-sent']);
    }
}
