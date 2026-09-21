<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Support\Facades\DB;

/** Lecture seule : complete la reconciliation sans modifier les donnees. */
class SandboxFinancialAuditService
{
    public function audit(): array
    {
        $payments = DB::table('payments')
            ->where('provider', Payment::PROVIDER_FEDAPAY)
            ->orderBy('id')
            ->get(['id', 'user_id', 'type', 'status', 'amount_fcfa', 'metadata', 'raw_response'])
            ->filter(fn (object $payment) => $this->paymentMode($payment) === 'momo_test')
            ->values();
        $paymentById = $payments->keyBy('id');
        $paymentIds = $paymentById->keys()->map(fn ($id) => (int) $id)->all();

        $userTransactions = $paymentIds === [] ? collect() : DB::table('user_wallet_transactions')->whereIn('payment_id', $paymentIds)->get();
        $userCredits = $userTransactions->filter(function (object $transaction) use ($paymentById): bool {
            $payment = $paymentById->get($transaction->payment_id);
            return $payment && (($transaction->type === 'deposit' && $payment->status === Payment::STATUS_PAID)
                || ($transaction->type === 'refund' && $payment->status === Payment::STATUS_REFUNDED));
        });
        $depositUsers = $userCredits->where('type', 'deposit')->pluck('user_id')->map(fn ($id) => (int) $id)->unique()->values();
        $directCourseIds = $payments
            ->filter(fn (object $payment) => $payment->type === Payment::TYPE_DELIVERY_FEE && $payment->status === Payment::STATUS_PAID)
            ->map(fn (object $payment) => $this->courseId($payment))->filter()->map(fn ($id) => (int) $id)->unique()->values();

        $courses = ($directCourseIds->isEmpty() && $depositUsers->isEmpty()) ? collect() : DB::table('courses')
            ->where(function ($query) use ($directCourseIds, $depositUsers) {
                if ($directCourseIds->isNotEmpty()) $query->whereIn('id', $directCourseIds);
                if ($depositUsers->isNotEmpty()) {
                    $method = $directCourseIds->isNotEmpty() ? 'orWhere' : 'where';
                    $query->{$method}(fn ($q) => $q->where('paid_from_wallet', true)->whereIn('sender_id', $depositUsers));
                }
            })->get(['id', 'reference', 'sender_id', 'driver_id', 'status', 'delivery_fee', 'driver_earnings', 'paid_from_wallet']);
        $directLookup = $directCourseIds->flip();
        $courseRows = $courses->map(fn (object $course) => [
            'course_id' => (int) $course->id,
            'reference' => $course->reference,
            'status' => $course->status,
            'classification' => $directLookup->has($course->id) ? 'sandbox_certain_direct' : 'sandbox_wallet_exposed',
            'delivery_fee' => (int) $course->delivery_fee,
            'driver_earnings' => (int) $course->driver_earnings,
        ])->values();

        $userIds = $depositUsers->merge($userCredits->pluck('user_id')->map(fn ($id) => (int) $id))->unique()->values();
        $walletRows = $userIds->isEmpty() ? collect() : DB::table('user_wallets')->whereIn('user_id', $userIds)->get()->map(function (object $wallet) use ($userCredits): array {
            $credits = (int) $userCredits->where('user_id', $wallet->user_id)->sum('amount_fcfa');
            return ['user_id' => (int) $wallet->user_id, 'balance' => (int) $wallet->balance,
                'pending_reserved' => (int) $wallet->pending_reserved, 'sandbox_credits' => $credits,
                'sandbox_residual_upper_bound' => min($credits, (int) $wallet->balance)];
        })->values();

        $courseIds = $courses->pluck('id')->map(fn ($id) => (int) $id)->all();
        $driverTransactions = ($courseIds === [] && $paymentIds === []) ? collect() : DB::table('wallet_transactions')
            ->where(function ($query) use ($courseIds, $paymentIds) {
                if ($courseIds !== []) $query->whereIn('course_id', $courseIds);
                if ($paymentIds !== []) {
                    $method = $courseIds !== [] ? 'orWhereIn' : 'whereIn';
                    $query->{$method}('payment_id', $paymentIds);
                }
            })->get();
        $driverIds = $driverTransactions->pluck('driver_id')->map(fn ($id) => (int) $id)->unique()->values();
        $driverWalletRows = $driverIds->isEmpty() ? collect() : DB::table('driver_wallets')->whereIn('driver_id', $driverIds)->get()->map(function (object $wallet) use ($driverTransactions): array {
            $credits = (int) $driverTransactions->where('driver_id', $wallet->driver_id)->whereIn('type', ['deposit', 'earning', 'refund'])->sum('amount_fcfa');
            return ['driver_id' => (int) $wallet->driver_id, 'balance' => (int) $wallet->balance,
                'exposed_credits' => $credits, 'exposed_residual_upper_bound' => min($credits, (int) $wallet->balance)];
        })->values();

        $withdrawals = ($userIds->isEmpty() && $driverIds->isEmpty()) ? collect() : DB::table('wallet_withdraw_requests')
            ->where(function ($query) use ($userIds, $driverIds) {
                if ($userIds->isNotEmpty()) $query->whereIn('user_id', $userIds);
                if ($driverIds->isNotEmpty()) {
                    $method = $userIds->isNotEmpty() ? 'orWhereIn' : 'whereIn';
                    $query->{$method}('driver_id', $driverIds);
                }
            })->whereIn('status', ['pending', 'approved'])
            ->get(['id', 'user_id', 'driver_id', 'amount_fcfa', 'status', 'paid_at', 'external_payout_reference', 'payout_failed_at'])
            ->map(fn (object $w) => ['withdrawal_id' => (int) $w->id, 'owner_type' => $w->driver_id ? 'driver' : 'user',
                'owner_id' => (int) ($w->driver_id ?: $w->user_id), 'amount' => (int) $w->amount_fcfa, 'status' => $w->status,
                'paid' => $w->paid_at !== null && $w->external_payout_reference !== null, 'payout_failed' => $w->payout_failed_at !== null])->values();

        $snapshot = $this->snapshot();
        return [
            'generated_at' => now()->toIso8601String(),
            'snapshot_token' => hash('sha256', json_encode($snapshot, JSON_THROW_ON_ERROR)),
            'snapshot' => $snapshot,
            'correction_ready' => false,
            'payments' => ['count' => $payments->count(), 'nominal_total' => (int) $payments->sum('amount_fcfa'),
                'paid_total' => (int) $payments->where('status', Payment::STATUS_PAID)->sum('amount_fcfa'),
                'refunded_total' => (int) $payments->where('status', Payment::STATUS_REFUNDED)->sum('amount_fcfa'), 'ids' => $paymentIds],
            'user_wallets' => ['sandbox_credit_total' => (int) $userCredits->sum('amount_fcfa'),
                'residual_upper_bound' => (int) $walletRows->sum('sandbox_residual_upper_bound'), 'items' => $walletRows],
            'driver_wallets' => ['exposed_residual_upper_bound' => (int) $driverWalletRows->sum('exposed_residual_upper_bound'), 'items' => $driverWalletRows],
            'courses' => $courseRows,
            'withdrawals_requiring_review' => $withdrawals,
        ];
    }

