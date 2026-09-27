<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_companions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->string('companion_key', 32);
            $table->timestamps();

            $table->unique(['user_profile_id', 'companion_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_companions');
    }
};
