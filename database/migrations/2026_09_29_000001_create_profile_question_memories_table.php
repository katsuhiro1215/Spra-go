<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 問題ごとの覚え具合(docs/design/2026-09-29-spaced-review-design.md 4-1)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_question_memories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            // 段階(1〜5)。出す日以降に正解すると1つ上がる
            $table->unsignedTinyInteger('level');
            // 次に出す日。覚えたら null
            $table->date('due_on')->nullable();
            $table->date('mastered_on')->nullable();
            $table->date('last_answered_on');
            $table->timestamps();

            $table->unique(['user_profile_id', 'question_id']);
            $table->index(['user_profile_id', 'due_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_question_memories');
    }
};
