<?php

use App\Models\ProfileWord;
use App\Models\UserProfile;
use App\Models\Word;

/** 単語帳のAPI(docs/design/2026-10-07-word-book-design.md 5章) */

/** 子どもが出会った語を作る(seen_at つき)。$extra で保存・状態も付けられる */
function seenWord(UserProfile $profile, string $word, array $attributes = [], array $extra = []): Word
{
    $model = makeWord($word, $attributes);
    ProfileWord::create(['user_profile_id' => $profile->id, 'word_id' => $model->id, 'seen_at' => now()] + $extra);

    return $model;
}

it('未ログインは401', function () {
    $this->getJson('/api/words')->assertUnauthorized();
});

it('一覧は、出会った語と、保存した語だけ。語・品詞・主な意味・重要度・自分の状態を返す', function () {
    $profile = createActiveProfile();
    seenWord($profile, 'reason', ['level' => 61, 'pos' => '名', 'importance' => 2, 'meanings' => [['pos' => '名', 'ja' => ['理由', '根拠']], ['pos' => '動', 'ja' => ['考える']]]], ['status' => 'weak']);
    makeWord('secret'); // 出会っていない語
    $savedOnly = makeWord('apple', ['level' => 1]);
    ProfileWord::create(['user_profile_id' => $profile->id, 'word_id' => $savedOnly->id, 'saved_at' => now()]);

    $response = $this->getJson('/api/words')->assertOk();

    expect($response->json('data'))->toHaveCount(2)
        ->and(collect($response->json('data'))->pluck('word')->all())->toBe(['apple', 'reason'])
        ->and($response->json('data.1'))->toMatchArray([
            'word' => 'reason', 'pos' => '名', 'importance' => 2, 'meaning' => '理由、根拠', 'status' => 'weak', 'saved' => false,
        ])
        ->and($response->json('data.0.saved'))->toBeTrue();
});

it('絞り込み: 単語帳(保存)・苦手・覚えた。検索は英語と日本語', function () {
    $profile = createActiveProfile();
    seenWord($profile, 'reason', ['meanings' => [['pos' => '名', 'ja' => ['理由']]]], ['saved_at' => now()]);
    seenWord($profile, 'cause', ['meanings' => [['pos' => '名', 'ja' => ['原因']]]], ['status' => 'weak']);
    seenWord($profile, 'logic', ['meanings' => [['pos' => '名', 'ja' => ['論理']]]], ['status' => 'learned']);

    $words = fn (string $query) => collect($this->getJson("/api/words?{$query}")->assertOk()->json('data'))->pluck('word')->sort()->values()->all();

    expect($words('filter=saved'))->toBe(['reason'])
        ->and($words('filter=weak'))->toBe(['cause'])
        ->and($words('filter=learned'))->toBe(['logic'])
        ->and($words('filter=all'))->toBe(['cause', 'logic', 'reason'])
        ->and($words('q=rea'))->toBe(['reason'])
        ->and($words('q='.urlencode('原因')))->toBe(['cause'])
        ->and($words('q=zzz'))->toBe([]);
});

it('一覧は50語ずつ。レベル順→綴り順', function () {
    $profile = createActiveProfile();
    foreach (range(1, 60) as $i) {
        seenWord($profile, sprintf('word%02d', $i), ['level' => $i]);
    }

    $first = $this->getJson('/api/words')->assertOk();
    $second = $this->getJson('/api/words?page=2')->assertOk();

    expect($first->json('data'))->toHaveCount(50)->and($first->json('data.0.word'))->toBe('word01')
        ->and($first->json('last_page'))->toBe(2)->and($first->json('total'))->toBe(60)
        ->and($second->json('data'))->toHaveCount(10)->and($second->json('data.0.word'))->toBe('word51');
});

it('詳細は全項目を返す。似た語のうち、出会った語には id が付く(出会っていない語は null)', function () {
    $profile = createActiveProfile();
    $cause = seenWord($profile, 'cause');
    $reason = seenWord($profile, 'reason', [
        'ipa' => 'ˈriːzn', 'usage' => '理由を言うとき。', 'cefr' => 'B1',
        'examples' => [['text' => 'Give me one good reason.', 'translation' => '理由を1つ教えて。']],
        'synonyms' => [['term' => 'cause', 'note' => '原因'], ['term' => 'excuse', 'note' => '言い訳']],
    ], ['saved_at' => now(), 'status' => 'learned']);
    makeWord('excuse');

    $response = $this->getJson("/api/words/{$reason->id}")->assertOk();

    expect($response->json())->toMatchArray(['id' => $reason->id, 'word' => 'reason', 'ipa' => 'ˈriːzn', 'usage' => '理由を言うとき。', 'cefr' => 'B1', 'status' => 'learned', 'saved' => true])
        ->and($response->json('meanings'))->toEqual([['pos' => '名詞', 'ja' => ['理由']]])
        ->and($response->json('examples.0.text'))->toBe('Give me one good reason.')
        ->and($response->json('synonyms'))->toEqual([
            ['term' => 'cause', 'note' => '原因', 'id' => $cause->id],
            ['term' => 'excuse', 'note' => '言い訳', 'id' => null],
        ]);
});

it('出会っていない語の詳細は404。別の子の記録は見えない', function () {
    $profile = createActiveProfile();
    $word = makeWord('secret');
    $other = createFamilyMember($profile);
    ProfileWord::create(['user_profile_id' => $other->id, 'word_id' => $word->id, 'seen_at' => now()]);

    $this->getJson("/api/words/{$word->id}")->assertNotFound();
    expect($this->getJson('/api/words')->json('data'))->toBe([]);
});

it('マーク: 保存と、苦手・覚えたは排他(どちらかを付けるともう一方は外れる)。連打しても同じ。null で外れる', function () {
    $profile = createActiveProfile();
    $word = seenWord($profile, 'reason');

    $this->putJson("/api/words/{$word->id}/mark", ['status' => 'weak'])->assertOk()->assertJsonPath('status', 'weak');
    $this->putJson("/api/words/{$word->id}/mark", ['status' => 'weak'])->assertOk()->assertJsonPath('status', 'weak');
    $this->putJson("/api/words/{$word->id}/mark", ['status' => 'learned'])->assertOk()->assertJsonPath('status', 'learned');
    $this->putJson("/api/words/{$word->id}/mark", ['saved' => true])->assertOk()->assertJsonPath('saved', true)->assertJsonPath('status', 'learned');
    $this->putJson("/api/words/{$word->id}/mark", ['saved' => true])->assertOk()->assertJsonPath('saved', true);
    $this->putJson("/api/words/{$word->id}/mark", ['status' => null])->assertOk()->assertJsonPath('status', null)->assertJsonPath('saved', true);
    $this->putJson("/api/words/{$word->id}/mark", ['saved' => false])->assertOk()->assertJsonPath('saved', false);

    $record = ProfileWord::first();
    expect(ProfileWord::count())->toBe(1)->and($record->status)->toBeNull()->and($record->saved_at)->toBeNull();
});

it('マークの入力が正しくないと422。出会っていない語にはマークできない(404)', function () {
    $profile = createActiveProfile();
    $word = seenWord($profile, 'reason');
    $secret = makeWord('secret');

    $this->putJson("/api/words/{$word->id}/mark", ['status' => 'good'])->assertUnprocessable();
    $this->putJson("/api/words/{$word->id}/mark", [])->assertUnprocessable();
    $this->putJson("/api/words/{$secret->id}/mark", ['status' => 'weak'])->assertNotFound();
    expect(ProfileWord::where('word_id', $secret->id)->count())->toBe(0);
});
