<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_greetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_profile_id')->constrained('user_profiles')->cascadeOnDelete();
            $table->foreignId('to_profile_id')->constrained('user_profiles')->cascadeOnDelete();
            $table->string('stamp', 16);
            $table->date('greeted_on');
            $table->timestamp('seen_at')->nullable();
            $table->timestamps();

            // 送る人と受け取る人の組み合わせで1日1回(同時に送っても1回だけになる)。
            // 自動で付く名前はMySQLの64文字を超えるので、短い名前を付ける
            $table->unique(['from_profile_id', 'to_profile_id', 'greeted_on'], 'profile_greetings_daily_unique');
            $table->index(['to_profile_id', 'seen_at'], 'profile_greetings_unseen_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_greetings');
    }
};
