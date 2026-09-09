<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WaitlistOpenedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Airmess est opérationnel — votre accès est ouvert');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.waitlist-opened',
            with: ['frontendUrl' => config('app.frontend_url')],
        );
    }
}
