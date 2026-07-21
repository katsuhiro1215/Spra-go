<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    protected $fillable = ['title', 'starts_at', 'ends_at'];

    protected $appends = ['status'];

    protected function casts(): array
    {
        return [
            'starts_at' => 'date',
            'ends_at' => 'date',
        ];
    }

    protected function status(): Attribute
    {
        return Attribute::make(get: function () {
            $today = CarbonImmutable::today();

            if ($today->lt($this->starts_at)) {
                return '開催予定';
            }

            if ($today->gt($this->ends_at)) {
                return '終了';
            }

            return '開催中';
        });
    }
}
