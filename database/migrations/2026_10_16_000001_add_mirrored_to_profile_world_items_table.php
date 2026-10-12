<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profile_world_items', function (Blueprint $table) {
            // 絵を左右反転して見せる(柵・塀など、向きが大事な物のため)。使うマスは変わらない
            $table->boolean('mirrored')->default(false)->after('y');
        });
    }

    public function down(): void
    {
        Schema::table('profile_world_items', function (Blueprint $table) {
            $table->dropColumn('mirrored');
        });
    }
};
