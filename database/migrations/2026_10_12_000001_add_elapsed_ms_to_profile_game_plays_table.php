<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profile_game_plays', function (Blueprint $table) {
            // スライドパズルで、パズルにかかった時間の合計(ミリ秒。docs/design/2026-10-09-slide-puzzle-design.md 3-1)。ほかのゲームでは空
            $table->unsignedInteger('elapsed_ms')->nullable()->after('stars');
        });
    }

    public function down(): void
    {
        Schema::table('profile_game_plays', function (Blueprint $table) {
            $table->dropColumn('elapsed_ms');
        });
    }
};
