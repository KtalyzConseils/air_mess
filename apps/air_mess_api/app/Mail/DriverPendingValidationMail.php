<?php

namespace App\Mail;

use App\Models\Driver;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Notification email envoyée aux admins super + ops à chaque nouvelle inscription de driver.
 */
class DriverPendingValidationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Driver $driver)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '🆕 Nouveau livreur à valider — ' . $this->driver->first_name . ' ' . $this->driver->last_name,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.driver-pending-validation',
            with: [
                'driver'      => $this->driver,
                'frontendUrl' => config('app.frontend_url'),
            ],
        );
    }
}
