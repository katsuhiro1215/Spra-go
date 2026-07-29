<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->unsignedInteger('hp')->default(20);
            $table->unsignedInteger('max_hp')->default(20);
            $table->unsignedInteger('xp')->default(0);
            $table->unsignedInteger('coins')->default(0);
            $table->unsignedInteger('level')->default(1);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn(['hp', 'max_hp', 'xp', 'coins', 'level']);
        });
    }
};
