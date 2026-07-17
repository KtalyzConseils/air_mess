<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Driver;
use App\Models\Individual;
use App\Models\Marchant;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    /**
     * Inscription d'un marchand (validation manuelle ensuite par un admin).
     */
    public function registerMarchant(
        Request $request,
        \App\Services\FirebaseTokenVerifier $firebaseVerifier,
    ): JsonResponse {
        $request->merge(['phone' => \App\Support\Phone::normalize((string) $request->input('phone'))]);

        $data = $request->validate([
            'name'             => ['required', 'string', 'max:255'],
            'email'            => ['required', 'email', 'unique:users,email'],
            'phone'            => ['required', 'string', 'max:20', 'unique:users,phone'],
            'password'         => ['required', 'string', 'min:8', 'confirmed'],
            // OTP téléphone (obligatoire) + connexion Google (optionnelle)
            'firebase_id_token'        => ['required', 'string'],
            'firebase_google_id_token' => ['nullable', 'string'],
            'raison_sociale'   => ['required', 'string', 'max:255'],
            'ifu_rccm'         => ['nullable', 'string', 'max:50'],
            'secteur_activite' => ['required', Rule::in([
                'supermarche', 'restaurant', 'boutique',
                'pharmacie', 'ecommerce', 'autre',
            ])],
            // Consentement CGU + politique confidentialité (obligatoire à l'inscription).
            'accepted_terms'   => ['required', 'accepted'],
        ]);

        $emailVerifiedAt = $this->assertRegistrationTokens($firebaseVerifier, $data);

        $user = DB::transaction(function () use ($data, $emailVerifiedAt) {
            $user = User::create([
                'name'                   => $data['name'],
                'email'                  => $data['email'],
                'phone'                  => $data['phone'],
                'password'               => $data['password'], // hashé via cast 'hashed'
                'type'                   => User::TYPE_MARCHANT,
                'phone_verified_at'      => now(), // prouvé par l'OTP Firebase
                'email_verified_at'      => $emailVerifiedAt,
                'accepted_terms_at'      => now(),
                'accepted_terms_version' => User::TERMS_VERSION,
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
    public function registerIndividual(
        Request $request,
        \App\Services\FirebaseTokenVerifier $firebaseVerifier,
    ): JsonResponse {
        $request->merge(['phone' => \App\Support\Phone::normalize((string) $request->input('phone'))]);

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name'  => ['required', 'string', 'max:100'],
            'email'      => ['required', 'email', 'unique:users,email'],
            'phone'      => ['required', 'string', 'max:20', 'unique:users,phone'],
            'password'   => ['required', 'string', 'min:8', 'confirmed'],
            'gender'     => ['nullable', Rule::in(['M', 'F', 'autre'])],
            // OTP téléphone (obligatoire) + connexion Google (optionnelle)
            'firebase_id_token'        => ['required', 'string'],
            'firebase_google_id_token' => ['nullable', 'string'],
            // Consentement CGU + politique confidentialité (obligatoire à l'inscription).
            'accepted_terms' => ['required', 'accepted'],
        ]);

        $emailVerifiedAt = $this->assertRegistrationTokens($firebaseVerifier, $data);

        $user = DB::transaction(function () use ($data, $emailVerifiedAt) {
            $user = User::create([
                'name'                   => $data['first_name'] . ' ' . $data['last_name'],
                'email'                  => $data['email'],
                'phone'                  => $data['phone'],
                'password'               => $data['password'],
                'type'                   => User::TYPE_INDIVIDUAL,
                'phone_verified_at'      => now(), // prouvé par l'OTP Firebase
                'email_verified_at'      => $emailVerifiedAt,
                'accepted_terms_at'      => now(),
                'accepted_terms_version' => User::TERMS_VERSION,
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
     * Inscription d'un livreur (validation manuelle ensuite par un admin ops).
     * Le compte est créé en activation_status='pending' tant qu'aucun admin n'a vérifié les documents.
     */
    public function registerDriver(
        Request $request,
        NotificationService $notifier,
        \App\Services\FirebaseTokenVerifier $firebaseVerifier,
        \App\Services\PhoneVerificationToken $phoneTokens,
    ): JsonResponse {
        // Le numéro est normalisé en E.164 AVANT validation pour que l'unicité
        // users.phone porte sur un format canonique (+2290190123456) et que la
        // comparaison avec le claim phone_number du jeton Firebase soit fiable.
        $request->merge(['phone' => \App\Support\Phone::normalize((string) $request->input('phone'))]);

        // Rétro-compat : les APK driver déjà distribués envoient encore
        // `vehicle_color` — on l'accepte comme alias de `vehicle_brand`.
        if (! $request->filled('vehicle_brand') && $request->filled('vehicle_color')) {
            $request->merge(['vehicle_brand' => $request->input('vehicle_color')]);
        }

        $data = $request->validate([
            // Identité
            'first_name' => ['required', 'string', 'max:100'],
            'last_name'  => ['required', 'string', 'max:100'],
            'gender'     => ['required', Rule::in(['M', 'F', 'autre'])],
            'birth_date' => ['required', 'date', 'before:-16 years'],

            // Auth
            'email'    => ['required', 'email', 'unique:users,email'],
            'phone'    => ['required', 'string', 'max:20', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],

            // Preuve de possession du numéro. Web : ID token Firebase Phone Auth.
            // App mobile : jeton OTP maison (POST /auth/phone/otp/verify). Exactement
            // l'un des deux est requis.
            'firebase_id_token'        => ['required_without:phone_verification_token', 'string'],
            'phone_verification_token' => ['required_without:firebase_id_token', 'string'],

            // Véhicule (marque : liste suggérée côté front + saisie libre)
            'vehicle_type'  => ['required', Rule::in(['scooter', 'moto', 'voiture', 'velo'])],
            'vehicle_plate' => ['required', 'string', 'max:20'],
            'vehicle_brand' => ['nullable', 'string', 'max:50'],

            // Documents (photo nullable, CNI + permis obligatoires)
            // max photo 4096 : filet de sécurité — la compression canvas côté
            // client ramène les photos caméra mobile bien en dessous.
            'photo'           => ['nullable', 'image', 'mimes:jpg,jpeg,png',
                                  'max:4096', 'dimensions:min_width=200,min_height=200'],
            // Pièce d'identité : cnib = recto + verso, cip/passeport = 1 seule face.
            'cni_type'        => ['required', Rule::in(['cnib', 'cip', 'passeport'])],
            'cni'             => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'cni_back'        => ['nullable', 'required_if:cni_type,cnib', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            // Permis exigé uniquement pour une voiture ; ignoré (nullable) pour moto/scooter/vélo.
            'driving_license' => ['nullable', 'required_if:vehicle_type,voiture', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],

            // Contacts d'urgence (2 obligatoires)
            'emergency_contact_name'   => ['required', 'string', 'max:255'],
            'emergency_contact_phone'  => ['required', 'string', 'max:20'],
            'emergency_contact2_name'  => ['required', 'string', 'max:255'],
            'emergency_contact2_phone' => ['required', 'string', 'max:20'],

            // Équipement (optionnel, défauts à false si non envoyés)
            'equipment'                  => ['nullable', 'array'],
            'equipment.isothermal_bag'   => ['nullable', 'boolean'],
            'equipment.top_case'         => ['nullable', 'boolean'],
            'equipment.refrigerated_bag' => ['nullable', 'boolean'],

            // Consentement CGU + politique confidentialité (obligatoire à l'inscription).
            'accepted_terms' => ['required', 'accepted'],
        ]);

        // Le numéro soumis doit être prouvé par l'un des deux jetons :
        //  - app mobile : jeton OTP maison (phone_verification_token) ;
        //  - web        : ID token Firebase Phone Auth (firebase_id_token).
        // Dans les deux cas le numéro prouvé (E.164) doit === phone normalisé du formulaire.
        $verifiedPhone = ! empty($data['phone_verification_token'])
            ? $phoneTokens->verify($data['phone_verification_token'])
            : $firebaseVerifier->verifyPhoneToken($data['firebase_id_token']);

        if ($verifiedPhone === null || $verifiedPhone !== $data['phone']) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'phone' => ['Numéro non vérifié. Refaites la vérification par SMS.'],
            ]);
        }

        // Stockage des documents AVANT la transaction (les fichiers sont indépendants de la DB).
        // Si la transaction échoue, on supprime le dossier dans le catch ci-dessous pour ne pas
        // laisser de fichiers orphelins sur disque.
        $paths = $this->storeDriverFiles($request);

        try {
            $driver = DB::transaction(function () use ($data, $paths) {
                $user = User::create([
                    'name'                   => $data['first_name'] . ' ' . $data['last_name'],
                    'email'                  => $data['email'],
                    'phone'                  => $data['phone'],
                    'password'               => $data['password'], // hashé via cast 'hashed' sur le model
                    'type'                   => User::TYPE_DRIVER,
                    'phone_verified_at'      => now(), // prouvé par OTP (Firebase web ou SMS mobile)
                    'accepted_terms_at'      => now(),
                    'accepted_terms_version' => User::TERMS_VERSION,
                ]);

                $driver = Driver::create([
                    'user_id'                  => $user->id,
                    'first_name'               => $data['first_name'],
                    'last_name'                => $data['last_name'],
                    'gender'                   => $data['gender'],
                    'birth_date'               => $data['birth_date'],
                    'photo_url'                => $paths['photo_url'],
                    'cni_url'                  => $paths['cni_url'],
                    'cni_type'                 => $data['cni_type'],
                    'cni_back_url'             => $paths['cni_back_url'],
                    'driving_license_url'      => $paths['driving_license_url'],
                    'vehicle_type'             => $data['vehicle_type'],
                    'vehicle_plate'            => $data['vehicle_plate'],
                    'vehicle_brand'            => $data['vehicle_brand'] ?? null,
                    'emergency_contact_name'   => $data['emergency_contact_name'],
                    'emergency_contact_phone'  => $data['emergency_contact_phone'],
                    'emergency_contact2_name'  => $data['emergency_contact2_name'],
                    'emergency_contact2_phone' => $data['emergency_contact2_phone'],
                    'equipment'                => [
                        'isothermal_bag'   => filter_var($data['equipment']['isothermal_bag']   ?? false, FILTER_VALIDATE_BOOL),
                        'top_case'         => filter_var($data['equipment']['top_case']         ?? false, FILTER_VALIDATE_BOOL),
                        'refrigerated_bag' => filter_var($data['equipment']['refrigerated_bag'] ?? false, FILTER_VALIDATE_BOOL),
                    ],
                    // activation_status='pending', availability_status='offline' viennent des défauts table.
                ]);

                // Création du wallet vide (caution = 0) à l'inscription. Le driver pourra
                // déposer plus tard via top-up Fedapay pour activer l'encaissement.
                \App\Models\DriverWallet::create([
                    'driver_id' => $driver->id,
                ]);

                return $driver;
            });
        } catch (\Throwable $e) {
            // Cleanup : si la transaction DB plante, on supprime les fichiers stockés pour ne pas
            // laisser de dossier orphelin (dirname() renvoie 'drivers/{uuid}' depuis 'drivers/{uuid}/cni.pdf').
            Storage::disk('local')->deleteDirectory(dirname($paths['cni_url']));
            throw $e;
        }

        $token = $driver->user->createToken('driver-' . $driver->user->id)->plainTextToken;

        // Mail de bienvenue au driver (queued ShouldQueue)
        try {
            Mail::to($driver->user->email)->send(new \App\Mail\WelcomeUserMail($driver->user));
        } catch (\Throwable $e) {
            Log::warning('WelcomeUserMail failed', ['err' => $e->getMessage(), 'user_id' => $driver->user->id]);
        }

        // Notifier les admins super + ops (in-app + email)
        $this->notifyAdminsOfNewDriver($driver, $notifier);

        return response()->json([
            'message' => 'Compte livreur créé. Vos documents sont en cours de vérification (sous 48h).',
            'user'    => $driver->user->load('driver'),
            'token'   => $token,
        ], 201);
    }

    /**
     * Vérifie les jetons Firebase d'une inscription :
     * - `firebase_id_token` (obligatoire) : le claim phone_number (E.164) doit
     *   correspondre au téléphone normalisé soumis — preuve de possession du numéro ;
     * - `firebase_google_id_token` (optionnel) : jeton d'une connexion Google dont
     *   l'email vérifié doit correspondre à l'email soumis.
     *
     * Retourne l'horodatage à stocker dans email_verified_at (now() si Google
     * a validé l'email, null sinon). Lève une ValidationException sinon.
     */
    private function assertRegistrationTokens(
        \App\Services\FirebaseTokenVerifier $verifier,
        array $data,
    ): ?\Illuminate\Support\Carbon {
        $verifiedPhone = $verifier->verifyPhoneToken($data['firebase_id_token']);
        if ($verifiedPhone === null || $verifiedPhone !== $data['phone']) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'phone' => ['Numéro non vérifié. Refaites la vérification par SMS.'],
            ]);
        }

        if (empty($data['firebase_google_id_token'])) {
            return null;
        }

        $googleEmail = $verifier->verifyGoogleEmail($data['firebase_google_id_token']);
        if ($googleEmail === null || $googleEmail !== mb_strtolower($data['email'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'email' => ['Connexion Google invalide ou email différent. Réessayez.'],
            ]);
        }

        return now();
    }

    /**
     * Crée une notif in-app + envoie un email à chaque admin super ou ops
     * pour qu'ils sachent qu'un nouveau driver attend leur validation.
     */
    private function notifyAdminsOfNewDriver(Driver $driver, NotificationService $notifier): void
    {
        $admins = Admin::with('user')
            ->whereIn('sub_role', [Admin::ROLE_SUPER, Admin::ROLE_OPS])
            ->get();

        $title = 'Nouveau livreur à valider';
        $body  = "{$driver->first_name} {$driver->last_name} attend la vérification de ses documents.";

        foreach ($admins as $admin) {
            try {
                $notifier->sendToUser(
                    userId: $admin->user_id,
                    type:   'driver.pending_validation',
                    title:  $title,
                    body:   $body,
                    data:   ['driver_id' => $driver->id],
                );
            } catch (\Throwable $e) {
                Log::warning('Driver pending notif failed', ['err' => $e->getMessage(), 'admin_user_id' => $admin->user_id]);
            }

            try {
                Mail::to($admin->user->email)->send(new \App\Mail\DriverPendingValidationMail($driver));
            } catch (\Throwable $e) {
                Log::warning('DriverPendingValidationMail failed', ['err' => $e->getMessage(), 'admin_user_id' => $admin->user_id]);
            }
        }
    }

    /**
     * Stocke les 3 documents sur disk 'local' (privé) dans drivers/{uuid}/.
     * Retourne les chemins relatifs prêts à être enregistrés en DB.
     *
     * NB : chemins relatifs au disk, pas au filesystem. Migration vers S3/MinIO
     * transparente plus tard (juste changer le driver du disk dans filesystems.php).
     */
    private function storeDriverFiles(Request $request): array
    {
        $uuid = (string) Str::uuid();
        $dir  = "drivers/{$uuid}";
        $disk = Storage::disk('local');

        $paths = [
            'photo_url'           => null,
            'cni_back_url'        => null,
            'driving_license_url' => null,
            'cni_url'             => $disk->putFileAs(
                $dir,
                $request->file('cni'),
                'cni.' . $request->file('cni')->extension(),
            ),
        ];

        // Verso de la pièce : présent uniquement pour une CNIB (voir required_if).
        if ($request->hasFile('cni_back')) {
            $paths['cni_back_url'] = $disk->putFileAs(
                $dir,
                $request->file('cni_back'),
                'cni_verso.' . $request->file('cni_back')->extension(),
            );
        }

        // Permis : présent seulement pour une voiture (voir validation required_if).
        if ($request->hasFile('driving_license')) {
            $paths['driving_license_url'] = $disk->putFileAs(
                $dir,
                $request->file('driving_license'),
                'permis.' . $request->file('driving_license')->extension(),
            );
        }

        if ($request->hasFile('photo')) {
            $paths['photo_url'] = $disk->putFileAs(
                $dir,
                $request->file('photo'),
                'photo.' . $request->file('photo')->extension(),
            );
        }

        return $paths;
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
            // Statut d'acceptation des CGU — le front s'en sert immédiatement après login
            // pour décider d'afficher la modale bloquante (utilisateurs pré-existant à la mise en place des CGU).
            'terms' => [
                'current_version'  => User::TERMS_VERSION,
                'accepted_version' => $user->accepted_terms_version,
                'accepted_at'      => $user->accepted_terms_at?->toIso8601String(),
                'needs_acceptance' => $user->needsToAcceptTerms(),
            ],
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
            'user' => $user->load($user->type),
            // Version courante des CGU + statut d'acceptation de l'utilisateur.
            // Le front s'en sert pour décider s'il affiche la modale bloquante.
            'terms' => [
                'current_version'      => User::TERMS_VERSION,
                'accepted_version'     => $user->accepted_terms_version,
                'accepted_at'          => $user->accepted_terms_at?->toIso8601String(),
                'needs_acceptance'     => $user->needsToAcceptTerms(),
            ],
        ]);
    }

    /**
     * Enregistre l'acceptation des CGU + politique de confidentialité par
     * l'utilisateur connecté. Datée + versionnée pour traçabilité juridique.
     * Idempotent : appeler N fois n'a pas d'effet néfaste, on met juste à jour.
     */
    public function acceptTerms(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->accepted_terms_at      = now();
        $user->accepted_terms_version = User::TERMS_VERSION;
        $user->save();

        return response()->json([
            'terms' => [
                'current_version'  => User::TERMS_VERSION,
                'accepted_version' => $user->accepted_terms_version,
                'accepted_at'      => $user->accepted_terms_at?->toIso8601String(),
                'needs_acceptance' => false,
            ],
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
