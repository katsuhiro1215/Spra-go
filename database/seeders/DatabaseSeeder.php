<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Category;
use App\Models\Country;
use App\Models\Owner;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::query()->firstOrCreate(
            ['email' => 'test@example.com'],
            User::factory()->raw(['name' => 'Test User'])
        );

        Admin::query()->firstOrCreate(
            ['email' => 'admin@example.com'],
            Admin::factory()->raw(['name' => 'Test Admin'])
        );

        Owner::query()->firstOrCreate(
            ['email' => 'owner@example.com'],
            Owner::factory()->raw(['name' => 'Test Owner'])
        );

        $rootCategories = [
            '国旗', '世界地図', '日本地図', '動物', '食べ物',
            'スポーツ', 'アニメ', '歴史', '世界遺産', '音楽', '建物',
        ];

        foreach ($rootCategories as $index => $name) {
            Category::query()->firstOrCreate(
                ['parent_id' => null, 'name' => $name],
                ['order' => $index]
            );
        }

        $countries = [
            ['code' => 'jp', 'name' => '日本', 'language' => '日本語', 'stages' => 12],
            ['code' => 'us', 'name' => 'アメリカ', 'language' => '英語', 'stages' => 20],
            ['code' => 'fr', 'name' => 'フランス', 'language' => 'フランス語', 'stages' => 8],
            ['code' => 'es', 'name' => 'スペイン', 'language' => 'スペイン語', 'stages' => 10],
            ['code' => 'it', 'name' => 'イタリア', 'language' => 'イタリア語', 'stages' => 6],
            ['code' => 'pt', 'name' => 'ポルトガル', 'language' => 'ポルトガル語', 'stages' => 4],
            ['code' => 'id', 'name' => 'インドネシア', 'language' => 'インドネシア語', 'stages' => 3],
            ['code' => 'th', 'name' => 'タイ', 'language' => 'タイ語', 'stages' => 5],
        ];

        foreach ($countries as $index => $country) {
            Country::query()->firstOrCreate(
                ['code' => $country['code']],
                [...$country, 'order' => $index]
            );
        }
    }
}
