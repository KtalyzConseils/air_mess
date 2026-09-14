<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MerchantWaitlistEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class MerchantWaitlistController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'commerce_type' => ['required', 'string', 'max:255'],
            'commerce_type_other' => ['nullable', 'string', 'max:255', Rule::requiredIf($request->input('commerce_type') === 'Autre')],
            'nda_partner' => ['required', 'string', 'max:255'],
            'zone' => ['required', 'string', 'max:255'],
            'zone_other' => ['nullable', 'string', 'max:255', Rule::requiredIf($request->input('zone') === 'Autre')],
            'weekly_orders' => ['required', 'string', 'max:255'],
            'source' => ['nullable', 'string', 'max:255'],
            'source_other' => ['nullable', 'string', 'max:255', Rule::requiredIf($request->input('source') === 'Autre')],
            'delivery_methods' => ['required', 'array', 'min:1'],
            'delivery_methods.*' => ['required', 'string', 'max:255'],
            'delivery_methods_other' => ['nullable', 'string', 'max:255', Rule::requiredIf(fn () => is_array($request->input('delivery_methods')) && in_array('Autre', $request->input('delivery_methods'), true))],
            'problems' => ['required', 'array', 'min:1'],
            'problems.*' => ['required', 'string', 'max:255'],
            'problems_other' => ['nullable', 'string', 'max:255', Rule::requiredIf(fn () => is_array($request->input('problems')) && in_array('Autre', $request->input('problems'), true))],
            'worst_experience' => ['required', 'string'],
            'cash_collection_issue' => ['required', 'string', 'max:255'],
            'time_lost_weekly' => ['required', 'string', 'max:255'],
            'orders_lost_weekly' => ['required', 'string', 'max:255'],
            'expected_benefit' => ['required', 'string'],
            'commission_acceptance' => ['required', 'string', 'max:255'],
            'reasonable_fee' => ['required', 'string', 'max:255'],
            'mobile_money_trust' => ['required', 'string', 'max:255'],
            'interest_level' => ['required', 'integer', 'min:1', 'max:10'],
            'trial_interest' => ['required', 'string', 'max:255'],
            'shop_name' => ['nullable', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'whatsapp' => ['nullable', 'string', 'regex:/^(\+229)?[0-9]{8}$/'],
        ]);

        $entry = MerchantWaitlistEntry::create([
            ...$data,
            'delivery_methods' => $data['delivery_methods'],
            'problems' => $data['problems'],
            'status' => 'pending',
            'bonus_amount' => 500,
            'bonus_code' => $this->generateBonusCode(),
        ]);

        return response()->json([
            'message' => 'Votre inscription à la liste d\'attente est confirmée.',
            'waitlist' => [
                'id' => $entry->id,
                'status' => $entry->status,
                'bonus_amount' => $entry->bonus_amount,
                'bonus_code' => $entry->bonus_code,
                'created_at' => $entry->created_at?->toIso8601String() ?? null,
            ],
        ], 201);
    }

    private function generateBonusCode(): string
    {
        do {
            $code = 'AIRMESS500-' . strtoupper(Str::random(6));
        } while (MerchantWaitlistEntry::where('bonus_code', $code)->exists());

        return $code;
    }
}
