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

    /**
     * 使うマスの大きさ [幅, 高さ](幅は x の向き、高さは y の向き)。絵で決まる(config/world.php の asset_footprints)。
     * 設定は、数字(N×N)か [幅, 高さ]。書いていない絵は1×1(docs/design/2026-10-19-town-rect-design.md)
     *
     * @return array{0: int, 1: int}
     */
    public function size(): array
    {
        $size = config('world.asset_footprints')[$this->assetKey()] ?? 1;

        return is_array($size) ? [(int) $size[0], (int) $size[1]] : [(int) $size, (int) $size];
    }

    /** 長いほうの辺(1・2・3…)。ごほうびの大きさの上限・にぎやか度・表示の「大きな物」に使う */
    public function footprint(): int
    {
        return max($this->size());
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
