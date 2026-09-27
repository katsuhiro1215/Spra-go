<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            // 相棒の仲間のキー。外部キーにすると、プロフィールを消すときに削除の連動が循環するためキーで持つ
            $table->string('partner_companion_key', 32)->nullable()->after('bloom_base_level');
            // 仲間の復習をやりきった日(日本時間)。1日1回に使う
            $table->date('last_review_on')->nullable()->after('last_correct_on');
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn(['partner_companion_key', 'last_review_on']);
        });
    }
};
