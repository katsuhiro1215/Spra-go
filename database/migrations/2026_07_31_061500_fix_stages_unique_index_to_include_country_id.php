<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * 言語学習モード(SPEC.md 4-4a)では米国・英国など複数国が同じカテゴリー
     * (例:「英語を学ぶ」)を共有するため、category_id+difficulty+stage_numberだけでは
     * ステージを一意に識別できない。country_idを含めた複合ユニーク制約に修正する。
     */
    public function up(): void
    {
        Schema::table('stages', function (Blueprint $table) {
            // category_idのFK制約が旧ユニークインデックスに依存しているため、
            // 先に新インデックスを追加してから旧インデックスを削除する
            // (先に削除するとFKを支えるインデックスが無くなりエラーになる)。
            $table->unique(['category_id', 'country_id', 'difficulty', 'stage_number']);
            $table->dropUnique(['category_id', 'difficulty', 'stage_number']);
        });
    }

    public function down(): void
    {
        Schema::table('stages', function (Blueprint $table) {
            $table->dropUnique(['category_id', 'country_id', 'difficulty', 'stage_number']);
            $table->unique(['category_id', 'difficulty', 'stage_number']);
        });
    }
};
