<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Gestion des clés d'accès d'une ApiApplication.
 *
 *   GET    /me/api-apps/{app}/keys        liste (sans plaintext)
 *   POST   /me/api-apps/{app}/keys        génère (retourne le plaintext une fois)
 *   DELETE /me/api-apps/{app}/keys/{key}  révoque une clé
 *
 * Le token est rattaché POLYMORPHIQUEMENT à l'ApiApplication (pas au User) :
 *   personal_access_tokens.tokenable_type = 'App\Models\ApiApplication'
 *
 * Effet : quand une requête arrive avec ce token, `$request->user()` renvoie
 * l'ApiApplication (Sanctum authentifie sur le `tokenable`). Le middleware
 * de course en tire l'user propriétaire pour débiter son wallet.
 */
class ApiApplicationKeyController extends Controller
{
    public const ABILITY = 'api:create-course';
    private const TOKEN_NAME = 'api-app-key';

    public function index(Request $request, ApiApplication $app): JsonResponse
    {
        $this->authorizeOwnership($request, $app);

        $keys = $app->tokens()
            ->where('name', self::TOKEN_NAME)
            ->latest()
            ->get(['id', 'name', 'last_used_at', 'created_at']);

        return response()->json(['data' => $keys]);
    }

    public function store(Request $request, ApiApplication $app): JsonResponse
    {
        $this->authorizeOwnership($request, $app);

        if (! $app->isActive()) {
            return response()->json([
                'message' => 'Cette app est suspendue. Contacte le support.',
            ], 403);
        }

        $token = $app->createToken(self::TOKEN_NAME, [self::ABILITY]);

        return response()->json([
            'message' => 'Clé générée. Copie-la maintenant, elle ne sera plus affichée.',
            'id'      => $token->accessToken->id,
            'key'     => $token->plainTextToken,
        ], 201);
    }

    public function destroy(Request $request, ApiApplication $app, int $keyId): JsonResponse
    {
        $this->authorizeOwnership($request, $app);

        $deleted = $app->tokens()
            ->where('id', $keyId)
            ->where('name', self::TOKEN_NAME)
            ->delete();

        if (! $deleted) {
            return response()->json(['message' => 'Clé introuvable.'], 404);
        }

        return response()->json(['message' => 'Clé révoquée.']);
    }

    private function authorizeOwnership(Request $request, ApiApplication $app): void
    {
        if ($app->user_id !== $request->user()->id) {
            abort(404);
        }
    }
}
