<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ajoute la valeur 'ios-voip' aux plateformes autorisées de device_tokens.
 *
 * Ce token PushKit (VoIP) est stocké à part du token Expo iOS classique : un iPhone
 * possède les DEUX (Expo/FCM pour les notifs normales, VoIP pour l'appel entrant CallKit).
 *
 * Laravel implémente `enum()` sur Postgres comme un varchar + contrainte CHECK ; on la
 * recrée donc avec la nouvelle valeur.
 */
return new class extends Migration {
    private const CONSTRAINT = 'device_tokens_platform_check';

    public function up(): void
    {
        DB::statement('ALTER TABLE device_tokens DROP CONSTRAINT IF EXISTS ' . self::CONSTRAINT);
        DB::statement(
            'ALTER TABLE device_tokens ADD CONSTRAINT ' . self::CONSTRAINT .
            " CHECK (platform::text = ANY (ARRAY['android','ios','web','ios-voip']::text[]))"
        );
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE device_tokens DROP CONSTRAINT IF EXISTS ' . self::CONSTRAINT);
        DB::statement(
            'ALTER TABLE device_tokens ADD CONSTRAINT ' . self::CONSTRAINT .
            " CHECK (platform::text = ANY (ARRAY['android','ios','web']::text[]))"
        );
    }
};
