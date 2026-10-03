<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** 答えの行(type = hp・reason が answer_*)を日時で速く探す(docs/design/2026-10-03-analytics-design.md 4-1)。足すだけで、データは変わらない */
    public function up(): void
    {
        Schema::table('profile_currency_ledger', function (Blueprint $table) {
            $table->index(['type', 'reason', 'created_at'], 'ledger_type_reason_created_index');
        });
    }

    public function down(): void
    {
        Schema::table('profile_currency_ledger', function (Blueprint $table) {
            $table->dropIndex('ledger_type_reason_created_index');
        });
    }
};
