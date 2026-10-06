<?php

use App\Models\Admin;
use App\Models\Category;
use App\Models\CoinPurchase;
use App\Models\ContentItem;
use App\Models\Country;
use App\Models\Event;
use App\Models\Feedback;
use App\Models\Language;
use App\Models\ProfileGamePlay;
use App\Models\ProfileStageProgress;
use App\Models\ProfileTitle;
use App\Models\ProfileWorldItem;
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
use App\Support\ActiveProfile;
use App\Support\Analytics;
use App\Support\AppSettings;
use App\Support\Bond;
use App\Support\CatchGame;
use App\Support\ContinueStage;
use App\Support\CourseLevels;
use App\Support\Courses;
use App\Support\Csv;
use App\Support\Errands;
use App\Support\Family;
use App\Support\Garden;
use App\Support\LevelCurve;
use App\Support\MiniQuizzes;
use App\Support\PlayableQuestion;
use App\Support\PlayTime;
use App\Support\Prefecture\PrefectureBadges;
use App\Support\Prefecture\PrefectureCatalog;
use App\Support\Prefecture\PrefectureMaster;
use App\Support\QuestionAnswerResolver;
use App\Support\QuestionMemory;
use App\Support\RareSeeds;
use App\Support\Review;
use App\Support\Roster;
use App\Support\StageDraw;
use App\Support\Travel;
use App\Support\Words;
use App\Support\WorldLand;
use App\Support\WorldPlacement;
use App\Support\Zukan;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Validator;
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
        'invite_code_empty' => AppSettings::inviteCode() === '',
        'coin_purchases' => [
            'completed_count' => CoinPurchase::query()->where('status', 'completed')->count(),
            'completed_amount_this_month' => (int) CoinPurchase::query()
                ->where('status', 'completed')
                ->where('completed_at', '>=', now()->startOfMonth())
                ->sum('amount'),
        ],
    ];
})->name('owner.dashboard.summary');

// ログイン不要。登録画面が、招待コードの欄を出すか・おやすみ中かを知るための問い合わせ(コードそのものは返さない)
Route::get('/registration', fn () => [
    'open' => AppSettings::registrationOpen(),
    'invite_required' => AppSettings::inviteCode() !== '',
])->name('registration.info');

Route::middleware(['auth:owner'])->get('/owner/settings', fn () => AppSettings::all())->name('owner.settings.show');

Route::middleware(['auth:owner'])->put('/owner/settings', function (Request $request) {
    $data = $request->validate([
        'invite_code' => ['nullable', 'string', 'max:64'],
        'registration_open' => ['required', 'boolean'],
        'coin_purchase_enabled' => ['required', 'boolean'],
    ]);

    AppSettings::update($data);

    return AppSettings::all();
})->name('owner.settings.update');

Route::middleware(['auth:owner'])->get('/owner/feedbacks', function (Request $request) {
    $query = Feedback::query()->with(['user:id,name', 'question:id,prompt'])->latest('id');

    if ($request->filled('kind')) {
        $query->where('kind', $request->string('kind'));
    }
    if ($request->filled('status')) {
        $query->where('status', $request->string('status'));
    }

    return $query->paginate(30)->through(fn (Feedback $feedback) => $feedback->toOwnerArray());
})->name('owner.feedbacks.index');

Route::middleware(['auth:owner'])->patch('/owner/feedbacks/{feedback}', function (Request $request, Feedback $feedback) {
    $data = $request->validate(['status' => ['required', Rule::in(Feedback::STATUSES)]]);

    $feedback->update($data);

    return $feedback->load(['user:id,name', 'question:id,prompt'])->toOwnerArray();
})->name('owner.feedbacks.update');

Route::middleware(['auth:owner'])->get('/owner/admins', function () {
    return Admin::query()->latest()->get();
})->name('owner.admins');

// 分析(docs/design/2026-10-03-analytics-design.md 4-4)。期間は 7・14・30・90 のどれか(それ以外は14)
Route::middleware(['auth:owner'])->get('/owner/analytics', function (Request $request) {
    $days = in_array((int) $request->query('days'), [7, 14, 30, 90], true) ? (int) $request->query('days') : 14;
    $analytics = new Analytics;
    $today = $analytics->today();
    $from = Carbon::parse($today)->subDays($days - 1)->toDateString();

    return [
        'days' => $days,
        'summary' => $analytics->summary(),
        'daily' => $analytics->daily($from, $today),
        'retention' => $analytics->retention(),
        'cohorts' => $analytics->cohorts(8),
        'funnel' => $analytics->funnel($from),
        'dropoff' => $analytics->dropoff($from),
        'hard_questions' => $analytics->hardQuestions(),
        'activities' => $analytics->activities($from, $today),
        'feedback' => $analytics->feedbackCounts(),
    ];
})->name('owner.analytics');

// 分析のCSV(docs/design/2026-10-03-analytics-design.md 4-4・6-3)。User一覧にメールアドレスは入れない
Route::middleware(['auth:owner'])->get('/owner/analytics/export/{kind}', function (Request $request, string $kind) {
    abort_unless(in_array($kind, ['daily', 'cohorts', 'hard-questions', 'users'], true), 404);

    $analytics = new Analytics;
    $today = $analytics->today();

    $csv = match ($kind) {
        'daily' => (function () use ($request, $analytics, $today) {
            $days = in_array((int) $request->query('days'), [7, 14, 30, 90], true) ? (int) $request->query('days') : 14;
            $rows = $analytics->daily(Carbon::parse($today)->subDays($days - 1)->toDateString(), $today);

            return Csv::make(
                ['日付', '新規アカウント', '新規プレイヤー', '開いた人数', '遊んだ人数', '解いた問題数', '正解数', '正解率', '遊んだ時間(分)'],
                array_map(fn ($r) => [$r['date'], $r['new_accounts'], $r['new_players'], $r['opened_players'], $r['active_players'], $r['answers'], $r['correct_answers'], $r['accuracy'], $r['play_minutes']], $rows),
            );
        })(),
        'cohorts' => Csv::make(
            ['登録した週', '人数', '登録した週', '1週後', '2週後', '3週後', '4週後'],
            array_map(fn ($c) => [$c['week'], $c['players'], ...$c['weeks']], $analytics->cohorts(8)),
        ),
        'hard-questions' => Csv::make(
            ['問題番号', '問題文', '回答数', '正解率', 'へん報告数'],
            array_map(fn ($q) => [$q['question_id'], $q['prompt'], $q['answers'], $q['accuracy'], $q['reports']], $analytics->hardQuestions()),
        ),
        'users' => (function () use ($analytics) {
            $stats = $analytics->userStats();

            return Csv::make(
                ['ID', '名前', '登録日', 'メール確認', 'プレイヤー数', '最後に遊んだ日', '解いた問題数', '遊んだ時間(分)'],
                User::query()->latest()->get()->map(fn (User $user) => [
                    $user->id, $user->name,
                    $user->created_at->copy()->setTimezone(Analytics::TIMEZONE)->toDateString(),
                    $user->email_verified_at ? '確認済み' : '未確認',
                    $stats[$user->id]['players'], $stats[$user->id]['last_played_on'], $stats[$user->id]['answers'], $stats[$user->id]['play_minutes'],
                ])->all(),
            );
        })(),
    };

    return response($csv, 200, ['Content-Type' => 'text/csv; charset=UTF-8']);
})->name('owner.analytics.export');

