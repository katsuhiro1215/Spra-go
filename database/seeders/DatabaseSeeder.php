<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 試験用のOwner・Admin・利用者は、推測できるパスワードで作られる。本番に入れてはいけない
        if (app()->isProduction()) {
            throw new RuntimeException('本番では DatabaseSeeder を流せません。中身だけを入れるときは ProductionSeeder を使ってください。');
        }

        $this->call([
            UserSeeder::class,
            AdminSeeder::class,
            OwnerSeeder::class,
            UserSchemaSeeder::class,
            UserProfileSeeder::class,
            ...ProductionSeeder::classes(),
        ]);
    }
}
