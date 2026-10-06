<?php

use App\Models\ProfileWord;
use App\Models\Word;
use Illuminate\Database\QueryException;

/** 単語帳のテーブル(docs/design/2026-10-07-word-book-design.md 4章) */
function makeWord(string $word = 'reason', array $attributes = []): Word
{
    return Word::create($attributes + [
        'language' => 'en',
        'word' => $word,
        'key' => mb_strtolower($word),
        'level' => 61,
        'pos' => 'noun',
        'importance' => 2,
        'meanings' => [['pos' => '名詞', 'ja' => ['理由']]],
    ]);
}

it('語は、言語と小文字の見出し語で一意。意味・例文・似た語は配列で読み書きできる', function () {
    $word = makeWord('reason', [
        'ipa' => 'ˈriːzn',
        'examples' => [['text' => 'Give me one good reason.', 'translation' => '理由を1つ教えて。']],
        'synonyms' => [['term' => 'cause', 'note' => '原因']],
    ]);

    $fresh = $word->fresh();
    expect($fresh->meanings)->toBe([['pos' => '名詞', 'ja' => ['理由']]])
        ->and($fresh->examples[0]['text'])->toBe('Give me one good reason.')
        ->and($fresh->synonyms[0]['term'])->toBe('cause')
        ->and($fresh->level)->toBe(61);

    expect(fn () => makeWord('Reason'))->toThrow(QueryException::class);
});

it('子どもごとの記録は、プロフィールと語で一意。プロフィールか語を消すと、記録も消える', function () {
    $profile = createActiveProfile();
    $word = makeWord();
    ProfileWord::create(['user_profile_id' => $profile->id, 'word_id' => $word->id, 'seen_at' => now(), 'status' => 'weak']);

    expect(fn () => ProfileWord::create(['user_profile_id' => $profile->id, 'word_id' => $word->id]))->toThrow(QueryException::class)
        ->and(ProfileWord::count())->toBe(1);

    $word->delete();
    expect(ProfileWord::count())->toBe(0);
});