Route::middleware(['auth:owner'])->get('/owner/users', function () {
    $stats = (new Analytics)->userStats();

    return User::query()->latest()->get()->map(fn (User $user) => array_merge($user->toArray(), [
        'registered_on' => $user->created_at->copy()->setTimezone(Analytics::TIMEZONE)->toDateString(),
    ], $stats[$user->id]));
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
    $shopItemTypes = ['potion', 'plane', 'background', 'character', 'title', 'decoration'];

    $rules = fn () => [
        'name' => ['required', 'string', 'max:255'],
        'price' => ['required', 'integer', 'min:0'],
        'type' => ['required', Rule::in($shopItemTypes)],
        'min_level' => ['nullable', 'integer', 'min:1', 'max:99'],
        'meta' => ['nullable', 'array'],
        'meta.heal' => ['required_if:type,potion', 'integer', 'min:1'],
        'meta.asset_key' => ['required_if:type,decoration', 'string', Rule::in(config('world.asset_keys'))],
    ];

    // 町のアイテムは学習ポイント払い、それ以外はコイン払いに固定する(Ownerが通貨を選び間違えないようにするため)
    $normalize = function (array $data): array {
        $data['currency'] = $data['type'] === 'decoration' ? 'point' : 'coin';
        $data['min_level'] = $data['min_level'] ?? 1;

        return $data;
    };

    Route::get('/', function () {
        return ShopItem::query()->orderBy('type')->orderBy('price')->get();
    })->name('index');

    Route::post('/', function (Request $request) use ($rules, $normalize) {
        return ShopItem::create($normalize($request->validate($rules())));
    })->name('store');

    Route::patch('/{shopItem}', function (Request $request, ShopItem $shopItem) use ($rules, $normalize) {
        abort_if($shopItem->meta['not_for_sale'] ?? false, 422, '非売品のアイテムは編集できません。');

        $shopItem->update($normalize($request->validate($rules())));

        return $shopItem;
    })->name('update');

    Route::delete('/{shopItem}', function (ShopItem $shopItem) {
        abort_if(
            ProfileWorldItem::query()->where('shop_item_id', $shopItem->id)->exists(),
            422,
            'プレイヤーが持っているアイテムのため削除できません。'
        );

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

// ミニアプリの引き出しに出すミニクイズ(docs/design/2026-10-04-mini-app-tidy-design.md 3章)
Route::middleware(['auth:sanctum'])->get('/mini-quizzes', fn (Request $request) => MiniQuizzes::list(ActiveProfile::find($request)))
    ->name('mini-quizzes.index');

// 国旗クイズなどの「コース」の一覧(docs/design/2026-10-05-flag-quiz-design.md 7-3)
Route::middleware(['auth:sanctum'])->get('/categories/{category}/courses', function (Request $request, Category $category) {
    abort_unless($category->is_course_group, 404);

    return Courses::list($category, ActiveProfile::find($request));
})->name('categories.courses');

Route::middleware(['auth:sanctum'])->get('/countries', function (Request $request) {
    // 学ぶタブ向け(docs/design/2026-09-28-travel-tickets-design.md 3-6): 日本と旅の行き先の国のうち、コンテンツがある国だけを
    // 日本 → 行き先の順に返し、まだ着いていない行き先に鍵(locked)を付ける。Owner管理画面は /api/owner/countries で全件を扱う。
    // Accept-Language からの推定(Country::guessFromAcceptLanguage)は、スタートが日本に決まったので使わない(海外展開のときにまた使う)
    // 国ごとの achievement(クリアしたステージの数/問題のあるステージの数)は国旗のカードに出す(docs/design/2026-09-29-learn-flag-cards-design.md)
    $codes = Travel::countryCodes();
    $profile = ActiveProfile::find($request);
    $locked = Travel::lockedCountryIds($profile);

    $countries = Country::query()
        ->whereIn(DB::raw('LOWER(code)'), $codes)
        ->whereHas('stages.questions')
        ->get();

    // 国旗のカードの進み具合(docs/design/2026-09-29-learn-flag-cards-design.md 4章)。問題のあるステージ(id => 国のid)と、
    // 今のプロフィールがそのうちクリアしたステージを、国の数によらずまとめて1回ずつ読む
    $stageCountries = Stage::query()
        ->whereIn('country_id', $countries->pluck('id'))
        ->whereIn('category_id', CourseLevels::mainCategoryIds())
        ->whereHas('questions')
        ->pluck('country_id', 'id');
    $homeCountry = CourseLevels::homeCountry($profile);
    $availableLanguages = CourseLevels::availableLanguageKeys();
    $clearedStageIds = $profile
        ? ProfileStageProgress::query()
            ->where('user_profile_id', $profile->id)
            ->whereNotNull('cleared_at')
            ->whereIn('stage_id', $stageCountries->keys())
            ->pluck('stage_id')
            ->all()
        : [];
    $clearedCountries = $stageCountries->only($clearedStageIds);

    return $countries
        ->sortBy(fn (Country $country) => array_search(strtolower($country->code), $codes, true))
        ->map(fn (Country $country) => [
            ...$country->toArray(),
            'locked' => in_array($country->id, $locked, true),
            // 国の言語のコース({key, name})。ステージのある言語だけ。母国の言語は出さない
            'language' => CourseLevels::languageForCountry($country->code, $homeCountry, $availableLanguages),
            'has_language_mode' => CourseLevels::languageForCountry($country->code, $homeCountry, $availableLanguages) !== null,
            'achievement' => [
                'cleared' => $clearedCountries->filter(fn ($countryId) => (int) $countryId === $country->id)->count(),
                'total' => $stageCountries->filter(fn ($countryId) => (int) $countryId === $country->id)->count(),
            ],
        ])
        ->values();
})->name('countries.index');

Route::middleware(['auth:sanctum'])->get('/countries/{country}', function (Request $request, Country $country) {
    Travel::abortIfLocked(ActiveProfile::find($request), $country->id);
    $profileId = $request->session()->get('active_profile_id');

    $clearedStageIds = $profileId
        ? ProfileStageProgress::query()
            ->where('user_profile_id', $profileId)
            ->whereNotNull('cleared_at')
            ->pluck('stage_id')
            ->all()
        : [];
    $bestScores = Stage::bestScores($profileId);

    $allStages = Stage::query()
        ->where('country_id', $country->id)
        ->with('category')
        ->orderBy('stage_number')
        ->get();

    // 級ごとのグループを作る(国のメインの道と、言語のコースで共通)
    $presentGroups = function ($stages) use ($clearedStageIds, $bestScores) {
        $stagesByCategoryThenDifficulty = $stages
            ->groupBy('category_id')
            ->map(fn ($categoryStages) => $categoryStages->groupBy('difficulty'));

        return $stages
            ->groupBy(fn (Stage $s) => $s->category_id.'|'.$s->difficulty)
            ->map(function ($group) use ($clearedStageIds, $stagesByCategoryThenDifficulty, $bestScores) {
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
                        $clearedStageIds,
                        $bestScores
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
    };

    // 国の画面の道は、国のメインの道(国旗)だけ。英語・世界遺産は出さない(docs/design/2026-10-07-main-game-levels-design.md 4-1)
    $mainCategoryIds = CourseLevels::mainCategoryIds();
    $mainStages = $allStages->whereNull('region_id')->whereIn('category_id', $mainCategoryIds);
    $groups = $presentGroups($mainStages);

    // その国の言語のコース(国に結びつかない)。母国の言語・ステージのない言語は出さない
    $language = CourseLevels::languageForCountry($country->code, CourseLevels::homeCountry(ActiveProfile::find($request)));
    $languageGroups = $language
        ? $presentGroups(Stage::query()->whereNull('country_id')->whereHas('category', fn ($q) => $q->where('name', config("courses.languages.{$language['key']}.category")))->with('category')->orderBy('stage_number')->get())
        : collect();

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
            'cleared' => $mainStages->filter(fn (Stage $s) => in_array($s->id, $clearedStageIds, true))->count(),
            'total' => $mainStages->count(),
        ],
        'regions' => $regions,
        'groups' => $groups,
        'language' => $language,
        'language_groups' => $languageGroups,
    ];
})->name('countries.show');

// パンとやさいのずかん(docs/design/2026-10-05-bread-zukan-design.md)。持っていない物の名前は返さない
Route::middleware(['auth:sanctum'])->get('/zukan', function (Request $request) {
    return Zukan::list(ActiveProfile::require($request));
})->name('zukan');

// 単語帳(docs/design/2026-10-07-word-book-design.md)。出会った語と、単語帳に保存した語だけ
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/words', fn (Request $request) => Words::list(
        ActiveProfile::require($request),
        in_array($request->query('filter'), ['saved', 'weak', 'learned'], true) ? $request->query('filter') : 'all',
        (string) $request->query('q', ''),
        (int) $request->query('page', 1),
    ))->name('words.index');
    Route::get('/words/{word}', fn (Request $request, int $word) => Words::detail(ActiveProfile::require($request), $word))->whereNumber('word')->name('words.show');
    Route::put('/words/{word}/mark', function (Request $request, int $word) {
        $input = $request->validate(['status' => ['nullable', Rule::in(['weak', 'learned'])], 'saved' => ['sometimes', 'boolean']]);

        return Words::mark(ActiveProfile::require($request), $word, array_intersect_key($input, array_flip(array_filter(['status', 'saved'], fn (string $key) => $request->has($key)))));
    })->whereNumber('word')->name('words.mark');
});

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
            // スタンプ・鍵は、国のメインの道(国旗)のステージだけで決める(英語・世界遺産は含めない。docs/design/2026-10-07-main-game-levels-design.md 4-5)
            $stages = Stage::query()->where('country_id', $country->id)->whereIn('category_id', CourseLevels::mainCategoryIds())->get();
            $stagesByDifficulty = $stages->groupBy('difficulty');

            $unlockedDifficulties = [];
            $stampTier = 'none';
            $previousAllCleared = true;
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
                // 前の級をすべてクリアしていないときは、上の段位を付けない(銅なしの金は付かない)
                if ($allCleared && $previousAllCleared) {
                    $stampTier = $tierByDifficulty[$difficulty];
                }
                $previousAllCleared = $previousAllCleared && $allCleared;
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

    // 連続プレイの節目のバッジ(docs/design/2026-09-28-streak-milestones-design.md 3-4)。一度届いたら、途切れても消えない
    $bestStreak = $profileId
        ? (int) (UserProfile::query()->whereKey($profileId)->value('best_streak') ?? 0)
        : 0;
    $activeProfile = ActiveProfile::find($request);

    $homeCountry = CourseLevels::homeCountry($activeProfile);

    return [
        'countries' => $countries,
        // 国レベルと言語レベル(クリアしたステージの数)。母国の言語は出さない(docs/design/2026-10-07-main-game-levels-design.md 4-5)
        'country_levels' => $activeProfile ? CourseLevels::forCountries($activeProfile) : [],
        'language_levels' => $activeProfile ? CourseLevels::forLanguages($activeProfile, $homeCountry) : [],
        'titles' => $titles,
        'visited_count' => $countries->filter(fn ($c) => $c['stamp_tier'] !== 'none')->count(),
        'best_streak' => $bestStreak,
        'streak_milestones' => collect(UserProfile::STREAK_MILESTONES)
            ->map(fn (int $days) => ['days' => $days, 'earned' => $bestStreak >= $days])
            ->all(),
        // 旅した国(設計書5-7)。チケットを使って着いた国
        'trips' => $activeProfile ? Travel::trips($activeProfile) : [],
        // 覚えた問題の数(docs/design/2026-09-29-spaced-review-design.md 4-8)
        'mastered_count' => $activeProfile ? QuestionMemory::masteredCount($activeProfile) : 0,
        // 日本のバッジ(docs/design/2026-10-06-passport-prefecture-badges-design.md)。47県。称号「◯◯はかせ」をもらった県が earned
        'prefecture_badges' => PrefectureBadges::list($titles->all()),
    ];
})->name('passport');

