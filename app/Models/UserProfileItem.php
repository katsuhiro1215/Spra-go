<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserProfileItem extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_profile_id', 'shop_item_id', 'purchased_at'];

    protected function casts(): array
    {
        return [
            'purchased_at' => 'datetime',
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
}
