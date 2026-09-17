<?php

namespace App\Console\Commands;

use App\Services\BrevoSmsService;
use Illuminate\Console\Command;

class TestSms extends Command
{
    /**
     * Exemples :
     *   php artisan sms:test +2290190123456
     *   php artisan sms:test +2290190123456 --message="Code test AirMess : 123456"
     */
    protected $signature = 'sms:test
                            {to : Destinataire au format international, ex. +2290190123456}
                            {--message=AirMess : test SMS Brevo. Si vous recevez ce message, la configuration fonctionne. : Contenu du SMS}';

    protected $description = "Envoie un SMS de test via Brevo, ou le log si BREVO_SMS_FAKE=true.";

    public function handle(BrevoSmsService $sms): int
    {
        $to = trim((string) $this->argument('to'));
        $message = trim((string) $this->option('message'));

        if (! preg_match('/^\+\d{8,15}$/', $to)) {
            $this->error('Numéro invalide. Utilise le format international, ex. +2290190123456.');

            return Command::FAILURE;
        }

        if ($message === '') {
            $this->error('Le message ne peut pas être vide.');

            return Command::FAILURE;
        }

        $fake = config('services.brevo.sms_fake') ? 'true' : 'false';
        $this->line("BREVO_SMS_FAKE={$fake}");
        $this->line('Sender: ' . config('services.brevo.sms_sender'));

        $sent = $sms->send($to, $message);

        if (! $sent) {
            $this->error("Échec de l'envoi SMS vers {$to}. Regarde les logs Laravel pour le détail Brevo.");

            return Command::FAILURE;
        }

        $this->info("SMS de test envoyé vers {$to}.");

        return Command::SUCCESS;
    }
}
