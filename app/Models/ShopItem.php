<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopItem extends Model
{
    protected $fillable = ['name', 'price', 'type', 'meta'];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }
}
