<?php

namespace App\Services;

use App\Models\AccountingJournal;
use App\Models\Course;
use App\Models\CourseCustodyEvent;
use App\Models\Driver;
use App\Models\PlatformEarning;
use App\Models\UserWalletTransaction;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;

class AccountingLedgerService
{
    public const ACC_PLATFORM_CASH = 'platform.cash';
    public const ACC_PLATFORM_REVENUE = 'platform.revenue';
    public const ACC_DRIVER_WALLET = 'driver.wallet';
    public const ACC_USER_WALLET = 'user.wallet';
    public const ACC_DRIVER_CASH_DUE = 'driver.cash_due';
    public const ACC_MERCHANT_PAYABLE = 'merchant.payable';

    public function recordDriverWalletTransaction(WalletTransaction $tx): AccountingJournal
    {
        $amount = abs((int) $tx->amount_fcfa);
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Accounting amount must be positive.');
        }

        $driver = ['type' => 'driver', 'id' => (int) $tx->driver_id];
        $platform = ['type' => 'platform', 'id' => null];
        $event = 'driver_wallet.' . $tx->type;

        return match ($tx->type) {
            WalletTransaction::TYPE_DEPOSIT => $this->recordJournal(
                idempotencyKey: "driver-wallet:{$tx->id}",
                eventType: $event,
                description: 'Recharge wallet livreur',
                context: [
                    'driver_id' => $tx->driver_id,
                    'course_id' => $tx->course_id,
                    'payment_id' => $tx->payment_id,
                    'metadata' => ['wallet_transaction_id' => $tx->id],
                    'occurred_at' => $tx->created_at,
                ],
                lines: [
                    $this->line(self::ACC_PLATFORM_CASH, 'Tresorerie AirMess', 'debit', $amount, $platform, $driver),
                    $this->line(self::ACC_DRIVER_WALLET, 'Solde wallet livreur', 'credit', $amount, $driver, $platform),
                ],
            ),
            WalletTransaction::TYPE_WITHDRAW => $this->recordJournal(
                idempotencyKey: "driver-wallet:{$tx->id}",
                eventType: $event,
                description: 'Retrait wallet livreur',
                context: [
                    'driver_id' => $tx->driver_id,
                    'payment_id' => $tx->payment_id,
                    'metadata' => ['wallet_transaction_id' => $tx->id],
                    'occurred_at' => $tx->created_at,
                ],
                lines: [
                    $this->line(self::ACC_DRIVER_WALLET, 'Solde wallet livreur', 'debit', $amount, $driver, $platform),
                    $this->line(self::ACC_PLATFORM_CASH, 'Tresorerie AirMess', 'credit', $amount, $platform, $driver),
                ],
            ),
            default => $this->recordJournal(
                idempotencyKey: "driver-wallet:{$tx->id}",
                eventType: $event,
                description: 'Mouvement wallet livreur',
                context: [
                    'driver_id' => $tx->driver_id,
                    'course_id' => $tx->course_id,
                    'payment_id' => $tx->payment_id,
                    'metadata' => ['wallet_transaction_id' => $tx->id, 'type' => $tx->type],
                    'occurred_at' => $tx->created_at,
                ],
                lines: $tx->amount_fcfa > 0
                    ? [
                        $this->line(self::ACC_PLATFORM_CASH, 'Tresorerie AirMess', 'debit', $amount, $platform, $driver),
                        $this->line(self::ACC_DRIVER_WALLET, 'Solde wallet livreur', 'credit', $amount, $driver, $platform),
                    ]
                    : [
                        $this->line(self::ACC_DRIVER_WALLET, 'Solde wallet livreur', 'debit', $amount, $driver, $platform),
                        $this->line(self::ACC_PLATFORM_CASH, 'Tresorerie AirMess', 'credit', $amount, $platform, $driver),
                    ],
            ),
        };
    }

    public function recordUserWalletTransaction(UserWalletTransaction $tx): AccountingJournal
    {
        $amount = abs((int) $tx->amount_fcfa);
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Accounting amount must be positive.');
        }

        $user = ['type' => 'user', 'id' => (int) $tx->user_id];
        $platform = ['type' => 'platform', 'id' => null];
        $event = 'user_wallet.' . $tx->type;

        return match ($tx->type) {
            UserWalletTransaction::TYPE_DEPOSIT => $this->recordJournal(
                idempotencyKey: "user-wallet:{$tx->id}",
                eventType: $event,
                description: 'Recharge wallet utilisateur',
                context: [
                    'user_id' => $tx->user_id,
                    'course_id' => $tx->course_id,
                    'payment_id' => $tx->payment_id,
                    'metadata' => ['user_wallet_transaction_id' => $tx->id],
                    'occurred_at' => $tx->created_at,
                ],
                lines: [
                    $this->line(self::ACC_PLATFORM_CASH, 'Tresorerie AirMess', 'debit', $amount, $platform, $user),
                    $this->line(self::ACC_USER_WALLET, 'Solde wallet utilisateur', 'credit', $amount, $user, $platform),
                ],
            ),
            UserWalletTransaction::TYPE_WITHDRAW => $this->recordJournal(
                idempotencyKey: "user-wallet:{$tx->id}",
                eventType: $event,
                description: 'Retrait wallet utilisateur',
                context: [
                    'user_id' => $tx->user_id,
                    'metadata' => ['user_wallet_transaction_id' => $tx->id],
                    'occurred_at' => $tx->created_at,
                ],
                lines: [
                    $this->line(self::ACC_USER_WALLET, 'Solde wallet utilisateur', 'debit', $amount, $user, $platform),
                    $this->line(self::ACC_PLATFORM_CASH, 'Tresorerie AirMess', 'credit', $amount, $platform, $user),
                ],
            ),
            UserWalletTransaction::TYPE_COURSE_CHARGE => $this->recordJournal(
                idempotencyKey: "user-wallet:{$tx->id}",
                eventType: $event,
                description: 'Frais de livraison payes depuis wallet',
                context: [
                    'user_id' => $tx->user_id,
                    'course_id' => $tx->course_id,
                    'metadata' => ['user_wallet_transaction_id' => $tx->id],
                    'occurred_at' => $tx->created_at,
                ],
                lines: [
                    $this->line(self::ACC_USER_WALLET, 'Solde wallet utilisateur', 'debit', $amount, $user, $platform),
                    $this->line(self::ACC_PLATFORM_REVENUE, 'Revenus AirMess', 'credit', $amount, $platform, $user),
                ],
            ),
            UserWalletTransaction::TYPE_COLLECTION_CREDIT => $this->recordJournal(
                idempotencyKey: "user-wallet:{$tx->id}",
                eventType: $event,
                description: 'Reversement encaissement colis au marchand',
                context: [
                    'user_id' => $tx->user_id,
                    'course_id' => $tx->course_id,
                    'metadata' => ['user_wallet_transaction_id' => $tx->id],
                    'occurred_at' => $tx->created_at,
                ],
                lines: [
                    $this->line(self::ACC_MERCHANT_PAYABLE, 'Dette envers marchand', 'debit', $amount, $user, $platform),
                    $this->line(self::ACC_USER_WALLET, 'Solde wallet utilisateur', 'credit', $amount, $user, $platform),
                ],
            ),
            default => $this->recordJournal(
                idempotencyKey: "user-wallet:{$tx->id}",
                eventType: $event,
                description: 'Mouvement wallet utilisateur',
                context: [
                    'user_id' => $tx->user_id,
                    'course_id' => $tx->course_id,
                    'payment_id' => $tx->payment_id,
                    'metadata' => ['user_wallet_transaction_id' => $tx->id, 'type' => $tx->type],
                    'occurred_at' => $tx->created_at,
                ],
                lines: $tx->amount_fcfa > 0
                    ? [
                        $this->line(self::ACC_PLATFORM_CASH, 'Tresorerie AirMess', 'debit', $amount, $platform, $user),
                        $this->line(self::ACC_USER_WALLET, 'Solde wallet utilisateur', 'credit', $amount, $user, $platform),
                    ]
                    : [
                        $this->line(self::ACC_USER_WALLET, 'Solde wallet utilisateur', 'debit', $amount, $user, $platform),
                        $this->line(self::ACC_PLATFORM_CASH, 'Tresorerie AirMess', 'credit', $amount, $platform, $user),
                    ],
            ),
        };
    }

    public function recordRecipientPaidDelivery(Course $course, Driver $driver, PlatformEarning $earning): AccountingJournal
    {
        $amount = (int) $earning->amount_fcfa;
        $driverHolder = ['type' => 'driver', 'id' => (int) $driver->id];
        $platform = ['type' => 'platform', 'id' => null];

        return $this->recordJournal(
            idempotencyKey: "recipient-paid-delivery:{$course->id}",
            eventType: 'course.recipient_paid_delivery',
            description: 'Frais de livraison collectes par le livreur chez le destinataire',
            context: [
                'course_id' => $course->id,
                'driver_id' => $driver->id,
                'user_id' => $course->sender_id,
                'metadata' => [
                    'platform_earning_id' => $earning->id,
                    'delivery_fee_paid_by' => $course->delivery_fee_paid_by,
                ],
                'occurred_at' => $earning->created_at,
            ],
            lines: [
                $this->line(self::ACC_DRIVER_CASH_DUE, 'Cash livreur a regulariser', 'debit', $amount, $driverHolder, $platform),
                $this->line(self::ACC_PLATFORM_REVENUE, 'Revenus AirMess', 'credit', $amount, $platform, $driverHolder),
            ],
        );
    }

    public function recordPackagePickedUp(Course $course, Driver $driver): CourseCustodyEvent
    {
        return $this->recordCustodyEvent(
            idempotencyKey: "package-picked-up:{$course->id}",
            eventType: 'package.picked_up',
            assetType: CourseCustodyEvent::ASSET_PACKAGE,
            course: $course,
            driver: $driver,
            from: ['type' => 'user', 'id' => $course->sender_id],
            to: ['type' => 'driver', 'id' => $driver->id],
            amount: null,
            metadata: ['status' => Course::STATUS_PICKED_UP],
        );
    }

    public function recordPackageDelivered(Course $course, Driver $driver): CourseCustodyEvent
    {
        return $this->recordCustodyEvent(
            idempotencyKey: "package-delivered:{$course->id}",
            eventType: 'package.delivered',
            assetType: CourseCustodyEvent::ASSET_PACKAGE,
            course: $course,
            driver: $driver,
            from: ['type' => 'driver', 'id' => $driver->id],
            to: ['type' => 'recipient', 'id' => null],
            amount: null,
            metadata: ['status' => Course::STATUS_DELIVERED],
        );
    }

    public function recordRecipientCashCollected(Course $course, Driver $driver): void
    {
        if ($course->delivery_fee_paid_by === Course::PAID_BY_RECIPIENT && (int) $course->delivery_fee > 0) {
            $this->recordCustodyEvent(
                idempotencyKey: "cash-delivery-fee-collected:{$course->id}",
                eventType: 'cash.delivery_fee_collected',
                assetType: CourseCustodyEvent::ASSET_CASH_DELIVERY_FEE,
                course: $course,
                driver: $driver,
                from: ['type' => 'recipient', 'id' => null],
                to: ['type' => 'driver', 'id' => $driver->id],
                amount: (int) $course->delivery_fee,
                metadata: ['paid_by' => Course::PAID_BY_RECIPIENT],
            );
        }

        if ($course->has_collection && (int) $course->collection_amount > 0) {
            $this->recordCustodyEvent(
                idempotencyKey: "cash-collection-collected:{$course->id}",
                eventType: 'cash.collection_collected',
                assetType: CourseCustodyEvent::ASSET_CASH_COLLECTION,
                course: $course,
                driver: $driver,
                from: ['type' => 'recipient', 'id' => null],
                to: ['type' => 'driver', 'id' => $driver->id],
                amount: (int) $course->collection_amount,
                metadata: ['merchant_user_id' => $course->sender_id],
            );
        }
    }

    private function recordJournal(
        string $idempotencyKey,
        string $eventType,
        ?string $description,
        array $context,
        array $lines,
    ): AccountingJournal {
        return DB::transaction(function () use ($idempotencyKey, $eventType, $description, $context, $lines) {
            $existing = AccountingJournal::where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return $existing;
            }

            $journal = AccountingJournal::create([
                'event_type' => $eventType,
                'description' => $description,
                'course_id' => $context['course_id'] ?? null,
                'payment_id' => $context['payment_id'] ?? null,
                'wallet_withdraw_request_id' => $context['wallet_withdraw_request_id'] ?? null,
                'driver_id' => $context['driver_id'] ?? null,
                'user_id' => $context['user_id'] ?? null,
                'admin_id' => $context['admin_id'] ?? null,
                'idempotency_key' => $idempotencyKey,
                'metadata' => $context['metadata'] ?? null,
                'occurred_at' => $context['occurred_at'] ?? now(),
            ]);

            foreach ($lines as $line) {
                $journal->lines()->create($line);
            }

            return $journal;
        });
    }

    private function recordCustodyEvent(
        string $idempotencyKey,
        string $eventType,
        string $assetType,
        Course $course,
        Driver $driver,
        array $from,
        array $to,
        ?int $amount,
        array $metadata = [],
    ): CourseCustodyEvent {
        return CourseCustodyEvent::firstOrCreate(
            ['idempotency_key' => $idempotencyKey],
            [
                'course_id' => $course->id,
                'event_type' => $eventType,
                'asset_type' => $assetType,
                'from_holder_type' => $from['type'] ?? null,
                'from_holder_id' => $from['id'] ?? null,
                'to_holder_type' => $to['type'] ?? null,
                'to_holder_id' => $to['id'] ?? null,
                'driver_id' => $driver->id,
                'user_id' => $course->sender_id,
                'amount_fcfa' => $amount,
                'metadata' => $metadata,
                'occurred_at' => now(),
            ],
        );
    }

    private function line(
        string $accountCode,
        string $accountName,
        string $direction,
        int $amount,
        array $holder,
        array $counterparty,
        array $metadata = [],
    ): array {
        return [
            'account_code' => $accountCode,
            'account_name' => $accountName,
            'direction' => $direction,
            'amount_fcfa' => $amount,
            'holder_type' => $holder['type'] ?? null,
            'holder_id' => $holder['id'] ?? null,
            'counterparty_type' => $counterparty['type'] ?? null,
            'counterparty_id' => $counterparty['id'] ?? null,
            'metadata' => $metadata ?: null,
        ];
    }
}
