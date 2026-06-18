<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestMail extends Command
{
    protected $signature = 'mail:test {to}';
    protected $description = 'Envoie un email de test à l\'adresse fournie';

    public function handle(): int
    {
        $to = $this->argument('to');

        try {
            Mail::raw(
                "Bonjour !\n\nCeci est un email de test envoyé depuis RMess.\nSi tu lis ceci, ta config SMTP fonctionne. 🎉\n\n— L'équipe RMess",
                fn ($msg) => $msg->to($to)->subject('✅ Test RMess — Configuration SMTP'),
            );
            $this->info("✓ Email envoyé à {$to}");
            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("✗ Échec : {$e->getMessage()}");
            return Command::FAILURE;
        }
    }
}
