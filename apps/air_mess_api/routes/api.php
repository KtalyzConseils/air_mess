<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\SubscriptionController;
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


// Routes protégées (token Sanctum requis)
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });

    // Courses
    Route::prefix('courses')->group(function () {
        Route::get('/', [CourseController::class, 'index']);
        Route::post('/', [CourseController::class, 'store']);
        Route::get('/{course}', [CourseController::class, 'show']);
        Route::get('/{course}/history', [CourseController::class, 'history']);
        Route::post('/{course}/cancel', [CourseController::class, 'cancel']);
    });

    // Driver
    Route::prefix('driver')->group(function () {
        Route::post('/availability', [DriverController::class, 'updateAvailability']);
        Route::post('/position',     [DriverController::class, 'updatePosition']);
        Route::get('/offered-courses', [DriverController::class, 'offeredCourses']);
        Route::get('/stats', [DriverController::class, 'stats']);
        Route::get('/balance',  [DriverController::class, 'balance']);
        Route::get('/earnings', [DriverController::class, 'earningsHistory']);
        Route::get('/payouts',  [DriverController::class, 'payoutsHistory']);
        Route::post('/courses/{course}/accept',    [DriverController::class, 'acceptCourse']);
        Route::post('/courses/{course}/transition', [DriverController::class, 'transition']);
        Route::post('/courses/{course}/incident', [DriverController::class, 'reportIncident']);
    });

    Route::get('/package-categories', function () {
        return \App\Models\PackageCategory::where('is_active', true)
            ->select('id', 'code', 'name', 'requires_isothermal_bag')
            ->get();
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

    // Abonnements (payement et tout)
    Route::prefix('subscription')->group(function () {
        Route::get('/plans', [SubscriptionController::class, 'plans']);
        Route::post('/checkout', [SubscriptionController::class, 'checkout']);
    });


});



// admin routes
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/dashboard', [AdminController::class, 'dashboard']);

    // Gestion des marchands : réservée au rôle commercial (super inclus automatiquement)
    // NB : /pending doit rester déclarée AVANT /{marchant} pour ne pas être capturée comme un id.
    Route::middleware('admin:commercial')->group(function () {
        Route::get('/marchants', [AdminController::class, 'marchants']);
        Route::get('/marchants/pending', [AdminController::class, 'pendingMarchants']);
        Route::get('/marchants/{marchant}', [AdminController::class, 'showMarchant']);
        Route::post('/marchants/{marchant}/validate', [AdminController::class, 'validateMarchant']);
        Route::post('/marchants/{marchant}/suspend', [AdminController::class, 'suspendMarchant']);
        Route::post('/marchants/{marchant}/reactivate', [AdminController::class, 'reactivateMarchant']);
        Route::post('/marchants/{marchant}/reject', [AdminController::class, 'rejectMarchant']);
        Route::delete('/marchants/{marchant}', [AdminController::class, 'destroyMarchant']);
    });

    // Opérations (courses + livreurs) : réservées au rôle ops (super inclus)
    Route::middleware('admin:ops')->group(function () {
        Route::get('/courses', [AdminController::class, 'courses']);
        Route::post('/courses/{course}/reassign', [AdminController::class, 'reassignCourse']);
        Route::post('/courses/{course}/dispute',  [AdminController::class, 'disputeCourse']);
        Route::get('/drivers', [AdminController::class, 'drivers']);
        Route::get('/drivers/{driver}', [AdminController::class, 'showDriver']);
        Route::post('/drivers/{driver}/validate', [AdminController::class, 'validateDriver']);
        Route::post('/drivers/{driver}/toggle-active', [AdminController::class, 'toggleDriverActive']);
        Route::get('/drivers/{driver}/document/{type}', [AdminController::class, 'driverDocument'])
            ->whereIn('type', ['photo', 'cni', 'driving_license']);
        Route::get('/incidents', [AdminController::class, 'incidents']);
        Route::post('/incidents/{incident}/resolve', [AdminController::class, 'resolveIncident']);

        // Payouts livreurs
        Route::get('/drivers/{driver}/earnings', [AdminController::class, 'driverEarnings']);
        Route::post('/drivers/{driver}/payouts',     [AdminController::class, 'generateDriverPayout']);
        Route::post('/payouts/{payout}/mark-paid',   [AdminController::class, 'markPayoutPaid']);
        Route::get('/payouts',                       [AdminController::class, 'listAllPayouts']);
    });

    // Paramètres globaux — super-admin uniquement
    Route::middleware('admin:super')->group(function () {
        Route::get('/settings',         [AdminController::class, 'listSettings']);
        Route::patch('/settings/{key}', [AdminController::class, 'updateSetting']);
        Route::get('/plans',            [AdminController::class, 'listPlans']);
        Route::patch('/plans/{plan}',   [AdminController::class, 'updatePlan']);
    });


});

// Fedapey public lien
Route::post('/webhooks/fedapay', [SubscriptionController::class, 'webhook']);

