<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\Course;
use App\Models\Driver;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Logique de création + dispatch d'une course pour le endpoint d'intégration
 * externe (IntegrationCourseController@store).
 *
 * Regroupe : calcul du tarif, génération des identifiants (référence, token de
 * tracking, codes), et push aux livreurs disponibles autour du point de retrait.
 * Le paiement (hold wallet) est orchestré par le contrôleur appelant.
 */
class CourseCreationService
{
    public function __construct(private NotificationService $notifier) {}

    /**
     * Tarif forfaitaire selon l'urgence + part livreur.
     *
     * @return array{delivery_fee:int, driver_earnings:int}
     */
    public function pricing(string $urgency = 'standard'): array
    {
        $isExpress = $urgency === 'express';
        $deliveryFee = (int) AppSetting::get(
            $isExpress ? 'express_delivery_fee_fcfa' : 'standard_delivery_fee_fcfa',
            $isExpress ? 2500 : 1500,
        );
        $driverPercent = (int) AppSetting::get('driver_commission_percent', 75);

        return [
            'delivery_fee'    => $deliveryFee,
            'driver_earnings' => (int) round($deliveryFee * $driverPercent / 100),
        ];
    }

    /**
     * Persiste la course + ses identifiants (référence, token, codes).
     *
     * @param array $attributes Champs métier déjà validés (origine, destination,
     *                          colis…). Les identifiants et le sender sont posés ici.
     * @param array $overrides  Surcharges (status, source, external_reference,
     *                          delivery_fee, driver_earnings…).
     */
    public function persist(User $sender, array $attributes, array $overrides = []): Course
    {
        // Crée uniquement la course + ses identifiants. Le paiement (hold wallet)
        // et le push livreurs sont orchestrés par l'appelant.
        return Course::create(array_merge($attributes, [
            'sender_id'      => $sender->id,
            'reference'      => $this->generateReference(),
            'tracking_token' => Str::random(10),
            'pickup_code'    => Course::generateCode(),
            'delivery_code'  => Course::generateCode(),
        ], $overrides));
    }

    /**
     * Push aux livreurs disponibles dans un rayon autour du RETRAIT.
     * Sans coordonnées d'origine (course en attente de géoloc), on ne pousse pas.
     */
    public function dispatchToAvailableDrivers(Course $course, float $radiusKm = 8.0): void
    {
        if ($course->origin_lat === null || $course->origin_lng === null) {
            return;
        }

        $driverUserIds = Driver::availableNear($course->origin_lat, $course->origin_lng, $radiusKm)
            ->pluck('user_id')
            ->toArray();

        if (empty($driverUserIds)) {
            return;
        }

        $title = $course->urgency === 'express' ? '⚡ Course Express' : '📦 Nouvelle course';
        $body  = "{$course->origin_quartier} → " . ($course->destination_quartier ?? 'destination à confirmer')
               . " · {$course->driver_earnings} FCFA";

        $this->notifier->sendToUsers(
            $driverUserIds,
            'course.offered',
            $title,
            $body,
            ['reference' => $course->reference],
            $course->id,
        );
    }

    /**
     * Référence unique du type AM-2026-00001.
     */
    public function generateReference(): string
    {
        $year = now()->format('Y');
        $count = Course::whereYear('created_at', $year)->count() + 1;

        do {
            $ref = sprintf('AM-%s-%05d', $year, $count++);
        } while (Course::where('reference', $ref)->exists());

        return $ref;
    }
}
