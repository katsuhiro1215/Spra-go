<?php

namespace App\Console\Commands;

use App\Models\Owner;
use Illuminate\Console\Command;

/**
 * Ownerを、サーバーの中から作る。Ownerの登録は画面(HTTP)から開けない(docs/design/2026-10-10-production-env-design.md 3章)。
 * パスワードは、コマンドに書くと履歴に残るので、ふだんは対話で入力する(--password は自動化・テスト用)
 */
class CreateOwnerCommand extends Command
{
    protected $signature = 'owner:create {email : ログインに使うメールアドレス} {--name= : 表示する名前} {--password= : パスワード(省略すると対話で入力)}';

    protected $description = 'Ownerを作る(メール確認済み)';

    private const MIN_PASSWORD_LENGTH = 12;

    public function handle(): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('メールアドレスの形が正しくありません。');

            return self::FAILURE;
        }
        if (Owner::where('email', $email)->exists()) {
            $this->error("{$email} のOwnerは、すでにいます。");

            return self::FAILURE;
        }

        $name = (string) ($this->option('name') ?: $this->ask('表示する名前'));
        $password = (string) ($this->option('password') ?: $this->secret('パスワード（'.self::MIN_PASSWORD_LENGTH.'文字以上）'));
        if (mb_strlen($password) < self::MIN_PASSWORD_LENGTH) {
            $this->error(self::MIN_PASSWORD_LENGTH.'文字以上にしてください。');

            return self::FAILURE;
        }

        $owner = Owner::create(['name' => $name, 'email' => $email, 'password' => $password]);
        $owner->forceFill(['email_verified_at' => now()])->save();

        $this->info("Ownerを作りました: {$email}");

        return self::SUCCESS;
    }
}
