<?php

namespace App\Mail;

use App\Models\Marchant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class QuotaAlertMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param 'warning'|'reached' $level
     */
    public function __construct(
        public Marchant $marchant,
        public string $level,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->level === 'reached'
                ? '🚫 Votre quota mensuel est atteint — RMess'
                : '⚠️ Vous avez utilisé 80% de votre quota — RMess',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.quota-alert',
            with: [
                'marchant'    => $this->marchant,
                'level'       => $this->level,
                'used'        => $this->marchant->monthly_courses_used,
                'limit'       => $this->marchant->monthlyCoursesLimit(),
                'frontendUrl' => config('app.frontend_url'),
            ],
        );
    }
}
