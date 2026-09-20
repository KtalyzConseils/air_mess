<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PublicWaitlistReadyMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $name, public string $kind, public string $activationToken) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Airmess est prêt — créez votre compte');
    }

    public function content(): Content
    {
        $path = $this->kind === 'driver' ? '/register/driver' : '/register?type=marchant';
        $separator = str_contains($path, '?') ? '&' : '?';

        return new Content(view: 'emails.public-waitlist-ready', with: [
            'name' => $this->name,
            'kind' => $this->kind,
            'registrationUrl' => rtrim(config('app.frontend_url'), '/') . $path . $separator . 'activation=' . urlencode($this->activationToken),
        ]);
    }
}
