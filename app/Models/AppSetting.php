<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** 公開設定の1行(名前と値)。読み書きは App\Support\AppSettings を通す */
class AppSetting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];
}