Route::middleware(['auth:sanctum'])->get('/regions/{region}', function (Request $request, Region $region) {
    Travel::abortIfLocked(ActiveProfile::find($request), $region->country_id);
    $profileId = $request->session()->get('active_profile_id');

    $clearedStageIds = $profileId
        ? ProfileStageProgress::query()
            ->where('user_profile_id', $profileId)
            ->whereNotNull('cleared_at')
            ->pluck('stage_id')
            ->all()
        : [];
    $bestScores = Stage::bestScores($profileId);

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
            ->map(function ($group) use ($clearedStageIds, $stagesByCategoryThenDifficulty, $bestScores) {
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
                        $clearedStageIds,
                        $bestScores
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
    $bestScores = Stage::bestScores($profileId);

    $locked = Travel::lockedCountryIds(ActiveProfile::find($request));

    $stagesByDifficulty = Stage::query()
        ->where('category_id', $category->id)
        ->withCount('questions')
        ->orderBy('stage_number')
        ->get()
        // 鍵の国のステージはミニアプリにも出さない(設計書3-6)
        ->reject(fn (Stage $stage) => in_array($stage->country_id, $locked, true))
        ->groupBy('difficulty');

    // 最高難易度は、そのステージがあるカテゴリーだけ4つ目に足す
    $difficulties = array_merge(
        config('quiz.difficulties'),
        array_values(array_filter(config('quiz.extra_difficulties'), fn (string $difficulty) => $stagesByDifficulty->has($difficulty))),
    );

    return collect($difficulties)
        ->map(function (string $difficulty) use ($stagesByDifficulty, $clearedStageIds, $bestScores) {
            $stages = ($stagesByDifficulty->get($difficulty) ?? collect())->values();
            $clearedNumbers = $stages
                ->filter(fn (Stage $s) => in_array($s->id, $clearedStageIds, true))
                ->pluck('stage_number')
                ->all();

            return [
                'difficulty' => $difficulty,
                'locked' => Stage::isDifficultyLocked($stagesByDifficulty, $difficulty, $clearedStageIds, $bestScores),
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

Route::middleware(['auth:sanctum'])->get('/stages/{stage}', function (Request $request, Stage $stage) {
    $profile = ActiveProfile::find($request);
    Travel::abortIfLocked($profile, $stage->country_id);
    $questions = $stage->questions()
        ->with(['choices', 'country'])
        ->get(['questions.id', 'questions.type', 'questions.prompt', 'questions.country_id', 'questions.meta']);

    abort_if($questions->isEmpty(), 404);

    // プールのステージは、抽選した問題だけを出す(docs/design/2026-10-06-prefecture-master-design.md 3章)
    if ($stage->is_pool) {
        $drawn = $profile ? StageDraw::pick($profile, $stage) : $questions->take($stage->playCount())->pluck('id')->all();
        $questions = $questions->keyBy('id');
        $questions = collect($drawn)->map(fn (int $id) => $questions[$id])->values();
    }

    // おさらい(docs/design/2026-09-29-spaced-review-design.md 4-5)。ボス以外に、出す日が来た前の問題を足す
    $reviewIds = $profile && ! $stage->is_boss
        ? QuestionMemory::dueIds($profile, config('review.stage_mix'), $questions->pluck('id')->all(), $stage->country_id)
        : [];
    $reviews = $reviewIds === []
        ? collect()
        : Question::query()->with(['choices', 'country'])->whereIn('id', $reviewIds)->get(['id', 'type', 'prompt', 'country_id', 'meta']);
    $questions->each(fn (Question $question) => $question->setAttribute('review', false));
    $reviews->each(fn (Question $question) => $question->setAttribute('review', true));
    $questions = $questions->concat($reviews)->shuffle()->values();

    PlayableQuestion::present($questions);

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
    // 点数はステージの問題だけの正解数(おさらいの問題は数えない)。念のため問題の数までに抑える(設計書4-6)
    $score = min($data['score'], $stage->playCount());

    $profileId = $request->session()->get('active_profile_id');
    $profile = $profileId ? UserProfile::find($profileId) : null;
    abort_unless($profile && $profile->user_schema_id === $request->user()->schema?->id, 422);
    Travel::abortIfLocked($profile, $stage->country_id);
    $earnedTicketsBefore = Travel::earnedTickets($profile);

    $progress = ProfileStageProgress::query()->firstOrNew([
        'user_profile_id' => $profile->id,
        'stage_id' => $stage->id,
    ]);
    // クリアに要る正解の数(通常60%・ボス80%。端数は切り上げ)。届かないときは、遊んだ記録だけ残す
    $required = (int) ceil($stage->playCount() * config('quiz.clear_percent')[$stage->is_boss ? 'boss' : 'normal'] / 100);
    $passed = $score >= $required;

    $progress->attempts = ($progress->attempts ?? 0) + 1;
    $progress->best_score = max($progress->best_score ?? 0, $score);
    if ($passed) {
        $progress->cleared_at ??= now();
    }
    $progress->save();

    $passed && $profile->applyEconomy(['coin' => intdiv(100 * $stage->reward_percent, 100), 'point' => intdiv(config('world.rewards.stage_clear') * $stage->reward_percent, 100)], 'stage_clear', null, $stage);

    // このクリアで新しくチケットが増え、使えるときだけ知らせる(設計書4-3・5-4)
    $ticketEarned = Travel::earnedTickets($profile) > $earnedTicketsBefore && Travel::tickets($profile) > 0;

    $titleGranted = false;
    if ($stage->is_boss && $stage->title_reward && $score === $stage->playCount()) {
        $title = ProfileTitle::query()->firstOrCreate(
            ['user_profile_id' => $profile->id, 'title' => $stage->title_reward],
            ['source_stage_id' => $stage->id, 'unlocked_at' => now()]
        );
        $titleGranted = $title->wasRecentlyCreated;
    }

    // 県の上級のボスを全問正解したら、県マスターの条件を見る(はかせと地名の両方。順番は問わない)
    $grantedTitle = $stage->title_reward;
    if ($score === $stage->playCount() && ($prefectureName = PrefectureMaster::prefectureOf($stage))) {
        if ($master = PrefectureMaster::grantIfReady($profile, $prefectureName)) {
            $titleGranted = true;
            $grantedTitle = $master->title;
        }
    }

    return [
        'progress' => $progress,
        'profile' => [
            'id' => $profile->id,
            'hp' => $profile->hp,
            'max_hp' => $profile->max_hp,
            'xp' => $profile->xp,
            'coins' => $profile->coins,
            'points' => $profile->points,
            'level' => $profile->level,
        ],
        'cleared' => $passed,
        'required' => $required,
        'title_granted' => $titleGranted,
        'title' => $grantedTitle,
        // 称号が県のもの(例 大阪府はかせ・大阪府マスター)なら、その県のバッジの絵(docs/design/2026-10-05-prefecture-quiz-design.md 7-2)
        'title_badge' => PrefectureCatalog::badgeForTitle($grantedTitle),
        'ticket_earned' => $ticketEarned,
    ];
})->name('stages.complete');

Route::middleware(['auth:sanctum'])->post('/questions/{question}/answer', function (Request $request, Question $question) {
    $result = match ($question->type) {
        'matching' => QuestionAnswerResolver::matching($request, $question),
        'ordering' => QuestionAnswerResolver::ordering($request, $question),
        'sorting' => QuestionAnswerResolver::sorting($request, $question),
        default => QuestionAnswerResolver::multipleChoice($request, $question),
    };

    $isCorrect = $result['correct'];

    // 解いた直後のやり直しは練習なので、正解かどうかだけを返し何も記録しない(設計書3-7)
    if ($request->boolean('practice')) {
        return [
            'correct' => $isCorrect,
            'correct_choice_id' => $result['correct_choice_id'] ?? null,
            'results' => $result['results'] ?? null,
            'explanation' => $question->explanation,
            'profile' => null,
        ];
    }

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

        if ($isCorrect) {
            // その日に水やりできるかに使う(applyEconomy の保存で一緒に保存される)
            $profile->last_correct_on = Garden::today();
        }

        $economyResult = $isCorrect
            ? $profile->applyEconomy([
                'hp' => config('world.hp.correct'),
                'xp' => config('world.rewards.xp_by_difficulty')[$question->quiz?->difficulty] ?? 10,
                'coin' => 5,
                'point' => config('world.rewards.answer_correct'),
            ], 'answer_correct', $question)
            : $profile->applyEconomy(['hp' => config('world.hp.wrong')], 'answer_wrong', $question);

        // 問題ごとの覚え具合(docs/design/2026-09-29-spaced-review-design.md 4-4)
        QuestionMemory::record($profile, $question->id, $isCorrect);

        $combo = $profile->registerComboResult($isCorrect);

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
            'points' => $profile->points,
            'level' => $profile->level,
            'leveled_up' => $economyResult['leveled_up'],
            'delta' => $economyResult['deltas'],
            'combo' => $combo['combo'],
            'best_combo' => $combo['best_combo'],
            'combo_milestone_bonus_coin' => $combo['milestone_bonus_coin'],
            'streak' => $streak['streak'],
            'best_streak' => $streak['best_streak'],
            'streak_extended_today' => $streak['streak_extended_today'],
            'streak_milestone_bonus_coin' => $streak['milestone_bonus_coin'],
            'streak_milestone' => $streak['milestone'],
            'streak_milestone_first' => $streak['milestone_first'],
            'level_xp' => LevelCurve::progress($profile->level),
            'spru_growth' => Garden::growth($profile),
            'garden_busy' => Garden::activeSeed($profile) !== null,
            'partner' => Bond::addToPartner($profile, $isCorrect ? config('companions.bond_per_correct') : 0),
        ];
    }

    return [
        'correct' => $isCorrect,
        'correct_choice_id' => $result['correct_choice_id'] ?? null,
        'results' => $result['results'] ?? null,
        // 答えたあとだけ見せる解説(答える前の取得には出ない。Question の $hidden)
        'explanation' => $question->explanation,
        // 単語帳の語(英語の単語の問題)。答えて出会った語として記録したときだけ返す
        'word_id' => $question->meta['word_id'] ?? null,
        'profile' => $economy,
    ];
})->name('questions.answer');

Route::middleware(['auth:sanctum'])->get('/shop', function (Request $request) {
    $level = ActiveProfile::find($request)?->level ?? 1;

    return ShopItem::query()
        ->whereIn('type', config('shop.enabled_types'))
        ->orderBy('type')
        ->orderBy('min_level')
        ->orderBy('price')
        ->get()
        // 種から咲く「スプルの花」・旅のおみやげなどの非売品は出さない
        ->reject(fn (ShopItem $item) => $item->meta['not_for_sale'] ?? false)
        ->values()
        ->map(fn (ShopItem $item) => [
            ...$item->toArray(),
            'asset_key' => $item->assetKey(),
            'footprint' => $item->footprint(),
            'category' => $item->category(),
            'locked' => $level < $item->min_level,
        ]);
})->name('shop.index');

Route::middleware(['auth:sanctum'])->post('/shop/{shopItem}/purchase', function (Request $request, ShopItem $shopItem) {
    abort_unless(
        in_array($shopItem->type, config('shop.enabled_types'), true),
        422,
        'この商品は現在準備中のため購入できません。'
    );
    abort_if($shopItem->meta['not_for_sale'] ?? false, 422, 'このアイテムは買えません。');

    $activeProfile = ActiveProfile::require($request);

    return DB::transaction(function () use ($activeProfile, $shopItem) {
        $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();

        if ($shopItem->currency === 'point') {
            abort_if($profile->level < $shopItem->min_level, 422, 'レベルが足りません。');
            abort_if($profile->points < $shopItem->price, 422, 'ポイントが足りません。');
            $profile->applyEconomy(['point' => -$shopItem->price], 'shop_purchase');
        } else {
            abort_if($profile->coins < $shopItem->price, 422, 'コインが足りません。');
            $deltas = ['coin' => -$shopItem->price];
            if ($shopItem->type === 'potion' && ($heal = $shopItem->meta['heal'] ?? null)) {
                $deltas['hp'] = $heal;
            }
            $profile->applyEconomy($deltas, 'shop_purchase');
        }

        if ($shopItem->type === 'title') {
            ProfileTitle::query()->firstOrCreate(
                ['user_profile_id' => $profile->id, 'title' => $shopItem->name],
                ['unlocked_at' => now()]
            );
        }

        $worldItem = $shopItem->type === 'decoration'
            ? $profile->worldItems()->create(['shop_item_id' => $shopItem->id])
            : null;

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
                'points' => $profile->points,
                'level' => $profile->level,
            ],
            'world_item' => $worldItem?->load('shopItem')->toWorldArray(),
        ];
    });
})->name('shop.purchase');

Route::middleware(['auth:sanctum'])->prefix('world')->name('world.')->group(function () {
    // 町の道のデザインを選ぶ(docs/design/2026-10-05-road-style-design.md)。選べるのは、日本と、着いた国だけ
    Route::put('/road', function (Request $request) {
        $profile = ActiveProfile::require($request);
        $data = $request->validate(['style' => ['required', 'string', Rule::in(Travel::roadKeys())]]);
        abort_unless($data['style'] === 'jp' || Travel::hasVisited($profile, $data['style']), 422, 'まだ着いていない国の道は、選べないよ');
        $profile->update(['road_style' => $data['style']]);

        return ['road_style' => Travel::roadStyle($profile)];
    })->name('road');

    Route::get('/', function (Request $request) {
        $profile = ActiveProfile::require($request);
        $profile->regenerateHp();
        // 条件を満たした特別な種を先に渡す(種のふくろに入る。docs/design/2026-09-29-rare-spru-design.md 3-2)
        $newSeeds = RareSeeds::grantLocked($profile);
        $items = $profile->worldItems()->with('shopItem')->orderBy('id')->get();

        return [
            'land' => WorldLand::toArray($profile->level),
            'road_style' => Travel::roadStyle($profile),
            'items' => $items->filter->isPlaced()->values()->map->toWorldArray(),
            'bag' => $items->reject->isPlaced()->values()->map->toWorldArray(),
            'profile' => [
                'id' => $profile->id,
                'points' => $profile->points,
                'level' => $profile->level,
                'xp' => $profile->xp,
                'hp' => $profile->hp,
                'max_hp' => $profile->max_hp,
                'coins' => $profile->coins,
                'level_xp' => LevelCurve::progress($profile->level),
            ],
            'welcome_available' => $profile->world_welcomed_at === null,
            'continue_stage_id' => ContinueStage::resolveId($profile),
            'spru' => ['growth' => Garden::growth($profile)],
            'garden' => Garden::state($profile),
            'companions' => Garden::companions($profile),
            'review' => Review::state($profile),
            'errands' => Errands::state($profile),
            'greetings' => Family::unseenGreetings($profile),
            'family_count' => Family::others($profile)->count(),
            'plots_new' => WorldLand::newPlotKeys($profile->level, $profile->world_plots_seen ?? []),
            'tickets' => Travel::tickets($profile),
            'new_seeds' => RareSeeds::present($newSeeds),
        ];
    })->name('show');

    Route::post('/welcome', function (Request $request) {
        $activeProfile = ActiveProfile::require($request);

        return DB::transaction(function () use ($activeProfile) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();

            if ($profile->world_welcomed_at !== null) {
                return ['granted' => false, 'points' => $profile->points];
            }

            $profile->world_welcomed_at = now();
            $profile->applyEconomy(['point' => config('world.rewards.welcome')], 'world_welcome');

            return ['granted' => true, 'points' => $profile->points];
        });
    })->name('welcome');

    Route::post('/garden/sow', function (Request $request) {
        $activeProfile = ActiveProfile::require($request);
        // spru(スプルの種)か、レアスプルの色だけ(docs/design/2026-09-29-rare-spru-design.md 4-5)
        $data = $request->validate(
            ['seed' => ['nullable', 'string', Rule::in(['spru', ...array_keys(RareSeeds::rares())])]],
            ['seed.in' => 'その種は持っていないよ', 'seed.string' => 'その種は持っていないよ'],
        );

        return DB::transaction(function () use ($activeProfile, $data) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();
            Garden::sow($profile, $data['seed'] ?? 'spru');

            return ['spru' => ['growth' => Garden::growth($profile)], 'garden' => Garden::state($profile)];
        });
    })->name('garden.sow');

    Route::post('/garden/water', function (Request $request) {
        $activeProfile = ActiveProfile::require($request);

        return DB::transaction(function () use ($activeProfile) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();
            $born = Garden::water($profile);

            return ['garden' => Garden::state($profile), 'born' => $born];
        });
    })->name('garden.water');

    Route::patch('/companions/{key}', function (Request $request, string $key) {
        $activeProfile = ActiveProfile::require($request);
        $nickname = $request->input('nickname');
        // 前後の空白(全角の空白も)を取り、空なら元の名前に戻す(設計書3-2)
        $nickname = is_string($nickname) ? preg_replace('/^[\s\x{3000}]+|[\s\x{3000}]+$/u', '', $nickname) : $nickname;
        $nickname = $nickname === '' ? null : $nickname;
        $max = config('companions.nickname_max');
        Validator::make(
            ['nickname' => $nickname],
            ['nickname' => ['nullable', 'string', "max:{$max}", 'regex:/^[^\p{Cc}]*$/u']],
            [
                'nickname.string' => '名前は文字で入れてね',
                'nickname.max' => "{$max}文字までにしてね",
                'nickname.regex' => '使えない文字が入っているよ',
            ],
        )->validate();

        return DB::transaction(function () use ($activeProfile, $key, $nickname) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();
            $companion = $profile->companions()->where('companion_key', $key)->first();
            abort_unless($companion, 404);
            $companion->update(['nickname' => $nickname]);

            return ['companions' => Garden::companions($profile), 'review' => Review::state($profile)];
        });
    })->name('companions.update');

    Route::post('/partner', function (Request $request) {
        $activeProfile = ActiveProfile::require($request);
        $data = $request->validate(['key' => ['required', 'string']]);

        return DB::transaction(function () use ($activeProfile, $data) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();
            $companion = $profile->companions()->where('companion_key', $data['key'])->first();
            abort_unless($companion, 422, 'まだ生まれていない仲間だよ');
            // 相棒はいつも町にいる。入れ替えを単純にするため、町にいる子だけ(docs/design/2026-09-29-rare-spru-design.md 3-5)
            abort_unless($companion->in_town, 422, '町にいる仲間だけ相棒にできるよ');
            $profile->partner_companion_key = $data['key'];
            $profile->save();

            return ['companions' => Garden::companions($profile), 'review' => Review::state($profile)];
        });
    })->name('partner');

    // なかまの一覧(docs/design/2026-09-29-rare-spru-design.md 4-5)。町と同じく、条件を満たした種を先に渡す
    Route::get('/roster', function (Request $request) {
        $profile = ActiveProfile::require($request);
        $newSeeds = RareSeeds::grantLocked($profile);

        return [...Roster::of($profile), 'new_seeds' => RareSeeds::present($newSeeds)];
    })->name('roster');

    // 町に出す・おうちで休む。町に立つのは town_limit 体まで、相棒は休ませられない
    Route::post('/companions/{key}/town', function (Request $request, string $key) {
        $activeProfile = ActiveProfile::require($request);
        $request->validate(['in_town' => ['required', 'boolean']]);
        $inTown = $request->boolean('in_town');

        return DB::transaction(function () use ($activeProfile, $key, $inTown) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();
            $companion = $profile->companions()->where('companion_key', $key)->first();
            abort_unless($companion, 404);
            if ($inTown && ! $companion->in_town) {
                $count = $profile->companions()->where('in_town', true)->count();
                abort_if($count >= config('companions.town_limit'), 422, '町はいっぱいだよ。だれかをおうちで休ませてね');
            }
            abort_if(! $inTown && $key === $profile->partner_companion_key, 422, '相棒はいつも町にいるよ');
            $companion->update(['in_town' => $inTown]);

            return ['companions' => Garden::companions($profile), 'review' => Review::state($profile)];
        });
    })->name('companions.town');

    Route::post('/greetings/seen', function (Request $request) {
        $profile = ActiveProfile::require($request);
        $data = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']]);
        Family::markSeen($profile, $data['ids']);

        return ['greetings' => Family::unseenGreetings($profile)];
    })->name('greetings.seen');

    // 開いた区画を祝った印(設計書3-2)。雲の区画・知らないキーは記録しない
    Route::post('/plots/seen', function (Request $request) {
        $activeProfile = ActiveProfile::require($request);
        $data = $request->validate(['keys' => ['required', 'array'], 'keys.*' => ['string']]);

        return DB::transaction(function () use ($activeProfile, $data) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();
            $seen = array_values(array_unique([
                ...($profile->world_plots_seen ?? []),
                ...array_values(array_intersect($data['keys'], WorldLand::openPlotKeys($profile->level))),
            ]));
            $profile->update(['world_plots_seen' => $seen]);

            return ['plots_new' => WorldLand::newPlotKeys($profile->level, $seen)];
        });
    })->name('plots.seen');

    Route::patch('/items/{profileWorldItem}', function (Request $request, ProfileWorldItem $profileWorldItem) {
        $activeProfile = ActiveProfile::require($request);
        abort_unless($profileWorldItem->user_profile_id === $activeProfile->id, 404);

        $data = $request->validate([
            'x' => ['present', 'nullable', 'integer', 'required_with:y'],
            'y' => ['present', 'nullable', 'integer', 'required_with:x'],
        ]);
        $x = $data['x'] === null ? null : (int) $data['x'];
        $y = $data['y'] === null ? null : (int) $data['y'];

        return DB::transaction(function () use ($activeProfile, $profileWorldItem, $x, $y) {
            // 2か所から同時に置いても、2×2の建物の4マスが重ならないようにロックしてから確かめる
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();
            if ($x !== null) {
                WorldPlacement::check($profile, $profileWorldItem, $x, $y);
            }

            try {
                $profileWorldItem->update(['x' => $x, 'y' => $y]);
            } catch (UniqueConstraintViolationException) {
                // 事前チェックと保存の間に同じマスへ置かれた場合(同時操作)
                abort(422, 'そこにはもう置いてあります。');
            }

            return $profileWorldItem->load('shopItem')->toWorldArray();
        });
    })->name('items.update');
});

