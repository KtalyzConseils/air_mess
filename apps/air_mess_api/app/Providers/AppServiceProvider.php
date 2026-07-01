<?php

namespace App\Providers;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }



    public function boot(): void
    {
        Log::info('🟢 AppServiceProvider::boot');

        // Transport e-mail Brevo via API HTTP (Railway bloque le SMTP sortant).
        // Activé avec MAIL_MAILER=brevo + BREVO_API_KEY (clé API v3, pas la clé SMTP).
        \Illuminate\Support\Facades\Mail::extend('brevo', function (array $config = []) {
            return (new \Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoTransportFactory())->create(
                new \Symfony\Component\Mailer\Transport\Dsn('brevo+api', 'default', config('services.brevo.key')),
            );
        });

        // Personnalise le mail de reset password (sujet, contenu, URL).
        // ATTENTION : quand toMailUsing est défini, Laravel ignore createUrlUsing
        // et passe directement le TOKEN (pas une URL) au callback. On reconstruit donc
        // l'URL nous-mêmes ici à partir de config('app.frontend_url').
        \Illuminate\Auth\Notifications\ResetPassword::toMailUsing(function ($notifiable, string $token) {
            $frontendUrl = config('app.frontend_url', 'http://localhost:5173');
            $url = "{$frontendUrl}/reset-password?token={$token}&email=" . urlencode($notifiable->getEmailForPasswordReset());

            return (new \Illuminate\Notifications\Messages\MailMessage)
                ->subject('Réinitialisation de votre mot de passe — RMess')
                ->greeting('Bonjour 👋')
                ->line('Vous avez demandé une réinitialisation de votre mot de passe.')
                ->action('Réinitialiser mon mot de passe', $url)
                ->line('Ce lien expire dans 60 minutes.')
                ->line("Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.")
                ->salutation("— L'équipe RMess");
        });

        // Les hooks Course (creating/created/updated) — logging + webhooks —
        // sont tous gérés par App\Observers\CourseObserver enregistré via
        // #[ObservedBy] sur le modèle. On ne duplique pas ici.
    }
}
