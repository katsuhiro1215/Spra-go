<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Tane をあそんだ日(日本時間)。保護者の画面の「最後に遊んだ日」「この1週間」のために使う。設計 5-3 */
class TanePlayDay extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_profile_id', 'played_on'];

    protected function casts(): array
    {
        return ['played_on' => 'date'];
    }
}
