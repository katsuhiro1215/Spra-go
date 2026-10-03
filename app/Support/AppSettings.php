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