Route::middleware(['auth:sanctum'])->prefix('review')->name('review.')->group(function () {
    Route::get('/', function (Request $request) {
        $profile = ActiveProfile::require($request);

        return ['giver' => Review::giver($profile), 'questions' => Review::questions($profile)];
    })->name('show');

    Route::post('/complete', function (Request $request) {
        $activeProfile = ActiveProfile::require($request);

        return DB::transaction(function () use ($activeProfile) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();

            return Review::complete($profile);
        });
    })->name('complete');
});

// ミニゲーム「スプルキャッチ」(docs/design/2026-09-29-spru-catch-design.md 6-3)と、国旗版「スプルキャッチ(こっき)」
// (docs/design/2026-10-05-flag-catch-design.md 5章)。同じ処理を、ゲームの名前だけ変えて登録する
foreach (['catch' => CatchGame::GAME, 'flag-catch' => CatchGame::FLAG_GAME] as $path => $game) {
    Route::middleware(['auth:sanctum'])->prefix("games/{$path}")->name("games.{$path}.")->group(function () use ($game) {
        Route::get('/', function (Request $request) use ($game) {
            return CatchGame::summary(ActiveProfile::require($request), $game);
        })->name('show');

        Route::post('/plays', function (Request $request) use ($game) {
            $profile = ActiveProfile::require($request);
            $data = $request->validate([
                'difficulty' => ['required', 'string', Rule::in(array_keys(config("games.{$game}.difficulties")))],
            ]);

            return CatchGame::start($profile, $data['difficulty'], $game);
        })->name('plays.store');

        Route::post('/plays/{play}/finish', function (Request $request, ProfileGamePlay $play) use ($game) {
            $profile = ActiveProfile::require($request);
            abort_unless($play->user_profile_id === $profile->id && $play->game === $game, 404);
            $data = $request->validate([
                'answers' => ['present', 'array'],
                'answers.*.question_id' => ['required', 'integer'],
                'answers.*.choice_id' => ['required', 'integer'],
            ]);

            return DB::transaction(function () use ($play, $data) {
                $locked = ProfileGamePlay::query()->whereKey($play->id)->lockForUpdate()->firstOrFail();
                abort_if($locked->finished_at !== null, 409, 'この回はもう終わっています。');

                return CatchGame::finish($locked, $data['answers']);
            });
        })->name('plays.finish');
    });
}

