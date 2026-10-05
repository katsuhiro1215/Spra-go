<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            // 町の道のデザイン。旅の行き先のキー(config/travel.php)か 'jp'。null は日本(docs/design/2026-10-05-road-style-design.md)
            $table->string('road_style', 8)->nullable()->after('world_plots_seen');
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn('road_style');
        });
    }
};
