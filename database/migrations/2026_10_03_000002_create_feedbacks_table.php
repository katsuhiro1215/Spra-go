<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedbacks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kind', 20);
            $table->text('body')->nullable();
            $table->foreignId('question_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reason', 20)->nullable();
            $table->string('status', 10)->default('new');
            $table->string('page', 200)->nullable();
            $table->timestamps();

            $table->index(['kind', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedbacks');
    }
};
