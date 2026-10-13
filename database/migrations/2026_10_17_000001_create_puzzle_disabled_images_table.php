<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // パズルに出さない絵(Ownerが管理画面で切り替える)。盤の大きさ(2x2 など)ごと
        Schema::create('puzzle_disabled_images', function (Blueprint $table) {
            $table->id();
            $table->string('game', 40);
            $table->string('grid', 10);
            $table->string('image');
            $table->timestamps();

            $table->unique(['game', 'grid', 'image']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('puzzle_disabled_images');
    }
};
