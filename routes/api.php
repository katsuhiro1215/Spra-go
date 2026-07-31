<?php

use App\Models\Admin;
use App\Models\Category;
use App\Models\CoinPurchase;
use App\Models\ContentItem;
use App\Models\Country;
use App\Models\Event;
use App\Models\Language;
use App\Models\ProfileStageProgress;
use App\Models\ProfileTitle;
use App\Models\Question;
use App\Models\QuestionChoice;
use App\Models\QuestionTheme;
use App\Models\Quiz;
use App\Models\Region;
use App\Models\ShopItem;
use App\Models\Stage;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\UserProfileItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\Rule;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook as StripeWebhook;

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});

Route::middleware(['auth:admin'])->get('/admin/user', function (Request $request) {
    return $request->user('admin');
})->name('admin.user');

Route::middleware(['auth:owner'])->get('/owner/user', function (Request $request) {
    return $request->user('owner');
})->name('owner.user');

Route::middleware(['auth:owner'])->get('/owner/dashboard/summary', function () {
    $sevenDaysAgo = now()->subDays(7);

    return [
        'user_count' => User::query()->count(),
        'profile_count' => UserProfile::query()->count(),
        'new_users_last_7_days' => User::query()->where('created_at', '>=', $sevenDaysAgo)->count(),
        'stage_clears_last_7_days' => ProfileStageProgress::query()
            ->whereNotNull('cleared_at')
            ->where('cleared_at', '>=', $sevenDaysAgo)
            ->count(),
        'countries_with_content' => Country::query()->whereHas('stages.questions')->count(),
        'coin_purchases' => [
            'completed_count' => CoinPurchase::query()->where('status', 'completed')->count(),
            'completed_amount_this_month' => (int) CoinPurchase::query()
                ->where('status', 'completed')
                ->where('completed_at', '>=', now()->startOfMonth())
                ->sum('amount'),
        ],
    ];
})->name('owner.dashboard.summary');

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

Route::middleware(['auth:owner'])->prefix('owner/regions')->name('owner.regions.')->group(function () {
    Route::get('/', function (Request $request) {
        return Region::query()
            ->when($request->query('country_id'), fn ($q, $countryId) => $q->where('country_id', $countryId))
            ->orderBy('order')
            ->get();
    })->name('index');

    Route::post('/', function (Request $request) {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'country_id' => ['required', Rule::exists('countries', 'id')],
            'parent_id' => [
                'nullable',
                Rule::exists('regions', 'id')->where(fn ($q) => $q->where('country_id', request('country_id'))),
            ],
        ]);

        $nextOrder = Region::query()
            ->where('country_id', $data['country_id'])
            ->where('parent_id', $data['parent_id'] ?? null)
            ->max('order') + 1;

        return Region::create([
            'name' => $data['name'],
            'country_id' => $data['country_id'],
            'parent_id' => $data['parent_id'] ?? null,
            'order' => $nextOrder,
        ]);
    })->name('store');

    Route::patch('/{region}', function (Request $request, Region $region) {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $region->update($data);

        return $region;
    })->name('update');

    Route::delete('/{region}', function (Region $region) {
        if ($region->children()->exists()) {
            return response()->json([
                'message' => '子地域が存在するため削除できません。先に子地域を削除してください。',
            ], 422);
        }

        $region->delete();

        return response()->noContent();
    })->name('destroy');
});

