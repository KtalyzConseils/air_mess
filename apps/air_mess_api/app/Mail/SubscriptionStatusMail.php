<?php

namespace App\Mail;

use App\Models\Individual;
use App\Models\Marchant;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubscriptionStatusMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param Marchant|Individual $profile  Le profil concerné (marchand ou particulier)
     * @param 'reminder'|'expired' $type
     * @param int|null $daysRemaining nombre de jours restants (null si déjà expiré)
     */
    public function __construct(
        public Marchant|Individual $profile,
        public string $type,
        public ?int $daysRemaining = null,
    ) {
    }

    public function envelope(): Envelope
    {
        if ($this->type === 'expired') {
            return new Envelope(subject: '🚫 Votre abonnement Air Mess a expiré');
        }

        $label = $this->daysRemaining === 1
            ? 'demain'
            : "dans {$this->daysRemaining} jours";

        return new Envelope(subject: "⏰ Votre abonnement Air Mess expire {$label}");
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.subscription-status',
            with: [
                'profile'       => $this->profile,
                'isMarchant'    => $this->profile instanceof Marchant,
                'displayName'   => $this->profile instanceof Marchant
                    ? $this->profile->raison_sociale
                    : trim("{$this->profile->first_name} {$this->profile->last_name}"),
                'type'          => $this->type,
                'daysRemaining' => $this->daysRemaining,
                'frontendUrl'   => config('app.frontend_url'),
            ],
        );
    }
}
