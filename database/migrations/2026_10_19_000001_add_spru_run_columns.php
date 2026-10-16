<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** スプルラン(docs/design/2026-10-22-spru-run-design.md 14-3)。本番の回の記録と、ランのタネの財布 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profile_game_plays', function (Blueprint $table) {
            $table->unsignedInteger('distance_m')->nullable();
            // もらったタネ(ボーナス込み)と、集めたタネの数え方の合計(ふつう1・銀2・光る5。ボーナスは含めない)
            $table->unsignedInteger('seeds_earned')->nullable();
            $table->unsignedInteger('seed_value')->nullable();
            // コースを決める乱数の種と、画面の高さ(タワーの高さが決まる)。あとで再現して確かめられるように残す
            $table->unsignedInteger('run_seed')->nullable();
            $table->unsignedSmallInteger('ceiling')->nullable();
            $table->timestamp('started_at')->nullable();
        });

        Schema::table('user_profiles', function (Blueprint $table) {
            $table->unsignedInteger('run_seeds')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', fn (Blueprint $table) => $table->dropColumn('run_seeds'));
        Schema::table('profile_game_plays', fn (Blueprint $table) => $table->dropColumn(['distance_m', 'seeds_earned', 'seed_value', 'run_seed', 'ceiling', 'started_at']));
    }
};
