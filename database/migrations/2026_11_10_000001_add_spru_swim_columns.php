<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** スプルスイム(docs/design/2026-11-10-spru-swim-design.md)。本番の回の記録と、スイムコインの財布 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profile_game_plays', function (Blueprint $table) {
            // 集めたコインの数え方の合計(ボーナス抜き。チート確認用)と、実際に渡したコイン(ボーナス込み)
            $table->unsignedInteger('coin_value')->nullable();
            $table->unsignedInteger('coins_earned')->nullable();
            // コースを決める乱数の種(run_seedと同じ役割)。distance_m・ceiling・started_at は run が追加した汎用カラムを使う
            $table->unsignedInteger('swim_seed')->nullable();
        });

        Schema::table('user_profiles', function (Blueprint $table) {
            $table->unsignedInteger('swim_coins')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', fn (Blueprint $table) => $table->dropColumn('swim_coins'));
        Schema::table('profile_game_plays', fn (Blueprint $table) => $table->dropColumn(['coin_value', 'coins_earned', 'swim_seed']));
    }
};
