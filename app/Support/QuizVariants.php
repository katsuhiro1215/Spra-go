<?php

namespace App\Support;

use App\Models\ProfileQuestionMemory;
use App\Models\Question;
use App\Models\UserProfile;
use App\Models\Word;
use Illuminate\Support\Collection;

/**
 * 遊ぶときに、問題の形を変える(docs/design/2026-10-09-review-variety-design.md 3章)。
 * 今は「スペルを並べる」だけ: 前に答えたことのある英単語の問題を、文字のタイルを並べて書く形にする。
 * 問題そのものは変えない(答えは元の問題の覚え具合に記録される)
 */
class QuizVariants
{
    /** スペルの形にできる問題か: 英単語の問題で、単語が英字だけ・決まった長さ */
    public static function eligible(Question $question): bool
    {
        $word = $question->meta['word'] ?? null;
        $config = config('review.variants.spelling');

        return ($question->meta['kind'] ?? null) === 'word'
            && is_string($word)
            && preg_match('/^[a-z]{'.$config['min_length'].','.$config['max_length'].'}$/', $word) === 1;
    }

    /**
     * 出す問題の並びのうち、条件に合うものを、スペルの形にする。ステージ1回に最大 max_per_stage 問で、隣り合わせにしない。
     * 形を変えた問題は、選択肢を空にし、答えの手がかり(meta.word)を隠して、variant を付ける
     *
     * @param  Collection<int, Question>  $questions  並べた順のもの(添字は0から)
     */
    public static function apply(UserProfile $profile, Collection $questions): void
    {
        $config = config('review.variants.spelling');
        $seen = ProfileQuestionMemory::query()
            ->where('user_profile_id', $profile->id)
            ->whereIn('question_id', $questions->pluck('id'))
            ->pluck('question_id')
            ->flip();

        $candidates = $questions->values()->keys()
            ->filter(fn (int $index) => self::eligible($questions->values()[$index]) && $seen->has($questions->values()[$index]->id))
            ->shuffle()
            ->values();

        $chosen = [];
        foreach ($candidates as $index) {
            if (count($chosen) >= $config['max_per_stage']) {
                break;
            }
            if (in_array($index - 1, $chosen, true) || in_array($index + 1, $chosen, true)) {
                continue;
            }
            $question = $questions->values()[$index];
            $variant = self::spelling($question);
            if ($variant === null) {
                continue;
            }
            $chosen[] = $index;
            $question->setAttribute('variant', $variant);
            $question->prompt = $variant['prompt']; // 元の問題文に、答えの単語が入っているので、差し替える
            $question->setRelation('choices', collect());
            $question->meta = array_diff_key($question->meta ?? [], ['word' => true]);
        }
    }

    /** @return array{kind: string, prompt: string, length: int, letters: list<string>}|null 日本語の意味がなければ null */
    private static function spelling(Question $question): ?array
    {
        $config = config('review.variants.spelling');
        $key = $question->meta['word'];
        $japanese = Word::query()->where('language', 'en')->where('key', $key)->first()?->meanings[0]['ja'][0] ?? null;
        if (! is_string($japanese) || $japanese === '') {
            return null;
        }

        $letters = str_split($key);
        $preschool = (int) ($question->meta['level'] ?? 99) <= $config['preschool_max_level'];
        $extra = $preschool ? $config['preschool_extra_letters'] : $config['extra_letters'];
        $pool = array_values(array_diff(range('a', 'z'), $letters));
        shuffle($pool);
        $tiles = [...$letters, ...array_slice($pool, 0, $extra)];
        for ($try = 0; $try < 5; $try++) {
            shuffle($tiles);
            if ($tiles !== $letters) {
                break;
            }
        }

        return [
            'kind' => 'spelling',
            'prompt' => "「{$japanese}」を 英語で かこう",
            'length' => count($letters),
            'letters' => $tiles,
        ];
    }
}
