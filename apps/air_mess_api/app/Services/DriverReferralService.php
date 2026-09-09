<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\Course;
use App\Models\Driver;
use App\Models\DriverReferral;
use App\Models\DriverWallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DriverReferralService
{
    public function ensureReferralCode(Driver $driver): string
    {
        if ($driver->referral_code) {
            return $driver->referral_code;
        }

        do {
            $code = 'AM' . Str::upper(Str::random(8));
        } while (Driver::where('referral_code', $code)->exists());

        $driver->forceFill(['referral_code' => $code])->save();

        return $code;
    }

    public function attachReferral(Driver $referred, ?string $code): ?DriverReferral
    {
        $normalized = Str::upper(trim((string) $code));
        if ($normalized === '') {
            return null;
        }

        $sponsor = Driver::where('referral_code', $normalized)->first();
        if (! $sponsor || $sponsor->id === $referred->id || $referred->receivedReferral()->exists()) {
            return null;
        }

        return DriverReferral::create([
            'sponsor_driver_id' => $sponsor->id,
            'referred_driver_id' => $referred->id,
            'referral_code' => $normalized,
            'status' => DriverReferral::STATUS_PENDING,
        ]);
    }

    public function evaluateForReferredDriver(Driver $referred): ?DriverReferral
    {
        if (! AppSetting::get('driver_referral_enabled', true)) {
            return null;
        }

        $required = max(1, (int) AppSetting::get('driver_referral_required_deliveries', 3));
        $amount = max(0, (int) AppSetting::get('driver_referral_reward_fcfa', 1000));
        if ($amount <= 0) {
            return null;
        }

        return DB::transaction(function () use ($referred, $required, $amount) {
            $referral = DriverReferral::where('referred_driver_id', $referred->id)
                ->lockForUpdate()
                ->first();

            if (! $referral || $referral->rewarded_at) {
                return null;
            }

            $deliveredCount = Course::where('driver_id', $referred->id)
                ->where('status', Course::STATUS_DELIVERED)
                ->count();

            $referral->delivered_courses_count = $deliveredCount;

            if ($deliveredCount < $required) {
                $referral->save();
                return null;
            }

            $wallet = DriverWallet::firstOrCreate(['driver_id' => $referral->sponsor_driver_id]);
            $wallet = DriverWallet::whereKey($wallet->id)->lockForUpdate()->firstOrFail();
            $wallet->balance += $amount;
            $wallet->save();

            $transaction = WalletTransaction::create([
                'driver_id' => $referral->sponsor_driver_id,
                'type' => WalletTransaction::TYPE_ADJUSTMENT_CREDIT,
                'amount_fcfa' => $amount,
                'balance_after' => $wallet->balance,
                'metadata' => [
                    'reason' => 'driver_referral_reward',
                    'referral_id' => $referral->id,
                    'referred_driver_id' => $referred->id,
                    'required_delivered_courses' => $required,
                ],
            ]);

            $referral->forceFill([
                'status' => DriverReferral::STATUS_REWARDED,
                'delivered_courses_count' => $deliveredCount,
                'required_delivered_courses' => $required,
                'reward_amount_fcfa' => $amount,
                'qualified_at' => now(),
                'rewarded_at' => now(),
                'wallet_transaction_id' => $transaction->id,
            ])->save();

            return $referral->fresh(['sponsor.user', 'referred.user']);
        });
    }

    public function summary(Driver $driver): array
    {
        $code = $this->ensureReferralCode($driver);
        $required = max(1, (int) AppSetting::get('driver_referral_required_deliveries', 3));
        $amount = max(0, (int) AppSetting::get('driver_referral_reward_fcfa', 1000));
        $enabled = (bool) AppSetting::get('driver_referral_enabled', true);
        $shareUrl = $this->shareUrl($code);

        return [
            'enabled' => $enabled,
            'code' => $code,
            'share_url' => $shareUrl,
            'share_message' => "Rejoins AirMess comme livreur avec mon lien : {$shareUrl}. Code parrainage : {$code}",
            'required_delivered_courses' => $required,
            'reward_amount_fcfa' => $amount,
            'sponsored_count' => $driver->sponsoredReferrals()->count(),
            'rewarded_count' => $driver->sponsoredReferrals()->whereNotNull('rewarded_at')->count(),
            'pending_count' => $driver->sponsoredReferrals()->whereNull('rewarded_at')->count(),
        ];
    }

    private function shareUrl(string $code): string
    {
        $base = rtrim((string) config('app.frontend_url'), '/');
        if (app()->environment('production') && preg_match('/:\/\/(localhost|127\.0\.0\.1)(?::|\/|$)/i', $base)) {
            $base = 'https://app.airmess-logistics.com';
        }

        return $base . '/register/driver?ref=' . rawurlencode($code);
    }
}
