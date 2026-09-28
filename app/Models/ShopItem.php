<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopItem extends Model
{
    protected $fillable = ['name', 'price', 'currency', 'min_level', 'type', 'meta'];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'min_level' => 'integer',
        ];
    }

    public function assetKey(): ?string
    {
        return $this->meta['asset_key'] ?? null;
    }

    /** 使うマスの一辺(1か2)。2×2かどうかは絵で決まる(config/world.php の asset_footprints) */
    public function footprint(): int
    {
        return (int) (config('world.asset_footprints')[$this->assetKey()] ?? 1);
    }

    /** カテゴリ(設計書 2026-09-28-town-items 3-2)。町に置く物でなければ null。おみやげは souvenir、設定にないキーは decor */
    public function category(): ?string
    {
        if ($this->type !== 'decoration') {
            return null;
        }
        if (isset($this->meta['souvenir_of'])) {
            return 'souvenir';
        }

        return config('world.asset_categories')[$this->assetKey() ?? ''] ?? 'decor';
    }
}
