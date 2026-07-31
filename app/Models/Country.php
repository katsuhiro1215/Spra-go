<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Country extends Model
{
    protected $fillable = [
        'code', 'name', 'stages', 'order', 'mood_emoji', 'intro_message',
        'three_code', 'name_en', 'country_code',
    ];

    public function languages(): BelongsToMany
    {
        return $this->belongsToMany(Language::class, 'country_language')
            ->withPivot('is_primary');
    }

    public function stages(): HasMany
    {
        return $this->hasMany(Stage::class);
    }

    /**
     * Accept-Languageヘッダーから「たぶんこの国」を弱く推定する。
     * IPジオロケーション(外部送信・精度は高いがプライバシー/依存コストが増える)は使わず、
     * ブラウザが送ってくる言語設定だけで判定する(2026-07-31 Owner合意)。
     * 判定できない、または該当国がコンテンツ対象に無い場合はnullを返す(必ず手動選択できる)。
     *
     * @param  list<string>  $availableCodes  コンテンツがある国のcode一覧(小文字/大文字は問わない)
     */
    public static function guessFromAcceptLanguage(?string $header, array $availableCodes): ?string
    {
        if (! $header) {
            return null;
        }

        $available = array_map('strtolower', $availableCodes);

        // 簡易マップ: 地域サブタグ無しの言語コードだけの場合のフォールバック
        $languageToCountry = [
            'ja' => 'jp',
            'fr' => 'fr',
        ];

        foreach (explode(',', $header) as $entry) {
            $tag = strtolower(trim(explode(';', $entry)[0] ?? ''));
            if ($tag === '') {
                continue;
            }

            $parts = explode('-', $tag);
            $region = $parts[1] ?? null;

            if ($region && in_array($region, $available, true)) {
                return $region;
            }

            $language = $parts[0];
            if (isset($languageToCountry[$language]) && in_array($languageToCountry[$language], $available, true)) {
                return $languageToCountry[$language];
            }
        }

        return null;
    }
}
