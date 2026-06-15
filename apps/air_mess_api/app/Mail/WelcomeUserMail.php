<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeUserMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user)
    {
    }

    public function envelope(): Envelope
    {
        $isMarchant = $this->user->isMarchant();
        return new Envelope(
            subject: $isMarchant
                ? '🎉 Bienvenue chez Air Mess — votre compte marchand est créé'
                : '🎉 Bienvenue chez Air Mess',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.welcome-user',
            with: [
                'user'        => $this->user,
                'isMarchant'  => $this->user->isMarchant(),
                'frontendUrl' => config('app.frontend_url'),
            ],
        );
    }
}
