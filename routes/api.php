<?php

use App\Models\Admin;
use App\Models\Category;
use App\Models\ContentItem;
use App\Models\Country;
use App\Models\Event;
use App\Models\ProfileStageProgress;
use App\Models\Question;
use App\Models\QuestionChoice;
use App\Models\QuestionTheme;
use App\Models\Quiz;
use App\Models\Stage;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\Rule;

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});

Route::middleware(['auth:admin'])->get('/admin/user', function (Request $request) {
    return $request->user('admin');
})->name('admin.user');

Route::middleware(['auth:owner'])->get('/owner/user', function (Request $request) {
    return $request->user('owner');
})->name('owner.user');

Route::middleware(['auth:owner'])->get('/owner/admins', function () {
    return Admin::query()->latest()->get();
})->name('owner.admins');

Route::middleware(['auth:owner'])->get('/owner/users', function () {
    return User::query()->latest()->get();
})->name('owner.users');

Route::middleware(['auth:owner'])->prefix('owner/categories')->name('owner.categories.')->group(function () {
    Route::get('/', function () {
        return Category::query()->orderBy('order')->get();
    })->name('index');

    Route::post('/', function (Request $request) {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', Rule::exists('categories', 'id')],
        ]);

        $nextOrder = Category::query()
            ->where('parent_id', $data['parent_id'] ?? null)
            ->max('order') + 1;

        return Category::create([
            'name' => $data['name'],
            'parent_id' => $data['parent_id'] ?? null,
            'order' => $nextOrder,
        ]);
    })->name('store');

    Route::patch('/{category}', function (Request $request, Category $category) {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $category->update($data);

        return $category;
    })->name('update');

    Route::delete('/{category}', function (Category $category) {
        if ($category->children()->exists()) {
            return response()->json([
                'message' => '子カテゴリーが存在するため削除できません。先に子カテゴリーを削除してください。',
            ], 422);
        }

        $category->delete();

        return response()->noContent();
    })->name('destroy');
});

Route::middleware(['auth:owner'])->prefix('owner/countries')->name('owner.countries.')->group(function () {
    Route::get('/', function () {
        return Country::query()->orderBy('order')->get();
    })->name('index');

    Route::post('/', function (Request $request) {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:10', 'unique:countries,code'],
            'name' => ['required', 'string', 'max:255'],
            'language' => ['required', 'string', 'max:255'],
            'stages' => ['nullable', 'integer', 'min:0'],
        ]);

        $nextOrder = Country::query()->max('order') + 1;

        return Country::create([
            'code' => $data['code'],
            'name' => $data['name'],
            'language' => $data['language'],
            'stages' => $data['stages'] ?? 0,
            'order' => $nextOrder,
        ]);
    })->name('store');

    Route::patch('/{country}', function (Request $request, Country $country) {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:10', Rule::unique('countries', 'code')->ignore($country->id)],
            'name' => ['required', 'string', 'max:255'],
            'language' => ['required', 'string', 'max:255'],
            'stages' => ['nullable', 'integer', 'min:0'],
        ]);

        $country->update($data);

        return $country;
    })->name('update');

    Route::delete('/{country}', function (Country $country) {
        $country->delete();

        return response()->noContent();
    })->name('destroy');
});

Route::middleware(['auth:owner'])->prefix('owner/events')->name('owner.events.')->group(function () {
    Route::get('/', function () {
        return Event::query()->orderBy('starts_at')->get();
    })->name('index');

    Route::post('/', function (Request $request) {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after_or_equal:starts_at'],
        ]);

        return Event::create($data);
    })->name('store');

    Route::patch('/{event}', function (Request $request, Event $event) {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after_or_equal:starts_at'],
        ]);

        $event->update($data);

        return $event;
    })->name('update');

    Route::delete('/{event}', function (Event $event) {
        $event->delete();

        return response()->noContent();
    })->name('destroy');
});

Route::middleware(['auth:owner'])->prefix('owner/content')->name('owner.content.')->group(function () {
    $contentTypes = ['単語', '会話', '文化', '歴史', '地理', '国旗', '世界遺産'];

    Route::get('/', function () {
        return ContentItem::query()->with('country')->latest()->get();
    })->name('index');

    Route::post('/', function (Request $request) use ($contentTypes) {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in($contentTypes)],
            'country_id' => ['nullable', Rule::exists('countries', 'id')],
        ]);

        return ContentItem::create($data)->load('country');
    })->name('store');

    Route::patch('/{contentItem}', function (Request $request, ContentItem $contentItem) use ($contentTypes) {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in($contentTypes)],
            'country_id' => ['nullable', Rule::exists('countries', 'id')],
        ]);

        $contentItem->update($data);

        return $contentItem->load('country');
    })->name('update');

    Route::delete('/{contentItem}', function (ContentItem $contentItem) {
        $contentItem->delete();

        return response()->noContent();
    })->name('destroy');
});