Route::middleware(['auth:owner'])->prefix('owner/countries')->name('owner.countries.')->group(function () {
    $languageIdsValidation = [
        'language_ids' => ['array'],
        'language_ids.*' => [Rule::exists('languages', 'id')],
        'primary_language_id' => ['nullable', Rule::exists('languages', 'id')],
    ];
    $syncLanguages = function (Country $country, array $data) {
        $syncData = collect($data['language_ids'] ?? [])->mapWithKeys(fn ($id) => [
            $id => ['is_primary' => $id == ($data['primary_language_id'] ?? null)],
        ]);
        $country->languages()->sync($syncData);
    };

    Route::get('/', function () {
        return Country::query()->with('languages')->orderBy('order')->get();
    })->name('index');

    Route::post('/', function (Request $request) use ($languageIdsValidation, $syncLanguages) {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:10', 'unique:countries,code'],
            'name' => ['required', 'string', 'max:255'],
            'stages' => ['nullable', 'integer', 'min:0'],
            'mood_emoji' => ['nullable', 'string', 'max:10'],
            'intro_message' => ['nullable', 'string'],
            ...$languageIdsValidation,
        ]);

        $nextOrder = Country::query()->max('order') + 1;

        $country = Country::create([
            'code' => $data['code'],
            'name' => $data['name'],
            'stages' => $data['stages'] ?? 0,
            'mood_emoji' => $data['mood_emoji'] ?? null,
            'intro_message' => $data['intro_message'] ?? null,
            'order' => $nextOrder,
        ]);

        $syncLanguages($country, $data);

        return $country->load('languages');
    })->name('store');

    Route::patch('/{country}', function (Request $request, Country $country) use ($languageIdsValidation, $syncLanguages) {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:10', Rule::unique('countries', 'code')->ignore($country->id)],
            'name' => ['required', 'string', 'max:255'],
            'stages' => ['nullable', 'integer', 'min:0'],
            'mood_emoji' => ['nullable', 'string', 'max:10'],
            'intro_message' => ['nullable', 'string'],
            ...$languageIdsValidation,
        ]);

        $country->update(collect($data)->except(['language_ids', 'primary_language_id'])->toArray());
        $syncLanguages($country, $data);

        return $country->load('languages');
    })->name('update');

    Route::delete('/{country}', function (Country $country) {
        $country->delete();

        return response()->noContent();
    })->name('destroy');
});

