<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stages', function (Blueprint $table) {
            // プールから question_count 問を抽選して出すステージの印(docs/design/2026-10-06-prefecture-master-design.md 3章)
            $table->boolean('is_pool')->default(false)->after('is_boss');
            // クリアのコイン・ポイントの割合(%)。地名コースは50
            $table->unsignedTinyInteger('reward_percent')->default(100)->after('is_pool');
        });

        Schema::create('profile_stage_draws', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('stage_id')->constrained()->cascadeOnDelete();
            $table->json('question_ids');
            $table->timestamps();
            $table->unique(['user_profile_id', 'stage_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_stage_draws');
        Schema::table('stages', function (Blueprint $table) {
            $table->dropColumn(['is_pool', 'reward_percent']);
        });
    }
};
