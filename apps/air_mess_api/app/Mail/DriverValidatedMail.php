<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Email envoyé au driver une fois que ses documents ont été validés par un admin.
 */
class DriverValidatedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public User $user)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '✅ Votre compte livreur RMess est activé',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.driver-validated',
            with: [
                'user'        => $this->user,
                'driver'      => $this->user->driver,
                'frontendUrl' => config('app.frontend_url'),
            ],
        );
    }
}
