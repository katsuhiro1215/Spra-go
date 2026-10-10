<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** ご意見を中央管理システムへ送った印(docs/design/2026-10-10-production-env-design.md 8章) */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('feedbacks', function (Blueprint $table) {
            $table->timestamp('relayed_at')->nullable()->after('page');
            $table->unsignedTinyInteger('relay_attempts')->default(0)->after('relayed_at');
        });
    }

    public function down(): void
    {
        Schema::table('feedbacks', function (Blueprint $table) {
            $table->dropColumn(['relayed_at', 'relay_attempts']);
        });
    }
};
