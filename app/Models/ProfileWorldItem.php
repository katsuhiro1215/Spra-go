<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileWorldItem extends Model
{
    protected $fillable = ['user_profile_id', 'shop_item_id', 'x', 'y', 'mirrored'];

    protected function casts(): array
    {
        return [
            'x' => 'integer',
            'y' => 'integer',
            'mirrored' => 'boolean',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }

    public function shopItem(): BelongsTo
    {
        return $this->belongsTo(ShopItem::class);
    }

    public function isPlaced(): bool
    {
        return $this->x !== null && $this->y !== null;
    }

    /**
     * いまの向きの大きさ [幅, 高さ]。左右反転(mirrored)すると、幅と高さが入れ替わる
     *
     * @return array{0: int, 1: int}
     */
    public function size(?bool $mirrored = null): array
    {
        [$w, $h] = $this->shopItem->size();

        return ($mirrored ?? $this->mirrored) ? [$h, $w] : [$w, $h];
    }

    /** @return array{id: int, shop_item_id: int, name: string, asset_key: ?string, footprint: int, w: int, h: int, category: ?string, souvenir: bool, x: ?int, y: ?int, mirrored: bool} */
    public function toWorldArray(): array
    {
        return [
            'id' => $this->id,
            'shop_item_id' => $this->shop_item_id,
            'name' => $this->shopItem->name,
            'asset_key' => $this->shopItem->assetKey(),
            'footprint' => $this->shopItem->footprint(),
            'w' => $this->size()[0],
            'h' => $this->size()[1],
            'category' => $this->shopItem->category(),
            'souvenir' => isset($this->shopItem->meta['souvenir_of']),
            'x' => $this->x,
            'y' => $this->y,
            'mirrored' => $this->mirrored,
        ];
    }
}
