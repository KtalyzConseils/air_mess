<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class QuickRegistrationCodeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $code,
        public string $displayName,
        public int $expiresInMinutes = 10,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Code de confirmation Air Mess',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.quick-registration-code',
            with: [
                'code'             => $this->code,
                'displayName'      => $this->displayName,
                'expiresInMinutes' => $this->expiresInMinutes,
                'preheader'        => "Votre code Air Mess est {$this->code}.",
            ],
        );
    }
}
