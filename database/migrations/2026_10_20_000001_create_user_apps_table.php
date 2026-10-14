<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// どのアプリを使っているか(docs/design/2026-10-14-multi-app-accounts-design.md 4-1)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_apps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('app', 32);
            $table->timestamp('first_used_at');
            $table->timestamp('last_used_at');
            $table->timestamps();

            $table->unique(['user_id', 'app']);
            $table->index('app');
        });

        // いまのユーザーは、全員 Spra Go を使っている。登録日を、使い始めた日・最後に使った日にする
        DB::table('users')->orderBy('id')->each(function ($user) {
            DB::table('user_apps')->insert([
                'user_id' => $user->id,
                'app' => 'go',
                'first_used_at' => $user->created_at,
                'last_used_at' => $user->created_at,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_apps');
    }
};