    /**
     * Prévisualise un plan de compensation sans effectuer d'écriture.
     * Refuse tout snapshot expiré ou périmé par une modification de données.
     */
    public function previewRepair(string $snapshotToken): array
    {
        $snapshot = $this->snapshot();
        $currentToken = hash('sha256', json_encode($snapshot, JSON_THROW_ON_ERROR));

        if (! hash_equals($currentToken, $snapshotToken)) {
            throw new \RuntimeException('Snapshot token invalid or stale: the financial state has changed since the audit was prepared.');
        }

        $audit = $this->audit();
        $userAdjustments = collect($audit['user_wallets']['items'])
            ->filter(fn (array $row) => (int) $row['sandbox_residual_upper_bound'] > 0)
            ->map(fn (array $row) => [
                'user_id' => (int) $row['user_id'],
                'amount_fcfa' => -(int) $row['sandbox_residual_upper_bound'],
                'reason' => 'sandbox_compensation',
                'wallet_balance_before' => (int) $row['balance'],
                'pending_reserved' => (int) $row['pending_reserved'],
            ])
            ->values()
            ->all();

        $driverAdjustments = collect($audit['driver_wallets']['items'])
            ->filter(fn (array $row) => (int) $row['exposed_residual_upper_bound'] > 0)
            ->map(fn (array $row) => [
                'driver_id' => (int) $row['driver_id'],
                'amount_fcfa' => -(int) $row['exposed_residual_upper_bound'],
                'reason' => 'sandbox_compensation',
                'wallet_balance_before' => (int) $row['balance'],
            ])
            ->values()
            ->all();

        return [
            'correction_ready' => $userAdjustments !== [] || $driverAdjustments !== [],
            'snapshot_token' => $snapshotToken,
            'user_adjustments' => $userAdjustments,
            'driver_adjustments' => $driverAdjustments,
            'notes' => 'Preview only: no wallet mutation is performed.',
        ];
    }