Route::middleware(['auth:owner'])->prefix('owner/quizzes')->name('owner.quizzes.')->group(function () {
    $quizValidation = fn () => [
        'title' => ['required', 'string', 'max:255'],
        'description' => ['nullable', 'string'],
        'difficulty' => ['required', Rule::in(['初級', '中級', '上級'])],
        'country_id' => ['nullable', Rule::exists('countries', 'id')],
        'category_ids' => ['array'],
        'category_ids.*' => [Rule::exists('categories', 'id')],
    ];
    $choicesValidation = [
        'prompt' => ['required', 'string'],
        'choices' => ['required', 'array', 'min:4', 'max:10'],
        'choices.*.label' => ['required', 'string', 'max:255'],
        'choices.*.is_correct' => ['required', 'boolean'],
    ];

    Route::get('/', function () {
        return Quiz::query()
            ->with(['country', 'categories'])
            ->withCount('questions')
            ->latest()
            ->get();
    })->name('index');

    Route::post('/', function (Request $request) use ($quizValidation) {
        $data = $request->validate($quizValidation());

        $quiz = Quiz::create(collect($data)->except('category_ids')->toArray());
        $quiz->categories()->sync($data['category_ids'] ?? []);

        return $quiz->load(['country', 'categories'])->loadCount('questions');
    })->name('store');

    Route::get('/{quiz}', function (Quiz $quiz) {
        return $quiz->load(['country', 'categories', 'questions.choices']);
    })->name('show');

    Route::patch('/{quiz}', function (Request $request, Quiz $quiz) use ($quizValidation) {
        $data = $request->validate($quizValidation());

        $quiz->update(collect($data)->except('category_ids')->toArray());
        $quiz->categories()->sync($data['category_ids'] ?? []);

        return $quiz->load(['country', 'categories'])->loadCount('questions');
    })->name('update');

    Route::delete('/{quiz}', function (Quiz $quiz) {
        $quiz->delete();

        return response()->noContent();
    })->name('destroy');

    Route::post('/{quiz}/questions', function (Request $request, Quiz $quiz) use ($choicesValidation) {
        $data = $request->validate($choicesValidation);

        if (collect($data['choices'])->where('is_correct', true)->count() !== 1) {
            return response()->json(['message' => '正解は1つだけ選択してください。'], 422);
        }

        $nextOrder = $quiz->questions()->max('order') + 1;

        $question = $quiz->questions()->create([
            'prompt' => $data['prompt'],
            'order' => $nextOrder,
        ]);

        foreach ($data['choices'] as $index => $choice) {
            $question->choices()->create([
                'label' => $choice['label'],
                'is_correct' => $choice['is_correct'],
                'order' => $index,
            ]);
        }

        return $question->load('choices');
    })->name('questions.store');

    Route::patch('/{quiz}/questions/{question}', function (Request $request, Quiz $quiz, Question $question) use ($choicesValidation) {
        abort_unless($question->quiz_id === $quiz->id, 404);

        $data = $request->validate($choicesValidation);

        if (collect($data['choices'])->where('is_correct', true)->count() !== 1) {
            return response()->json(['message' => '正解は1つだけ選択してください。'], 422);
        }

        $question->update(['prompt' => $data['prompt']]);
        $question->choices()->delete();

        foreach ($data['choices'] as $index => $choice) {
            $question->choices()->create([
                'label' => $choice['label'],
                'is_correct' => $choice['is_correct'],
                'order' => $index,
            ]);
        }

        return $question->load('choices');
    })->name('questions.update');

    Route::delete('/{quiz}/questions/{question}', function (Quiz $quiz, Question $question) {
        abort_unless($question->quiz_id === $quiz->id, 404);

        $question->delete();

        return response()->noContent();
    })->name('questions.destroy');
});