Route::middleware(['auth:owner'])->prefix('owner/languages')->name('owner.languages.')->group(function () {
    Route::get('/', function () {
        return Language::query()->orderBy('name')->get();
    })->name('index');

    Route::post('/', function (Request $request) {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:10', 'unique:languages,code'],
            'name' => ['required', 'string', 'max:255'],
        ]);

        return Language::create($data);
    })->name('store');

    Route::patch('/{language}', function (Request $request, Language $language) {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:10', Rule::unique('languages', 'code')->ignore($language->id)],
            'name' => ['required', 'string', 'max:255'],
        ]);

        $language->update($data);

        return $language;
    })->name('update');

    Route::delete('/{language}', function (Language $language) {
        $language->delete();

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
        'country_id' => ['nullable', Rule::exists('countries', 'id')],
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
        return $quiz->load(['country', 'categories', 'questions.choices', 'questions.country']);
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
            'country_id' => $data['country_id'] ?? null,
            'order' => $nextOrder,
        ]);

        foreach ($data['choices'] as $index => $choice) {
            $question->choices()->create([
                'label' => $choice['label'],
                'is_correct' => $choice['is_correct'],
                'order' => $index,
            ]);
        }

        return $question->load(['choices', 'country']);
    })->name('questions.store');

    Route::patch('/{quiz}/questions/{question}', function (Request $request, Quiz $quiz, Question $question) use ($choicesValidation) {
        abort_unless($question->quiz_id === $quiz->id, 404);

        $data = $request->validate($choicesValidation);

        if (collect($data['choices'])->where('is_correct', true)->count() !== 1) {
            return response()->json(['message' => '正解は1つだけ選択してください。'], 422);
        }

        $question->update([
            'prompt' => $data['prompt'],
            'country_id' => $data['country_id'] ?? null,
        ]);
        $question->choices()->delete();

        foreach ($data['choices'] as $index => $choice) {
            $question->choices()->create([
                'label' => $choice['label'],
                'is_correct' => $choice['is_correct'],
                'order' => $index,
            ]);
        }

        return $question->load(['choices', 'country']);
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

Route::middleware(['auth:owner'])->prefix('owner/shop-items')->name('owner.shop-items.')->group(function () {
    $shopItemTypes = ['potion', 'plane', 'background', 'character', 'title'];

    Route::get('/', function () {
        return ShopItem::query()->orderBy('type')->orderBy('price')->get();
    })->name('index');

    Route::post('/', function (Request $request) use ($shopItemTypes) {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'integer', 'min:0'],
            'type' => ['required', Rule::in($shopItemTypes)],
            'meta' => ['nullable', 'array'],
            'meta.heal' => ['required_if:type,potion', 'integer', 'min:1'],
        ]);

        return ShopItem::create($data);
    })->name('store');

    Route::patch('/{shopItem}', function (Request $request, ShopItem $shopItem) use ($shopItemTypes) {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'integer', 'min:0'],
            'type' => ['required', Rule::in($shopItemTypes)],
            'meta' => ['nullable', 'array'],
            'meta.heal' => ['required_if:type,potion', 'integer', 'min:1'],
        ]);

        $shopItem->update($data);

        return $shopItem;
    })->name('update');

    Route::delete('/{shopItem}', function (ShopItem $shopItem) {
        $shopItem->delete();

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
        'country_id' => ['nullable', Rule::exists('countries', 'id')],
        'region_id' => ['nullable', Rule::exists('regions', 'id')],
        'question_count' => ['required', 'integer', 'min:1'],
        'is_boss' => ['boolean'],
        'title_reward' => ['nullable', 'string', 'max:255'],
    ];

    Route::get('/', function (Request $request) {
        return Stage::query()
            ->when($request->query('category_id'), fn ($q, $categoryId) => $q->where('category_id', $categoryId))
            ->when($request->query('difficulty'), fn ($q, $difficulty) => $q->where('difficulty', $difficulty))
            ->with(['category', 'questionTheme', 'country', 'region'])
            ->orderBy('stage_number')
            ->get();
    })->name('index');

    Route::post('/', function (Request $request) use ($stageValidation) {
        $data = $request->validate($stageValidation());

        return Stage::create($data)->load(['category', 'questionTheme', 'country', 'region']);
    })->name('store');

    Route::patch('/{stage}', function (Request $request, Stage $stage) use ($stageValidation) {
        $data = $request->validate($stageValidation($stage));

        $stage->update($data);

        return $stage->load(['category', 'questionTheme', 'country', 'region']);
    })->name('update');

    Route::delete('/{stage}', function (Stage $stage) {
        $stage->delete();

        return response()->noContent();
    })->name('destroy');

    Route::get('/{stage}', function (Stage $stage) {
        return $stage->load(['category', 'questionTheme', 'country', 'region']);
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

Route::middleware(['auth:sanctum'])->get('/countries', function (Request $request) {
    // ホーム画面向け: コンテンツが実際にある国だけを返す(190ヶ国全部を出すと選べない上、
    // ほとんどが未実装で行き止まりになるため)。Owner管理画面は別エンドポイント
    // (/api/owner/countries)で全件を扱う。
    $countries = Country::query()
        ->whereHas('stages.questions')
        ->orderBy('order')
        ->get();

    $suggestedCode = Country::guessFromAcceptLanguage(
        $request->header('Accept-Language'),
        $countries->pluck('code')->all()
    );

    return $countries->map(fn (Country $country) => [
        ...$country->toArray(),
        'is_suggested' => $suggestedCode !== null
            && strtolower($country->code) === $suggestedCode,
        'has_language_mode' => $country->stages()
            ->whereHas('category', fn ($q) => $q->where('is_language_mode', true))
            ->whereHas('questions')
            ->exists(),
    ])->sortByDesc('is_suggested')->values();
})->name('countries.index');

Route::middleware(['auth:sanctum'])->get('/countries/{country}', function (Request $request, Country $country) {
    $profileId = $request->session()->get('active_profile_id');

    $clearedStageIds = $profileId
        ? ProfileStageProgress::query()
            ->where('user_profile_id', $profileId)
            ->whereNotNull('cleared_at')
            ->pluck('stage_id')
            ->all()
        : [];

    $allStages = Stage::query()
        ->where('country_id', $country->id)
        ->with('category')
        ->orderBy('stage_number')
        ->get();

    $directStages = $allStages->whereNull('region_id');

    $stagesByCategoryThenDifficulty = $directStages
        ->groupBy('category_id')
        ->map(fn ($stages) => $stages->groupBy('difficulty'));

    $groups = $directStages
        ->groupBy(fn (Stage $s) => $s->category_id.'|'.$s->difficulty)
        ->map(function ($group) use ($clearedStageIds, $stagesByCategoryThenDifficulty) {
            $clearedNumbers = $group
                ->filter(fn (Stage $s) => in_array($s->id, $clearedStageIds, true))
                ->pluck('stage_number')
                ->all();

            $categoryId = $group->first()->category_id;
            $difficulty = $group->first()->difficulty;

            return [
                'category' => $group->first()->category,
                'difficulty' => $difficulty,
                'locked' => Stage::isDifficultyLocked(
                    $stagesByCategoryThenDifficulty->get($categoryId) ?? collect(),
                    $difficulty,
                    $clearedStageIds
                ),
                'stages' => $group->map(fn (Stage $s) => [
                    'id' => $s->id,
                    'stage_number' => $s->stage_number,
                    'is_boss' => $s->is_boss,
                    'title_reward' => $s->title_reward,
                    'cleared' => in_array($s->id, $clearedStageIds, true),
                    'locked' => $s->stage_number > 1
                        && ! in_array($s->stage_number - 1, $clearedNumbers, true),
                ])->values(),
            ];
        })
        ->values();

    $allRegions = Region::query()->where('country_id', $country->id)->get(['id', 'parent_id', 'name']);

    $regions = $allRegions->whereNull('parent_id')
        ->map(function (Region $region) use ($allRegions, $allStages, $clearedStageIds) {
            $descendantIds = Region::descendantIdsFrom($allRegions, $region->id);
            $regionStages = $allStages->whereIn('region_id', $descendantIds);

            return [
                'id' => $region->id,
                'name' => $region->name,
                'achievement' => [
                    'cleared' => $regionStages->filter(fn (Stage $s) => in_array($s->id, $clearedStageIds, true))->count(),
                    'total' => $regionStages->count(),
                ],
            ];
        })
        ->values();

    return [
        'id' => $country->id,
        'code' => $country->code,
        'name' => $country->name,
        'mood_emoji' => $country->mood_emoji,
        'intro_message' => $country->intro_message,
        'achievement' => [
            'cleared' => $allStages->filter(fn (Stage $s) => in_array($s->id, $clearedStageIds, true))->count(),
            'total' => $allStages->count(),
        ],
        'regions' => $regions,
        'groups' => $groups,
    ];
})->name('countries.show');

Route::middleware(['auth:sanctum'])->get('/passport', function (Request $request) {
    $profileId = $request->session()->get('active_profile_id');

    $clearedProgress = $profileId
        ? ProfileStageProgress::query()
            ->where('user_profile_id', $profileId)
            ->whereNotNull('cleared_at')
            ->get(['stage_id', 'cleared_at'])
            ->keyBy('stage_id')
        : collect();

    $difficultyOrder = config('quiz.difficulties');

    $countries = Country::query()
        ->whereHas('stages.questions')
        ->orderBy('order')
        ->get()
        ->map(function (Country $country) use ($clearedProgress, $difficultyOrder) {
            $stages = Stage::query()->where('country_id', $country->id)->get();
            $stagesByDifficulty = $stages->groupBy('difficulty');

            $unlockedDifficulties = [];
            $stampTier = 'none';
            $tierByDifficulty = ['初級' => 'bronze', '中級' => 'silver', '上級' => 'gold'];

            foreach ($difficultyOrder as $index => $difficulty) {
                $diffStages = $stagesByDifficulty->get($difficulty, collect());
                if ($diffStages->isEmpty()) {
                    continue;
                }

                if ($index === 0) {
                    $unlockedDifficulties[] = $difficulty;
                } else {
                    $prevBoss = ($stagesByDifficulty->get($difficultyOrder[$index - 1]) ?? collect())
                        ->first(fn (Stage $s) => $s->is_boss);
                    if ($prevBoss && $clearedProgress->has($prevBoss->id)) {
                        $unlockedDifficulties[] = $difficulty;
                    }
                }

                $allCleared = $diffStages->every(fn (Stage $s) => $clearedProgress->has($s->id));
                if ($allCleared) {
                    $stampTier = $tierByDifficulty[$difficulty];
                }
            }

            $firstClearedAt = $stages
                ->map(fn (Stage $s) => $clearedProgress->get($s->id)?->cleared_at)
                ->filter()
                ->sort()
                ->first();

            return [
                'code' => $country->code,
                'name' => $country->name,
                'mood_emoji' => $country->mood_emoji,
                'stamp_tier' => $stampTier,
                'unlocked_difficulties' => $unlockedDifficulties,
                'first_cleared_at' => $firstClearedAt?->toDateString(),
            ];
        })
        ->values();

    $titles = $profileId
        ? ProfileTitle::query()
            ->where('user_profile_id', $profileId)
            ->orderBy('unlocked_at')
            ->pluck('title')
        : collect();

    return [
        'countries' => $countries,
        'titles' => $titles,
        'visited_count' => $countries->filter(fn ($c) => $c['stamp_tier'] !== 'none')->count(),
    ];
})->name('passport');

Route::middleware(['auth:sanctum'])->get('/regions/{region}', function (Request $request, Region $region) {
    $profileId = $request->session()->get('active_profile_id');

    $clearedStageIds = $profileId
        ? ProfileStageProgress::query()
            ->where('user_profile_id', $profileId)
            ->whereNotNull('cleared_at')
            ->pluck('stage_id')
            ->all()
        : [];

    $ancestors = [];
    $current = $region->parent;
    while ($current) {
        array_unshift($ancestors, ['id' => $current->id, 'name' => $current->name]);
        $current = $current->parent;
    }

    $allRegions = Region::query()->where('country_id', $region->country_id)->get(['id', 'parent_id', 'name']);
    $descendantIds = Region::descendantIdsFrom($allRegions, $region->id);

    $descendantStages = Stage::query()->whereIn('region_id', $descendantIds)->get(['id']);

    $children = $allRegions->where('parent_id', $region->id)
        ->map(function ($child) use ($allRegions, $clearedStageIds) {
            $childDescendantIds = Region::descendantIdsFrom($allRegions, $child->id);
            $childStages = Stage::query()->whereIn('region_id', $childDescendantIds)->get(['id']);

            return [
                'id' => $child->id,
                'name' => $child->name,
                'achievement' => [
                    'cleared' => $childStages->filter(fn (Stage $s) => in_array($s->id, $clearedStageIds, true))->count(),
                    'total' => $childStages->count(),
                ],
            ];
        })
        ->values();

    $groups = [];
    if ($children->isEmpty()) {
        $stages = Stage::query()->where('region_id', $region->id)->with('category')->orderBy('stage_number')->get();

        $stagesByCategoryThenDifficulty = $stages
            ->groupBy('category_id')
            ->map(fn ($s) => $s->groupBy('difficulty'));

        $groups = $stages
            ->groupBy(fn (Stage $s) => $s->category_id.'|'.$s->difficulty)
            ->map(function ($group) use ($clearedStageIds, $stagesByCategoryThenDifficulty) {
                $clearedNumbers = $group
                    ->filter(fn (Stage $s) => in_array($s->id, $clearedStageIds, true))
                    ->pluck('stage_number')
                    ->all();

                $categoryId = $group->first()->category_id;
                $difficulty = $group->first()->difficulty;

                return [
                    'category' => $group->first()->category,
                    'difficulty' => $difficulty,
                    'locked' => Stage::isDifficultyLocked(
                        $stagesByCategoryThenDifficulty->get($categoryId) ?? collect(),
                        $difficulty,
                        $clearedStageIds
                    ),
                    'stages' => $group->map(fn (Stage $s) => [
                        'id' => $s->id,
                        'stage_number' => $s->stage_number,
                        'is_boss' => $s->is_boss,
                        'title_reward' => $s->title_reward,
                        'cleared' => in_array($s->id, $clearedStageIds, true),
                        'locked' => $s->stage_number > 1
                            && ! in_array($s->stage_number - 1, $clearedNumbers, true),
                    ])->values(),
                ];
            })
            ->values();
    }

    return [
        'id' => $region->id,
        'name' => $region->name,
        'country' => $region->country,
        'ancestors' => $ancestors,
        'achievement' => [
            'cleared' => $descendantStages->filter(fn (Stage $s) => in_array($s->id, $clearedStageIds, true))->count(),
            'total' => $descendantStages->count(),
        ],
        'children' => $children,
        'groups' => $groups,
    ];
})->name('regions.show');

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
                'locked' => Stage::isDifficultyLocked($stagesByDifficulty, $difficulty, $clearedStageIds),
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
        ->with(['choices', 'country'])
        ->get(['questions.id', 'questions.type', 'questions.prompt', 'questions.country_id'])
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

    $profile->applyEconomy(['coin' => 100], 'stage_clear', null, $stage);

    $titleGranted = false;
    if ($stage->is_boss && $stage->title_reward && $data['score'] === $stage->questions()->count()) {
        $title = ProfileTitle::query()->firstOrCreate(
            ['user_profile_id' => $profile->id, 'title' => $stage->title_reward],
            ['source_stage_id' => $stage->id, 'unlocked_at' => now()]
        );
        $titleGranted = $title->wasRecentlyCreated;
    }

    return [
        'progress' => $progress,
        'profile' => [
            'id' => $profile->id,
            'hp' => $profile->hp,
            'max_hp' => $profile->max_hp,
            'xp' => $profile->xp,
            'coins' => $profile->coins,
            'level' => $profile->level,
        ],
        'title_granted' => $titleGranted,
        'title' => $stage->title_reward,
    ];
})->name('stages.complete');

Route::middleware(['auth:sanctum'])->post('/questions/{question}/answer', function (Request $request, Question $question) {
    $data = $request->validate([
        'choice_id' => ['required', Rule::exists('question_choices', 'id')],
    ]);

    $choice = QuestionChoice::query()->findOrFail($data['choice_id']);
    abort_unless($choice->question_id === $question->id, 422);

    $correctChoice = $question->choices()->where('is_correct', true)->first();

    $profileId = $request->session()->get('active_profile_id');
    $profile = $profileId ? UserProfile::find($profileId) : null;

    $economy = null;
    if ($profile && $profile->user_schema_id === $request->user()->schema?->id) {
        $profile->regenerateHp();

        if ($profile->hp <= 0) {
            return response()->json([
                'blocked' => true,
                'profile' => [
                    'hp' => $profile->hp,
                    'max_hp' => $profile->max_hp,
                    'hp_regen_seconds' => $profile->secondsUntilNextHp(),
                ],
            ], 409);
        }

        $result = $choice->is_correct
            ? $profile->applyEconomy(['hp' => -1, 'xp' => 10, 'coin' => 5], 'answer_correct', $question)
            : $profile->applyEconomy(['hp' => -2], 'answer_wrong', $question);

        $combo = $profile->registerComboResult($choice->is_correct);

        if ($combo['milestone_bonus_coin'] > 0) {
            $profile->applyEconomy(['coin' => $combo['milestone_bonus_coin']], 'combo_milestone', $question);
        }

        $streak = $profile->registerDailyStreak();

        if ($streak['milestone_bonus_coin'] > 0) {
            $profile->applyEconomy(['coin' => $streak['milestone_bonus_coin']], 'streak_milestone', $question);
        }

        $economy = [
            'hp' => $profile->hp,
            'max_hp' => $profile->max_hp,
            'hp_regen_seconds' => $profile->secondsUntilNextHp(),
            'xp' => $profile->xp,
            'coins' => $profile->coins,
            'level' => $profile->level,
            'leveled_up' => $result['leveled_up'],
            'delta' => $result['deltas'],
            'combo' => $combo['combo'],
            'best_combo' => $combo['best_combo'],
            'combo_milestone_bonus_coin' => $combo['milestone_bonus_coin'],
            'streak' => $streak['streak'],
            'best_streak' => $streak['best_streak'],
            'streak_extended_today' => $streak['streak_extended_today'],
            'streak_milestone_bonus_coin' => $streak['milestone_bonus_coin'],
        ];
    }

    return [
        'correct' => $choice->is_correct,
        'correct_choice_id' => $correctChoice?->id,
        'profile' => $economy,
    ];
})->name('questions.answer');

Route::middleware(['auth:sanctum'])->get('/shop', function () {
    return ShopItem::query()
        ->whereIn('type', config('shop.enabled_types'))
        ->orderBy('type')
        ->orderBy('price')
        ->get();
})->name('shop.index');

Route::middleware(['auth:sanctum'])->post('/shop/{shopItem}/purchase', function (Request $request, ShopItem $shopItem) {
    abort_unless(
        in_array($shopItem->type, config('shop.enabled_types'), true),
        422,
        'この商品は現在準備中のため購入できません。'
    );

    $profileId = $request->session()->get('active_profile_id');
    $profile = $profileId ? UserProfile::find($profileId) : null;
    abort_unless($profile && $profile->user_schema_id === $request->user()->schema?->id, 422);
    abort_if($profile->coins < $shopItem->price, 422, 'コインが足りません。');

    $deltas = ['coin' => -$shopItem->price];
    if ($shopItem->type === 'potion' && ($heal = $shopItem->meta['heal'] ?? null)) {
        $deltas['hp'] = $heal;
    }
    $profile->applyEconomy($deltas, 'shop_purchase');

    if ($shopItem->type === 'title') {
        ProfileTitle::query()->firstOrCreate(
            ['user_profile_id' => $profile->id, 'title' => $shopItem->name],
            ['unlocked_at' => now()]
        );
    }

    UserProfileItem::create([
        'user_profile_id' => $profile->id,
        'shop_item_id' => $shopItem->id,
        'purchased_at' => now(),
    ]);

    return [
        'profile' => [
            'id' => $profile->id,
            'hp' => $profile->hp,
            'max_hp' => $profile->max_hp,
            'xp' => $profile->xp,
            'coins' => $profile->coins,
            'level' => $profile->level,
        ],
    ];
})->name('shop.purchase');

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
        $profile = $id ? UserProfile::find($id) : null;
        $profile?->regenerateHp();

        $payload = $profile
            ? [...$profile->toArray(), 'hp_regen_seconds' => $profile->secondsUntilNextHp()]
            : null;

        // response()->json(null) は Symfony の JsonResponse の仕様で
        // "null" ではなく "{}" を返してしまう(空データ扱いされるため)。
        // フロントは「アクティブなプロフィールが無い」をnullで判定しているため、
        // 素のjson_encodeで確実にnullを返す。
        return response(json_encode($payload), 200, ['Content-Type' => 'application/json']);
    })->name('active');

    Route::post('/{profile}/select', function (Request $request, UserProfile $profile) {
        abort_unless(
            $profile->user_schema_id === $request->user()->schema?->id,
            403
        );

        $request->session()->put('active_profile_id', $profile->id);

        return $profile;
    })->name('select');

    Route::patch('/{profile}', function (Request $request, UserProfile $profile) {
        abort_unless(
            $profile->user_schema_id === $request->user()->schema?->id,
            403
        );

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $profile->update($data);

        return $profile;
    })->name('update');

    Route::delete('/{profile}', function (Request $request, UserProfile $profile) {
        abort_unless(
            $profile->user_schema_id === $request->user()->schema?->id,
            403
        );

        if ($request->session()->get('active_profile_id') === $profile->id) {
            $request->session()->forget('active_profile_id');
        }

        $profile->delete();

        return response()->noContent();
    })->name('destroy');
});

