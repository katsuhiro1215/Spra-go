<?php

namespace App\Console\Commands;

use App\Models\Country;
use App\Models\Question;
use App\Support\RetiredQuestions;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * すでに入っている、外す問題(docs/content/retired-questions.json)を、国のコースのステージから外す。
 * 問題そのものは消さない。何度流しても同じ。course:build の前に流す(プールの元は、ステージについている問題)
 */
class RetireQuestionsCommand extends Command
{
    protected $signature = 'content:retire';

    protected $description = '同じ国旗の問題など、外す一覧の問題を、国のコースのステージから外す';

    public function handle(): int
    {
        $detached = 0;

        foreach (RetiredQuestions::all() as $code => $levels) {
            $country = Country::query()->whereRaw('LOWER(code) = ?', [strtolower($code)])->first();
            if (! $country) {
                continue;
            }

            foreach ($levels as $difficulty => $prompts) {
                $questionIds = Question::query()
                    ->where('country_id', $country->id)
                    ->whereIn('prompt', $prompts)
                    ->whereHas('quiz', fn ($query) => $query->where('difficulty', $difficulty))
                    ->pluck('id');
                if ($questionIds->isEmpty()) {
                    continue;
                }

                $detached += DB::table('stage_questions')
                    ->whereIn('question_id', $questionIds)
                    ->whereIn('stage_id', DB::table('stages')->where('country_id', $country->id)->where('difficulty', $difficulty)->select('id'))
                    ->delete();
            }
        }

        $this->info("ステージから外した問題のつなぎ: {$detached}件");

        return self::SUCCESS;
    }
}
