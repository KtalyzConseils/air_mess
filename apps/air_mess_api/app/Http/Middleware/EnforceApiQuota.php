<?php

namespace App\Http\Middleware;

use App\Models\ApiApplication;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Vérifie le quota mensuel d'une ApiApplication avant de laisser passer.
 *
 * S'applique aux routes servies avec un token dont le `tokenable` est une
 * ApiApplication. Si le token porte encore un User (ancienne clé
 * d'intégration marchand), on laisse passer pour compatibilité.
 *
 * NB : ce middleware ne DÉCRÉMENTE PAS le quota. L'incrément se fait dans le
 * contrôleur, à l'intérieur de la transaction de création de course, pour
 * éviter le décompte de requêtes qui échouent en 4xx/5xx.
 */
class EnforceApiQuota
{
    public function handle(Request $request, Closure $next): Response
    {
        $tokenable = $request->user();

        if ($tokenable instanceof ApiApplication) {
            if (! $tokenable->isActive()) {
                return response()->json([
                    'message' => 'Cette application est suspendue.',
                ], 403);
            }

            if (! $tokenable->canConsumeRequest()) {
                $limit = $tokenable->monthlyLimit();
                return response()->json([
                    'message'         => 'Quota mensuel atteint pour cette application.',
                    'quota_limit'     => $limit,
                    'quota_used'      => (int) $tokenable->quota_used,
                    'reset_at'        => now()->startOfMonth()->addMonth()->toIso8601String(),
                ], 429);
            }
        }

        return $next($request);
    }
}
