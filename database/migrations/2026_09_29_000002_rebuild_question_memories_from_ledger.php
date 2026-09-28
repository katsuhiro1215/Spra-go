<?php

use App\Support\QuestionMemory;
use Illuminate\Database\Migrations\Migration;

/**
 * 今までの答えの記録から、問題ごとの覚え具合を作る(docs/design/2026-09-29-spaced-review-design.md 3-5)。
 * 表を消すと覚え具合も消えるので、戻すときは何もしない
 */
return new class extends Migration
{
    public function up(): void
    {
        QuestionMemory::rebuildFromLedger();
    }

    public function down(): void {}
};
