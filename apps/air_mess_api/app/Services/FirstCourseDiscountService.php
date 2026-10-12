<?php

namespace App\Services;

use App\Models\Course;
use App\Models\MerchantWaitlist;
use App\Models\Payment;
use App\Models\User;

class FirstCourseDiscountService
{
    public const AMOUNT_FCFA = 500;
    public const CODE = 'FIRST_COURSE_500';

    /** @return array{original_fee:int, discount_amount:int, fee:int, discount_code:?string} */
    public function quote(User $user, int $originalFee): array
    {
        $discountAlreadyReserved = Payment::where('user_id', $user->id)
            ->where('type', Payment::TYPE_DELIVERY_FEE)
            ->where('metadata->discount_code', self::CODE)
            ->where(function ($query) {
                $query->where('status', Payment::STATUS_PAID)
                    ->orWhere(function ($active) {
                        $active->whereIn('status', [Payment::STATUS_PENDING, Payment::STATUS_PROCESSING])
                            ->where('created_at', '>=', now()->subHour());
                    });
            })
            ->exists();

        $eligible = $user->type === User::TYPE_MARCHANT
            && $user->email !== null
            && MerchantWaitlist::whereRaw('LOWER(email) = ?', [mb_strtolower($user->email)])
                ->whereNull('bonus_redeemed_at')
                ->exists()
            && ! Course::where('sender_id', $user->id)->exists()
            && ! $discountAlreadyReserved;
        $discount = $eligible ? min(self::AMOUNT_FCFA, $originalFee) : 0;

        return [
            'original_fee' => $originalFee,
            'discount_amount' => $discount,
            'fee' => max(0, $originalFee - $discount),
            'discount_code' => $discount > 0 ? self::CODE : null,
        ];
    }

    public function markRedeemed(User $user): void
    {
        if ($user->type !== User::TYPE_MARCHANT || $user->email === null) {
            return;
        }

        MerchantWaitlist::whereRaw('LOWER(email) = ?', [mb_strtolower($user->email)])
            ->whereNull('bonus_redeemed_at')
            ->update(['bonus_redeemed_at' => now()]);
    }
}
