<?php

namespace App\Support\Prefecture;

/**
 * 都道府県の一覧(docs/design/2026-10-05-prefecture-quiz-design.md 4章)。
 * database/data/prefectures.php を読む。47県の基本データ(名前・地方・県庁所在地・となり)は最初から全部あり、
 * 事実(名物・名所・お祭りなど・難読地名)は、地方ごとの段階で足す
 */
class PrefectureCatalog
{
    /** 地方のキー => 名前(この順) */
    public const REGIONS = [
        'hokkaido-tohoku' => '北海道・東北',
        'kanto' => '関東',
        'chubu' => '中部',
        'kinki' => '近畿',
        'chugoku-shikoku' => '中国・四国',
        'kyushu-okinawa' => '九州・沖縄',
    ];

    /** 県のコースを作るのに要る事実の数 */
    public const MIN_FOODS = 4;

    public const MIN_SIGHTS = 4;

    public const MIN_CULTURE = 3;

    public const MIN_HARD = 3;

    private const TITLE_SUFFIX = 'はかせ';

    /** @return array<string, array{key: string, name: string, region: string, capital: string, neighbors: list<string>, foods: list<string>, sights: list<string>, culture: list<string>, hard: list<array{word: string, reading: string, wrong: list<string>}>}> */
    public static function all(): array
    {
        $data = require base_path('database/data/prefectures.php');

        $prefectures = [];
        foreach ($data['prefectures'] as $row) {
            $prefectures[$row['key']] = $row + ['neighbors' => [], 'foods' => [], 'sights' => [], 'culture' => [], 'hard' => []];
        }

        return $prefectures;
    }

    /** 県のコースを作れるだけの事実がそろっているか */
    public static function isReady(array $prefecture): bool
    {
        return count($prefecture['foods'] ?? []) >= self::MIN_FOODS
            && count($prefecture['sights'] ?? []) >= self::MIN_SIGHTS
            && count($prefecture['culture'] ?? []) >= self::MIN_CULTURE
            && count($prefecture['hard'] ?? []) >= self::MIN_HARD;
    }

    /** 県の上級のボスの称号(例: 大阪府はかせ) */
    public static function title(string $name): string
    {
        return $name.self::TITLE_SUFFIX;
    }

    /** 称号が県のものなら、その県のバッジの絵(そうでなければ null) */
    public static function badgeForTitle(?string $title): ?string
    {
        if ($title === null) {
            return null;
        }
        foreach (self::all() as $prefecture) {
            if ($title === self::title($prefecture['name'])) {
                return self::badge($prefecture['key']);
            }
        }

        return null;
    }

    /** 県の名前なら、その県のバッジの絵(そうでなければ null) */
    public static function badgeForName(string $name): ?string
    {
        foreach (self::all() as $prefecture) {
            if ($name === $prefecture['name']) {
                return self::badge($prefecture['key']);
            }
        }

        return null;
    }

    private static function badge(string $key): string
    {
        return "/badge/pref/{$key}.webp";
    }
}
