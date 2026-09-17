<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDriverWaitlistRequest;
use App\Mail\DriverWaitlistNotificationMail;
use App\Models\DriverWaitlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class DriverWaitlistController extends Controller
{
    public function store(StoreDriverWaitlistRequest $request): JsonResponse
    {
        $waitlist = DriverWaitlist::create($request->validated() + [
            'status' => DriverWaitlist::STATUS_WAITLISTED,
            'ip_address' => $request->ip(),
        ]);

        try {
            Mail::to(config('services.driver_waitlist.notification_email'))
                ->send(new DriverWaitlistNotificationMail($waitlist));
        } catch (\Throwable $e) {
            Log::warning('DriverWaitlistNotificationMail failed', [
                'error' => $e->getMessage(),
                'waitlist_id' => $waitlist->id,
            ]);
        }

        return response()->json([
            'message' => "Votre inscription sur la liste d'attente des livreurs est confirmée.",
            'waitlist' => [
                'id' => $waitlist->id,
                'status' => $waitlist->status,
                'created_at' => $waitlist->created_at?->toIso8601String(),
            ],
        ], 201);
    }
}