    /**
     * Applique une correction sandbox validée.
     * La transaction est atomique, et l'opération est refusée si le snapshot a changé.
     */
    public function applyRepair(string $snapshotToken, ?int $adminId = null): array
    {
        $snapshot = $this->snapshot();
        $currentToken = hash('sha256', json_encode($snapshot, JSON_THROW_ON_ERROR));

        if (! hash_equals($currentToken, $snapshotToken)) {
            throw new \RuntimeException('Snapshot token invalid or stale: the financial state has changed since the audit was prepared.');
        }

        $audit = $this->audit();
        $plan = $this->previewRepair($snapshotToken);

        if (! $plan['correction_ready']) {
            return [
                'snapshot_token' => $snapshotToken,
                'applied' => false,
                'user_adjustments' => [],
                'driver_adjustments' => [],
                'notes' => 'No sandbox exposure found in the current snapshot.',
            ];
        }

        $created = ['user' => [], 'driver' => []];

        DB::transaction(function () use ($audit, $adminId, &$created) {
            foreach ($audit['user_wallets']['items'] as $row) {
                $amount = (int) $row['sandbox_residual_upper_bound'];
                if ($amount <= 0) {
                    continue;
                }

                $user = \App\Models\User::find((int) $row['user_id']);
                if (! $user) {
                    continue;
                }

                $wallet = \App\Models\UserWallet::where('user_id', $user->id)->lockForUpdate()->first();
                if (! $wallet) {
                    continue;
                }

                $wallet->balance = max(0, (int) $wallet->balance - $amount);
                $wallet->save();

                $tx = \App\Models\UserWalletTransaction::create([
                    'user_id' => $user->id,
                    'type' => \App\Models\UserWalletTransaction::TYPE_ADJUSTMENT_DEBIT,
                    'amount_fcfa' => -$amount,
                    'balance_after' => $wallet->balance,
                    'metadata' => [
                        'admin_id' => $adminId,
                        'reason' => 'sandbox_compensation',
                        'snapshot_token' => $audit['snapshot_token'],
                    ],
                    'created_at' => now(),
                ]);

                app(\App\Services\AccountingLedgerService::class)->recordUserWalletTransaction($tx);
                \App\Models\WalletAdjustment::create([
                    'wallet_type' => \App\Models\WalletAdjustment::WALLET_TYPE_USER,
                    'wallet_owner_id' => $user->id,
                    'amount_fcfa' => -$amount,
                    'reason_code' => \App\Models\WalletAdjustment::REASON_MANUAL_DEBIT,
                    'notes' => 'sandbox_compensation',
                    'admin_id' => $adminId,
                    'balance_after' => $wallet->balance,
                    'created_at' => now(),
                ]);

                $created['user'][] = ['user_id' => $user->id, 'amount_fcfa' => -$amount];
            }

            foreach ($audit['driver_wallets']['items'] as $row) {
                $amount = (int) $row['exposed_residual_upper_bound'];
                if ($amount <= 0) {
                    continue;
                }

                $driver = \App\Models\Driver::find((int) $row['driver_id']);
                if (! $driver) {
                    continue;
                }

                $wallet = \App\Models\DriverWallet::where('driver_id', $driver->id)->lockForUpdate()->first();
                if (! $wallet) {
                    continue;
                }

                $wallet->balance = max(0, (int) $wallet->balance - $amount);
                $wallet->save();

                $tx = \App\Models\WalletTransaction::create([
                    'driver_id' => $driver->id,
                    'type' => \App\Models\WalletTransaction::TYPE_ADJUSTMENT_DEBIT,
                    'amount_fcfa' => -$amount,
                    'balance_after' => $wallet->balance,
                    'metadata' => [
                        'admin_id' => $adminId,
                        'reason' => 'sandbox_compensation',
                        'snapshot_token' => $audit['snapshot_token'],
                    ],
                    'created_at' => now(),
                ]);

                app(\App\Services\AccountingLedgerService::class)->recordDriverWalletTransaction($tx);
                \App\Models\WalletAdjustment::create([
                    'wallet_type' => \App\Models\WalletAdjustment::WALLET_TYPE_DRIVER,
                    'wallet_owner_id' => $driver->id,
                    'amount_fcfa' => -$amount,
                    'reason_code' => \App\Models\WalletAdjustment::REASON_MANUAL_DEBIT,
                    'notes' => 'sandbox_compensation',
                    'admin_id' => $adminId,
                    'balance_after' => $wallet->balance,
                    'created_at' => now(),
                ]);

                $created['driver'][] = ['driver_id' => $driver->id, 'amount_fcfa' => -$amount];
            }
        });

        return [
            'snapshot_token' => $snapshotToken,
            'applied' => true,
            'user_adjustments' => $created['user'],
            'driver_adjustments' => $created['driver'],
            'notes' => 'Transaction executed atomically with token validation.',
        ];
    }

