<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_schemas', function (Blueprint $table) {
            // みんなのランキングに載る・見られるか(保護者のスイッチ。初期値はOff)
            $table->boolean('ranking_public')->default(false);
        });

        Schema::table('user_profiles', function (Blueprint $table) {
            // みんなのランキングに出す名前(付け直したときだけ入る。なければ番号から決まる)
            $table->string('ranking_nickname')->nullable();
        });

        Schema::table('profile_game_plays', function (Blueprint $table) {
            // パズルの時間が、サーバーが測った時間と食いちがっていない(ランキングに載せてよい)
            $table->boolean('time_verified')->default(false);
            $table->index(['game', 'difficulty', 'played_on']);
        });
    }

    public function down(): void
    {
        Schema::table('profile_game_plays', function (Blueprint $table) {
            $table->dropIndex(['game', 'difficulty', 'played_on']);
            $table->dropColumn('time_verified');
        });
        Schema::table('user_profiles', fn (Blueprint $table) => $table->dropColumn('ranking_nickname'));
        Schema::table('user_schemas', fn (Blueprint $table) => $table->dropColumn('ranking_public'));
    }
};
