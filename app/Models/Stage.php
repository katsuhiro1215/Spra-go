<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;

class Stage extends Model
{
    protected $fillable = [
        'category_id',
        'country_id',
        'region_id',
        'difficulty',
        'stage_number',
        'question_theme_id',
        'question_count',
        'is_boss',
        'is_pool',
        'reward_percent',
        'title_reward',
    ];

    protected function casts(): array
    {
        return [
            'is_boss' => 'boolean',
            'is_pool' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function questionTheme(): BelongsTo
    {
        return $this->belongsTo(QuestionTheme::class);
    }

    public function questions(): BelongsToMany
    {
        return $this->belongsToMany(Question::class, 'stage_questions')
            ->withPivot('order')
            ->withTimestamps()
            ->orderByPivot('order');
    }

    /**
     * 難易度単位のロック判定。1つ前の難易度(config('quiz.difficulties')の並び順)の
     * ボスステージがクリア済みでなければロックする。初級(先頭)は常にロックしない。
     * ボスステージが存在しない(=まだコンテンツが無い)難易度もロック扱いにする。
     *
     * @param  Collection<string, Collection<int, Stage>>  $stagesByDifficulty  同一category内でdifficultyごとにグループ化したStage一覧
     * @param  list<int>  $clearedStageIds
     */
    /** 満点になる問題の数。プールのステージは、出す数(question_count)まで。そうでなければ割り当てた問題すべて */
    public function playCount(): int
    {
        $pool = $this->questions()->count();

        return $this->is_pool ? min($this->question_count, $pool) : $pool;
    }

    public static function isDifficultyLocked(Collection $stagesByDifficulty, string $difficulty, array $clearedStageIds, array $bestScores = []): bool
    {
        $order = array_merge(config('quiz.difficulties'), config('quiz.extra_difficulties'));
        $index = array_search($difficulty, $order, true);

        if ($index === false || $index === 0) {
            return false;
        }

        $previousStages = $stagesByDifficulty->get($order[$index - 1]) ?? collect();
        $previousBoss = $previousStages->first(fn (Stage $stage) => $stage->is_boss);

        if ($previousBoss && in_array($previousBoss->id, $clearedStageIds, true)) {
            return false;
        }

        // 近道: 前の級で、3ステージ以上遊び、合計の正答率が50%を超えていれば、ボス前でも開く(docs/design/2026-10-07-main-game-levels-design.md 4-4)
        $shortcut = config('quiz.shortcut');
        $played = $previousStages->filter(fn (Stage $stage) => isset($bestScores[$stage->id]));
        if ($played->count() < $shortcut['min_stages']) {
            return true;
        }
        $total = $played->sum(fn (Stage $stage) => $stage->playCount());

        return $total === 0 || $played->sum(fn (Stage $stage) => $bestScores[$stage->id]) * 100 <= $shortcut['percent'] * $total;
    }

    /** 遊んだことのあるステージの、いちばん良かった点(ステージの番号 → 点) @return array<int, int> */
    public static function bestScores(?int $profileId): array
    {
        return $profileId
            ? ProfileStageProgress::query()->where('user_profile_id', $profileId)->where('attempts', '>', 0)->pluck('best_score', 'stage_id')->map(fn ($score) => (int) $score)->all()
            : [];
    }
}
