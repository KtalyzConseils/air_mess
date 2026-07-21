<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware qui lit l'entête `Accept-Language` et bascule la locale Laravel
 * en conséquence — utilisé principalement pour retourner les messages de
 * validation dans la langue du client (FR/EN).
 *
 * Le front injecte `Accept-Language: fr` ou `en` via l'intercepteur axios.
 * Toute autre valeur retombe sur la locale par défaut de config/app.php.
 */
class SetLocale
{
    /** Locales supportées côté serveur — étend au besoin. */
    private const SUPPORTED = ['fr', 'en'];

    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Accept-Language');
        if ($header) {
            // "fr", "en", "fr-FR" → on ne garde que les 2 premiers caractères.
            $lang = strtolower(substr($header, 0, 2));
            if (in_array($lang, self::SUPPORTED, true)) {
                App::setLocale($lang);
            }
        }
        return $next($request);
    }
}
