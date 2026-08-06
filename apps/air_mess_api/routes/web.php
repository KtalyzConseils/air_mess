<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AccountDeletionController;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/delete-account', [AccountDeletionController::class, 'show'])->name('delete-account.show');
Route::post('/delete-account', [AccountDeletionController::class, 'destroy'])->name('delete-account.destroy');


// La documentation API publique est servie en statique depuis public/docs/
// (page Scalar + spec OpenAPI), sans middleware ni base de données.
// → https://<api>/docs/
