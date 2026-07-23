<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->string('difficulty');
            $table->unsignedInteger('stage_number');
            $table->foreignId('question_theme_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('question_count')->default(10);
            $table->boolean('is_boss')->default(false);
            $table->string('title_reward')->nullable();
            $table->timestamps();

            $table->unique(['category_id', 'difficulty', 'stage_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stages');
    }
};
