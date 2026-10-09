<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * ふりがな辞書を作る材料(問題・選択肢・解説・単語帳・国の文字)を、1文1行で書き出す(docs/design/2026-10-09-furigana-morph-design.md 3-1)。
 * 書き出した文字を tools/furigana/build_generated.py に渡す
 */
class FuriganaCorpusCommand extends Command
{
    protected $signature = 'furigana:corpus {path : 書き出すファイル}';

    protected $description = 'ふりがな辞書の材料(漢字を含む文字)を、重複なしで書き出す';

    public function handle(): int
    {
        $texts = [];
        $add = function (mixed $value) use (&$texts, &$add): void {
            if (is_array($value)) {
                array_walk_recursive($value, fn ($item) => is_string($item) ? $add($item) : null);

                return;
            }
            if (! is_string($value)) {
                return;
            }
            $line = trim(preg_replace('/\s+/u', ' ', $value));
            if ($line !== '' && preg_match('/\p{Han}/u', $line)) {
                $texts[$line] = true;
            }
        };
        $json = fn (?string $raw) => $raw === null ? null : json_decode($raw, true);

        foreach (['questions' => ['prompt'], 'question_choices' => ['label'], 'countries' => ['name', 'intro_message']] as $table => $columns) {
            foreach (DB::table($table)->select($columns)->cursor() as $row) {
                foreach ($columns as $column) {
                    $add($row->$column);
                }
            }
        }
        foreach (DB::table('questions')->whereNotNull('explanation')->select('explanation')->cursor() as $row) {
            $add($json($row->explanation));
        }
        // 単語帳の意味・場面・例文(英語の綴りは漢字を含まないので、日本語の値だけが残る)
        foreach (DB::table('words')->select(['meanings', 'usage', 'examples'])->cursor() as $row) {
            foreach (['meanings', 'usage', 'examples'] as $column) {
                $add($json($row->$column) ?? $row->$column); // usage は文字列。meanings・examples はJSON
            }
        }

        file_put_contents($this->argument('path'), implode("\n", array_keys($texts))."\n");
        $this->info(count($texts).'行を書き出しました: '.$this->argument('path'));

        return self::SUCCESS;
    }
}
