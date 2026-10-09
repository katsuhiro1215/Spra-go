<?php

namespace App\Support;

use App\Models\Category;
use App\Models\ProfileGamePlay;
use App\Models\Question;
use App\Models\QuestionChoice;
use App\Models\Quiz;
use App\Models\UserProfile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * ミニゲーム「スプルキャッチ」(docs/design/2026-09-29-spru-catch-design.md 4〜6章)と、その国旗版「スプルキャッチ(こっき)」
 * (docs/design/2026-10-05-flag-catch-design.md 5章)。ゲームの名前(catch・flag_catch)を引数で受け、設定は config('games.{ゲーム}') から読む。
 * 英語(catch)は「英語を学ぶ」の問題から、選んだ難しさ・鍵のない国・4択・選択肢が短い問題を選ぶ。
 * 国旗(flag_catch)は、難しさごとの国旗キャッチ専用のクイズの問題から選ぶ。
 * どちらも、最近まちがえた問題と出す日が来た問題を先に出す。正解は始めるときに渡し、終えるときに採点し直す。
 */
class CatchGame
{
    public const GAME = 'catch';

    public const FLAG_GAME = 'flag_catch';

    public const SPACE_GAME = 'space_trip';

    /** 難しさを選ぶ画面に出すもの(設計書6-3) */
    public static function summary(UserProfile $profile, string $game = self::GAME): array
    {
        $best = $profile->gamePlays()
            ->where('game', $game)
            ->whereNotNull('finished_at')
            ->groupBy('difficulty')
            ->selectRaw('difficulty, MAX(score) AS best')
            ->pluck('best', 'difficulty');

        return [
            'category_id' => $game === self::GAME ? self::rootCategoryId($game) : null,
            'difficulties' => collect(config("games.{$game}.difficulties"))
                ->map(fn (array $settings, string $difficulty) => [
                    'difficulty' => $difficulty,
                    'lanes' => $settings['lanes'],
                    'available' => self::pool($profile, $difficulty, $game)->count(),
                    'best_score' => isset($best[$difficulty]) ? (int) $best[$difficulty] : null,
                ])
                ->values()
                ->all(),
            'rewarded_plays_left' => self::rewardedPlaysLeft($profile, $game),
        ];
    }

    /** 回を始める。問題を選んで遊んだ回を1行作り、問題と正解と設定を返す(設計書4章・6-3) */
    public static function start(UserProfile $profile, string $difficulty, string $game = self::GAME): array
    {
        $settings = self::settings($difficulty, $game);
        $pool = self::pool($profile, $difficulty, $game);
        abort_if($pool->isEmpty(), 422, self::emptyMessage($profile, $game));

        $ids = self::pick($profile, $pool->pluck('id')->all(), $game);
        $play = $profile->gamePlays()->create(['game' => $game, 'difficulty' => $difficulty, 'question_ids' => $ids]);
        $byId = $pool->keyBy('id');

        return [
            'play_id' => $play->id,
            'difficulty' => $difficulty,
            'lanes' => $settings['lanes'],
            'fall_ms' => $settings['fall_ms'],
        ] + (isset($settings['obstacle_rows']) ? ['obstacle_rows' => $settings['obstacle_rows']] : []) + [
            'questions' => array_map(fn (int $id) => self::present($byId[$id], $settings['lanes']), $ids),
        ];
    }

    /** 今日のごほうびの残り回数。その日に終えた回を数える(終えていない回は数えない。設計書5-2) */
    public static function rewardedPlaysLeft(UserProfile $profile, string $game = self::GAME): int
    {
        $finishedToday = $profile->gamePlays()
            ->where('game', $game)
            ->where('played_on', Garden::today())
            ->count();

        return max(0, config("games.{$game}.daily_rewarded_plays") - $finishedToday);
    }

