<?php

namespace App\Support;

use App\Models\ProfileWord;
use App\Models\Question;
use App\Models\UserProfile;
use App\Models\Word;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

/** 単語帳の決まり(docs/design/2026-10-07-word-book-design.md)。取り込み・API・出会いの記録 */
class Words
{
    /** 重要度(★の数)の既定。語のレベルで決まる */
    public static function defaultImportance(int $level): int
    {
        $tiers = config('words.importance_by_level');
        ksort($tiers);
        foreach ($tiers as $upTo => $importance) {
            if ($level <= $upTo) {
                return $importance;
            }
        }

        return (int) end($tiers);
    }

    /** 品詞の短い表示(名・動・形…)。「名詞・動詞」は「名・動」。知らない品詞は、そのまま */
    public static function posLabel(string $pos): string
    {
        $labels = config('words.pos_labels');

        return implode('・', array_map(fn (string $part) => $labels[trim($part)] ?? trim($part), explode('・', $pos)));
    }

    /**
     * 問題に答えたとき、その問題の語に出会ったことにする(profile_words の seen_at。最初の日時のまま)。
     * 語のない問題(meta.word_id がない)は何もしない。保存・苦手・覚えたのマークは変えない
     */
    public static function encounter(int $profileId, int $questionId): void
    {
        $wordId = Question::query()->find($questionId, ['id', 'meta'])?->meta['word_id'] ?? null;
        if ($wordId === null) {
            return;
        }

        $record = ProfileWord::query()->firstOrCreate(['user_profile_id' => $profileId, 'word_id' => (int) $wordId]);
        if ($record->seen_at === null) {
            $record->update(['seen_at' => now()]);
        }
    }

    /** 子どもの単語帳に出す語(出会った語と、単語帳に保存した語)。profile_words を結びつけて返す */
    private static function visible(UserProfile $profile): Builder
    {
        return Word::query()
            ->join('profile_words as pw', fn ($join) => $join->on('pw.word_id', '=', 'words.id')->where('pw.user_profile_id', $profile->id))
            ->where(fn (Builder $query) => $query->whereNotNull('pw.seen_at')->orWhereNotNull('pw.saved_at'))
            ->select('words.*', 'pw.status as my_status', 'pw.saved_at as my_saved_at');
    }

    /**
     * 単語帳の一覧(1ページ50語。レベル順→綴り順)。$filter は all / saved / weak / learned、$search は英語・日本語の一部
     *
     * @return array{data: list<array<string, mixed>>, page: int, last_page: int, total: int}
     */
    public static function list(UserProfile $profile, string $filter = 'all', string $search = '', int $page = 1): array
    {
        $query = self::visible($profile)
            ->when($filter === 'saved', fn (Builder $q) => $q->whereNotNull('pw.saved_at'))
            ->when(in_array($filter, ['weak', 'learned'], true), fn (Builder $q) => $q->where('pw.status', $filter))
            ->when(trim($search) !== '', function (Builder $q) use ($search) {
                $like = '%'.addcslashes(trim($search), '%_\\').'%';
                $q->where(fn (Builder $inner) => $inner->where('words.word', 'like', $like)->orWhereRaw('CAST(words.meanings AS CHAR) LIKE ?', [$like]));
            })
            ->orderBy('words.level')->orderBy('words.key');

        $paginator = $query->paginate(50, ['*'], 'page', max(1, $page));

        return [
            'data' => $paginator->getCollection()->map(fn (Word $word) => [
                'id' => $word->id,
                'word' => $word->word,
                'pos' => $word->pos,
                'importance' => $word->importance,
                'meaning' => implode('、', $word->meanings[0]['ja'] ?? []),
                'status' => $word->my_status,
                'saved' => $word->my_saved_at !== null,
            ])->all(),
            'page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'total' => $paginator->total(),
        ];
    }

    /**
     * 語の詳細。出会っていない語は404。似た語には、子どもが出会った語だけ id を付ける(その語の詳細へ行ける)
     *
     * @return array<string, mixed>
     */
    public static function detail(UserProfile $profile, int $wordId): array
    {
        $word = self::visible($profile)->where('words.id', $wordId)->first();
        abort_if($word === null, 404);

        $terms = array_map(fn (array $synonym) => mb_strtolower($synonym['term']), $word->synonyms ?? []);
        $known = self::visible($profile)->where('words.language', $word->language)->whereIn('words.key', $terms)->pluck('words.id', 'words.key');

        return [
            'id' => $word->id,
            'word' => $word->word,
            'level' => $word->level,
            'pos' => $word->pos,
            'cefr' => $word->cefr,
            'importance' => $word->importance,
            'ipa' => $word->ipa,
            'meanings' => $word->meanings,
            'usage' => $word->usage,
            'examples' => $word->examples ?? [],
            'synonyms' => array_map(fn (array $synonym) => $synonym + ['id' => $known[mb_strtolower($synonym['term'])] ?? null], $word->synonyms ?? []),
            'status' => $word->my_status,
            'saved' => $word->my_saved_at !== null,
        ];
    }

    /**
     * 単語帳・苦手・覚えたのマークを変える。status は weak / learned / null(外す。どちらかを付けると、もう一方は外れる)、saved は保存の有無。
     * 送られなかった項目は変えない。出会っていない語は404
     *
     * @param  array{status?: ?string, saved?: bool}  $changes
     * @return array{id: int, status: ?string, saved: bool}
     */
    public static function mark(UserProfile $profile, int $wordId, array $changes): array
    {
        if (! array_key_exists('status', $changes) && ! array_key_exists('saved', $changes)) {
            throw ValidationException::withMessages(['status' => 'status か saved を送ってください。']);
        }
        abort_if(self::visible($profile)->where('words.id', $wordId)->doesntExist(), 404);

        $record = ProfileWord::query()->where(['user_profile_id' => $profile->id, 'word_id' => $wordId])->firstOrFail();
        if (array_key_exists('status', $changes)) {
            $record->status = $changes['status'];
        }
        if (array_key_exists('saved', $changes)) {
            $record->saved_at = $changes['saved'] ? ($record->saved_at ?? now()) : null;
        }
        $record->save();

        return ['id' => $wordId, 'status' => $record->status, 'saved' => $record->saved_at !== null];
    }
}
