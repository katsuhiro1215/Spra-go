<?php

namespace App\Http\Controllers\Admin\Auth;

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
        if ($request->user('admin')->hasVerifiedEmail()) {
            return redirect()->intended('/admin/dashboard');
        }

        $request->user('admin')->sendEmailVerificationNotification();

        return response()->json(['status' => 'verification-link-sent']);
    }
}
