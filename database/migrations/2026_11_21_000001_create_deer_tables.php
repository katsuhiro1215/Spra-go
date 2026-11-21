<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Spraと鹿。(奈良の鹿のゲーム)の記録(docs/design/2026-11-21-deer-account-request.md)。
// プレイヤーを消すと、外部キーで記録も一緒に消える。将来サーバーを分けるときは、deer_ の表ごと移す
return new class extends Migration
{
    public function up(): void
    {
        // 遊んだ1回ずつ。ログインしていない人は anon_id(端末ごとの番号。名前などは持たない)で数える
        Schema::create('deer_plays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->nullable()->constrained()->cascadeOnDelete();
            $table->uuid('anon_id')->nullable();
            // 人数を数えるための印(p:プロフィールの番号 / a:anon_id)
            $table->string('player_key', 48);
            $table->string('level_id', 8);
            $table->string('result', 8)->nullable(); // clear・fail・quit(終わっていなければ null)
            $table->unsignedInteger('time_ms')->nullable();
            $table->unsignedTinyInteger('stars')->nullable();
            $table->boolean('time_verified')->default(false);
            $table->timestamp('started_at');
            $table->timestamp('finished_at')->nullable();
            $table->date('played_on');

            $table->index(['level_id', 'result']);
            $table->index(['user_profile_id', 'level_id']);
        });

        // プロフィールごと・面ごとの記録(ランキングと、端末をまたいだ記録の引きつぎに使う)
        Schema::create('deer_stage_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->string('level_id', 8);
            $table->unsignedInteger('plays')->default(0);
            $table->unsignedInteger('clears')->default(0);
            $table->unsignedTinyInteger('stars')->default(0);
            $table->unsignedInteger('best_ms')->nullable();
            $table->timestamp('best_at')->nullable();
            $table->timestamp('updated_at')->nullable();

            $table->unique(['user_profile_id', 'level_id']);
            $table->index(['level_id', 'best_ms']);
        });

        // みんなのランキングに出すか(家族ごと)。Spra Go の ranking_public とは別に、保護者が選ぶ
        Schema::table('user_schemas', function (Blueprint $table) {
            $table->boolean('deer_ranking_public')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('user_schemas', fn (Blueprint $table) => $table->dropColumn('deer_ranking_public'));
        Schema::dropIfExists('deer_stage_records');
        Schema::dropIfExists('deer_plays');
    }
};
