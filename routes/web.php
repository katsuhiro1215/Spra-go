<?php

use Illuminate\Support\Facades\Route;

// Public用
Route::get('/', function () {
    return ['Laravel' => app()->version()];
});

// User認証
require __DIR__.'/auth.php';
require __DIR__.'/admin.php';
require __DIR__.'/owner.php';

// User用
