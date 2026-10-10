<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** 宇宙ぼうけんマップとうちゅうずかん(docs/design/2026-10-10-space-adventure-map-design.md 3-1) */
return new class extends Migration
{
    public function up(): void
    {
        // 星ごとの、いちばんよい星の評価(0〜3)。クリアした日
        Schema::create('profile_space_stops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->string('stop', 32);
            $table->unsignedTinyInteger('stars')->default(0);
            $table->date('cleared_on')->nullable();
            $table->timestamps();

            $table->unique(['user_profile_id', 'stop']);
        });

        // うちゅうずかんのカード(開いた絵のキー)。一度開いたら、あとでまちがえても消えない
        Schema::create('profile_space_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->string('picture', 64);
            $table->date('unlocked_on');
            $table->timestamps();

            $table->unique(['user_profile_id', 'picture']);
        });

        Schema::table('profile_game_plays', function (Blueprint $table) {
            // 地図から始めた回の星のキー。れんしゅうは空
            $table->string('stop', 32)->nullable()->after('difficulty');
        });
    }

    public function down(): void
    {
        Schema::table('profile_game_plays', function (Blueprint $table) {
            $table->dropColumn('stop');
        });
        Schema::dropIfExists('profile_space_cards');
        Schema::dropIfExists('profile_space_stops');
    }
};
