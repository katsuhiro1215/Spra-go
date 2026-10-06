<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_schemas', function (Blueprint $table) {
            // 母国(国コード・小文字)。パスポートの言語レベルから、母国の言語を除く。今は全員「日本」(docs/design/2026-10-07-main-game-levels-design.md 3章)
            $table->string('home_country', 8)->default('jp');
        });
    }

    public function down(): void
    {
        Schema::table('user_schemas', function (Blueprint $table) {
            $table->dropColumn('home_country');
        });
    }
};
