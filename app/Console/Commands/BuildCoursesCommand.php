<?php

namespace App\Console\Commands;

use App\Models\Country;
use App\Support\CoursePoolBuilder;
use Illuminate\Console\Command;

/** content:import のあとに実行する。国のコースを、10ステージのプールに並べ直す(docs/design/2026-10-07-main-game-levels-design.md) */
class BuildCoursesCommand extends Command
{
    protected $signature = 'course:build {code? : 国のコード(省略すると全国)}';

    protected $description = '国のコースを、級ごとに10ステージ(最後がボス)のプールに並べ直す';

    public function handle(): int
    {
        $countries = Country::query()
            ->when($this->argument('code'), fn ($query, $code) => $query->whereRaw('LOWER(code) = ?', [strtolower($code)]))
            ->orderBy('order')->get();

        foreach ($countries as $country) {
            $result = CoursePoolBuilder::buildCountry($country);
            if ($result['stages'] > 0) {
                $this->info("{$country->name}: ステージ{$result['stages']}・プール{$result['pool']}");
            }
        }

        // 言語のコース(国に結びつけない)。国を指定したときは、触らない
        if (! $this->argument('code')) {
            foreach (CoursePoolBuilder::buildLanguages() as $key => $result) {
                $this->info(config("courses.languages.{$key}.name").": ステージ{$result['stages']}・プール{$result['pool']}");
            }
        }

        return self::SUCCESS;
    }
}
