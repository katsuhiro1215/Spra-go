<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** 子どもごとの単語の記録: 出会った日時・単語帳に保存した日時・苦手/覚えた(docs/design/2026-10-07-word-book-design.md 4-2) */
class ProfileWord extends Model
{
    public const WEAK = 'weak';

    public const LEARNED = 'learned';

    protected $fillable = ['user_profile_id', 'word_id', 'seen_at', 'saved_at', 'status'];

    protected function casts(): array
    {
        return ['seen_at' => 'datetime', 'saved_at' => 'datetime'];
    }

    public function word(): BelongsTo
    {
        return $this->belongsTo(Word::class);
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }
}
