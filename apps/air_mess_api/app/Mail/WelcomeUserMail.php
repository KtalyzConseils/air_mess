<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeUserMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public User $user)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: match (true) {
                $this->user->isMarchant() => '🎉 Bienvenue chez Air Mess — votre compte marchand est créé',
                $this->user->isDriver()   => '🛵 Bienvenue chez Air Mess — vos documents sont en cours de vérification',
                default                   => '🎉 Bienvenue chez Air Mess',
            },
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.welcome-user',
            with: [
                'user'        => $this->user,
                'isMarchant'  => $this->user->isMarchant(),
                'isDriver'    => $this->user->isDriver(),
                'frontendUrl' => config('app.frontend_url'),
            ],
        );
    }
}
