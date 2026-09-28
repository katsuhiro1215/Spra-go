<?php

use App\Support\Travel;
use Illuminate\Database\Migrations\Migration;

/**
 * 国の進め方をチケットにしたときの、今のデータの記録(docs/design/2026-09-28-travel-tickets-design.md 3-7)。
 * 行を足すだけなので、戻すときは何もしない
 */
return new class extends Migration
{
    public function up(): void
    {
        Travel::recordTripsForClearedCountries();
    }

    public function down(): void {}
};
