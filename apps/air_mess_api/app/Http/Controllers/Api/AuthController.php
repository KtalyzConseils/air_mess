<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Individual;
use App\Models\Marchant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    /**
     * Inscription d'un marchand (validation manuelle ensuite par un admin).
     */
    public function registerMarchant(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'             => ['required', 'string', 'max:255'],
            'email'            => ['required', 'email', 'unique:users,email'],
            'phone'            => ['required', 'string', 'max:20', 'unique:users,phone'],
            'password'         => ['required', 'string', 'min:8', 'confirmed'],
            'raison_sociale'   => ['required', 'string', 'max:255'],
            'ifu_rccm'         => ['nullable', 'string', 'max:50'],
            'secteur_activite' => ['required', Rule::in([
                'supermarche', 'restaurant', 'boutique',
                'pharmacie', 'ecommerce', 'autre',
            ])],
        ]);

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'name'     => $data['name'],
                'email'    => $data['email'],
                'phone'    => $data['phone'],
                'password' => $data['password'], // hashé via cast 'hashed'
                'type'     => User::TYPE_MARCHANT,
            ]);

            Marchant::create([
                'user_id'           => $user->id,
                'raison_sociale'    => $data['raison_sociale'],
                'ifu_rccm'          => $data['ifu_rccm'] ?? null,
                'secteur_activite'  => $data['secteur_activite'],
                'subscription_plan' => 'trial',
                'subscription_status' => 'trial',
            ]);

            return $user;
        });

        $token = $user->createToken('marchant-' . $user->id)->plainTextToken;

        // Email de bienvenue (best-effort : on n'échoue pas l'inscription si SMTP plante)
        try {
            \Illuminate\Support\Facades\Mail::to($user->email)
                ->send(new \App\Mail\WelcomeUserMail($user));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('WelcomeUserMail failed', ['err' => $e->getMessage(), 'user_id' => $user->id]);
        }

        return response()->json([
            'message' => 'Compte marchand créé. Validation par un administrateur sous 24h.',
            'user'    => $user->load('marchant'),
            'token'   => $token,
        ], 201);
    }

    /**
     * Inscription d'un particulier (self-service, accès immédiat).
     */
    public function registerIndividual(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name'  => ['required', 'string', 'max:100'],
            'email'      => ['required', 'email', 'unique:users,email'],
            'phone'      => ['required', 'string', 'max:20', 'unique:users,phone'],
            'password'   => ['required', 'string', 'min:8', 'confirmed'],
            'gender'     => ['nullable', Rule::in(['M', 'F', 'autre'])],
        ]);

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'name'     => $data['first_name'] . ' ' . $data['last_name'],
                'email'    => $data['email'],
                'phone'    => $data['phone'],
                'password' => $data['password'],
                'type'     => User::TYPE_INDIVIDUAL,
            ]);

            Individual::create([
                'user_id'                   => $user->id,
                'first_name'                => $data['first_name'],
                'last_name'                 => $data['last_name'],
                'gender'                    => $data['gender'] ?? null,
                'monthly_courses_limit'     => (int) \App\Models\AppSetting::get('individual_monthly_courses_limit', 20),
                'monthly_period_started_at' => now()->startOfMonth(),
            ]);

            return $user;
        });

        $token = $user->createToken('individual-' . $user->id)->plainTextToken;

        // Email de bienvenue
        try {
            \Illuminate\Support\Facades\Mail::to($user->email)
                ->send(new \App\Mail\WelcomeUserMail($user));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('WelcomeUserMail failed', ['err' => $e->getMessage(), 'user_id' => $user->id]);
        }

        return response()->json([
            'message' => 'Compte particulier créé.',
            'user'    => $user->load('individual'),
            'token'   => $token,
        ], 201);
    }

    /**
     * Login universel (tous types d'utilisateurs).
     */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json([
                'message' => 'Identifiants invalides.',
            ], 401);
        }

        if (! $user->is_active) {
            return response()->json([
                'message' => 'Ce compte est désactivé. Contactez le support.',
            ], 403);
        }

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken($user->type . '-' . $user->id)->plainTextToken;

        return response()->json([
            'user'    => $user->load($user->type), // charge marchant, individual, driver ou admin
            'token'   => $token,
        ]);
    }

    /**
     * Logout du token courant uniquement.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }

    /**
     * Infos sur l'utilisateur authentifié.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user'    => $user->load($user->type),
        ]);
    }

    /**
     * Étape 1 du reset : envoie un email avec un lien contenant un token.
     */
    public function forgotPassword(\Illuminate\Http\Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        // Laravel s'occupe de tout : génère le token, l'enregistre, envoie la notif.
        $status = \Illuminate\Support\Facades\Password::sendResetLink([
            'email' => $request->input('email'),
        ]);

        // Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non.
        // Sinon on permettrait de faire de l'énumération d'utilisateurs.
        return response()->json([
            'message' => 'Si cet email est associé à un compte, un lien de réinitialisation a été envoyé.',
        ]);
    }

    /**
     * Étape 2 du reset : valide le token + applique le nouveau mot de passe.
     */
    public function resetPassword(\Illuminate\Http\Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'                 => ['required', 'email'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            'token'                 => ['required', 'string'],
        ]);

        $status = \Illuminate\Support\Facades\Password::reset(
            $data,
            function ($user, $password) {
                $user->update(['password' => bcrypt($password)]);
                // Invalide tous les tokens Sanctum existants (sécurité : déconnecte tous les appareils)
                $user->tokens()->delete();
            },
        );

        if ($status === \Illuminate\Support\Facades\Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Mot de passe réinitialisé avec succès.']);
        }

        return response()->json([
            'message' => 'Lien invalide ou expiré. Demandez un nouveau lien.',
        ], 422);
    }

}
