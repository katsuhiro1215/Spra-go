<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Tane(算数アプリ)の記録(company/spra/tane/docs/2026-10-21-account-sync-design.md 5章)。
// プレイヤーを消すと、外部キーで Tane の記録も一緒に消える。将来 Tane のサーバーを分けるときは、tane_ の表ごと移す
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tane_stage_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->string('stage_id', 32);
            $table->unsignedTinyInteger('stars');
            $table->unsignedInteger('best_score')->nullable();
            $table->timestamp('updated_at')->nullable();

            $table->unique(['user_profile_id', 'stage_id']);
        });

        Schema::create('tane_profile_states', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->unique()->constrained()->cascadeOnDelete();
            $table->json('challenge_best')->nullable();
            $table->json('endless_best')->nullable();
            $table->json('garden')->nullable();
            $table->timestamp('garden_changed_at')->nullable();
            $table->string('last_mode', 32)->nullable();
            $table->timestamp('last_mode_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });

        Schema::create('tane_play_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->date('played_on');

            $table->unique(['user_profile_id', 'played_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tane_play_days');
        Schema::dropIfExists('tane_profile_states');
        Schema::dropIfExists('tane_stage_records');
    }
};
