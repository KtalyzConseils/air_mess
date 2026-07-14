<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Envoi de SMS transactionnels via l'API Brevo (même clé que le mailer brevo+api).
 *
 * NB : branche actuellement dormante — l'option "réponse par SMS" est affichée
 * "bientôt disponible" côté front. À l'activation : prévoir des crédits SMS et
 * un sender ID validé dans le compte Brevo (BREVO_SMS_SENDER).
 */
class BrevoSmsService
{
    private const ENDPOINT = 'https://api.brevo.com/v3/transactionalSMS/sms';

    /**
     * Envoie un SMS transactionnel. Best-effort : log + false en cas d'échec,
     * ne lève jamais (même contrat que les envois mail du projet).
     *
     * @param string $phoneE164 numéro au format E.164 (ex. +2290190123456)
     */
    public function send(string $phoneE164, string $content): bool
    {
        // Mode local/test : pas d'appel réseau, le SMS part dans le log.
        if (config('services.brevo.sms_fake')) {
            Log::info('[FAKE SMS]', ['to' => $phoneE164, 'content' => $content]);

            return true;
        }

        try {
            $response = Http::withHeaders(['api-key' => config('services.brevo.key')])
                ->post(self::ENDPOINT, [
                    'type'      => 'transactional',
                    'sender'    => config('services.brevo.sms_sender'),
                    // Brevo attend le numéro international sans le "+"
                    'recipient' => ltrim($phoneE164, '+'),
                    'content'   => $content,
                ]);

            if (! $response->successful()) {
                Log::warning('Brevo SMS failed', [
                    'to'     => $phoneE164,
                    'status' => $response->status(),
                    'body'   => $response->json(),
                ]);
            }

            return $response->successful();
        } catch (\Throwable $e) {
            Log::warning('Brevo SMS exception', ['to' => $phoneE164, 'err' => $e->getMessage()]);

            return false;
        }
    }
}
