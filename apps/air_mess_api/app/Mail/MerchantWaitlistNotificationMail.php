<?php

namespace App\Mail;

use App\Models\MerchantWaitlist;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MerchantWaitlistNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public MerchantWaitlist $waitlist)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Nouvelle réponse au formulaire commerçant — #' . $this->waitlist->id,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.merchant-waitlist-notification',
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
                'merchant-waitlist-' . $this->waitlist->id . '.csv',
            )->withMime('text/csv'),
        ];
    }

    private function buildCsv(): string
    {
        $fields = [
            'id' => 'id',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
            'email' => 'email',
            'shop_name' => 'shop_name',
            'contact_name' => 'contact_name',
            'whatsapp' => 'whatsapp',
            'commerce_type' => 'commerce_type',
            'commerce_type_other' => 'commerce_type_other',
            'zone' => 'zone',
            'zone_other' => 'zone_other',
            'weekly_orders' => 'weekly_orders',
            'source' => 'source',
            'source_other' => 'source_other',
            'delivery_methods' => 'delivery_methods',
            'delivery_methods_other' => 'delivery_methods_other',
            'problems' => 'problems',
            'problems_other' => 'problems_other',
            'worst_experience' => 'worst_experience',
            'cash_collection_issue' => 'cash_collection_issue',
            'time_lost_weekly' => 'time_lost_weekly',
            'orders_lost_weekly' => 'orders_lost_weekly',
            'expected_benefit' => 'expected_benefit',
            'commission_acceptance' => 'commission_acceptance',
            'reasonable_fee' => 'reasonable_fee',
            'mobile_money_trust' => 'mobile_money_trust',
            'interest_level' => 'interest_level',
            'trial_interest' => 'trial_interest',
            'status' => 'status',
            'bonus_amount' => 'bonus_amount',
            'bonus_code' => 'bonus_code',
            'bonus_redeemed_at' => 'bonus_redeemed_at',
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