// 認証不要。マーケティングサイトの国別クイズ紹介ページ(公開・SEO向け)からの利用を想定。
// 経済ロジック(HP/XP/Coin)には一切触れない、あくまで体験版。
Route::prefix('public')->name('public.')->group(function () {
    Route::get('/countries/{country:code}/sample-quiz', function (Country $country) {
        $questions = Question::query()
            ->where('country_id', $country->id)
            ->whereHas('choices')
            ->with('choices')
            ->limit(50)
            ->get()
            ->shuffle()
            ->take(3)
            ->values();

        $questions->each(function (Question $question) {
            $question->choices = $question->choices->shuffle()->values();
        });

        return [
            'country' => [
                'code' => $country->code,
                'name' => $country->name,
                'mood_emoji' => $country->mood_emoji,
            ],
            'questions' => $questions->map(fn (Question $q) => [
                'id' => $q->id,
                'prompt' => $q->prompt,
                'choices' => $q->choices->map(fn (QuestionChoice $c) => [
                    'id' => $c->id,
                    'label' => $c->label,
                    'is_correct' => $c->is_correct,
                ]),
            ]),
        ];
    })->name('sample-quiz');
});

Route::middleware(['auth:sanctum'])->get('/coin-packages', function () {
    return collect(config('coin_packages.packages'))
        ->map(fn (array $package, string $key) => [
            'key' => $key,
            'coins' => $package['coins'],
            'amount' => $package['amount'],
            'currency' => $package['currency'],
            'label' => $package['label'],
        ])
        ->values();
})->name('coin-packages.index');

