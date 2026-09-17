<?php

namespace App\Console\Commands;

use App\Services\ZavuMessageService;
use Illuminate\Console\Command;

class TestZavuWhatsapp extends Command
{
    protected $signature = 'zavu:whatsapp
                            {to : Destinataire au format international, ex. +2290190123456}
                            {--message= : Contenu du message}';

    protected $description = 'Envoie un message WhatsApp de test via Zavu.';

    protected $aliases = ['zavu:whastapp'];

    public function handle(ZavuMessageService $zavu): int
    {
        $to = trim((string) $this->argument('to'));
        $message = trim((string) $this->option('message'));
        $message = $message !== ''
            ? $message
            : 'AirMess : test WhatsApp via Zavu. Si vous recevez ce message, la configuration fonctionne.';

        if (! preg_match('/^\+\d{8,15}$/', $to)) {
            $this->error('Numero invalide. Utilise le format international, ex. +2290190123456.');

            return Command::FAILURE;
        }

        if ($message === '') {
            $this->error('Le message ne peut pas etre vide.');

            return Command::FAILURE;
        }

        if ($zavu->usesTestKey()) {
            $this->warn('Mode sandbox Zavu : la cle zv_test_ envoie seulement WhatsApp vers les numeros de ton equipe verifies dans Zavu.');
        }

        $result = $zavu->send('whatsapp', $to, $message);

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
            $this->info('Message WhatsApp Zavu accepte vers ' . $to . '.');
            $this->line('Message ID: ' . ($message['id'] ?? 'n/a'));
            $this->line('Statut: ' . ($message['status'] ?? 'n/a'));

            return Command::SUCCESS;
        }

        $this->error('Echec envoi WhatsApp Zavu : ' . ($result['error'] ?? 'erreur inconnue'));

        return Command::FAILURE;
    }
}
