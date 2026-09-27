<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_souvenirs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            // おみやげのキー(config/travel.php)。連打しても1つだけにする
            $table->string('souvenir', 32);
            $table->timestamp('received_at');
            $table->timestamps();

            $table->unique(['user_profile_id', 'souvenir']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_souvenirs');
    }
};
