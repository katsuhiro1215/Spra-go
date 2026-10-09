<?php

namespace App\Models;

use App\Support\LevelCurve;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class UserProfile extends Model
{
    protected $fillable = [
        'name', 'avatar', 'hp', 'max_hp', 'hp_updated_at', 'xp', 'coins', 'points', 'world_welcomed_at', 'world_plots_seen', 'road_style',
        'level', 'combo', 'best_combo', 'current_streak', 'best_streak', 'last_played_date',
        'bloom_base_level', 'last_correct_on', 'partner_companion_key', 'last_review_on', 'reviews_completed',
    ];

    /**
     * HP自然回復の間隔(秒)。1HPあたり4.5分、フル回復(20HP)まで1.5時間となる想定
     * (2026-07-31 Owner確認。Duolingo・Candy Crush等の他アプリ調査を踏まえた値)。
     */
    private const HP_REGEN_INTERVAL_SECONDS = 270;

    /**
     * ストリーク(継続プレイ)の日境界に使うタイムゾーン。サービスの主な利用者層に合わせて
     * 固定する(多言語対応でユーザーごとのタイムゾーンに分ける場合は要見直し、TASKS.md参照)。
     */
    private const STREAK_TIMEZONE = 'Asia/Tokyo';

    /** 何日おきにボーナスコインを付与するか */
    private const STREAK_BONUS_INTERVAL_DAYS = 7;

    private const STREAK_BONUS_COIN = 50;

    /**
     * 連続プレイの節目。この日数に届いた日をお祝いし、パスポートにバッジを残す
     * (docs/design/2026-09-28-streak-milestones-design.md)
     */
    public const STREAK_MILESTONES = [3, 7, 30];

    /**
     * プレイヤーのアバターの名前。絵は画面側(frontend/src/components/app/avatars.ts)で対応させるので、
     * 絵を替えてもデータは変わらない(docs/design/2026-09-28-top-profiles-design.md 5章)
     */
    public const AVATARS = ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5', 'avatar-6'];

    protected static function booted(): void
    {
        // アバターを決めずに作ったプレイヤーには、家族でまだ使われていないものを入れる
        static::creating(function (UserProfile $profile) {
            $profile->avatar ??= self::nextAvatarFor($profile->user_schema_id);
        });
    }

    /** 家族の中でまだ誰も使っていないアバターの1つ目。全部使われていたら1つ目 */
    public static function nextAvatarFor(?int $schemaId): string
    {
        $used = $schemaId === null
            ? []
            : DB::table('user_profiles')->where('user_schema_id', $schemaId)->pluck('avatar')->all();

        foreach (self::AVATARS as $avatar) {
            if (! in_array($avatar, $used, true)) {
                return $avatar;
            }
        }

        return self::AVATARS[0];
    }

    /**
     * アバターが空のプレイヤーに、家族ごとに作った順(id順)で割り当てる(7人目からは1つ目に戻る)。
     * avatar 列を足すマイグレーションから呼ぶので、モデルの属性に頼らずテーブルを直接読む
     */
    public static function assignAvatarsByCreationOrder(): void
    {
        $counts = [];
        DB::table('user_profiles')
            ->orderBy('user_schema_id')
            ->orderBy('id')
            ->get(['id', 'user_schema_id', 'avatar'])
            ->each(function ($row) use (&$counts) {
                $index = $counts[$row->user_schema_id] ?? 0;
                $counts[$row->user_schema_id] = $index + 1;
                if ($row->avatar === null) {
                    DB::table('user_profiles')
                        ->where('id', $row->id)
                        ->update(['avatar' => self::AVATARS[$index % count(self::AVATARS)]]);
                }
            });
    }

    protected function casts(): array
    {
        return [
            'last_played_date' => 'date',
            'hp_updated_at' => 'datetime',
            'world_welcomed_at' => 'datetime',
            'world_plots_seen' => 'array',
            'bloom_base_level' => 'integer',
            'last_correct_on' => 'date',
            'last_review_on' => 'date',
            'reviews_completed' => 'integer',
        ];
    }

    /**
     * 時間経過によるHP自然回復を計算し、必要なら反映する(遅延評価。定期バッチは無し)。
     * HPを参照・消費するAPI(プロフィール取得・回答API)の入り口で必ず呼ぶこと。
     */
    public function regenerateHp(): void
    {
        if ($this->hp >= $this->max_hp) {
            if ($this->hp_updated_at !== null) {
                $this->hp_updated_at = null;
                $this->save();
            }

            return;
        }

        $lastUpdated = $this->hp_updated_at ?? Carbon::now();
        $elapsedSeconds = $lastUpdated->diffInSeconds(Carbon::now());
        $ticks = intdiv($elapsedSeconds, self::HP_REGEN_INTERVAL_SECONDS);

        if ($ticks <= 0) {
            if ($this->hp_updated_at === null) {
                $this->hp_updated_at = Carbon::now();
                $this->save();
            }

            return;
        }

        $healed = min($ticks, $this->max_hp - $this->hp);
        $this->hp += $healed;
        $this->hp_updated_at = $this->hp >= $this->max_hp
            ? null
            : $lastUpdated->copy()->addSeconds($healed * self::HP_REGEN_INTERVAL_SECONDS);

        $this->save();
    }

    /**
     * 次の1HP回復までの残り秒数。フルHPならnull。
     */
    public function secondsUntilNextHp(): ?int
    {
        if ($this->hp >= $this->max_hp || $this->hp_updated_at === null) {
            return null;
        }

        $elapsed = $this->hp_updated_at->diffInSeconds(Carbon::now());

        return max(0, self::HP_REGEN_INTERVAL_SECONDS - $elapsed);
    }

    /**
     * コンボ(連続正解)は経済ロジックとは別に管理する通貨ではないため、
     * applyEconomy()とは別メソッドにしている。docs/AppInfo.mdが
     * 「最重要要素」の1つとして挙げる要素。
     *
     * @return array{combo: int, best_combo: int, milestone_bonus_coin: int}
     */
    public function registerComboResult(bool $correct): array
    {
        if ($correct) {
            $this->combo += 1;
            $this->best_combo = max($this->best_combo, $this->combo);
        } else {
            $this->combo = 0;
        }
        $this->save();

        $milestoneBonusCoin = ($correct && $this->combo > 0 && $this->combo % 5 === 0)
            ? 20
            : 0;

        return [
            'combo' => $this->combo,
            'best_combo' => $this->best_combo,
            'milestone_bonus_coin' => $milestoneBonusCoin,
        ];
    }

    /**
     * 毎日プレイのストリーク(継続日数)を更新する。1日1回だけカウントし
     * (同じ日に何問答えても増えない)、前日にプレイしていなければリセットする。
     * 日の境界はSTREAK_TIMEZONE(Asia/Tokyo)固定。docs/AppInfo.mdが
     * 「最重要要素」の1つとして挙げるが、これまで未実装だった(docs/AppRoadmap.md)。
     * 節目(STREAK_MILESTONES)に届いた日は milestone にその日数を入れ、伸びる前の
     * いちばん長い連続が節目より短ければ milestone_first を true にする。
     *
     * @return array{streak: int, best_streak: int, streak_extended_today: bool, milestone_bonus_coin: int, milestone: int|null, milestone_first: bool}
     */
    public function registerDailyStreak(): array
    {
        $today = Carbon::now(self::STREAK_TIMEZONE)->toDateString();
        $lastPlayed = $this->last_played_date?->toDateString();

        if ($lastPlayed === $today) {
            return [
                'streak' => $this->current_streak,
                'best_streak' => $this->best_streak,
                'streak_extended_today' => false,
                'milestone_bonus_coin' => 0,
                'milestone' => null,
                'milestone_first' => false,
            ];
        }

        $previousBest = (int) $this->best_streak;
        $yesterday = Carbon::now(self::STREAK_TIMEZONE)->subDay()->toDateString();
        $this->current_streak = $lastPlayed === $yesterday ? $this->current_streak + 1 : 1;
        $this->best_streak = max($this->best_streak, $this->current_streak);
        $this->last_played_date = $today;
        $this->save();

        $milestoneBonusCoin = $this->current_streak % self::STREAK_BONUS_INTERVAL_DAYS === 0
            ? self::STREAK_BONUS_COIN
            : 0;
        $milestone = in_array((int) $this->current_streak, self::STREAK_MILESTONES, true)
            ? (int) $this->current_streak
            : null;

        return [
            'streak' => $this->current_streak,
            'best_streak' => $this->best_streak,
            'streak_extended_today' => true,
            'milestone_bonus_coin' => $milestoneBonusCoin,
            'milestone' => $milestone,
            'milestone_first' => $milestone !== null && $previousBest < $milestone,
        ];
    }

    public function schema(): BelongsTo
    {
        return $this->belongsTo(UserSchema::class);
    }

    public function currencyLedger(): HasMany
    {
        return $this->hasMany(ProfileCurrencyLedger::class);
    }

    public function gifts(): HasMany
    {
        return $this->hasMany(ProfileGift::class);
    }

    public function worldItems(): HasMany
    {
        return $this->hasMany(ProfileWorldItem::class);
    }

    public function seeds(): HasMany
    {
        return $this->hasMany(ProfileSeed::class);
    }

    /** がんばった記念にもらった特別な種(docs/design/2026-09-29-rare-spru-design.md 4-1) */
    public function specialSeeds(): HasMany
    {
        return $this->hasMany(ProfileSpecialSeed::class);
    }

    public function companions(): HasMany
    {
        return $this->hasMany(ProfileCompanion::class);
    }

    public function sentGreetings(): HasMany
    {
        return $this->hasMany(ProfileGreeting::class, 'from_profile_id');
    }

    public function receivedGreetings(): HasMany
    {
        return $this->hasMany(ProfileGreeting::class, 'to_profile_id');
    }

    public function errands(): HasMany
    {
        return $this->hasMany(ProfileErrand::class);
    }

    public function trips(): HasMany
    {
        return $this->hasMany(ProfileTrip::class);
    }

    /** ミニゲームを遊んだ回(docs/design/2026-09-29-spru-catch-design.md 5-1) */
    public function gamePlays(): HasMany
    {
        return $this->hasMany(ProfileGamePlay::class);
    }

    public function souvenirs(): HasMany
    {
        return $this->hasMany(ProfileSouvenir::class);
    }

    public function zukan(): HasMany
    {
        return $this->hasMany(ProfileZukan::class);
    }

    /**
     * @param  array<string,int>  $deltas  type(hp/coin/xp/point) => delta
     * @return array{leveled_up: bool, deltas: array<string,int>}
     */
    public function applyEconomy(array $deltas, string $reason, ?Question $question = null, ?Stage $stage = null): array
    {
        $leveledUp = false;

        foreach ($deltas as $type => $delta) {
            if ($delta === 0) {
                continue;
            }

            if ($type === 'hp' && $delta < 0 && $this->hp >= $this->max_hp) {
                // フルHPから減り始めた瞬間に自然回復タイマーを起動する
                $this->hp_updated_at = Carbon::now();
            }

            match ($type) {
                'hp' => $this->hp = max(0, min($this->max_hp, $this->hp + $delta)),
                'coin' => $this->coins = max(0, $this->coins + $delta),
                'xp' => $this->xp = max(0, $this->xp + $delta),
                'point' => $this->points = max(0, $this->points + $delta),
            };

            $this->currencyLedger()->create([
                'type' => $type,
                'delta' => $delta,
                'reason' => $reason,
                'question_id' => $question?->id,
                'stage_id' => $stage?->id,
            ]);
        }

        if (isset($deltas['xp'])) {
            $newLevel = LevelCurve::levelForXp($this->xp);

            if ($newLevel > $this->level) {
                $this->level = $newLevel;
                $healAmount = $this->max_hp - $this->hp;
                $this->hp = $this->max_hp;
                $this->hp_updated_at = null;
                $leveledUp = true;

                if ($healAmount > 0) {
                    $this->currencyLedger()->create([
                        'type' => 'hp',
                        'delta' => $healAmount,
                        'reason' => 'level_up_heal',
                    ]);
                }
            }
        }

        if ($this->hp >= $this->max_hp) {
            $this->hp_updated_at = null;
        }

        $this->save();

        return ['leveled_up' => $leveledUp, 'deltas' => $deltas];
    }
}
