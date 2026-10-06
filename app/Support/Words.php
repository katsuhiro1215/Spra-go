<?php

namespace App\Support;

use App\Models\ProfileWord;
use App\Models\Question;

/** 単語帳の決まり(docs/design/2026-10-07-word-book-design.md)。取り込み・API・出会いの記録 */
class Words
{
    /** 重要度(★の数)の既定。語のレベルで決まる */
    public static function defaultImportance(int $level): int
    {
        $tiers = config('words.importance_by_level');
        ksort($tiers);
        foreach ($tiers as $upTo => $importance) {
            if ($level <= $upTo) {
                return $importance;
            }
        }

        return (int) end($tiers);
    }

    /** 品詞の短い表示(名・動・形…)。「名詞・動詞」は「名・動」。知らない品詞は、そのまま */
    public static function posLabel(string $pos): string
    {
        $labels = config('words.pos_labels');

        return implode('・', array_map(fn (string $part) => $labels[trim($part)] ?? trim($part), explode('・', $pos)));
    }

    /**
     * 問題に答えたとき、その問題の語に出会ったことにする(profile_words の seen_at。最初の日時のまま)。
     * 語のない問題(meta.word_id がない)は何もしない。保存・苦手・覚えたのマークは変えない
     */
    public static function encounter(int $profileId, int $questionId): void
    {
        $wordId = Question::query()->find($questionId, ['id', 'meta'])?->meta['word_id'] ?? null;
        if ($wordId === null) {
            return;
        }

        $record = ProfileWord::query()->firstOrCreate(['user_profile_id' => $profileId, 'word_id' => (int) $wordId]);
        if ($record->seen_at === null) {
            $record->update(['seen_at' => now()]);
        }
    }
}
