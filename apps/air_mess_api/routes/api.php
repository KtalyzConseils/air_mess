<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\IntegrationKeyController;
use App\Http\Controllers\Api\IntegrationCourseController;
use App\Http\Controllers\Api\ApiPlanController;
use App\Http\Controllers\Api\MyApiApplicationController;
use App\Http\Controllers\Api\ApiApplicationKeyController;
use App\Http\Controllers\Api\ApiApplicationWebhookController;
use App\Http\Controllers\Api\AdminApiApplicationController;
use App\Http\Controllers\Api\SupportController;
use App\Http\Controllers\Api\UserWalletController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Routes publiques d'authentification
Route::prefix('auth')->group(function () {
    Route::post('/register/marchant', [AuthController::class, 'registerMarchant']);
    Route::post('/register/individual', [AuthController::class, 'registerIndividual']);
    Route::post('/register/driver', [AuthController::class, 'registerDriver']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/password/forgot', [AuthController::class, 'forgotPassword']);   
    Route::post('/password/reset',  [AuthController::class, 'resetPassword']);
});


// routes de tracking de la commande pour destinataire
Route::get('/tracking/{token}', [TrackingController::class, 'show']);
// Cas 8 — Contestation destinataire depuis le lien tracking (public, anti-abus applicatif)
Route::post('/tracking/{token}/dispute', [TrackingController::class, 'dispute']);

// Contacts support publics — utilisés par les modales "Contacter le support"
// des 3 apps (marchant-web, driver-app, tracking public). Values vides = option
// masquée côté UI. Les settings sont éditables dans /admin/settings (super-admin).
Route::get('/support-contact', function () {
    return [
        'phone'    => \App\Models\AppSetting::get('support_phone', ''),
        'whatsapp' => \App\Models\AppSetting::get('support_whatsapp_number', ''),
        'email'    => \App\Models\AppSetting::get('support_email', ''),
    ];
});


// Routes protégées (token Sanctum requis)
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        // Enregistre l'acceptation des CGU + politique confidentialité par l'utilisateur connecté.
        // Requis pour les utilisateurs pré-existant à la mise en place (accepted_terms_at IS NULL)
        // ET pour tout bump de TERMS_VERSION.
        Route::post('/accept-terms', [AuthController::class, 'acceptTerms']);
    });

    // Courses
    Route::prefix('courses')->group(function () {
        Route::get('/', [CourseController::class, 'index']);
        Route::post('/', [CourseController::class, 'store']);
        Route::get('/{course}', [CourseController::class, 'show']);
        Route::get('/{course}/history', [CourseController::class, 'history']);
        Route::post('/{course}/cancel', [CourseController::class, 'cancel']);
        Route::post('/{course}/incident', [CourseController::class, 'reportIncident']);
    });

    // Driver
    Route::prefix('driver')->group(function () {
        Route::post('/availability', [DriverController::class, 'updateAvailability']);
        Route::post('/position',     [DriverController::class, 'updatePosition']);
        // Canal de réponse à la candidature — accessible au driver pending
        // (choisi sur la page de confirmation d'inscription web).
        Route::post('/response-channel', [DriverController::class, 'setResponseChannel']);
        Route::get('/offered-courses', [DriverController::class, 'offeredCourses']);
        Route::get('/stats', [DriverController::class, 'stats']);

        // Wallet driver (unique source de vérité pour la caution + gains + retraits)
        Route::get('/wallet',                    [DriverController::class, 'wallet']);
        Route::post('/wallet/top-up',            [DriverController::class, 'topUpWallet']);
        Route::post('/wallet/withdraw-request',  [DriverController::class, 'requestWithdraw']);
        Route::post('/wallet/withdraw-requests/{withdraw}/cancel', [DriverController::class, 'cancelWithdraw']);

        Route::post('/courses/{course}/accept',    [DriverController::class, 'acceptCourse']);
        Route::post('/courses/{course}/decline',   [DriverController::class, 'declineCourse']);
        Route::post('/courses/{course}/transition', [DriverController::class, 'transition']);
        Route::post('/courses/{course}/incident', [DriverController::class, 'reportIncident']);

        // Cas 5 — SOS accident/danger : notif prioritaire ops + numéro d'urgence
        Route::post('/sos', [DriverController::class, 'sos']);

        // Cas 3 — Client injoignable : compteur de tentatives d'appel.
        // POST = incrément silencieux (au tap "Appeler" côté app driver).
        // PATCH = correction manuelle (appel depuis tel perso, avec note justificative).
        Route::post('/courses/{course}/call-attempt', [DriverController::class, 'registerCallAttempt']);
        Route::patch('/courses/{course}/contact-attempts', [DriverController::class, 'patchContactAttempts']);
    });

    Route::get('/package-categories', function () {
        return \App\Models\PackageCategory::where('is_active', true)
            ->select('id', 'code', 'name', 'requires_isothermal_bag')
            ->get();
    });

    // Tarifs de livraison (lus depuis AppSetting). Servent à afficher le prix
    // dans le sélecteur d'urgence du formulaire de création de course.
    Route::get('/delivery-fees', function () {
        return [
            'standard' => (int) \App\Models\AppSetting::get('standard_delivery_fee_fcfa', 1500),
            'express'  => (int) \App\Models\AppSetting::get('express_delivery_fee_fcfa', 2500),
        ];
    });

    // Adresses
    Route::prefix('addresses')->group(function () {
        Route::get('/',           [AddressController::class, 'index']);
        Route::post('/',          [AddressController::class, 'store']);
        Route::patch('/{address}', [AddressController::class, 'update']);
        Route::delete('/{address}', [AddressController::class, 'destroy']);
    });

    // nottifications
    Route::prefix('notifications')->group(function () {
        Route::get('/',           [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/{notification}/read', [NotificationController::class, 'markRead']);
    });

    Route::post('/device-tokens', [NotificationController::class, 'registerToken']);
    Route::delete('/device-tokens', [NotificationController::class, 'deleteToken']);

    // Abonnements (payement et tout) — masqués côté UI mais conservés pour réversibilité
    Route::prefix('subscription')->group(function () {
        Route::get('/plans', [SubscriptionController::class, 'plans']);
        Route::post('/checkout', [SubscriptionController::class, 'checkout']);
    });

    // Clés d'intégration du marchand (pour connecter un site externe type Gbandjo).
    // Gérées par le marchand connecté ; la valeur en clair n'apparaît qu'à la création.
    Route::prefix('integration/keys')->group(function () {
        Route::get('/',        [IntegrationKeyController::class, 'index']);
        Route::post('/',       [IntegrationKeyController::class, 'store']);
        Route::delete('/{id}', [IntegrationKeyController::class, 'destroy']);
    });

    // Wallet payeur (marchand + particulier) — source de vérité pour les paiements de courses
    Route::prefix('me/wallet')->group(function () {
        Route::get('/',        [UserWalletController::class, 'show']);
        Route::post('/top-up', [UserWalletController::class, 'topUp']);

        // Payout marchand/particulier : demande + annulation avant décision admin
        Route::post('/withdraw-request',                        [UserWalletController::class, 'requestWithdraw']);
        Route::post('/withdraw-requests/{withdraw}/cancel',     [UserWalletController::class, 'cancelWithdraw']);
    });

    // ─── Mode développeur — apps API du user connecté ────────────────
    // Le user (marchand ou particulier) peut créer plusieurs apps, chacune
    // avec son plan API et ses clés. Voir MyApiApplicationController.
    Route::get('/api-plans', [ApiPlanController::class, 'index']);
    Route::apiResource('me/api-apps', MyApiApplicationController::class)
        ->parameters(['api-apps' => 'app']);
    Route::post('/me/api-apps/{app}/subscribe', [MyApiApplicationController::class, 'subscribe']);

    // Clés d'accès scopées à une app
    Route::prefix('me/api-apps/{app}/keys')->group(function () {
        Route::get('/',        [ApiApplicationKeyController::class, 'index']);
        Route::post('/',       [ApiApplicationKeyController::class, 'store']);
        Route::delete('/{keyId}', [ApiApplicationKeyController::class, 'destroy']);
    });

    // Config webhook + historique deliveries d'une app
    Route::put('/me/api-apps/{app}/webhook',    [ApiApplicationWebhookController::class, 'configure']);
    Route::delete('/me/api-apps/{app}/webhook', [ApiApplicationWebhookController::class, 'destroy']);
    Route::get('/me/api-apps/{app}/deliveries', [ApiApplicationWebhookController::class, 'deliveries']);
    Route::post('/me/api-apps/{app}/deliveries/{delivery}/retry',
        [ApiApplicationWebhookController::class, 'retry']);
});

