<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMerchantWaitlistRequest;
use App\Mail\MerchantWaitlistNotificationMail;
use App\Models\MerchantWaitlist;
use App\Services\FirstCourseDiscountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class MerchantWaitlistController extends Controller
{
    public function store(StoreMerchantWaitlistRequest $request): JsonResponse
    {
        $waitlist = MerchantWaitlist::create($request->validated() + [
            'status' => MerchantWaitlist::STATUS_WAITLISTED,
            // Information commerciale uniquement : l'éligibilité et l'application
            // du bon restent centralisées dans FirstCourseDiscountService.
            'bonus_amount' => FirstCourseDiscountService::AMOUNT_FCFA,
            'bonus_code' => null,
            'ip_address' => $request->ip(),
        ]);

        try {
            Mail::to(config('services.merchant_waitlist.notification_email'))
                ->send(new MerchantWaitlistNotificationMail($waitlist));
        } catch (\Throwable $e) {
            Log::warning('MerchantWaitlistNotificationMail failed', [
                'error' => $e->getMessage(),
                'waitlist_id' => $waitlist->id,
            ]);
        }

        return response()->json([
            'message' => "Votre inscription sur la liste d'attente est confirmée.",
            'waitlist' => [
                'id' => $waitlist->id,
                'status' => $waitlist->status,
                'bonus_amount' => $waitlist->bonus_amount,
                'created_at' => $waitlist->created_at?->toIso8601String(),
            ],
        ], 201);
    }
}
