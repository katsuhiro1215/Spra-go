<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Question;
use App\Models\QuestionChoice;
use App\Models\UserProfile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * ミニゲーム1本目「スプルキャッチ(英単語)」(docs/design/2026-09-29-spru-catch-design.md 4〜6章)。
 * 「英語を学ぶ」の問題から、選んだ難しさ・鍵のない国・4択・選択肢が短い問題を選び、
 * 最近まちがえた問題と出す日が来た問題を先に出す。正解は始めるときに渡し、終えるときに採点し直す。
 */
class CatchGame
{
    public const GAME = 'catch';

    /** 難しさを選ぶ画面に出すもの(設計書6-3) */
    public static function summary(UserProfile $profile): array
    {
        $best = $profile->gamePlays()
            ->where('game', self::GAME)
            ->whereNotNull('finished_at')
            ->groupBy('difficulty')
            ->selectRaw('difficulty, MAX(score) AS best')
            ->pluck('best', 'difficulty');

        return [
            'category_id' => self::categoryId(),
            'difficulties' => collect(config('games.catch.difficulties'))
                ->map(fn (array $settings, string $difficulty) => [
                    'difficulty' => $difficulty,
                    'lanes' => $settings['lanes'],
                    'available' => self::pool($profile, $difficulty)->count(),
                    'best_score' => isset($best[$difficulty]) ? (int) $best[$difficulty] : null,
                ])
                ->values()
                ->all(),
            'rewarded_plays_left' => self::rewardedPlaysLeft($profile),
        ];
    }

    /** 回を始める。問題を選んで遊んだ回を1行作り、問題と正解と設定を返す(設計書4章・6-3) */
    public static function start(UserProfile $profile, string $difficulty): array
    {
        $settings = self::settings($difficulty);
        $pool = self::pool($profile, $difficulty);
        abort_if(
            $pool->isEmpty(),
            422,
            self::stageQuestionIds($profile, null) === [] ? config('games.catch.messages.locked') : config('games.catch.messages.empty'),
        );

        $ids = self::pick($profile, $pool->pluck('id')->all());
        $play = $profile->gamePlays()->create(['game' => self::GAME, 'difficulty' => $difficulty, 'question_ids' => $ids]);
        $byId = $pool->keyBy('id');

        return [
            'play_id' => $play->id,
            'difficulty' => $difficulty,
            'lanes' => $settings['lanes'],
            'fall_ms' => $settings['fall_ms'],
            'questions' => array_map(fn (int $id) => self::present($byId[$id], $settings['lanes']), $ids),
        ];
    }

    /** 今日のごほうびの残り回数。その日に終えた回を数える(終えていない回は数えない。設計書5-2) */
    public static function rewardedPlaysLeft(UserProfile $profile): int
    {
        $finishedToday = $profile->gamePlays()
            ->where('game', self::GAME)
            ->where('played_on', Garden::today())
            ->count();

        return max(0, config('games.catch.daily_rewarded_plays') - $finishedToday);
    }

    /** @return array{lanes: int, fall_ms: int, max_label_width: int, reward: array{xp: int, point: int}} */
    private static function settings(string $difficulty): array
    {
        return config('games.catch.difficulties')[$difficulty];
    }

    private static function categoryId(): ?int
    {
        $id = Category::query()->where('name', config('games.catch.category'))->value('id');

        return $id === null ? null : (int) $id;
    }

    /**
     * 「英語を学ぶ」の、鍵のない国のステージに入っている問題の番号。$difficulty が null なら全部の難しさ
     *
     * @return list<int>
     */
    private static function stageQuestionIds(UserProfile $profile, ?string $difficulty): array
    {
        $categoryId = self::categoryId();
        if ($categoryId === null) {
            return [];
        }
        $locked = Travel::lockedCountryIds($profile);

        return DB::table('stage_questions')
            ->join('stages', 'stages.id', '=', 'stage_questions.stage_id')
            ->where('stages.category_id', $categoryId)
            ->when($difficulty !== null, fn ($query) => $query->where('stages.difficulty', $difficulty))
            ->when($locked !== [], fn ($query) => $query->where(
                fn ($inner) => $inner->whereNull('stages.country_id')->orWhereNotIn('stages.country_id', $locked),
            ))
            ->distinct()
            ->pluck('stage_questions.question_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * 使える問題(設計書4-1)
     *
     * @return Collection<int, Question>
     */
    private static function pool(UserProfile $profile, string $difficulty): Collection
    {
        $settings = self::settings($difficulty);

        return Question::query()
            ->with('choices')
            ->whereIn('id', self::stageQuestionIds($profile, $difficulty))
            ->where('type', 'multiple_choice')
            ->orderBy('id')
            ->get(['id', 'prompt'])
            ->filter(fn (Question $question) => self::fits($question, $settings))
            ->values();
    }

    /** 正解が1つ、まちがいが「列の数−1」以上、選択肢がすべて長さの上限に収まる */
    private static function fits(Question $question, array $settings): bool
    {
        return $question->choices->where('is_correct', true)->count() === 1
            && $question->choices->where('is_correct', false)->count() >= $settings['lanes'] - 1
            && $question->choices->every(fn (QuestionChoice $choice) => mb_strwidth($choice->label) <= $settings['max_label_width']);
    }

    /**
     * 出す問題を選ぶ(設計書4-2)。最近まちがえた問題 → 出す日が来た問題(あわせて review_max まで) →
     * どちらでもない問題をランダムに。足りなければ、入りきらなかった復習の問題を足す。最後に順をまぜる
     *
     * @param  list<int>  $poolIds
     * @return list<int>
     */
    private static function pick(UserProfile $profile, array $poolIds): array
    {
        $reviewMax = config('games.catch.review_max');
        $wrong = QuestionMemory::wrongIdsAmong($profile, $poolIds, count($poolIds));
        $due = QuestionMemory::dueIdsAmong($profile, array_values(array_diff($poolIds, $wrong)), count($poolIds));
        $review = [...$wrong, ...$due];
        $fresh = collect($poolIds)->diff($review)->shuffle()->values()->all();

        return collect([...array_slice($review, 0, $reviewMax), ...$fresh, ...array_slice($review, $reviewMax)])
            ->take(config('games.catch.question_count'))
            ->shuffle()
            ->values()
            ->all();
    }

    /** 正解と、まちがいからランダムに「列の数−1」個をまぜて列の順にする(設計書4-3) */
    private static function present(Question $question, int $lanes): array
    {
        $correct = $question->choices->firstWhere('is_correct', true);
        $choices = $question->choices
            ->where('is_correct', false)
            ->shuffle()
            ->take($lanes - 1)
            ->push($correct)
            ->shuffle()
            ->values();

        return [
            'id' => $question->id,
            'prompt' => $question->prompt,
            'choices' => $choices->map(fn (QuestionChoice $choice) => ['id' => $choice->id, 'label' => $choice->label])->all(),
            'correct_choice_id' => $correct->id,
        ];
    }
}
