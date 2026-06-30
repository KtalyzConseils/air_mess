<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\View;

class TestMail extends Command
{
    /**
     * Deux modes :
     *   --preview              écrit le rendu HTML dans storage/app/mail-test.html
     *                          (utile pour itérer sur le design sans spammer la boîte)
     *   {to?} (sans --preview) envoie l'email au destinataire
     *
     * Exemples :
     *   php artisan mail:test --preview
     *   php artisan mail:test moi@exemple.com
     *   php artisan mail:test moi@exemple.com --subject="Test refonte"
     */
    protected $signature = 'mail:test
                            {to? : Destinataire (omis si --preview)}
                            {--preview : Écrit le HTML dans storage/app/mail-test.html au lieu d\'envoyer}
                            {--subject=Test layout Air Mess : Sujet de l\'email}
                            {--name=Marie : Prénom injecté dans la vue}';

    protected $description = "Envoie ou prévisualise un email de test utilisant le layout d'Air Mess (tous les éléments réutilisables).";

    public function handle(): int
    {
        $viewData = [
            'subject'     => $this->option('subject'),
            'name'        => $this->option('name'),
            'frontendUrl' => config('app.frontend_url', 'https://airmess.bj'),
        ];

        // Mode preview : on rend la vue côté serveur et on dump le HTML.
        // → itère vite sur le design sans toucher au SMTP.
        if ($this->option('preview')) {
            $html = View::make('emails.test-layout', $viewData)->render();
            Storage::disk('local')->put('mail-test.html', $html);
            // Path réel = disque "local" (storage/app/private/ en Laravel 11+, sinon storage/app/)
            $path = Storage::disk('local')->path('mail-test.html');

            $this->info("✓ Aperçu HTML écrit dans : {$path}");
            $this->line('  Ouvre ce fichier dans ton navigateur pour voir le rendu.');

            return Command::SUCCESS;
        }

        $to = $this->argument('to');
        if (! $to) {
            $this->error('✗ Destinataire requis (sauf en --preview).');
            $this->line('  Usage : php artisan mail:test ton@email.com');
            $this->line('     ou : php artisan mail:test --preview');

            return Command::FAILURE;
        }

        try {
            Mail::send('emails.test-layout', $viewData, function ($msg) use ($to, $viewData) {
                $msg->to($to)->subject($viewData['subject']);
            });
            $this->info("✓ Email de test envoyé à {$to}");

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("✗ Échec : {$e->getMessage()}");

            return Command::FAILURE;
        }
    }
}
