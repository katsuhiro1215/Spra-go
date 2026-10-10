<?php

namespace App\Support;

use App\Models\Question;
use App\Models\UserProfile;
use Illuminate\Support\Facades\DB;

/**
 * うちゅうずかん(docs/design/2026-10-10-space-adventure-map-design.md 2章)。
 * 宇宙の絵(`/space/{キー}.webp`)を正解の選択肢とする問題に、一度でも正解したら、その絵のカードが開く。開いたカードは消えない
 */
class SpaceCards
{
    /** 宇宙の絵の問題に正解したとき、その絵のカードを開く(はじめてなら、そのキーを返す)。宇宙の絵の問題でなければ null */
    public static function unlock(int $profileId, int $questionId, string $today): ?string
    {
        $question = Question::query()->find($questionId, ['id', 'meta']);
        if ($question === null || ! str_starts_with((string) ($question->meta['flag_key'] ?? ''), 'space:')) {
            return null;
        }

        $image = DB::table('question_choices')->where('question_id', $questionId)->where('is_correct', true)->value('meta');
        $path = $image === null ? null : (json_decode($image, true)['image'] ?? null);
        if (! is_string($path) || ! preg_match('#^/space/([a-z0-9_]+)\.webp$#', $path, $match)) {
            return null;
        }

        $created = DB::table('profile_space_cards')->insertOrIgnore([
            'user_profile_id' => $profileId,
            'picture' => $match[1],
            'unlocked_on' => $today,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $created === 1 ? $match[1] : null;
    }

    /** @return list<string> 開いているカードの絵のキー(開いた順) */
    public static function keys(UserProfile $profile): array
    {
        return DB::table('profile_space_cards')->where('user_profile_id', $profile->id)->orderBy('id')->pluck('picture')->all();
    }

    /**
     * 全部のカード(宇宙の絵の一覧の順)。開いていないカードは、名前を出さない
     *
     * @return list<array{key: string, name: ?string, image: string, unlocked: bool}>
     */
    public static function list(UserProfile $profile): array
    {
        $open = array_flip(self::keys($profile));

        return array_map(fn (array $picture) => [
            'key' => $picture['key'],
            'name' => isset($open[$picture['key']]) ? $picture['name'] : null,
            'image' => "/space/{$picture['key']}.webp",
            'unlocked' => isset($open[$picture['key']]),
        ], self::pictures());
    }

    /** @return list<array{key: string, name: string}> 宇宙の絵の一覧(database/data/space/pictures.csv) */
    private static function pictures(): array
    {
        static $pictures = null;
        if ($pictures !== null) {
            return $pictures;
        }

        $path = base_path('database/data/space/pictures.csv');
        $pictures = [];
        if (! is_file($path) || ($handle = fopen($path, 'r')) === false) {
            return $pictures;
        }
        $header = fgetcsv($handle, 0, ',', '"', '\\');
        $header[0] = ltrim((string) $header[0], "\xEF\xBB\xBF");
        $keyAt = array_search('キー', $header, true);
        $nameAt = array_search('名前', $header, true);
        while (($row = fgetcsv($handle, 0, ',', '"', '\\')) !== false) {
            if (isset($row[$keyAt], $row[$nameAt]) && trim($row[$keyAt]) !== '') {
                $pictures[] = ['key' => trim($row[$keyAt]), 'name' => trim($row[$nameAt])];
            }
        }
        fclose($handle);

        return $pictures;
    }
}
