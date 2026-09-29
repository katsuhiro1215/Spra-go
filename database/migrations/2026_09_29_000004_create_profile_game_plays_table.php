<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ミニゲームを遊んだ回(docs/design/2026-09-29-spru-catch-design.md 5-1)。始めたときに1行作り、終えたときに結果を書く
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_game_plays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            // ゲームの名前(catch など)
            $table->string('game');
            $table->string('difficulty');
            // 出した問題の番号(出した順)
            $table->json('question_ids');
            $table->timestamp('finished_at')->nullable();
            // 終えた日(日本時間)。1日のごほうびの回数を数える
            $table->date('played_on')->nullable();
            $table->unsignedTinyInteger('answered_count')->nullable();
            $table->unsignedTinyInteger('correct_count')->nullable();
            $table->unsignedSmallInteger('score')->nullable();
            $table->unsignedTinyInteger('best_combo')->nullable();
            $table->boolean('rewarded')->default(false);
            $table->timestamps();

            $table->index(['user_profile_id', 'game', 'played_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_game_plays');
    }
};
