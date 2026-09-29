<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 最後の答えがまちがいだった日(docs/design/2026-09-29-spru-catch-design.md 4-4)。
 * スプルキャッチで「最近まちがえた問題」を先に出すのに使う。今までの記録には入れない
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profile_question_memories', function (Blueprint $table) {
            // まちがえたらその日。正解すると null
            $table->date('wrong_on')->nullable()->after('last_answered_on');
            $table->index(['user_profile_id', 'wrong_on']);
        });
    }

    public function down(): void
    {
        Schema::table('profile_question_memories', function (Blueprint $table) {
            $table->dropIndex(['user_profile_id', 'wrong_on']);
            $table->dropColumn('wrong_on');
        });
    }
};
