<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // 保護者のご意見を送る、中央管理システム(Spra)のお問い合わせAPI。どれかが空なら送らない
    'spra_contact' => [
        'url' => env('SPRA_CONTACT_API_URL'),
        'key' => env('SPRA_CONTACT_API_KEY'),
        'category_id' => env('SPRA_CONTACT_CATEGORY_ID'),
        'site_url' => env('NEXT_PUBLIC_SITE_URL', env('FRONTEND_URL')),
    ],

    // Googleでのログイン・登録。クライアントIDかシークレットが空なら、ボタンを出さない(docs/design/2026-10-12-google-auth-design.md)
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', rtrim((string) env('APP_URL', 'http://localhost'), '/').'/auth/google/callback'),
    ],

    'stripe' => [
        'public_key' => env('STRIPE_PUBLIC_KEY'),
        'secret_key' => env('STRIPE_SECRET_KEY'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

];
