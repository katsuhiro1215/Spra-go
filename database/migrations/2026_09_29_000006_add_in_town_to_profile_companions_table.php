<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 仲間が町に立っているか(docs/design/2026-09-29-rare-spru-design.md 3-5)。町に立つのは5体までで、
 * ほかはおうちで休む。今いる仲間(最大5人)は全員町にいる
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profile_companions', function (Blueprint $table) {
            $table->boolean('in_town')->default(true)->after('bond');
        });
    }

    public function down(): void
    {
        Schema::table('profile_companions', function (Blueprint $table) {
            $table->dropColumn('in_town');
        });
    }
};
