<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** 子のカテゴリーを「コース」として選ばせる親の目印(docs/design/2026-10-05-flag-quiz-design.md 3-2) */
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->boolean('is_course_group')->default(false)->after('is_language_mode');
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('is_course_group');
        });
    }
};
