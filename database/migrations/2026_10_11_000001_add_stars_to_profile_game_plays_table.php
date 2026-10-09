<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profile_game_plays', function (Blueprint $table) {
            // うちゅう旅行で集めた星の合計(docs/design/2026-10-09-space-trip-design.md 6章)。ほかのゲームでは空
            $table->unsignedSmallInteger('stars')->nullable()->after('best_combo');
        });
    }

    public function down(): void
    {
        Schema::table('profile_game_plays', function (Blueprint $table) {
            $table->dropColumn('stars');
        });
    }
};
