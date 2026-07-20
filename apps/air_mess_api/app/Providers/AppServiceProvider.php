<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
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

        $this->registerRateLimiters();
    }

    /**
     * Rate limiters personnalisés pour les endpoints sensibles.
     *
     * Chaque limiter est appliqué via middleware `throttle:<nom>` sur les routes
     * concernées. La clé de rate est choisie pour maximiser la protection :
     *  - login / password : email + IP (empêche brute-force par IP ET par cible)
     *  - OTP : phone (empêche spam d'un numéro particulier — protège le coût SMS)
     *  - wallet : user_id (endpoint auth requis, l'IP est moins pertinente)
     *  - register / dispute public : IP (utilisateur pas encore identifié)
     *
     * Le format du message d'erreur 429 est géré par le handler dans bootstrap/app.php.
     */
    private function registerRateLimiters(): void
    {
        // Login : 5 tentatives / minute par (email + IP). Empêche brute-force
        // même distribué sur plusieurs comptes depuis une IP.
        RateLimiter::for('auth-login', function (Request $request) {
            $email = strtolower((string) $request->input('email', ''));
            return Limit::perMinute(5)->by($email . '|' . $request->ip());
        });

        // Register (marchand + particulier + driver) : 3 / minute par IP.
        // Bloque les bots qui spawn des comptes en masse.
        RateLimiter::for('auth-register', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });

        // OTP send : 3 / heure par NUMÉRO — protège directement le coût SMS Brevo.
        // Un bot qui balaie 1000 numéros paie 1000 SMS aujourd'hui ; ici il en enverra 3.
        RateLimiter::for('auth-otp-send', function (Request $request) {
            $phone = (string) $request->input('phone', $request->ip());
            return Limit::perHour(3)->by('otp-send|' . $phone);
        });

        // OTP verify : 10 / heure par numéro — laisse un vrai user se tromper
        // plusieurs fois mais bloque le brute-force du code à 6 chiffres.
        RateLimiter::for('auth-otp-verify', function (Request $request) {
            $phone = (string) $request->input('phone', $request->ip());
            return Limit::perHour(10)->by('otp-verify|' . $phone);
        });

        // Password forgot : 3 / heure par (email + IP). Empêche l'énumération
        // d'emails ET le spam de mails de reset.
        RateLimiter::for('auth-password-forgot', function (Request $request) {
            $email = strtolower((string) $request->input('email', ''));
            return Limit::perHour(3)->by($email . '|' . $request->ip());
        });

        // Wallet top-up : 5 / heure par user. Évite la pollution du dashboard
        // Fedapay avec des checkouts non payés.
        RateLimiter::for('wallet-topup', function (Request $request) {
            return Limit::perHour(5)->by(optional($request->user())->id ?: $request->ip());
        });

        // Wallet withdraw request : 3 / heure par user. Complète les plafonds
        // métier (count_24h, count_7d) — ici c'est un anti-spam très court terme.
        RateLimiter::for('wallet-withdraw', function (Request $request) {
            return Limit::perHour(3)->by(optional($request->user())->id ?: $request->ip());
        });

        // Tracking dispute (endpoint public — pas d'auth) : 3 / jour par IP.
        // Le lien tracking peut être partagé, on veut éviter qu'un troll ouvre
        // un incident par heure depuis le lien.
        RateLimiter::for('tracking-dispute', function (Request $request) {
            return Limit::perDay(3)->by($request->ip());
        });
    }
}
