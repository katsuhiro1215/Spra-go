<?php

namespace App\Support\Space;

/**
 * 宇宙の問題の原稿(questions.csv・pictures.csv)を読んで、形を確かめる
 * (docs/design/2026-10-09-space-quiz-design.md 5章)。データベースには触らない。
 * エラーがあるときは、行番号つきの文で返す(呼び出し側が、何も書かずに止める)
 */
class SpaceCatalog
{
    public const LEVELS = ['初級', '中級', '上級'];

    /** 選択肢の長さの上限(mb_strwidth。全角1文字が2。ミニゲームの画面に収めるため。依頼書2章) */
    public const MAX_WIDTH = 12;

    /** @return array{questions: list<array<string, mixed>>, pictures: array<string, array{key: string, name: string}>, errors: list<string>} */
    public static function load(string $dir): array
    {
        $errors = [];
        $pictures = self::pictures("{$dir}/pictures.csv", $errors);
        $questions = self::questions("{$dir}/questions.csv", $pictures, $errors);

        return ['questions' => $questions, 'pictures' => $pictures, 'errors' => $errors];
    }

    /** @return array<string, array{key: string, name: string}> */
    private static function pictures(string $path, array &$errors): array
    {
        $pictures = [];
        $keys = [];
        foreach (self::rows($path, $errors) as $line => $row) {
            $key = trim($row['キー'] ?? '');
            $name = trim($row['名前'] ?? '');
            if (! preg_match('/^[a-z0-9_]+$/', $key)) {
                $errors[] = "pictures.csv {$line}行目: キーは英小文字・数字・_だけにしてください（{$key}）";

                continue;
            }
            if (isset($keys[$key]) || isset($pictures[$name])) {
                $errors[] = "pictures.csv {$line}行目: キーまたは名前が重複しています（{$key} / {$name}）";

                continue;
            }
            $keys[$key] = true;
            $pictures[$name] = ['key' => $key, 'name' => $name];
        }

        return $pictures;
    }

    /** @return list<array<string, mixed>> */
    private static function questions(string $path, array $pictures, array &$errors): array
    {
        $questions = [];
        foreach (self::rows($path, $errors) as $line => $row) {
            $where = "questions.csv {$line}行目";
            $level = trim($row['難しさ'] ?? '');
            $form = trim($row['形'] ?? '');
            $prompt = trim($row['問題文'] ?? '');
            $correct = trim($row['正解'] ?? '');
            $wrong = [trim($row['まちがい1'] ?? ''), trim($row['まちがい2'] ?? ''), trim($row['まちがい3'] ?? '')];
            $choices = [$correct, ...$wrong];
            $problems = [];

            if (! in_array($level, self::LEVELS, true)) {
                $problems[] = "難しさが初級・中級・上級のどれでもありません（{$level}）";
            }
            if (! in_array($form, ['4択', '絵4択'], true)) {
                $problems[] = "形が4択・絵4択のどちらでもありません（{$form}）";
            }
            if ($prompt === '') {
                $problems[] = '問題文が空です';
            }
            if (in_array('', $choices, true)) {
                $problems[] = '選択肢に空があります';
            } elseif (count(array_unique($choices)) < 4) {
                $problems[] = '選択肢が重複しています';
            }
            foreach ($choices as $choice) {
                if (mb_strwidth($choice) > self::MAX_WIDTH) {
                    $problems[] = "選択肢が全角6文字を超えています（{$choice}）";
                }
                if ($form === '絵4択' && $choice !== '' && ! isset($pictures[$choice])) {
                    $problems[] = "絵の一覧にない名前です（{$choice}）";
                }
            }

            if ($problems !== []) {
                foreach ($problems as $problem) {
                    $errors[] = "{$where}: {$problem}";
                }

                continue;
            }

            $questions[] = [
                'level' => $level,
                'number' => (int) ($row['番号'] ?? 0),
                'theme' => trim($row['テーマ'] ?? ''),
                'kind' => $form === '絵4択' ? 'picture' : 'text',
                'prompt' => $prompt,
                'correct' => $correct,
                'wrong' => $wrong,
                'explanation' => trim($row['解説(要約)'] ?? ''),
            ];
        }

        return $questions;
    }

    /**
     * 行を、見出しをキーにした配列にして返す。添字はファイルの行番号(見出しが1行目)
     *
     * @return array<int, array<string, string>>
     */
    private static function rows(string $path, array &$errors): array
    {
        $name = basename($path);
        if (! is_file($path)) {
            $errors[] = "{$name} が見つかりません（{$path}）";

            return [];
        }

        $handle = fopen($path, 'r');
        $header = fgetcsv($handle, 0, ',', '"', '');
        if ($header === false) {
            fclose($handle);

            return [];
        }
        $header = array_map(fn (?string $cell) => trim(preg_replace('/^\xEF\xBB\xBF/', '', (string) $cell)), $header);

        $rows = [];
        $line = 1;
        while (($cells = fgetcsv($handle, 0, ',', '"', '')) !== false) {
            $line++;
            if ($cells === [null]) {
                continue;
            }
            $rows[$line] = array_combine($header, array_pad(array_slice($cells, 0, count($header)), count($header), ''));
        }
        fclose($handle);

        return $rows;
    }
}
