<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 今日の復習をやりきった回数(docs/design/2026-09-29-rare-spru-design.md 3-1。アンバーの種の条件)。
 * 今までは数えていなかったので、0から数え始める
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->unsignedInteger('reviews_completed')->default(0)->after('last_review_on');
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn('reviews_completed');
        });
    }
};
