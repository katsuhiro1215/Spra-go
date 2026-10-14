<?php

// 本番(Linux)はファイル名の大文字・小文字を区別するが、開発のMacは区別しない。
// file_exists では開発で見逃すので、ファイル名の一覧と、文字どおりに比べる(2026-10-14 国旗が出ない不具合の再発防止)

function flagFileNames(): array
{
    return array_map(fn (string $f) => substr($f, 0, -4), array_filter(scandir(base_path('frontend/public/flag')), fn ($f) => str_ends_with($f, '.svg')));
}

/** CountrySeeder の国コード(画面は小文字にして /flag/{小文字}.svg を読む) */
function seededCountryCodes(): array
{
    preg_match_all("/'code' => '([^']+)'/", file_get_contents(database_path('seeders/CountrySeeder.php')), $m);

    return $m[1];
}

it('国のシーダーの国コードは、小文字にして、国旗のファイルが文字どおりにある', function () {
    $files = flagFileNames();
    $missing = array_values(array_filter(seededCountryCodes(), fn ($code) => ! in_array(strtolower($code), $files, true)));

    expect($missing)->toBe([]);
});

it('旅の行き先の国旗は、文字どおりのファイル名がある(本番は大文字小文字を区別する)', function () {
    $files = flagFileNames();
    $missing = array_values(array_filter(
        array_map(fn ($d) => $d['flag'], config('travel.destinations')),
        fn ($flag) => ! in_array($flag, $files, true),
    ));

    expect($missing)->toBe([]);
});

it('国コードに国名が入っているデータ(Belgium・Georgia)は、2文字のコードのファイルで読み替える', function () {
    expect(flagFileNames())->toContain('be')->toContain('ge');
});
