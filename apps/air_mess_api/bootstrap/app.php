<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Derrière le proxy Railway : faire confiance aux en-têtes X-Forwarded-*
        // pour que Laravel détecte le HTTPS et génère des liens corrects
        // (reset mot de passe, tracking public).
        $middleware->trustProxies(at: '*');

        // Bascule la locale selon Accept-Language (FR/EN) — sert notamment aux
        // messages de validation renvoyés au front (marchant-web / driver-app).
        $middleware->api(prepend: [\App\Http\Middleware\SetLocale::class]);

        $middleware->alias([
            'admin'     => \App\Http\Middleware\EnsureUserIsAdmin::class,
            // Vérification des abilities Sanctum (clés d'intégration scoping).
            'abilities' => \Laravel\Sanctum\Http\Middleware\CheckAbilities::class,
            'ability'   => \Laravel\Sanctum\Http\Middleware\CheckForAnyAbility::class,
            // Quota mensuel de requêtes pour les apps dev API.
            'api.quota' => \App\Http\Middleware\EnforceApiQuota::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Rate limiting : renvoyer un JSON français propre avec Retry-After.
        // Sans ce handler, Laravel renvoie une page HTML "Too Many Attempts" pas
        // exploitable par les 3 clients (marchant-web, driver-app, integration).
        $exceptions->render(function (\Illuminate\Http\Exceptions\ThrottleRequestsException $e) {
            $retryAfter = (int) ($e->getHeaders()['Retry-After'] ?? 60);
            $minutes    = (int) max(1, ceil($retryAfter / 60));
            $suffix     = $minutes > 1 ? 's' : '';

            \Illuminate\Support\Facades\Log::warning('Rate limit hit', [
                'ip'          => request()->ip(),
                'path'        => request()->path(),
                'user_id'     => optional(request()->user())->id,
                'retry_after' => $retryAfter,
            ]);

            return response()->json([
                'message'             => "Trop de tentatives. Réessayez dans {$minutes} minute{$suffix}.",
                'retry_after_seconds' => $retryAfter,
            ], 429, [
                'Retry-After' => $retryAfter,
            ]);
        });
    })->create();
