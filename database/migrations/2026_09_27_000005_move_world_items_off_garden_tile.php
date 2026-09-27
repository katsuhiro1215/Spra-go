<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 畑(config/world.php の landmarks の garden)になるマスに置いてあったアイテムはバッグに戻す
        DB::table('profile_world_items')
            ->where('x', 1)
            ->where('y', 2)
            ->update(['x' => null, 'y' => null, 'updated_at' => now()]);
    }

    public function down(): void
    {
        //
    }
};
