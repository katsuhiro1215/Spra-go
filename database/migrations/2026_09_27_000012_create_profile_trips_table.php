<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            // 行き先のキー(config/travel.php)
            $table->string('destination', 32);
            $table->timestamp('arrived_at');
            $table->timestamps();

            $table->unique(['user_profile_id', 'destination']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_trips');
    }
};
