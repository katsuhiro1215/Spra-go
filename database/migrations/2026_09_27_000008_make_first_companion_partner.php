<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 仲間がいて相棒がいないプロフィールは、最初に生まれた仲間を相棒にする(docs/design/2026-09-27-spru-wave-c-design.md 4-1)
        $firstIds = DB::table('profile_companions')
            ->selectRaw('MIN(id) as first_id')
            ->groupBy('user_profile_id')
            ->pluck('first_id');

        DB::table('profile_companions')->whereIn('id', $firstIds)->get(['user_profile_id', 'companion_key'])
            ->each(fn ($companion) => DB::table('user_profiles')
                ->where('id', $companion->user_profile_id)
                ->whereNull('partner_companion_key')
                ->update(['partner_companion_key' => $companion->companion_key]));
    }

    public function down(): void
    {
        //
    }
};
