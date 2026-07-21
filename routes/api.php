<?php

use App\Models\Admin;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});

Route::middleware(['auth:admin'])->get('/admin/user', function (Request $request) {
    return $request->user('admin');
})->name('admin.user');

Route::middleware(['auth:owner'])->get('/owner/user', function (Request $request) {
    return $request->user('owner');
})->name('owner.user');

Route::middleware(['auth:owner'])->get('/owner/admins', function () {
    return Admin::query()->latest()->get();
})->name('owner.admins');

Route::middleware(['auth:owner'])->get('/owner/users', function () {
    return User::query()->latest()->get();
})->name('owner.users');

Route::middleware(['auth:sanctum'])->prefix('profiles')->name('profiles.')->group(function () {
    Route::get('/', function (Request $request) {
        return $request->user()->schema?->profiles ?? [];
    })->name('index');

    Route::post('/', function (Request $request) {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $schema = $request->user()->schema ?? $request->user()->schema()->create();

        return $schema->profiles()->create([
            'name' => $request->string('name'),
        ]);
    })->name('store');

    Route::get('/active', function (Request $request) {
        $id = $request->session()->get('active_profile_id');

        return $id ? UserProfile::find($id) : null;
    })->name('active');

    Route::post('/{profile}/select', function (Request $request, UserProfile $profile) {
        abort_unless(
            $profile->user_schema_id === $request->user()->schema?->id,
            403
        );

        $request->session()->put('active_profile_id', $profile->id);

        return $profile;
    })->name('select');
});
