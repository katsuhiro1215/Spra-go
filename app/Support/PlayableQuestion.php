<?php

namespace App\Support;

use App\Models\Question;
use Illuminate\Support\Collection;

/**
 * 問題を出すときに、正解の手がかりを隠す(ステージの出題と、仲間の復習で共通)。
 */
class PlayableQuestion
{
    /**
     * @param  Collection<int, Question>  $questions  choices・country を読み込み済みのもの
     * @return Collection<int, Question>
     */
    public static function present(Collection $questions): Collection
    {
        $questions->each(function (Question $question) {
            if ($question->type === 'matching') {
                // マッチングは全ペア分の選択肢をそのまま出す(is_correctの単一正解という概念がないため)。
                // meta.item_idを返すと正解の組み合わせが漏れるので隠す。
                $question->setRelation('choices', $question->choices->shuffle()->values());
                $question->choices->each->makeHidden(['is_correct', 'meta']);

                return;
            }

            if ($question->type === 'ordering') {
                // 並べ替えはorder列を「正解の順序」として使うため、シャッフルして出し、
                // 手がかりになるorder/is_correctを隠す。
                $question->setRelation('choices', $question->choices->shuffle()->values());
                $question->choices->each->makeHidden(['is_correct', 'order']);

                return;
            }

            if ($question->type === 'sorting') {
                // 仕分けはquestion_choicesを使わずmeta(items/baskets)だけで完結する。
                // items内のcorrect_basket_idは正解の手がかりになるため取り除いて返す。
                $question->meta = [
                    'items' => collect($question->meta['items'] ?? [])
                        ->map(fn (array $item) => ['id' => $item['id'], 'image' => $item['image']])
                        ->all(),
                    'baskets' => $question->meta['baskets'] ?? [],
                ];

                return;
            }

            $correct = $question->choices->firstWhere('is_correct', true);
            $wrong = $question->choices->where('is_correct', false);
            $display = $wrong->random(min(3, $wrong->count()));

            if ($correct) {
                $display->push($correct);
            }

            $question->setRelation('choices', $display->shuffle()->values());
            $question->choices->each->makeHidden('is_correct');
        });

        return $questions;
    }
}
