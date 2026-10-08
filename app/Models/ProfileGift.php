<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** 好きな名所を選んだ記録(docs/design/2026-10-08-town-growth-design.md 4-4) */
class ProfileGift extends Model
{
    protected $fillable = ['user_profile_id', 'level', 'shop_item_id'];
}
