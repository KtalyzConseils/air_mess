<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Marchant;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CourseBillingService
{
    public function __construct(
        private FedapayService $fedapay,
    ) {}

    /**
     * Envoie une notif de quota au marchand si on vient de franchir 80% ou 100%.
     * Idempotent : utilise les data de notification (type) pour éviter le spam si la notif
     * a déjà été envoyée dans la période en cours.
     */
    public function sendQuotaAlertsIfNeeded(Marchant $marchant, NotificationService $notifier): void
    {
        $ratio = $marchant->quotaUsageRatio();
        $used  = $marchant->monthly_courses_used;
        $limit = $marchant->monthlyCoursesLimit();

        if ($limit === 0) return;

        // À 100%, on prévient à chaque dépassement (pour rappeler l'upgrade)
        if ($ratio >= 1.0) {
            $notifier->sendToUser(
                $marchant->user_id,
                'subscription.quota_reached',
                '🚫 Quota mensuel atteint',
                "Vous avez utilisé {$used}/{$limit} courses. Passez à un plan supérieur pour continuer.",
                ['used' => $used, 'limit' => $limit],
            );
            $this->sendQuotaEmail($marchant, 'reached');
            return;
        }

        // À 80%, on prévient une seule fois par période
        if ($ratio >= 0.8) {
            $alreadyNotified = \App\Models\Notification::where('user_id', $marchant->user_id)
                ->where('type', 'subscription.quota_warning')
                ->where('created_at', '>=', $marchant->monthly_period_started_at ?? now()->startOfMonth())
                ->exists();

            if (! $alreadyNotified) {
                $notifier->sendToUser(
                    $marchant->user_id,
                    'subscription.quota_warning',
                    '⚠️ 80 % du quota atteint',
                    "Il vous reste " . max(0, $limit - $used) . " courses ce mois. Envisagez un upgrade.",
                    ['used' => $used, 'limit' => $limit],
                );
                $this->sendQuotaEmail($marchant, 'warning');
            }
        }
    }

    private function sendQuotaEmail(Marchant $marchant, string $level): void
    {
        try {
            \Illuminate\Support\Facades\Mail::to($marchant->user->email)
                ->send(new \App\Mail\QuotaAlertMail($marchant, $level));
        } catch (\Throwable $e) {
            Log::warning('QuotaAlertMail failed', [
                'err' => $e->getMessage(),
                'marchant_id' => $marchant->id,
                'level' => $level,
            ]);
        }
    }

    /**
     * Démarre un checkout Fedapay pour une course one-shot (particulier au-delà du quota).
     * On stocke le payload complet dans `Payment.metadata` ; le webhook créera la course
     * une fois le paiement confirmé.
     */
    public function initiateOneShotCheckout(
        User $user,
        array $coursePayload,
        int $deliveryFee,
        int $driverEarnings,
    ): JsonResponse {
        $callbackUrl = $coursePayload['callback_url'] ?? null;
        if (! $callbackUrl) {
            return response()->json([
                'message'         => 'Quota mensuel atteint. Le paiement à la course nécessite un callback_url.',
                'payment_required'=> true,
            ], 402);
        }
        unset($coursePayload['callback_url']);

        // Création du Payment AVANT Fedapay (trace)
        $payment = Payment::create([
            'user_id'     => $user->id,
            'type'        => Payment::TYPE_DELIVERY_FEE,
            'amount_fcfa' => $deliveryFee,
            'currency'    => 'XOF',
            'status'      => Payment::STATUS_PENDING,
            'provider'    => Payment::PROVIDER_FEDAPAY,
            'description' => "Course one-shot — {$coursePayload['destination_quartier']}",
            'metadata'    => [
                'course_payload'  => $coursePayload,
                'delivery_fee'    => $deliveryFee,
                'driver_earnings' => $driverEarnings,
            ],
        ]);

        try {
            $checkout = $this->fedapay->createCheckout(
                amountFcfa: $deliveryFee,
                description: "RMess — Course vers {$coursePayload['destination_quartier']}",
                customer: [
                    'email'     => $user->email,
                    'firstname' => $user->name,
                    'phone'     => $user->phone,
                ],
                callbackUrl: $callbackUrl,
            );
        } catch (\Throwable $e) {
            $payment->update([
                'status'         => Payment::STATUS_FAILED,
                'failure_reason' => $e->getMessage(),
            ]);
            Log::error('One-shot checkout failed', ['err' => $e->getMessage()]);
            return response()->json(['message' => 'Impossible de créer le paiement.'], 502);
        }

        $payment->update([
            'provider_ref' => $checkout['transaction_id'],
            'status'       => Payment::STATUS_PROCESSING,
        ]);

        return response()->json([
            'payment_required' => true,
            'payment_id'       => $payment->id,
            'checkout_url'     => $checkout['checkout_url'],
            'message'          => 'Quota atteint : paiement requis pour cette course.',
        ], 402);
    }

    /**
     * Finalise une course one-shot après confirmation du paiement par le webhook.
     * Appelé depuis SubscriptionController::webhook pour les Payment de type delivery_fee.
     */
    public function finalizeOneShotCourse(Payment $payment, NotificationService $notifier): ?Course
    {
        $payload = $payment->metadata['course_payload'] ?? null;
        if (! $payload) {
            Log::warning('finalizeOneShotCourse : payload manquant', ['payment_id' => $payment->id]);
            return null;
        }

        $course = DB::transaction(function () use ($payment, $payload) {
            $course = Course::create(array_merge($payload, [
                'sender_id'       => $payment->user_id,
                'status'          => isset($payload['scheduled_for'])
                    ? Course::STATUS_PENDING_PREP
                    : Course::STATUS_AWAITING,
                'delivery_fee'    => $payment->metadata['delivery_fee'],
                'driver_earnings' => $payment->metadata['driver_earnings'],
                'has_collection'  => $payload['has_collection'] ?? false,
                'urgency'         => $payload['urgency'] ?? 'standard',
                'reference'       => $this->generateReference(),
                'tracking_token'  => Str::random(10),
                'pickup_code'     => Course::generateCode(),
                'delivery_code'   => Course::generateCode(),
            ]));

            // Lier le Payment à la course pour la traçabilité
            $payment->update([
                'metadata' => array_merge($payment->metadata, ['course_id' => $course->id]),
            ]);

            // Incrémenter le quota du particulier (sa course payée compte aussi)
            if ($payment->user?->isIndividual()) {
                $payment->user->individual->increment('monthly_courses_used');
            }

            return $course;
        });

        // Notif au sender + push aux livreurs (même logique que store classique)
        $driverUserIds = \App\Models\Driver::availableNear($course->origin_lat, $course->origin_lng, 8.0)
            ->pluck('user_id')
            ->toArray();

        $title = $course->urgency === 'express' ? '⚡ Course Express' : '📦 Nouvelle course';
        $body  = "{$course->origin_quartier} → {$course->destination_quartier} · {$course->driver_earnings} FCFA";

        $notifier->sendToUsers($driverUserIds, 'course.offered', $title, $body,
            ['reference' => $course->reference],
            $course->id,
        );

        $notifier->sendToUser(
            $payment->user_id,
            'course.created',
            '✅ Course créée',
            "Paiement reçu. Votre course {$course->reference} est en recherche de livreur.",
            ['reference' => $course->reference],
            $course->id,
        );

        return $course;
    }

    private function generateReference(): string
    {
        $year = now()->format('Y');
        $count = Course::whereYear('created_at', $year)->count() + 1;
        do {
            $ref = sprintf('AM-%s-%05d', $year, $count++);
        } while (Course::where('reference', $ref)->exists());
        return $ref;
    }
}
