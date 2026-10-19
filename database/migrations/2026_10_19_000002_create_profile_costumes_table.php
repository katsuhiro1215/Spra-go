<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** スプルのきせかえ(docs/design/2026-10-17-spru-costumes-design.md 5章)。持っている衣装と、いま着ている衣装 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_costumes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->string('costume_key');
            $table->timestamp('acquired_at')->useCurrent();
            $table->unique(['user_profile_id', 'costume_key']);
        });

        Schema::table('user_profiles', function (Blueprint $table) {
            $table->string('costume_key')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', fn (Blueprint $table) => $table->dropColumn('costume_key'));
        Schema::dropIfExists('profile_costumes');
    }
};