Route::middleware(['auth:sanctum'])->post('/coin-purchases/checkout', function (Request $request) {
    $data = $request->validate(['package_key' => ['required', 'string']]);

    $package = config("coin_packages.packages.{$data['package_key']}");
    abort_unless($package, 422, '不明なコインパッケージです。');

    $profileId = $request->session()->get('active_profile_id');
    $profile = $profileId ? UserProfile::find($profileId) : null;
    abort_unless($profile && $profile->user_schema_id === $request->user()->schema?->id, 422);

    abort_unless(config('services.stripe.secret_key'), 503, 'Stripeが設定されていません。');

    $stripe = new StripeClient(config('services.stripe.secret_key'));

    $session = $stripe->checkout->sessions->create([
        'mode' => 'payment',
        'line_items' => [[
            'price_data' => [
                'currency' => $package['currency'],
                'product_data' => ['name' => $package['label']],
                'unit_amount' => $package['amount'],
            ],
            'quantity' => 1,
        ]],
        'metadata' => [
            'user_profile_id' => (string) $profile->id,
            'package_key' => $data['package_key'],
        ],
        'success_url' => config('app.frontend_url').'/shop?purchase=success',
        'cancel_url' => config('app.frontend_url').'/shop?purchase=cancel',
    ]);

    CoinPurchase::create([
        'user_profile_id' => $profile->id,
        'package_key' => $data['package_key'],
        'coins' => $package['coins'],
        'amount' => $package['amount'],
        'currency' => $package['currency'],
        'stripe_checkout_session_id' => $session->id,
        'status' => 'pending',
    ]);

    return ['url' => $session->url];
})->name('coin-purchases.checkout');

// Stripeから直接叩かれる。セッション認証は使わず、署名検証だけで真正性を確認する。
Route::post('/stripe/webhook', function (Request $request) {
    $webhookSecret = config('services.stripe.webhook_secret');
    abort_unless($webhookSecret, 503, 'STRIPE_WEBHOOK_SECRETが未設定です。');

    try {
        $event = StripeWebhook::constructEvent(
            $request->getContent(),
            $request->header('Stripe-Signature', ''),
            $webhookSecret
        );
    } catch (SignatureVerificationException|\UnexpectedValueException $e) {
        return response()->json(['error' => 'invalid signature'], 400);
    }

    if ($event->type === 'checkout.session.completed') {
        CoinPurchase::completeFromStripeSession($event->data->object->id);
    }

    return response()->json(['received' => true]);
})->name('stripe.webhook');
