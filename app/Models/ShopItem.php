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
}
