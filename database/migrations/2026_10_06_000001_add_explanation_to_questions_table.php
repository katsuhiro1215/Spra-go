<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            // 答えたあとに見せる解説(summary・example・usage・related。docs/design/2026-10-06-question-explanation-design.md)。空の問題は解説なし
            $table->json('explanation')->nullable()->after('meta');
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn('explanation');
        });
    }
};
