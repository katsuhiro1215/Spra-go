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

    public static function isDifficultyLocked(Collection $stagesByDifficulty, string $difficulty, array $clearedStageIds): bool
    {
        $order = array_merge(config('quiz.difficulties'), config('quiz.extra_difficulties'));
        $index = array_search($difficulty, $order, true);

        if ($index === false || $index === 0) {
            return false;
        }

        $previousDifficulty = $order[$index - 1];
        $previousBoss = ($stagesByDifficulty->get($previousDifficulty) ?? collect())
            ->first(fn (Stage $stage) => $stage->is_boss);

        return ! $previousBoss || ! in_array($previousBoss->id, $clearedStageIds, true);
    }
}
