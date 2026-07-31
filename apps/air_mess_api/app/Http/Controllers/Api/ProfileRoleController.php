<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Marchant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Ajout d'un rôle secondaire à un utilisateur DÉJÀ inscrit.
 *
 * Le modèle est en STI inversé : un même User peut avoir plusieurs profils
 * (Driver + Marchant, ou Individual + Driver, etc.). Cet endpoint construit
 * le profil complémentaire sans dupliquer le User (email/phone conservés,
 * password inchangé, token Sanctum toujours valide).
 *
 * La validation admin du nouveau profil suit le même flux que l'inscription
 * classique (queue admin, notifications, etc.).
 */
class ProfileRoleController extends Controller
{
    /**
     * POST /profile/add-role/marchant
     *
     * L'utilisateur (driver ou individual déjà connecté) demande à ouvrir
     * AUSSI un commerce. On crée uniquement le row Marchant ; le User n'est
     * pas touché (users.type reste tel quel — la notion de "mode actif"
     * sera gérée par la future bascule).
     */
    public function addMarchantRole(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        // Le user doit être connecté (garanti par le middleware) et ne pas
        // déjà avoir un profil marchand — la migration a un UNIQUE sur
        // marchants.user_id, on court-circuite pour renvoyer un 409 propre
        // plutôt que laisser exploser une intégrité SQL.
        if ($user->marchant()->exists()) {
            return response()->json([
                'message' => 'Un profil marchand existe déjà pour cet utilisateur.',
            ], 409);
        }

        // Un admin n'a rien à faire ici. Un marchand non plus (déjà filtré
        // au dessus par le exists()). Les 2 rôles éligibles à l'ajout de
        // marchand sont donc driver et individual.
        if (! in_array($user->type, [User::TYPE_DRIVER, User::TYPE_INDIVIDUAL], true)) {
            return response()->json([
                'message' => 'Ce type de compte ne peut pas ajouter de profil marchand.',
            ], 403);
        }

        $data = $request->validate([
            'raison_sociale'   => ['required', 'string', 'max:255'],
            'ifu_rccm'         => ['nullable', 'string', 'max:50'],
            'secteur_activite' => ['required', Rule::in([
                'supermarche', 'restaurant', 'boutique',
                'pharmacie', 'ecommerce', 'autre',
            ])],
        ]);

        $marchant = DB::transaction(function () use ($user, $data) {
            return Marchant::create([
                'user_id'             => $user->id,
                'raison_sociale'      => $data['raison_sociale'],
                'ifu_rccm'            => $data['ifu_rccm'] ?? null,
                'secteur_activite'    => $data['secteur_activite'],
                'subscription_plan'   => 'trial',
                'subscription_status' => 'trial',
            ]);
        });

        return response()->json([
            'message'  => 'Profil marchand créé. Validation par un administrateur sous 24h.',
            'marchant' => $marchant,
            'user'     => $user->fresh()->load(['driver', 'marchant', 'individual']),
        ], 201);
    }
}
