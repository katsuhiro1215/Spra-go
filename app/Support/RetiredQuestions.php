<?php

namespace App\Support;

/**
 * 国のコースの問題から外す問題の一覧(docs/content/retired-questions.json)。
 * 同じ国旗の問題が何度も出る問題を直すため、国旗の問題を、国ごと・級ごとに少数に絞った。
 * 問題そのものは消さない(覚え具合の記録を守る)。ステージにつながないだけ
 */
class RetiredQuestions
{
    /** @return array<string, array<string, list<string>>> 国コード(小文字) => 級 => 問題文 */
    public static function all(): array
    {
        $path = config('content.retired_file');
        if (! is_string($path) || ! is_file($path)) {
            return [];
        }

        $data = json_decode((string) file_get_contents($path), true);

        // 「_説明」のような、先頭が _ のキーは注釈
        return is_array($data) ? array_filter($data, fn ($value, $key) => ! str_starts_with((string) $key, '_') && is_array($value), ARRAY_FILTER_USE_BOTH) : [];
    }

    /** @return list<string> */
    public static function prompts(string $countryCode, string $difficulty): array
    {
        return self::all()[strtolower($countryCode)][$difficulty] ?? [];
    }
}