    /**
     * 回を終える(設計書4-4・5章・6-3)。答えを採点し直して覚え具合に書き、その日の最初の3回ならごほうびを出す。
     * ゲームの名前は、回の game から決める。呼ぶ側で、終えていない回をロックしてから呼ぶ
     *
     * @param  list<array{question_id: int|string, choice_id: int|string}>  $answers  答えた順
     */
    public static function finish(ProfileGamePlay $play, array $answers): array
    {
        $game = $play->game;
        $dealt = array_map('intval', $play->question_ids);
        $questionIds = array_map(fn (array $answer) => (int) $answer['question_id'], $answers);
        abort_if(
            count($answers) > count($dealt)
            || count(array_unique($questionIds)) !== count($questionIds)
            || array_diff($questionIds, $dealt) !== [],
            422,
            '答えが正しくありません。',
        );

        $choices = QuestionChoice::query()
            ->whereIn('id', array_map(fn (array $answer) => (int) $answer['choice_id'], $answers))
            ->get(['id', 'question_id', 'is_correct'])
            ->keyBy('id');
        $maxStars = (int) config('games.space_trip.max_stars_per_question');
        $results = array_map(function (array $answer) use ($choices, $maxStars) {
            $choice = $choices->get((int) $answer['choice_id']);
            abort_if(! $choice || (int) $choice->question_id !== (int) $answer['question_id'], 422, '答えが正しくありません。');
            // 星は、うちゅう旅行だけ(省略なら0)。範囲だけを確かめる(設計書3-5)
            $stars = $answer['stars'] ?? 0;
            abort_if(! is_int($stars) && ! (is_string($stars) && ctype_digit($stars)) || (int) $stars < 0 || (int) $stars > $maxStars, 422, '星の数が正しくありません。');

            return ['question_id' => (int) $choice->question_id, 'correct' => $choice->is_correct, 'stars' => (int) $stars];
        }, $answers);

        $profile = UserProfile::query()->whereKey($play->user_profile_id)->lockForUpdate()->firstOrFail();
        $today = Garden::today();
        foreach ($results as $result) {
            QuestionMemory::record($profile, $result['question_id'], $result['correct'], $today);
        }

        $flags = array_column($results, 'correct');
        $starCounts = array_column($results, 'stars');
        $totalStars = array_sum($starCounts);
        ['score' => $score, 'best_combo' => $bestCombo] = self::score($flags, $starCounts);
        $correctCount = count(array_filter($flags));
        $previousBest = (int) $profile->gamePlays()
            ->where('game', $game)
            ->where('difficulty', $play->difficulty)
            ->whereNotNull('finished_at')
            ->max('score');
        $left = self::rewardedPlaysLeft($profile, $game);
        $previousLevel = $profile->level;
        $reward = null;
        $leveledUp = false;

        if ($left > 0 && $correctCount > 0) {
            $per = self::settings($play->difficulty, $game)['reward'];
            $reward = ['xp' => $correctCount * $per['xp'], 'point' => $correctCount * $per['point']];
            $leveledUp = $profile->applyEconomy($reward, "game_{$game}")['leveled_up'];
        }

        $play->fill([
            'finished_at' => now(),
            'played_on' => $today,
            'answered_count' => count($results),
            'correct_count' => $correctCount,
            'score' => $score,
            'best_combo' => $bestCombo,
            'stars' => $game === self::SPACE_GAME ? $totalStars : null,
            'rewarded' => $reward !== null,
        ])->save();

        return [
            'answered_count' => count($results),
            'correct_count' => $correctCount,
            'score' => $score,
            'best_combo' => $bestCombo,
            'best_score' => max($previousBest, $score),
            'new_best' => $score > $previousBest,
            'reward' => $reward,
            'rewarded_plays_left' => max(0, $left - 1),
            'leveled_up' => $leveledUp,
            'previous_level' => $previousLevel,
            'level' => $profile->level,
        ] + ($game === self::SPACE_GAME ? [
            'stars' => $totalStars,
            'destination' => self::spaceDestination($correctCount, count($dealt)),
        ] : []);
    }

    /**
     * 到着する星(設計書2章)。正解の数を、出した問題の数で10問に換算して、config('games.space_trip.destinations') の区切りで決める
     */
    public static function spaceDestination(int $correct, int $dealt): string
    {
        $converted = $dealt > 0 ? (int) round($correct * 10 / $dealt) : 0;
        foreach (config('games.space_trip.destinations') as $limit => $key) {
            if ($converted <= $limit) {
                return $key;
            }
        }

        return array_key_last(array_flip(config('games.space_trip.destinations')));
    }

    /**
     * 答えの並び(正解か)から、点数といちばん長いコンボ(設計書3-5)。画面の scoreOf と同じ決まり。
     * 点数の決まりは、英語と国旗で共通(games.catch.score)
     *
     * 星(うちゅう旅行。答えごとの数)は、そのまま点数に足す。省略なら足さない
     *
     * @param  list<bool>  $results
     * @param  list<int>  $stars
     * @return array{score: int, best_combo: int}
     */
    public static function score(array $results, array $stars = []): array
    {
        $rules = config('games.catch.score');
        $score = 0;
        $combo = 0;
        $best = 0;

        foreach ($results as $correct) {
            if (! $correct) {
                $combo = 0;

                continue;
            }
            $combo++;
            $best = max($best, $combo);
            $score += $rules['correct'] + ($combo >= $rules['combo_bonus_from'] ? $rules['combo_bonus'] : 0);
        }

        return ['score' => $score + array_sum($stars), 'best_combo' => $best];
    }

    /** @return array{lanes: int, fall_ms: int, max_label_width?: int, quiz?: string, reward: array{xp: int, point: int}} */
    private static function settings(string $difficulty, string $game): array
    {
        return config("games.{$game}.difficulties")[$difficulty];
    }

