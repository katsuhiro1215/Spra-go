<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** 自分で引いた町の道(docs/design/2026-10-19-town-roads-design.md 4章) */
    public function up(): void
    {
        Schema::create('profile_roads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('x');
            $table->unsignedTinyInteger('y');
            $table->timestamp('created_at')->nullable();

            $table->unique(['user_profile_id', 'x', 'y']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_roads');
    }
};
