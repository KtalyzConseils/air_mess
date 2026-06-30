<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Gestion des clés d'intégration d'un marchand (tokens Sanctum portant la
 * seule ability `integration:create-course`). Ces clés servent aux sites
 * externes (Gbandjo via Systige) pour créer des courses en serveur-à-serveur.
 *
 * Le marchand est authentifié normalement (session app) pour gérer ses clés ;
 * la valeur en clair n'est affichée qu'une seule fois, à la génération.
 */
class IntegrationKeyController extends Controller
{
    public const ABILITY = 'integration:create-course';

    /** Préfixe de nom des tokens d'intégration (pour les distinguer des tokens de session). */
    private const TOKEN_NAME = 'integration-key';

    /**
     * Liste les clés d'intégration actives du marchand (sans la valeur).
     */
    public function index(Request $request): JsonResponse
    {
        $this->ensureMarchant($request);

        $keys = $request->user()->tokens()
            ->where('name', self::TOKEN_NAME)
            ->latest()
            ->get(['id', 'name', 'last_used_at', 'created_at']);

        return response()->json(['keys' => $keys]);
    }

    /**
     * Génère une nouvelle clé d'intégration. La valeur en clair n'est renvoyée
     * qu'ici, une seule fois.
     */
    public function store(Request $request): JsonResponse
    {
        $this->ensureMarchant($request);

        $token = $request->user()->createToken(self::TOKEN_NAME, [self::ABILITY]);

        return response()->json([
            'message' => 'Clé d\'intégration générée. Copiez-la maintenant : elle ne sera plus affichée.',
            'id'      => $token->accessToken->id,
            'key'     => $token->plainTextToken,
        ], 201);
    }

    /**
     * Révoque une clé d'intégration du marchand.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->ensureMarchant($request);

        $deleted = $request->user()->tokens()
            ->where('id', $id)
            ->where('name', self::TOKEN_NAME)
            ->delete();

        if (! $deleted) {
            return response()->json(['message' => 'Clé introuvable.'], 404);
        }

        return response()->json(['message' => 'Clé révoquée.']);
    }

    private function ensureMarchant(Request $request): void
    {
        $user = $request->user();
        if (! $user || ! $user->isMarchant()) {
            abort(403, 'Réservé aux marchands.');
        }
    }
}
