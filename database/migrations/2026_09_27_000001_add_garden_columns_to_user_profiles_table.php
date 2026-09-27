<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            // 前に種をまいたときのレベル。育ち具合 = level − bloom_base_level(上限3)
            $table->unsignedInteger('bloom_base_level')->default(1)->after('level');
            // 最後に正解した日(日本時間)。その日に水やりできるかに使う
            $table->date('last_correct_on')->nullable()->after('last_played_date');
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn(['bloom_base_level', 'last_correct_on']);
        });
    }
};
