<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analytics_daily', function (Blueprint $table) {
            $table->date('date')->primary();
            $table->unsignedInteger('new_accounts')->default(0);
            $table->unsignedInteger('new_players')->default(0);
            $table->unsignedInteger('active_players')->default(0);
            $table->unsignedInteger('opened_players')->default(0);
            $table->unsignedInteger('answers')->default(0);
            $table->unsignedInteger('correct_answers')->default(0);
            $table->unsignedBigInteger('play_seconds')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_daily');
    }
};
