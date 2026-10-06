<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('words', function (Blueprint $table) {
            $table->id();
            $table->string('language', 8)->default('en');
            $table->string('word');
            // 小文字の見出し語。問題の meta.word と同じ
            $table->string('key');
            $table->unsignedSmallInteger('level');
            $table->string('pos')->nullable();
            $table->string('cefr', 2)->nullable();
            $table->unsignedTinyInteger('importance')->default(1);
            $table->string('ipa')->nullable();
            $table->json('meanings');
            $table->text('usage')->nullable();
            $table->json('examples')->nullable();
            $table->json('synonyms')->nullable();
            $table->timestamps();

            $table->unique(['language', 'key']);
            $table->index(['language', 'level']);
        });

        Schema::create('profile_words', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('word_id')->constrained()->cascadeOnDelete();
            // 出会った日時(その語の問題に答えた)と、単語帳に保存した日時
            $table->timestamp('seen_at')->nullable();
            $table->timestamp('saved_at')->nullable();
            // weak(苦手)・learned(覚えた)・null。手動のマーク
            $table->string('status', 16)->nullable();
            $table->timestamps();

            $table->unique(['user_profile_id', 'word_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_words');
        Schema::dropIfExists('words');
    }
};
