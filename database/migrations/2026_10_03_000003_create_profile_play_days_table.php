<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_play_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->date('played_on');
            $table->unsignedInteger('seconds')->default(0);
            $table->timestamp('last_beat_at')->nullable();
            $table->timestamps();

            $table->unique(['user_profile_id', 'played_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_play_days');
    }
};