Route::middleware(['auth:sanctum'])->prefix('travel')->name('travel.')->group(function () {
    Route::get('/', function (Request $request) {
        $profile = ActiveProfile::require($request);

        return ['level' => $profile->level, 'road_style' => Travel::roadStyle($profile), ...Travel::overview($profile)];
    })->name('index');

    Route::get('/{key}', function (Request $request, string $key) {
        $destination = Travel::show(ActiveProfile::require($request), $key);
        abort_unless($destination, 404);
        abort_unless($destination['state'] === 'visited', 422, 'まだこの国に着いていません。');

        return $destination;
    })->name('show');

    Route::post('/{key}/depart', function (Request $request, string $key) {
        $activeProfile = ActiveProfile::require($request);

        return DB::transaction(function () use ($activeProfile, $key) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();

            return Travel::depart($profile, $key);
        });
    })->name('depart');

    Route::post('/{key}/souvenirs/{souvenir}', function (Request $request, string $key, string $souvenir) {
        $activeProfile = ActiveProfile::require($request);

        return DB::transaction(function () use ($activeProfile, $key, $souvenir) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();

            return Travel::receive($profile, $key, $souvenir);
        });
    })->name('souvenirs.receive');
});

Route::middleware(['auth:sanctum'])->prefix('family')->name('family.')->group(function () {
    Route::get('/', function (Request $request) {
        return Family::list(ActiveProfile::require($request));
    })->name('index');

    Route::get('/{profile}', function (Request $request, UserProfile $profile) {
        $me = ActiveProfile::require($request);

        return Family::town($me, Family::member($me, $profile));
    })->whereNumber('profile')->name('show');

    Route::post('/{profile}/greet', function (Request $request, UserProfile $profile) {
        $me = ActiveProfile::require($request);
        $data = $request->validate(['stamp' => ['required', 'string']]);
        Family::greet($me, Family::member($me, $profile), $data['stamp']);

        return ['greeted_today' => true];
    })->whereNumber('profile')->name('greet');
});

