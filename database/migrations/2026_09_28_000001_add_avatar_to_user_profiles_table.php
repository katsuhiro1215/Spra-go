<?php

use App\Models\UserProfile;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            // プレイヤーのアバターの名前(avatar-1〜6)。絵は画面側で対応させる(トップとプロフィール選びの設計書5章)
            $table->string('avatar', 20)->nullable()->after('name');
        });

        // 今いるプレイヤーに、家族ごとに作った順で割り当てる(今の色違いの並び順と同じ)
        UserProfile::assignAvatarsByCreationOrder();
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn('avatar');
        });
    }
};
