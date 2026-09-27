<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_seeds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            // 生まれるもの(仲間のキーか spru_flower)。種をまいたときに決め、生まれるまで画面に出さない
            $table->string('result_key', 32);
            $table->unsignedTinyInteger('waterings')->default(0);
            $table->date('last_watered_on')->nullable();
            // null の間は畑で育っている(1人1つまで。処理側で保証する)
            $table->timestamp('bloomed_at')->nullable();
            $table->timestamps();

            $table->index(['user_profile_id', 'bloomed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_seeds');
    }
};