Route::middleware(['auth:sanctum'])->post('/errands/{slot}/claim', function (Request $request, int $slot) {
    $activeProfile = ActiveProfile::require($request);

    // 二重に押しても1回分だけになるよう、プロフィールをロックしてから渡す
    return DB::transaction(function () use ($activeProfile, $slot) {
        $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();

        return Errands::claim($profile, $slot);
    });
})->whereNumber('slot')->name('errands.claim');

Route::middleware(['auth:sanctum'])->prefix('profiles')->name('profiles.')->group(function () {
    Route::get('/', function (Request $request) {
        return $request->user()->schema?->profiles ?? [];
    })->name('index');

    Route::post('/', function (Request $request) {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'avatar' => ['nullable', Rule::in(UserProfile::AVATARS)],
        ]);

        $schema = $request->user()->schema ?? $request->user()->schema()->create();

        // avatar が無ければ、モデルが家族でまだ使われていないものを入れる
        return $schema->profiles()->create([
            'name' => $data['name'],
            'avatar' => $data['avatar'] ?? null,
        ]);
    })->name('store');

    Route::get('/active', function (Request $request) {
        $id = $request->session()->get('active_profile_id');
        $profile = $id ? UserProfile::find($id) : null;
        $profile?->regenerateHp();

        $payload = $profile
            ? [...$profile->toArray(), 'hp_regen_seconds' => $profile->secondsUntilNextHp(), 'level_xp' => LevelCurve::progress($profile->level)]
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
            'avatar' => ['sometimes', Rule::in(UserProfile::AVATARS)],
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

// 遊んだ時間(docs/design/2026-10-03-analytics-design.md 5章)。画面が見えていて操作があるあいだ、30秒ごとに送られる
Route::middleware(['auth:sanctum', 'throttle:6,1'])->post('/play-time', function (Request $request) {
    $data = $request->validate(['seconds' => ['required', 'integer', 'min:1', 'max:60']]);

    return ['seconds' => PlayTime::record(ActiveProfile::require($request), $data['seconds'])];
})->name('play-time.store');

// 保護者のご意見と、子どもの問題の「へん」報告(docs/design/2026-10-03-closed-beta-design.md 5章)
Route::middleware(['auth:sanctum', 'throttle:10,60'])->post('/feedback', function (Request $request) {
    $data = $request->validate([
        'kind' => ['required', Rule::in(Feedback::WRITTEN_KINDS)],
        'body' => ['required', 'string', 'max:2000'],
        'page' => ['nullable', 'string', 'max:200'],
    ]);

    Feedback::create($data + ['user_id' => $request->user()->id]);

    return response()->json(['sent' => true], 201);
})->name('feedback.store');

Route::middleware(['auth:sanctum', 'throttle:30,60'])->post('/questions/{question}/report', function (Request $request, Question $question) {
    $data = $request->validate(['reason' => ['required', Rule::in(array_keys(Feedback::REASONS))]]);
    $profile = ActiveProfile::require($request);

    // 同じ子が同じ問題を重ねて報告しても、最初の1件のまま
    Feedback::firstOrCreate(
        ['kind' => Feedback::KIND_QUESTION_REPORT, 'user_profile_id' => $profile->id, 'question_id' => $question->id],
        ['user_id' => $request->user()->id, 'reason' => $data['reason'], 'body' => Feedback::REASONS[$data['reason']]],
    );

    return ['reported' => true];
})->name('questions.report');

// 公開設定でコイン購入がOFFのあいだは、一覧を空にして購入の欄を出さない(docs/design/2026-10-03-closed-beta-design.md 4章)
Route::middleware(['auth:sanctum'])->get('/coin-packages', function () {
    if (! AppSettings::coinPurchaseEnabled()) {
        return ['enabled' => false, 'packages' => []];
    }

    return [
        'enabled' => true,
        'packages' => collect(config('coin_packages.packages'))
            ->map(fn (array $package, string $key) => [
                'key' => $key,
                'coins' => $package['coins'],
                'amount' => $package['amount'],
                'currency' => $package['currency'],
                'label' => $package['label'],
            ])
            ->values(),
    ];
})->name('coin-packages.index');

Route::middleware(['auth:sanctum'])->post('/coin-purchases/checkout', function (Request $request) {
    abort_unless(AppSettings::coinPurchaseEnabled(), 403, 'コインの購入は、まだ始まっていません。');

    $data = $request->validate(['package_key' => ['required', 'string']]);

    $package = config("coin_packages.packages.{$data['package_key']}");
    abort_unless($package, 422, '不明なコインパッケージです。');

    $profileId = $request->session()->get('active_profile_id');
    $profile = $profileId ? UserProfile::find($profileId) : null;
    abort_unless($profile && $profile->user_schema_id === $request->user()->schema?->id, 422);

    // メールアドレスを確かめるまでは買えない(docs/design/2026-09-29-email-verify-reset-design.md 4-3)
    if (! $request->user()->hasVerifiedEmail()) {
        return response()->json([
            'message' => 'メールアドレスを確かめると、コインを買えるようになります。',
            'code' => 'email_unverified',
        ], 403);
    }

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
    } catch (SignatureVerificationException|UnexpectedValueException $e) {
        return response()->json(['error' => 'invalid signature'], 400);
    }

    if ($event->type === 'checkout.session.completed') {
        CoinPurchase::completeFromStripeSession($event->data->object->id);
    }

    return response()->json(['received' => true]);
})->name('stripe.webhook');
