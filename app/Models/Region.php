<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

class Region extends Model
{
    protected $fillable = ['country_id', 'parent_id', 'name', 'order'];

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Region::class, 'parent_id')->orderBy('order');
    }

    public function stages(): HasMany
    {
        return $this->hasMany(Stage::class);
    }

    /**
     * @return array<int>
     */
    public function descendantIds(): array
    {
        $regions = static::where('country_id', $this->country_id)->get(['id', 'parent_id']);

        return static::descendantIdsFrom($regions, $this->id);
    }

    /**
     * @return array<int>
     */
    public static function descendantIdsFrom(Collection $regions, int $rootId): array
    {
        $byParent = $regions->groupBy('parent_id');
        $ids = [$rootId];
        $queue = [$rootId];

        while ($queue) {
            $current = array_pop($queue);
            foreach ($byParent->get($current, collect()) as $child) {
                $ids[] = $child->id;
                $queue[] = $child->id;
            }
        }

        return $ids;
    }
}
