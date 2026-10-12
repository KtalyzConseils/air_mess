<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DriverRejectedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $driverName,
        public string $reason,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre candidature livreur Air Mess',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.driver-rejected',
            with: [
                'user' => $this->user,
                'driverName' => $this->driverName,
                'reason' => $this->reason,
                'frontendUrl' => config('app.frontend_url'),
            ],
        );
    }
}
