<?php

namespace Database\Seeders;

use App\Models\Admin;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Admin::query()->firstOrCreate(
            ['email' => 'admin@example.com'],
            Admin::factory()->raw(['name' => 'Test Admin'])
        );
    }
}
