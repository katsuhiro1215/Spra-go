<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileWorldItem extends Model
{
    protected $fillable = ['user_profile_id', 'shop_item_id', 'x', 'y'];

    protected function casts(): array
    {
        return [
            'x' => 'integer',
            'y' => 'integer',
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

    /** @return array{id: int, shop_item_id: int, name: string, asset_key: ?string, x: ?int, y: ?int} */
    public function toWorldArray(): array
    {
        return [
            'id' => $this->id,
            'shop_item_id' => $this->shop_item_id,
            'name' => $this->shopItem->name,
            'asset_key' => $this->shopItem->assetKey(),
            'x' => $this->x,
            'y' => $this->y,
        ];
    }
}
