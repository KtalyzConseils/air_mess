<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    /**
     * Vérifie que l'utilisateur est admin, et — si des sous-rôles sont exigés —
     * qu'il possède l'un d'eux (le rôle `super` passe toujours).
     *
     * Usage dans les routes :
     *   ->middleware('admin')                 // n'importe quel admin
     *   ->middleware('admin:commercial')      // super OU commercial
     *   ->middleware('admin:ops,commercial')  // super OU ops OU commercial
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isAdmin() || ! $user->admin) {
            return response()->json(['message' => 'Accès réservé aux administrateurs.'], 403);
        }

        // Aucun sous-rôle exigé → tout admin passe (rétrocompat).
        if (empty($roles)) {
            return $next($request);
        }

        // `super` = accès total. Sinon, le sous-rôle doit figurer dans la liste autorisée.
        $subRole = $user->admin->sub_role;

        if ($subRole === Admin::ROLE_SUPER || in_array($subRole, $roles, true)) {
            return $next($request);
        }

        return response()->json([
            'message' => 'Accès refusé : votre rôle ne permet pas cette action.',
        ], 403);
    }
}
