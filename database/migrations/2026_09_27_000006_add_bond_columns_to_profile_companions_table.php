<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profile_companions', function (Blueprint $table) {
            // 子どもが付けた名前。null なら元の名前(docs/design/2026-09-27-spru-wave-c-design.md 3-2)
            $table->string('nickname', 8)->nullable()->after('companion_key');
            // なかよし度。ハートの数はここから計算する(3-3)
            $table->unsignedInteger('bond')->default(0)->after('nickname');
        });
    }

    public function down(): void
    {
        Schema::table('profile_companions', function (Blueprint $table) {
            $table->dropColumn(['nickname', 'bond']);
        });
    }
};
