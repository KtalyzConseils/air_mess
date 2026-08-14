<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\DriverWallet;
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

    /**
     * POST /profile/add-role/driver
     *
     * L'utilisateur (marchand ou particulier déjà connecté) demande à devenir
     * AUSSI livreur. On crée un profil Driver en attente de validation admin ;
     * le User garde son type principal actuel.
     */
    public function addDriverRole(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->driver()->exists()) {
            return response()->json([
                'message' => 'Un profil livreur existe déjà pour cet utilisateur.',
            ], 409);
        }

        if (! in_array($user->type, [User::TYPE_MARCHANT, User::TYPE_INDIVIDUAL], true)) {
            return response()->json([
                'message' => 'Ce type de compte ne peut pas ajouter de profil livreur.',
            ], 403);
        }

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'gender' => ['nullable', Rule::in(['M', 'F', 'autre'])],
            'birth_date' => ['nullable', 'date', 'before_or_equal:-18 years'],
            'vehicle_type' => ['required', Rule::in(['scooter', 'moto', 'voiture', 'velo'])],
            'vehicle_plate' => ['required', 'string', 'max:20'],
            'vehicle_brand' => ['nullable', 'string', 'max:80'],
            'emergency_contact_name' => ['required', 'string', 'max:120'],
            'emergency_contact_phone' => ['required', 'string', 'max:20'],
            'emergency_contact2_name' => ['nullable', 'string', 'max:120'],
            'emergency_contact2_phone' => ['nullable', 'string', 'max:20'],
            'preferred_response_channel' => ['nullable', Rule::in(['email', 'sms', 'whatsapp'])],
            'equipment.isothermal_bag' => ['sometimes', 'boolean'],
            'equipment.top_case' => ['sometimes', 'boolean'],
            'equipment.refrigerated_bag' => ['sometimes', 'boolean'],
        ]);

        $driver = DB::transaction(function () use ($user, $data) {
            $driver = Driver::create([
                'user_id' => $user->id,
                'first_name' => trim($data['first_name']),
                'last_name' => trim($data['last_name']),
                'gender' => $data['gender'] ?? null,
                'birth_date' => $data['birth_date'] ?? null,
                'vehicle_type' => $data['vehicle_type'],
                'vehicle_plate' => strtoupper(trim($data['vehicle_plate'])),
                'vehicle_brand' => isset($data['vehicle_brand']) ? trim($data['vehicle_brand']) : null,
                'equipment' => [
                    'isothermal_bag' => (bool) data_get($data, 'equipment.isothermal_bag', false),
                    'top_case' => (bool) data_get($data, 'equipment.top_case', false),
                    'refrigerated_bag' => (bool) data_get($data, 'equipment.refrigerated_bag', false),
                ],
                'emergency_contact_name' => trim($data['emergency_contact_name']),
                'emergency_contact_phone' => $data['emergency_contact_phone'],
                'emergency_contact2_name' => isset($data['emergency_contact2_name']) ? trim($data['emergency_contact2_name']) : null,
                'emergency_contact2_phone' => $data['emergency_contact2_phone'] ?? null,
                'preferred_response_channel' => $data['preferred_response_channel'] ?? null,
                'activation_status' => 'pending',
                'availability_status' => 'offline',
            ]);

            DriverWallet::firstOrCreate(['driver_id' => $driver->id]);

            return $driver;
        });

        return response()->json([
            'message' => 'Profil livreur créé. Validation par un administrateur sous 24h.',
            'driver' => $driver,
            'user' => $user->fresh()->load(['driver', 'marchant', 'individual']),
        ], 201);
    }
}
