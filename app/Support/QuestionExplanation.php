<?php

namespace App\Support;

/**
 * 問題の解説(docs/design/2026-10-06-question-explanation-design.md 3章)を、書く前にそろえる。
 * 形: summary(要約)・example{text, translation}(例文)・usage(使いどころ)・related[{term, note}](似た語)。すべて任意。
 * 知らないキーは捨て、文字の前後の空白を取り、空の項目は捨てる。なにも残らなければ null
 */
class QuestionExplanation
{
    public static function normalize(mixed $explanation): ?array
    {
        if (! is_array($explanation)) {
            return null;
        }

        $result = [];

        if (($summary = self::text($explanation['summary'] ?? null)) !== null) {
            $result['summary'] = $summary;
        }

        if (is_array($explanation['example'] ?? null) && ($text = self::text($explanation['example']['text'] ?? null)) !== null) {
            $result['example'] = ['text' => $text];
            if (($translation = self::text($explanation['example']['translation'] ?? null)) !== null) {
                $result['example']['translation'] = $translation;
            }
        }

        if (($usage = self::text($explanation['usage'] ?? null)) !== null) {
            $result['usage'] = $usage;
        }

        $related = [];
        foreach (is_array($explanation['related'] ?? null) ? $explanation['related'] : [] as $item) {
            if (! is_array($item) || ($term = self::text($item['term'] ?? null)) === null) {
                continue;
            }
            $related[] = ['term' => $term] + (($note = self::text($item['note'] ?? null)) !== null ? ['note' => $note] : []);
        }
        if ($related !== []) {
            $result['related'] = $related;
        }

        return $result === [] ? null : $result;
    }

    private static function text(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }
        $value = trim($value);

        return $value === '' ? null : $value;
    }
}
