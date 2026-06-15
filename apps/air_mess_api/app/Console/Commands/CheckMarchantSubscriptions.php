<?php

namespace App\Console\Commands;

use App\Models\Individual;
use App\Models\Marchant;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class CheckMarchantSubscriptions extends Command
{
    protected $signature = 'subscription:check';
    protected $description = 'Vérifie les abonnements (marchands + particuliers), envoie les rappels et expire ceux arrivés à terme.';

    public function handle(NotificationService $notifier): int
    {
        $stats = ['reminded' => 0, 'expired' => 0, 'churned' => 0];

        // On traite chaque type avec la MÊME logique en lui passant la classe.
        $this->processType(Marchant::class, $stats, $notifier);
        $this->processType(Individual::class, $stats, $notifier);

        $this->info("✓ Rappels envoyés : {$stats['reminded']}");
        $this->info("✓ Abos expirés : {$stats['expired']}");
        $this->info("✓ Profils churned : {$stats['churned']}");

        Log::info('subscription:check terminée', $stats);

        return Command::SUCCESS;
    }

    /**
     * Logique commune appliquée à Marchant OU Individual.
     *
     * @param  class-string  $modelClass
     */
    private function processType(string $modelClass, array &$stats, NotificationService $notifier): void
    {
        $now = now();

        // 1. Rappels J-7 / J-3 / J-1
        foreach ([7, 3, 1] as $days) {
            $deadline = $now->copy()->addDays($days)->startOfDay();
            /** @var Builder $q */
            $q = $modelClass::query()
                ->where('subscription_status', 'active')
                ->whereDate('subscription_next_billing_at', $deadline);

            foreach ($q->get() as $profile) {
                $alreadySent = \App\Models\Notification::where('user_id', $profile->user_id)
                    ->where('type', 'subscription.reminder')
                    ->whereDate('created_at', today())
                    ->exists();
                if ($alreadySent) continue;

                $label = $days === 1 ? 'demain' : "dans {$days} jours";
                $notifier->sendToUser(
                    $profile->user_id,
                    'subscription.reminder',
                    "⏰ Abo expire {$label}",
                    "Renouvelle dès maintenant pour éviter l'interruption du service.",
                    ['days_remaining' => $days, 'plan' => $profile->subscription_plan],
                );

                $this->sendEmailSafely($profile, 'reminder', $days);
                $stats['reminded']++;
            }
        }

        // 2. Expiration : actifs dont l'échéance est passée
        $toExpire = $modelClass::query()
            ->where('subscription_status', 'active')
            ->where('subscription_next_billing_at', '<=', $now)
            ->get();

        foreach ($toExpire as $profile) {
            $profile->update(['subscription_status' => 'expired']);

            // Message adapté : un marchand est BLOQUÉ, un particulier retombe sur le quota gratuit
            $isMarchant = $profile instanceof Marchant;
            $body = $isMarchant
                ? 'Votre abonnement a expiré. Renouvelez pour continuer à créer des courses.'
                : 'Votre abonnement a expiré. Vous gardez vos courses gratuites mensuelles ; au-delà, paiement à la course.';

            $notifier->sendToUser(
                $profile->user_id,
                'subscription.expired',
                '🚫 Abonnement expiré',
                $body,
                ['plan' => $profile->subscription_plan],
            );

            $this->sendEmailSafely($profile, 'expired');
            $stats['expired']++;
        }

        // 3. Churn : expirés depuis plus de 10 jours
        $churnThreshold = $now->copy()->subDays(10);
        $toChurn = $modelClass::query()
            ->where('subscription_status', 'expired')
            ->where('subscription_next_billing_at', '<', $churnThreshold)
            ->get();

        foreach ($toChurn as $profile) {
            $profile->update(['subscription_status' => 'churned']);
            $stats['churned']++;
        }
    }

    /**
     * Envoie un email d'état d'abo (best-effort).
     * Le Mailable accepte indifféremment un Marchant ou un Individual via $profile.
     */
    private function sendEmailSafely(Marchant|Individual $profile, string $type, ?int $days = null): void
    {
        try {
            Mail::to($profile->user->email)
                ->send(new \App\Mail\SubscriptionStatusMail($profile, $type, $days));
        } catch (\Throwable $e) {
            Log::warning('SubscriptionStatusMail failed', [
                'err'    => $e->getMessage(),
                'type'   => $type,
                'profile'=> get_class($profile) . '#' . $profile->id,
            ]);
        }
    }
}
