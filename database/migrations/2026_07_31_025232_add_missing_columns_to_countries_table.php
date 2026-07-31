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
        // 2026_07_21_135656_create_countries_table.php はthree_code/name_en/country_code
        // を定義しているが、この開発DBは同マイグレーションが最初に流れた後に列定義が
        // 編集され、実テーブルには反映されていなかった(docs/AppRoadmap.md記載のスキーマ
        // 不整合)。hasColumnで確認し、無い環境だけ追加することで、既にこれらの列を
        // 持つ環境(テストDB等、マイグレーションファイルから素で構築した場合)を壊さない。
        Schema::table('countries', function (Blueprint $table) {
            if (! Schema::hasColumn('countries', 'three_code')) {
                $table->string('three_code')->nullable()->after('code');
            }
            if (! Schema::hasColumn('countries', 'name_en')) {
                $table->string('name_en')->nullable()->after('name');
            }
            if (! Schema::hasColumn('countries', 'country_code')) {
                $table->unsignedInteger('country_code')->nullable()->after('name_en');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('countries', function (Blueprint $table) {
            $table->dropColumn(['three_code', 'name_en', 'country_code']);
        });
    }
};