    private function paymentMode(object $payment): ?string
    {
        $raw = is_string($payment->raw_response) ? json_decode($payment->raw_response, true) : (array) $payment->raw_response;
        return isset($raw['mode']) ? (string) $raw['mode'] : null;
    }

    private function courseId(object $payment): ?int
    {
        $metadata = is_string($payment->metadata) ? json_decode($payment->metadata, true) : (array) $payment->metadata;
        return is_numeric($metadata['course_id'] ?? null) ? (int) $metadata['course_id'] : null;
    }

    private function snapshot(): array
    {
        // Les journaux sont immuables : count/max_id suffisent. Les tables d'etat
        // incluent aussi updated_at et les sommes sensibles afin qu'une modification
        // concurrente invalide le jeton, meme sans nouvelle ligne.
        $immutable = collect(['user_wallet_transactions', 'wallet_transactions'])
            ->mapWithKeys(function (string $table): array {
                $row = DB::table($table)->selectRaw('COUNT(*) AS count, COALESCE(MAX(id), 0) AS max_id')->first();
                return [$table => [(int) $row->count, (int) $row->max_id]];
            })->all();

        return [
            ...$immutable,
            'payments' => (array) DB::table('payments')->selectRaw(
                "COUNT(*) AS count, COALESCE(MAX(id), 0) AS max_id, COALESCE(MAX(updated_at)::text, '') AS updated_at, COALESCE(SUM(amount_fcfa), 0) AS amount"
            )->first(),
            'user_wallets' => (array) DB::table('user_wallets')->selectRaw(
                "COUNT(*) AS count, COALESCE(MAX(id), 0) AS max_id, COALESCE(MAX(updated_at)::text, '') AS updated_at, COALESCE(SUM(balance), 0) AS balance, COALESCE(SUM(pending_reserved), 0) AS reserved"
            )->first(),
            'driver_wallets' => (array) DB::table('driver_wallets')->selectRaw(
                "COUNT(*) AS count, COALESCE(MAX(id), 0) AS max_id, COALESCE(MAX(updated_at)::text, '') AS updated_at, COALESCE(SUM(balance), 0) AS balance"
            )->first(),
            'courses' => (array) DB::table('courses')->selectRaw(
                "COUNT(*) AS count, COALESCE(MAX(id), 0) AS max_id, COALESCE(MAX(updated_at)::text, '') AS updated_at, COALESCE(SUM(delivery_fee), 0) AS fees"
            )->first(),
            'wallet_withdraw_requests' => (array) DB::table('wallet_withdraw_requests')->selectRaw(
                "COUNT(*) AS count, COALESCE(MAX(id), 0) AS max_id, COALESCE(MAX(updated_at)::text, '') AS updated_at, COALESCE(SUM(amount_fcfa), 0) AS amount"
            )->first(),
        ];
    }
}
