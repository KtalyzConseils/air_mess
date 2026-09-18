<?php

namespace App\Console\Commands;

use App\Services\ZavuMessageService;
use Illuminate\Console\Command;

class TestZavuSms extends Command
{
    protected $signature = 'zavu:sms
                            {to : Destinataire au format international, ex. +2290190123456}
                            {--message= : Contenu du SMS}';

    protected $description = 'Envoie un SMS de test via Zavu.';

    public function handle(ZavuMessageService $zavu): int
    {
        $to = trim((string) $this->argument('to'));
        $message = trim((string) $this->option('message'));
        $message = $message !== ''
            ? $message
            : 'AirMess : test SMS via Zavu. Si vous recevez ce message, la configuration fonctionne.';

        if (! preg_match('/^\+\d{8,15}$/', $to)) {
            $this->error('Numero invalide. Utilise le format international, ex. +2290190123456.');

            return Command::FAILURE;
        }

        if ($message === '') {
            $this->error('Le message ne peut pas etre vide.');

            return Command::FAILURE;
        }

        if ($zavu->usesTestKey()) {
            $this->warn('Attention : une cle zv_test_ Zavu refuse le SMS selon la documentation. Utilise une cle zv_live_ pour tester le SMS reel.');
        }

        $result = $zavu->send('sms', $to, $message);

        return $this->renderResult($result, $to);
    }

    /**
     * @param array{ok: bool, status: int|null, data: array|null, error: string|null} $result
     */
    private function renderResult(array $result, string $to): int
    {
        $this->line('HTTP status: ' . ($result['status'] ?? 'n/a'));

        if ($result['ok']) {
            $message = $result['data']['message'] ?? [];
            $this->info('SMS Zavu accepte vers ' . $to . '.');
            $this->line('Message ID: ' . ($message['id'] ?? 'n/a'));
            $this->line('Statut: ' . ($message['status'] ?? 'n/a'));

            return Command::SUCCESS;
        }

        $this->error('Echec envoi SMS Zavu : ' . ($result['error'] ?? 'erreur inconnue'));

        return Command::FAILURE;
    }
}
