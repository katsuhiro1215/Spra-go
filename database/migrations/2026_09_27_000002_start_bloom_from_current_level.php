<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 今あるプロフィールは「ふつう」(育ち具合0)から育ち始める
        DB::table('user_profiles')->update(['bloom_base_level' => DB::raw('level')]);
    }

    public function down(): void
    {
        //
    }
};
