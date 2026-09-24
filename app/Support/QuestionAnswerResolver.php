<?php

namespace App\Support;

use App\Models\Question;
use App\Models\QuestionChoice;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * 出題タイプ(type)ごとに回答リクエストを検証し、正誤を判定する。
 * questions/{question}/answer エンドポイントの経済ロジック(HP/XP/コンボ等)は
 * 出題タイプに関わらず共通のため、ここでは正誤判定までを受け持つ。
 */
class QuestionAnswerResolver
{
    /**
     * @return array{correct: bool, correct_choice_id: int|null}
     */
    public static function multipleChoice(Request $request, Question $question): array
    {
        $data = $request->validate([
            'choice_id' => ['required', Rule::exists('question_choices', 'id')],
        ]);

        $choice = QuestionChoice::query()->findOrFail($data['choice_id']);
        abort_unless($choice->question_id === $question->id, 422);

        $correctChoice = $question->choices()->where('is_correct', true)->first();

        return [
            'correct' => $choice->is_correct,
            'correct_choice_id' => $correctChoice?->id,
        ];
    }

    /**
     * @return array{correct: bool, results: list<array{item_id: string, correct: bool, correct_choice_id: int}>}
     */
    public static function matching(Request $request, Question $question): array
    {
        $itemIds = collect($question->meta['items'] ?? [])->pluck('id')->all();

        $data = $request->validate([
            'answers' => ['required', 'array', 'size:'.count($itemIds)],
            'answers.*.item_id' => ['required', Rule::in($itemIds)],
            'answers.*.choice_id' => ['required', Rule::exists('question_choices', 'id')],
        ]);

        $submittedItemIds = collect($data['answers'])->pluck('item_id');
        if ($submittedItemIds->unique()->count() !== count($itemIds)) {
            throw ValidationException::withMessages([
                'answers' => 'すべてのアイテムに1回ずつ回答してください。',
            ]);
        }

        $choicesByItemId = $question->choices->keyBy(fn (QuestionChoice $choice) => $choice->meta['item_id'] ?? null);

        $results = collect($data['answers'])->map(function (array $answer) use ($question, $choicesByItemId) {
            $submittedChoice = QuestionChoice::query()->findOrFail($answer['choice_id']);
            abort_unless($submittedChoice->question_id === $question->id, 422);

            $correctChoice = $choicesByItemId->get($answer['item_id']);

            return [
                'item_id' => $answer['item_id'],
                'correct' => $correctChoice !== null && $correctChoice->id === $submittedChoice->id,
                'correct_choice_id' => $correctChoice?->id,
            ];
        })->values();

        return [
            'correct' => $results->every(fn (array $r) => $r['correct']),
            'results' => $results->all(),
        ];
    }
}
