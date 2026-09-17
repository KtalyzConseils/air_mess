<?php

namespace App\Mail;

use App\Models\DriverWaitlist;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DriverWaitlistNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public DriverWaitlist $waitlist)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Nouvelle réponse au formulaire livreur — #' . $this->waitlist->id,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.driver-waitlist-notification',
            with: [
                'waitlist' => $this->waitlist,
            ],
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(
                fn () => $this->buildCsv(),
                'driver-waitlist-' . $this->waitlist->id . '.csv',
            )->withMime('text/csv'),
        ];
    }

    private function buildCsv(): string
    {
        $fields = [
            'id' => 'id',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
            'full_name' => 'full_name',
            'email' => 'email',
            'whatsapp' => 'whatsapp',
            'vehicle_type' => 'vehicle_type',
            'zone' => 'zone',
            'zone_other' => 'zone_other',
            'experience' => 'experience',
            'availability' => 'availability',
            'source' => 'source',
            'source_other' => 'source_other',
            'platforms_used' => 'platforms_used',
            'platforms_used_other' => 'platforms_used_other',
            'weekly_deliveries' => 'weekly_deliveries',
            'weekly_income' => 'weekly_income',
            'problems' => 'problems',
            'problems_other' => 'problems_other',
            'worst_experience' => 'worst_experience',
            'expected_payment_model' => 'expected_payment_model',
            'expected_weekly_income' => 'expected_weekly_income',
            'mobile_money_trust' => 'mobile_money_trust',
            'interest_level' => 'interest_level',
            'launch_availability' => 'launch_availability',
            'status' => 'status',
            'ip_address' => 'ip_address',
        ];

        $stream = fopen('php://temp', 'r+');
        fwrite($stream, "\xEF\xBB\xBF");
        fputcsv($stream, array_keys($fields), ';');
        fputcsv($stream, array_map(
            fn (string $field) => $this->formatValue($this->waitlist->{$field}),
            array_values($fields),
        ), ';');
        rewind($stream);
        $csv = stream_get_contents($stream);
        fclose($stream);

        return $csv;
    }

    private function formatValue(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d H:i:s');
        }

        if (is_array($value)) {
            return implode(' | ', array_map(fn ($item) => $this->formatValue($item), $value));
        }

        return (string) $value;
    }
}
