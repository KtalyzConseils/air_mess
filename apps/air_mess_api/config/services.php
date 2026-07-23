<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'brevo' => [
        'key' => env('BREVO_API_KEY'),
        // SMS transactionnels (réponse de candidature driver). Sender ID : max 11
        // caractères alphanumériques, à faire valider dans le compte Brevo.
        'sms_sender' => env('BREVO_SMS_SENDER', 'AirMess'),
        // true = pas d'appel réseau, SMS loggé (dev/tests sans crédits).
        'sms_fake' => env('BREVO_SMS_FAKE', env('APP_ENV') === 'local'),
    ],

    'firebase' => [
        // Project ID Firebase — sert à valider aud/iss des ID tokens Phone Auth.
        'project_id' => env('FIREBASE_PROJECT_ID'),
        // Chemin du JSON de compte de service (console Firebase → Service accounts).
        // Requis uniquement pour le web push FCM ; absent = envoi FCM ignoré.
        'credentials' => env('FIREBASE_CREDENTIALS'),
        // URL du front — cible des clics sur les notifications web push.
        'frontend_url' => env('FRONTEND_URL', 'https://app.airmess-logistics.com'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'fedapay' => [
        'env'            => env('FEDAPAY_ENV', 'sandbox'),
        'public_key'     => env('FEDAPAY_PUBLIC_KEY'),
        'secret_key'     => env('FEDAPAY_SECRET_KEY'),
        'webhook_secret' => env('FEDAPAY_WEBHOOK_SECRET'),
        'currency'       => env('FEDAPAY_CURRENCY', 'XOF'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Google Places Autocomplete + Details.
    // Le front n'appelle JAMAIS Google directement — tout passe par notre proxy
    // (App\Http\Controllers\Api\PlacesController). La clé reste server-side.
    // Restreindre la clé côté Google Cloud Console :
    //   - Application restrictions : HTTP referrer / IP du serveur Laravel
    //   - API restrictions : "Places API" UNIQUEMENT
    'google' => [
        'places_key'          => env('GOOGLE_PLACES_API_KEY'),
        // Restreint les résultats à un pays ISO 3166-1 alpha-2 (bj = Bénin).
        'places_country'      => env('GOOGLE_PLACES_COUNTRY', 'bj'),
        // Biais géographique pour prioriser les résultats proches. Cotonou par défaut.
        // Format "lat,lng". Radius en mètres.
        'places_center'       => env('GOOGLE_PLACES_CENTER', '6.3703,2.3912'),
        'places_radius_m'     => (int) env('GOOGLE_PLACES_RADIUS_M', 50000),
        // Langue des résultats (fr par défaut). Le front peut override.
        'places_language'     => env('GOOGLE_PLACES_LANGUAGE', 'fr'),
    ],

];
