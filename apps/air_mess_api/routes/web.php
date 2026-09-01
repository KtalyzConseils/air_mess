<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AccountDeletionController;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/delete-account', [AccountDeletionController::class, 'show'])->name('delete-account.show');
Route::post('/delete-account', [AccountDeletionController::class, 'destroy'])->name('delete-account.destroy');

Route::get('/billing/return', function () {
    $query = request()->getQueryString();
    $appUrl = 'airmess://billing/return' . ($query ? '?' . $query : '');

    return view('billing-return', ['appUrl' => $appUrl]);
})->name('billing.return');


// La documentation API publique est servie en statique depuis public/docs/
// (page Scalar + spec OpenAPI), sans middleware ni base de données.
// → https://<api>/docs/
