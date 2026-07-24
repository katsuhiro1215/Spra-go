<?php

namespace Database\Seeders;

use App\Models\Owner;
use Illuminate\Database\Seeder;

class OwnerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Owner::query()->firstOrCreate(
            ['email' => 'owner@example.com'],
            Owner::factory()->raw(['name' => 'Test Owner'])
        );
    }
}
