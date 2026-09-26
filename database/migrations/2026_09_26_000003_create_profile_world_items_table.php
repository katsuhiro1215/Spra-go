<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_world_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('shop_item_id')->constrained()->restrictOnDelete();
            $table->unsignedTinyInteger('x')->nullable();
            $table->unsignedTinyInteger('y')->nullable();
            $table->timestamps();

            // x,yがNULL(バッグの中)の行は重複扱いにならないため、置いてある物だけが1マス1個に制限される
            $table->unique(['user_profile_id', 'x', 'y']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_world_items');
    }
};
