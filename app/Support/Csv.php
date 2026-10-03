<?php

namespace App\Support;

/**
 * CSVを作る(docs/design/2026-10-03-analytics-design.md 6-3)。先頭にBOMを付けて、Excelで文字化けしないようにする。
 * `=` `+` `-` `@`・タブ・改行で始まる文字は、Excelで式として動かないように、先頭に `'` を付ける。数字はそのまま
 */
class Csv
{
    /**
     * @param  list<string>  $header
     * @param  iterable<list<mixed>>  $rows
     */
    public static function make(array $header, iterable $rows): string
    {
        $stream = fopen('php://temp', 'r+');
        fwrite($stream, "\xEF\xBB\xBF");

        foreach ([$header, ...$rows] as $row) {
            fputcsv($stream, array_map(self::cell(...), $row), ',', '"', '\\', "\r\n");
        }

        rewind($stream);

        return stream_get_contents($stream);
    }

    private static function cell(mixed $value): string|int|float
    {
        if ($value === null) {
            return '';
        }
        if (is_int($value) || is_float($value)) {
            return $value;
        }

        $text = (string) $value;

        return preg_match('/^[=+\-@\t\r]/u', $text) ? "'".$text : $text;
    }
}
