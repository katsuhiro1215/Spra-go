<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * 本番に入れる中身(カテゴリー・国・問題・ステージ・町の物など)だけを流す。
 * 試験用のOwner・Admin・利用者(推測できるパスワードがつく)は入れない(docs/design/2026-10-10-production-env-design.md 3章・7章)。
 * 開発では DatabaseSeeder が、試験用アカウントのあとに、これと同じ一覧を流す。
 */
class ProductionSeeder extends Seeder
{
    /** @return list<class-string<Seeder>> */
    public static function classes(): array
    {
        return [
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
            WorldItemSeeder::class,
            FlagQuizSeeder::class,
            PrefectureQuizSeeder::class,
        ];
    }

    public function run(): void
    {
        $this->call(self::classes());
    }
}
