<?php

namespace Database\Seeders;

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
        $this->call([
            UserSeeder::class,
            AdminSeeder::class,
            OwnerSeeder::class,
            UserSchemaSeeder::class,
            UserProfileSeeder::class,
            CategorySeeder::class,
            LanguageSeeder::class,
            CountrySeeder::class,
            EventSeeder::class,
            ContentItemSeeder::class,
            QuestionThemeSeeder::class,
            QuizSeeder::class,
            QuestionSeeder::class,
            QuestionChoiceSeeder::class,
            StageSeeder::class,
        ]);
    }
}
