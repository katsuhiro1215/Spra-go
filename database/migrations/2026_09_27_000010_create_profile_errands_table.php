<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_errands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->date('errand_on');
            $table->unsignedTinyInteger('slot');
            $table->string('kind', 32);
            $table->unsignedSmallInteger('target');
            $table->string('giver', 16);
            $table->timestamp('claimed_at')->nullable();
            $table->timestamps();

            // 同時に町を開いても、その日のおつかいは1組だけになる
            $table->unique(['user_profile_id', 'errand_on', 'slot'], 'profile_errands_daily_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_errands');
    }
};