// ===== API d'intégration externe (serveur-à-serveur) =====
// Auth par clé Sanctum + ability + rate-limit dur + quota mensuel (uniquement
// pour les tokens portés par une ApiApplication ; les clés marchand Gbandjo
// passent sans quota pour compat rétro).
//
// Les DEUX abilities sont acceptées via le middleware `ability` (any) :
//   - integration:create-course  (ancien flow Gbandjo)
//   - api:create-course          (nouveau flow app dev)
Route::middleware([
    'auth:sanctum',
    'ability:integration:create-course,api:create-course',
    'throttle:60,1',
    'api.quota',
])
    ->prefix('integration')
    ->group(function () {
        Route::post('/courses', [IntegrationCourseController::class, 'store']);
    });



// admin routes
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/dashboard', [AdminController::class, 'dashboard']);

    // === LECTURE PARTAGÉE (commercial + ops + support) ===
    // Le support peut lire les fiches users/courses/drivers/incidents pour assister
    // au téléphone, mais ne peut rien modifier. Les actions restent gatées plus bas.
    // NB : /pending doit rester AVANT /{marchant} pour ne pas être capturée comme un id.
    Route::middleware('admin:commercial,ops,support')->group(function () {
        Route::get('/marchants',                 [AdminController::class, 'marchants']);
        Route::get('/marchants/pending',         [AdminController::class, 'pendingMarchants']);
        Route::get('/marchants/{marchant}',      [AdminController::class, 'showMarchant']);
        Route::get('/individuals',               [AdminController::class, 'individuals']);
        Route::get('/individuals/{individual}',  [AdminController::class, 'showIndividual']);
        Route::get('/courses',                   [AdminController::class, 'courses']);
        Route::get('/drivers',                   [AdminController::class, 'drivers']);
        Route::get('/drivers/{driver}',          [AdminController::class, 'showDriver']);
        Route::get('/drivers/{driver}/document/{type}', [AdminController::class, 'driverDocument'])
            ->whereIn('type', ['photo', 'cni', 'cni_back', 'driving_license']);
        Route::get('/incidents',                 [AdminController::class, 'incidents']);

        // API dev apps — lecture partagée (utile au support pour aider un dev)
        Route::get('/api-apps',            [AdminApiApplicationController::class, 'index']);
        Route::get('/api-apps/{app}',      [AdminApiApplicationController::class, 'show']);
    });

    // === ÉCRITURE COMMERCIALE (validation/suspension marchands & particuliers) ===
    Route::middleware('admin:commercial')->group(function () {
        Route::post('/marchants/{marchant}/validate',   [AdminController::class, 'validateMarchant']);
        Route::post('/marchants/{marchant}/suspend',    [AdminController::class, 'suspendMarchant']);
        Route::post('/marchants/{marchant}/reactivate', [AdminController::class, 'reactivateMarchant']);
        Route::post('/marchants/{marchant}/reject',     [AdminController::class, 'rejectMarchant']);
        Route::delete('/marchants/{marchant}',          [AdminController::class, 'destroyMarchant']);

        Route::post('/individuals/{individual}/suspend',    [AdminController::class, 'suspendIndividual']);
        Route::post('/individuals/{individual}/reactivate', [AdminController::class, 'reactivateIndividual']);

        // Suspension d'app dev — même hiérarchie que suspension marchand.
        Route::post('/api-apps/{app}/suspend',    [AdminApiApplicationController::class, 'suspend']);
        Route::post('/api-apps/{app}/reactivate', [AdminApiApplicationController::class, 'reactivate']);
    });

    // === ÉCRITURE OPS (réassignation course, validation driver, retraits) ===
    // Les retraits (argent) restent strictement ops — pas accessibles au support.
    Route::middleware('admin:ops')->group(function () {
        Route::post('/courses/{course}/reassign',      [AdminController::class, 'reassignCourse']);
        Route::post('/courses/{course}/dispute',       [AdminController::class, 'disputeCourse']);
        Route::post('/drivers/{driver}/validate',      [AdminController::class, 'validateDriver']);
        Route::post('/drivers/{driver}/toggle-active', [AdminController::class, 'toggleDriverActive']);
        Route::post('/incidents/{incident}/resolve',   [AdminController::class, 'resolveIncident']);
        Route::post('/incidents/{incident}/arbitrate', [AdminController::class, 'arbitrateIncident']);
        // Cas 3 — preset 1-clic pour no-show confirmé (utilise les % de app_settings)
        Route::post('/incidents/{incident}/no-show-partial', [AdminController::class, 'noShowPartial']);
        // Cas 4 — preset 1-clic pour course retour confirmée après refus client
        Route::post('/incidents/{incident}/return-trip-confirmed', [AdminController::class, 'returnTripConfirmed']);
        // Cas 6 — preset 1-clic pour annulation marchand confirmée post-pickup
        Route::post('/incidents/{incident}/marchand-cancel-confirmed', [AdminController::class, 'marchandCancelConfirmed']);

        // Demandes de retrait de caution — argent, donc strictement ops/super.
        Route::get('/withdraw-requests',                          [AdminController::class, 'withdrawRequests']);
        Route::get('/withdraw-requests/{withdraw}',               [AdminController::class, 'showWithdrawRequest']);
        Route::post('/withdraw-requests/{withdraw}/approve',      [AdminController::class, 'approveWithdrawRequest']);
        Route::post('/withdraw-requests/{withdraw}/reject',       [AdminController::class, 'rejectWithdrawRequest']);
        Route::post('/withdraw-requests/{withdraw}/mark-paid',    [AdminController::class, 'markWithdrawRequestPaid']);
        Route::post('/withdraw-requests/{withdraw}/retry-payout', [AdminController::class, 'retryWithdrawPayout']);
    });

    // === ACTIONS DOUCES SUPPORT (support inclus) ===
    // Reset password, notif manuelle, annulation course non-assignée.
    // Le support ne touche jamais à l'argent ni à l'état d'un compte.
    Route::middleware('admin:support')->group(function () {
        Route::post('/users/{user}/send-password-reset', [SupportController::class, 'sendPasswordReset']);
        Route::post('/users/{user}/send-notification',   [SupportController::class, 'sendNotificationToUser']);
        Route::post('/courses/{course}/cancel-support',  [SupportController::class, 'cancelCourse']);
    });

    // === NOTES INTERNES (ouvertes à tous les rôles admin) ===
    // Utile pour transmettre du contexte entre support, ops, commercial.
    Route::middleware('admin:support,ops,commercial')->group(function () {
        Route::get('/notes',          [SupportController::class, 'listNotes']);
        Route::post('/notes',         [SupportController::class, 'storeNote']);
        Route::delete('/notes/{note}', [SupportController::class, 'destroyNote']);
    });

    // Paramètres globaux — super-admin uniquement
    Route::middleware('admin:super')->group(function () {
        Route::get('/settings',         [AdminController::class, 'listSettings']);
        Route::patch('/settings/{key}', [AdminController::class, 'updateSetting']);
        Route::get('/plans',            [AdminController::class, 'listPlans']);
        Route::patch('/plans/{plan}',   [AdminController::class, 'updatePlan']);

        // Ajustement manuel des wallets (driver + user) — action comptable très sensible
        Route::post('/drivers/{driver}/wallet-adjustment', [AdminController::class, 'adjustDriverWallet']);
        Route::post('/users/{user}/wallet-adjustment',     [AdminController::class, 'adjustUserWallet']);

        // Cas 7 — Signaler une course frauduleuse (vol livreur).
        // Bannit le driver + saisit la caution + rembourse le marchand. Irréversible.
        Route::post('/courses/{course}/mark-fraud', [AdminController::class, 'markFraud']);

        // Réconciliation comptable : dashboard financier + export CSV
        Route::get('/reconciliation',            [AdminController::class, 'reconciliation']);
        Route::get('/reconciliation/export.csv', [AdminController::class, 'reconciliationExportCsv']);
    });


});

// Fedapey public lien
Route::post('/webhooks/fedapay', [SubscriptionController::class, 'webhook']);

