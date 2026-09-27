<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            // 祝った区画のキーの一覧(E回 3-2)。null はまだ1つも祝っていない
            $table->json('world_plots_seen')->nullable()->after('world_welcomed_at');
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn('world_plots_seen');
        });
    }
};
