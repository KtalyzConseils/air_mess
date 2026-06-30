<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// La documentation API publique est servie en statique depuis public/docs/
// (page Scalar + spec OpenAPI), sans middleware ni base de données.
// → https://<api>/docs/
