<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** ステージのテーマの名前(「日本のことばとマナー」など)。画面のステージの道・ルールのカードに出す(docs/design/2026-10-21-japan-themed-course-design.md) */
    public function up(): void
    {
        Schema::table('stages', function (Blueprint $table) {
            $table->string('theme_name', 40)->nullable()->after('stage_number');
        });
    }

    public function down(): void
    {
        Schema::table('stages', function (Blueprint $table) {
            $table->dropColumn('theme_name');
        });
    }
};
