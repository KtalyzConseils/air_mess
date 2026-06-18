<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MarchantValidatedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public User $user)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '✅ Votre compte marchand RMess est activé',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.marchant-validated',
            with: [
                'user'        => $this->user,
                'marchant'    => $this->user->marchant,
                'frontendUrl' => config('app.frontend_url'),
            ],
        );
    }
}
