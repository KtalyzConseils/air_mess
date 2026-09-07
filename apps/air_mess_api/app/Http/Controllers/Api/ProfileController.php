<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function updateMarchant(Request $request): JsonResponse
    {
        $user = $request->user();
        $marchant = $user->marchant;

        if (! $marchant) {
            return response()->json(['message' => 'Profil marchand introuvable.'], 404);
        }

        $data = $request->validate([
            'name'             => ['required', 'string', 'max:150'],
            'phone'            => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('users', 'phone')->ignore($user->id),
            ],
            'raison_sociale'   => ['required', 'string', 'max:150'],
            'ifu_rccm'         => ['nullable', 'string', 'max:100'],
            'secteur_activite' => [
                'required',
                Rule::in(['supermarche', 'restaurant', 'boutique', 'pharmacie', 'ecommerce', 'autre']),
            ],
        ]);

        DB::transaction(function () use ($user, $marchant, $data) {
            $user->update([
                'name'  => trim($data['name']),
                'phone' => isset($data['phone']) && trim($data['phone']) !== ''
                    ? trim($data['phone'])
                    : null,
            ]);

            $marchant->update([
                'raison_sociale'   => trim($data['raison_sociale']),
                'ifu_rccm'         => isset($data['ifu_rccm']) && trim($data['ifu_rccm']) !== ''
                    ? trim($data['ifu_rccm'])
                    : null,
                'secteur_activite' => $data['secteur_activite'],
            ]);
        });

        return response()->json([
            'message' => 'Profil marchand mis à jour.',
            'user'    => $user->fresh()->load(['marchant', 'individual', 'driver', 'admin']),
        ]);
    }

    public function updateIndividual(Request $request): JsonResponse
    {
        $user = $request->user();
        $individual = $user->individual;

        if (! $individual) {
            return response()->json(['message' => 'Profil particulier introuvable.'], 404);
        }

        $data = $request->validate([
            'name'  => ['required', 'string', 'max:150'],
            'phone' => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('users', 'phone')->ignore($user->id),
            ],
        ]);

        $name = trim($data['name']);
        $parts = preg_split('/\s+/', $name, 2) ?: [$name];

        DB::transaction(function () use ($user, $individual, $data, $name, $parts) {
            $user->update([
                'name'  => $name,
                'phone' => isset($data['phone']) && trim($data['phone']) !== ''
                    ? trim($data['phone'])
                    : null,
            ]);

            $individual->update([
                'first_name' => $parts[0] ?? $name,
                'last_name'  => $parts[1] ?? '',
            ]);
        });

        return response()->json([
            'message' => 'Profil particulier mis Ã  jour.',
            'user'    => $user->fresh()->load(['marchant', 'individual', 'driver', 'admin']),
        ]);
    }

    /**
     * Active l'accès au site web pour un compte créé via l'inscription rapide
     * (mot de passe aléatoire, inconnu de l'utilisateur, jamais utilisable pour
     * se connecter). L'utilisateur choisit ici lui-même un email + mot de passe.
     */
    public function setWebAccess(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'email'    => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user->update([
            'email'           => $data['email'],
            'password'        => $data['password'], // hashé via cast 'hashed' sur le model
            'password_set_at' => now(),
        ]);

        return response()->json([
            'message' => 'Accès web activé.',
            'user'    => $user->fresh()->load(['marchant', 'individual', 'driver', 'admin']),
        ]);
    }
}
