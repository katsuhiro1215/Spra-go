<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** パズルに出さない絵。盤の大きさごと(docs/design/2026-10-09-slide-puzzle-design.md)。Ownerが管理画面で切り替える */
class PuzzleDisabledImage extends Model
{
    protected $fillable = ['game', 'grid', 'image'];
}
