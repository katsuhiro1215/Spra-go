<?php

namespace App\Support\Prefecture;

/**
 * 地名コースの問題に出る地名の読み(docs/design/2026-10-06-prefecture-master-design.md 6章)。
 * 元データ database/data/municipality-readings.json は、日本郵便の郵便番号データから
 * tools/place-names/build_municipality_readings.py で作った(県ごとの、市区町村名→ひらがな)。
 * 同じ名前でも県で読みが違う(朝日町など)ので、辞書には入れず、問題ごとに「その県の読み」を持たせる
 */
class MunicipalityReadings
{
    /** 北海道の地域名など、市区町村ではないが解説に出る語 */
    private const REGIONS = [
        '胆振' => 'いぶり', '十勝' => 'とかち', '石狩' => 'いしかり', '渡島' => 'おしま', '後志' => 'しりべし',
        '宗谷' => 'そうや', '留萌' => 'るもい', '上川' => 'かみかわ', '空知' => 'そらち', '根室' => 'ねむろ',
        '釧路' => 'くしろ', '網走' => 'あばしり', '日高' => 'ひだか', '檜山' => 'ひやま',
    ];

    /** 単独の「市・町・村」は、「ある町は」のような言い方のときだけ読む */
    private const SUFFIXES = ['市' => 'し', '町' => 'まち', '村' => 'むら'];

    private static ?array $table = null;

    private static ?array $index = null;

    /** @return array<string, array<string, string>> 県名 → (市区町村名 → ひらがな) */
    public static function table(): array
    {
        return self::$table ??= json_decode(file_get_contents(database_path('data/municipality-readings.json')), true, 512, JSON_THROW_ON_ERROR);
    }

    /**
     * 名前 → (県名 → 読み)。「市」を除いた言い方(帯広・米沢など)も足す
     *
     * @return array<string, array<string, string>>
     */
    private static function index(): array
    {
        if (self::$index !== null) {
            return self::$index;
        }
        $index = [];
        foreach (self::table() as $prefecture => $names) {
            foreach ($names as $name => $reading) {
                $index[$name][$prefecture] = $reading;
            }
        }
        foreach (self::table() as $prefecture => $names) {
            foreach ($names as $name => $reading) {
                if (str_ends_with($name, '市') && mb_strlen($name) >= 3 && str_ends_with($reading, 'し')) {
                    $index[mb_substr($name, 0, -1)][$prefecture] ??= mb_substr($reading, 0, -1);
                }
            }
        }
        foreach (self::REGIONS as $name => $reading) {
            $index[$name]['*'] = $reading;
        }

        return self::$index = $index;
    }

    /**
     * $texts(問題文・選択肢・解説)に出る地名の読みを、名前 → ひらがなで返す。
     * 同じ名前は、その県の読みを使う。ほかの県の名前(選択肢)は、いちばん多い読み。同数なら、表の先に出る県の読み
     *
     * @param  list<string>  $texts
     * @param  list<string>  $plain  ふりがなを付けない語(問われた地名)
     * @return array<string, string>
     */
    public static function forTexts(string $prefecture, array $texts, array $plain = []): array
    {
        $haystack = implode("\n", $texts);
        $readings = [];

        foreach (self::index() as $name => $byPrefecture) {
            if (! str_contains($haystack, (string) $name) || ! preg_match('/[\x{3400}-\x{9FFF}々]/u', (string) $name)) {
                continue;
            }
            $reading = $byPrefecture[$prefecture] ?? self::majority($byPrefecture);
            if ($reading !== null) {
                $readings[$name] = $reading;
            }
        }

        foreach (self::SUFFIXES as $suffix => $reading) {
            if (str_contains($haystack, "ある{$suffix}")) {
                $readings[$suffix] = $reading;
            }
        }

        foreach ($plain as $word) {
            unset($readings[$word]);
        }

        return $readings;
    }

    /** @param  array<string, string>  $byPrefecture */
    private static function majority(array $byPrefecture): ?string
    {
        $counts = array_count_values($byPrefecture);
        arsort($counts); // 同数のときは、先に数えた読み(表の先の県)が前に残る

        return $counts === [] ? null : (string) array_key_first($counts);
    }
}
