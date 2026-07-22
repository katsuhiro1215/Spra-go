<?php

use App\Models\Admin;
use App\Models\Category;
use App\Models\ContentItem;
use App\Models\Country;
use App\Models\Event;
use App\Models\Question;
use App\Models\Quiz;
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
        'choices' => ['required', 'array', 'size:4'],
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

Route::middleware(['auth:sanctum'])->get('/categories', function () {
    return Category::query()->orderBy('order')->get();
})->name('categories.index');

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
