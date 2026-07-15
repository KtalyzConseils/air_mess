<?php

namespace App\Services;

use App\Models\WalletWithdrawRequest;
use Illuminate\Support\Facades\Log;

/**
 * Initie le payout Fedapay pour une demande de retrait approuvée.
 *
 * Extrait d'AdminController pour être réutilisable depuis DriverController
 * en mode `driver_payout_mode = instant` (le driver déclenche lui-même
 * l'appel Fedapay depuis l'app, sans passer par un admin).
 *
 * Idempotent : si le payout a déjà été initié avec succès (payout_initiated_at
 * ET pas de payout_failed_at), la méthode est no-op — le webhook Fedapay se
 * chargera de la transition finale (paid_at / status=failed).
 *
 * Ne pas appeler dans une transaction DB : l'appel Fedapay peut prendre plusieurs
 * secondes et on ne veut pas tenir un lock pendant ce temps.
 */
class WalletWithdrawPayoutInitiator
{
    public function __construct(
        private FedapayService $fedapay,
    ) {}

    public function initiate(WalletWithdrawRequest $withdraw): void
    {
        // Idempotence : un payout en cours (initié sans échec récent) n'est pas relancé
        if ($withdraw->payout_initiated_at && ! $withdraw->payout_failed_at) {
            return;
        }
        // Bank pas encore supporté par Fedapay Payout API → l'admin fera le virement manuel
        if ($withdraw->target_method !== WalletWithdrawRequest::METHOD_MOMO) {
            return;
        }

        // Coordonnées Fedapay adaptées au propriétaire (driver ou user marchand/particulier).
        if ($withdraw->isForDriver()) {
            $customer = [
                'email'     => $withdraw->driver->user->email ?? null,
                'firstname' => $withdraw->driver->first_name,
                'lastname'  => $withdraw->driver->last_name,
            ];
            $description = "Air Mess — Retrait caution #{$withdraw->id}";
        } else {
            $u = $withdraw->user;
            $customer = [
                'email'     => $u->email ?? null,
                'firstname' => $u->name,
            ];
            $description = "Air Mess — Retrait wallet #{$withdraw->id}";
        }

        try {
            $payout = $this->fedapay->createPayout(
                amountFcfa:    $withdraw->amount_fcfa,
                mode:          'mtn', // sandbox accepte 'mtn' pour tester
                accountNumber: $withdraw->target_account,
                customer:      $customer,
                description:   $description,
            );

            $withdraw->update([
                'payout_initiated_at'    => now(),
                'payout_provider_ref'    => $payout['id'],
                'payout_failed_at'       => null, // efface un éventuel échec précédent (retentative)
                'payout_failure_reason'  => null,
            ]);
        } catch (\Throwable $e) {
            Log::warning('FedaPay payout initiation failed', [
                'withdraw_id' => $withdraw->id,
                'error'       => $e->getMessage(),
            ]);
            $withdraw->update([
                'payout_failed_at'      => now(),
                'payout_failure_reason' => $e->getMessage(),
            ]);
        }
    }
}
