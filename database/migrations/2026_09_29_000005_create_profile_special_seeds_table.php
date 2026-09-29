<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * がんばった記念にもらった特別な種(docs/design/2026-09-29-rare-spru-design.md 4-1)。
 * まくまでは種のふくろにあり、まくと planted_at が入る。1人1色につき1行だけ
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_special_seeds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            // レアスプルのキー(ruby など。config/companions.php の list)
            $table->string('rare_key');
            $table->timestamp('granted_at');
            $table->timestamp('planted_at')->nullable();
            $table->timestamps();

            $table->unique(['user_profile_id', 'rare_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_special_seeds');
    }
};