Route::middleware(['auth:owner'])->prefix('owner/question-themes')->name('owner.question-themes.')->group(function () {
    Route::get('/', function () {
        return QuestionTheme::query()->orderBy('label')->get();
    })->name('index');

    Route::post('/', function (Request $request) {
        $data = $request->validate([
            'key' => ['required', 'string', 'max:255', 'unique:question_themes,key'],
            'label' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        return QuestionTheme::create($data);
    })->name('store');

    Route::patch('/{questionTheme}', function (Request $request, QuestionTheme $questionTheme) {
        $data = $request->validate([
            'key' => ['required', 'string', 'max:255', Rule::unique('question_themes', 'key')->ignore($questionTheme->id)],
            'label' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $questionTheme->update($data);

        return $questionTheme;
    })->name('update');

    Route::delete('/{questionTheme}', function (QuestionTheme $questionTheme) {
        $questionTheme->delete();

        return response()->noContent();
    })->name('destroy');
});

Route::middleware(['auth:owner'])->prefix('owner/stages')->name('owner.stages.')->group(function () {
    $stageValidation = fn (?Stage $ignore = null) => [
        'category_id' => ['required', Rule::exists('categories', 'id')],
        'difficulty' => ['required', Rule::in(config('quiz.difficulties'))],
        'stage_number' => [
            'required',
            'integer',
            'min:1',
            Rule::unique('stages', 'stage_number')
                ->where(fn ($query) => $query
                    ->where('category_id', request('category_id'))
                    ->where('difficulty', request('difficulty')))
                ->ignore($ignore?->id),
        ],
        'question_theme_id' => ['nullable', Rule::exists('question_themes', 'id')],
        'question_count' => ['required', 'integer', 'min:1'],
        'is_boss' => ['boolean'],
        'title_reward' => ['nullable', 'string', 'max:255'],
    ];

    Route::get('/', function (Request $request) {
        return Stage::query()
            ->when($request->query('category_id'), fn ($q, $categoryId) => $q->where('category_id', $categoryId))
            ->when($request->query('difficulty'), fn ($q, $difficulty) => $q->where('difficulty', $difficulty))
            ->with(['category', 'questionTheme'])
            ->orderBy('stage_number')
            ->get();
    })->name('index');

    Route::post('/', function (Request $request) use ($stageValidation) {
        $data = $request->validate($stageValidation());

        return Stage::create($data)->load(['category', 'questionTheme']);
    })->name('store');

    Route::patch('/{stage}', function (Request $request, Stage $stage) use ($stageValidation) {
        $data = $request->validate($stageValidation($stage));

        $stage->update($data);

        return $stage->load(['category', 'questionTheme']);
    })->name('update');

    Route::delete('/{stage}', function (Stage $stage) {
        $stage->delete();

        return response()->noContent();
    })->name('destroy');

    Route::get('/{stage}', function (Stage $stage) {
        return $stage->load(['category', 'questionTheme']);
    })->name('show');

    Route::get('/{stage}/questions', function (Stage $stage) {
        return $stage->questions()
            ->with('quiz:id,title,difficulty')
            ->get(['questions.id', 'questions.quiz_id', 'questions.type', 'questions.prompt']);
    })->name('questions.index');

    Route::post('/{stage}/questions', function (Request $request, Stage $stage) {
        $data = $request->validate([
            'question_ids' => ['required', 'array'],
            'question_ids.*' => ['integer', Rule::exists('questions', 'id')],
        ]);

        $existingIds = $stage->questions()->pluck('questions.id')->all();
        $newIds = array_values(array_diff($data['question_ids'], $existingIds));

        $nextOrder = (int) ($stage->questions()->max('stage_questions.order') ?? 0) + 1;

        $attach = [];
        foreach ($newIds as $questionId) {
            $attach[$questionId] = ['order' => $nextOrder++];
        }

        $stage->questions()->attach($attach);

        return $stage->questions()
            ->with('quiz:id,title,difficulty')
            ->get(['questions.id', 'questions.quiz_id', 'questions.type', 'questions.prompt']);
    })->name('questions.store');

    Route::delete('/{stage}/questions/{question}', function (Stage $stage, Question $question) {
        $stage->questions()->detach($question->id);

        return response()->noContent();
    })->name('questions.destroy');

    Route::get('/{stage}/candidate-questions', function (Stage $stage) {
        return Question::query()
            ->whereHas('quiz', function ($query) use ($stage) {
                $query->where('is_published', true)
                    ->whereHas('categories', fn ($q) => $q->where('categories.id', $stage->category_id));
            })
            ->whereNotIn('id', $stage->questions()->pluck('questions.id'))
            ->with('quiz:id,title,difficulty')
            ->get(['questions.id', 'questions.quiz_id', 'questions.type', 'questions.prompt']);
    })->name('candidate-questions');
});

Route::middleware(['auth:sanctum'])->get('/categories', function () {
    return Category::query()->orderBy('order')->get();
})->name('categories.index');

Route::middleware(['auth:sanctum'])->get('/categories/{category}/stages', function (Request $request, Category $category) {
    $profileId = $request->session()->get('active_profile_id');

    $clearedStageIds = $profileId
        ? ProfileStageProgress::query()
            ->where('user_profile_id', $profileId)
            ->whereNotNull('cleared_at')
            ->pluck('stage_id')
            ->all()
        : [];

    $stagesByDifficulty = Stage::query()
        ->where('category_id', $category->id)
        ->withCount('questions')
        ->orderBy('stage_number')
        ->get()
        ->groupBy('difficulty');

    return collect(config('quiz.difficulties'))
        ->map(function (string $difficulty) use ($stagesByDifficulty, $clearedStageIds) {
            $stages = ($stagesByDifficulty->get($difficulty) ?? collect())->values();
            $clearedNumbers = $stages
                ->filter(fn (Stage $s) => in_array($s->id, $clearedStageIds, true))
                ->pluck('stage_number')
                ->all();

            return [
                'difficulty' => $difficulty,
                'stages' => $stages->map(fn (Stage $stage) => [
                    'id' => $stage->id,
                    'stage_number' => $stage->stage_number,
                    'is_boss' => $stage->is_boss,
                    'title_reward' => $stage->title_reward,
                    'question_count' => $stage->question_count,
                    'assigned_count' => $stage->questions_count,
                    'cleared' => in_array($stage->id, $clearedStageIds, true),
                    'locked' => $stage->stage_number > 1
                        && ! in_array($stage->stage_number - 1, $clearedNumbers, true),
                ])->values(),
            ];
        })
        ->values();
})->name('categories.stages');

Route::middleware(['auth:sanctum'])->get('/stages/{stage}', function (Stage $stage) {
    $questions = $stage->questions()
        ->with('choices')
        ->get(['questions.id', 'questions.type', 'questions.prompt'])
        ->shuffle()
        ->values();

    abort_if($questions->isEmpty(), 404);

    $questions->each(function (Question $question) {
        $correct = $question->choices->firstWhere('is_correct', true);
        $wrong = $question->choices->where('is_correct', false);
        $display = $wrong->random(min(3, $wrong->count()));

        if ($correct) {
            $display->push($correct);
        }

        $question->setRelation('choices', $display->shuffle()->values());
        $question->choices->each->makeHidden('is_correct');
    });

    return [
        'id' => $stage->id,
        'category' => $stage->category,
        'difficulty' => $stage->difficulty,
        'stage_number' => $stage->stage_number,
        'is_boss' => $stage->is_boss,
        'title_reward' => $stage->title_reward,
        'questions' => $questions,
    ];
})->name('stages.play');

Route::middleware(['auth:sanctum'])->post('/stages/{stage}/complete', function (Request $request, Stage $stage) {
    $data = $request->validate([
        'score' => ['required', 'integer', 'min:0'],
    ]);

    $profileId = $request->session()->get('active_profile_id');
    $profile = $profileId ? UserProfile::find($profileId) : null;
    abort_unless($profile && $profile->user_schema_id === $request->user()->schema?->id, 422);

    $progress = ProfileStageProgress::query()->firstOrNew([
        'user_profile_id' => $profile->id,
        'stage_id' => $stage->id,
    ]);
    $progress->attempts = ($progress->attempts ?? 0) + 1;
    $progress->best_score = max($progress->best_score ?? 0, $data['score']);
    $progress->cleared_at ??= now();
    $progress->save();

    return $progress;
})->name('stages.complete');

Route::middleware(['auth:sanctum'])->post('/questions/{question}/answer', function (Request $request, Question $question) {
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
})->name('questions.answer');

Route::middleware(['auth:sanctum'])->prefix('profiles')->name('profiles.')->group(function () {
    Route::get('/', function (Request $request) {
        return $request->user()->schema?->profiles ?? [];
    })->name('index');

    Route::post('/', function (Request $request) {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $schema = $request->user()->schema ?? $request->user()->schema()->create();

        return $schema->profiles()->create([
            'name' => $request->string('name'),
        ]);
    })->name('store');

    Route::get('/active', function (Request $request) {
        $id = $request->session()->get('active_profile_id');

        return $id ? UserProfile::find($id) : null;
    })->name('active');

    Route::post('/{profile}/select', function (Request $request, UserProfile $profile) {
        abort_unless(
            $profile->user_schema_id === $request->user()->schema?->id,
            403
        );

        $request->session()->put('active_profile_id', $profile->id);

        return $profile;
    })->name('select');
});