    /** ゲームの問題を探すカテゴリー。ゲームごとの category があればそれ、なければ英語のもの */
    private static function rootCategoryId(string $game): ?int
    {
        $name = config("games.{$game}.category") ?? config('games.catch.category');
        $id = Category::query()->where('name', $name)->whereNull('parent_id')->value('id')
            ?? Category::query()->where('name', $name)->value('id');

        return $id === null ? null : (int) $id;
    }

    /**
     * そのカテゴリーと、その子(宇宙の「宇宙たんけん」のように、ステージが子のカテゴリーにあるもの)の番号
     *
     * @return list<int>
     */
    private static function categoryIds(string $game): array
    {
        $root = self::rootCategoryId($game);
        if ($root === null) {
            return [];
        }

        return [$root, ...Category::query()->where('parent_id', $root)->pluck('id')->map(fn ($id) => (int) $id)->all()];
    }

    /** 使える問題が0のときの文。英語は、どの国にも着いていなければ「着くと遊べるよ」、国旗は「まだないよ」 */
    private static function emptyMessage(UserProfile $profile, string $game): string
    {
        if ($game === self::GAME && self::stageQuestionIds($profile, null, $game) === []) {
            return config('games.catch.messages.locked');
        }

        return config("games.{$game}.messages.empty");
    }

    /**
     * 「英語を学ぶ」の、鍵のない国のステージに入っている問題の番号。$difficulty が null なら全部の難しさ
     *
     * @return list<int>
     */
    private static function stageQuestionIds(UserProfile $profile, ?string $difficulty, string $game = self::GAME): array
    {
        $categoryIds = self::categoryIds($game);
        if ($categoryIds === []) {
            return [];
        }
        $locked = Travel::lockedCountryIds($profile);

        return DB::table('stage_questions')
            ->join('stages', 'stages.id', '=', 'stage_questions.stage_id')
            ->whereIn('stages.category_id', $categoryIds)
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
     * 国旗キャッチ専用のクイズの問題の番号
     *
     * @return list<int>
     */
    private static function quizQuestionIds(string $title): array
    {
        return Question::query()
            ->whereIn('quiz_id', Quiz::query()->where('title', $title)->pluck('id'))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * 使える問題(設計書4-1)
     *
     * @return Collection<int, Question>
     */
    private static function pool(UserProfile $profile, string $difficulty, string $game): Collection
    {
        $settings = self::settings($difficulty, $game);
        $ids = isset($settings['quiz'])
            ? self::quizQuestionIds($settings['quiz'])
            : self::stageQuestionIds($profile, $difficulty, $game);

        return Question::query()
            ->with('choices')
            ->whereIn('id', $ids)
            ->where('type', 'multiple_choice')
            ->orderBy('id')
            ->get(['id', 'prompt'])
            ->filter(fn (Question $question) => self::fits($question, $settings))
            ->values();
    }

    /** 正解が1つ、まちがいが「列の数−1」以上、(上限があれば)選択肢がすべて長さの上限に収まる */
    private static function fits(Question $question, array $settings): bool
    {
        return $question->choices->where('is_correct', true)->count() === 1
            && $question->choices->where('is_correct', false)->count() >= $settings['lanes'] - 1
            && (! isset($settings['max_label_width'])
                || $question->choices->every(fn (QuestionChoice $choice) => mb_strwidth($choice->label) <= $settings['max_label_width']));
    }

    /**
     * 出す問題を選ぶ(設計書4-2)。最近まちがえた問題 → 出す日が来た問題(あわせて review_max まで) →
     * どちらでもない問題をランダムに。足りなければ、入りきらなかった復習の問題を足す。最後に順をまぜる
     *
     * @param  list<int>  $poolIds
     * @return list<int>
     */
    private static function pick(UserProfile $profile, array $poolIds, string $game): array
    {
        $reviewMax = config("games.{$game}.review_max");
        $wrong = QuestionMemory::wrongIdsAmong($profile, $poolIds, count($poolIds));
        $due = QuestionMemory::dueIdsAmong($profile, array_values(array_diff($poolIds, $wrong)), count($poolIds));
        $review = [...$wrong, ...$due];
        $fresh = collect($poolIds)->diff($review)->shuffle()->values()->all();

        return collect([...array_slice($review, 0, $reviewMax), ...$fresh, ...array_slice($review, $reviewMax)])
            ->take(config("games.{$game}.question_count"))
            ->shuffle()
            ->values()
            ->all();
    }

    /** 正解と、まちがいからランダムに「列の数−1」個をまぜて列の順にする(設計書4-3)。国旗の絵があれば image を付ける */
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
            'choices' => $choices->map(function (QuestionChoice $choice) {
                $image = $choice->meta['image'] ?? null;

                return ['id' => $choice->id, 'label' => $choice->label] + ($image !== null ? ['image' => $image] : []);
            })->all(),
            'correct_choice_id' => $correct->id,
        ];
    }
}
