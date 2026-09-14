<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMerchantWaitlistRequest;
use App\Models\MerchantWaitlist;
use Illuminate\Http\JsonResponse;

class MerchantWaitlistController extends Controller
{
    public function store(StoreMerchantWaitlistRequest $request): JsonResponse
    {
        $bonusCode = strtoupper(bin2hex(random_bytes(8)));

        $waitlist = MerchantWaitlist::create($request->validated() + [
            'status' => MerchantWaitlist::STATUS_WAITLISTED,
            'bonus_amount' => 500,
            'bonus_code' => $bonusCode,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => "Votre inscription sur la liste d'attente est confirmée.",
            'waitlist' => [
                'id' => $waitlist->id,
                'status' => $waitlist->status,
                'bonus_amount' => $waitlist->bonus_amount,
                'bonus_code' => $waitlist->bonus_code,
                'created_at' => $waitlist->created_at?->toIso8601String(),
            ],
        ], 201);
    }
}