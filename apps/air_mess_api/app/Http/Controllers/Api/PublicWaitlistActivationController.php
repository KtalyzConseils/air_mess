<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PublicWaitlistActivationService;
use Illuminate\Http\JsonResponse;

class PublicWaitlistActivationController extends Controller
{
    public function show(string $token, PublicWaitlistActivationService $activations): JsonResponse
    {
        return response()->json(['prefill' => $activations->prefill($token)]);
    }
}
