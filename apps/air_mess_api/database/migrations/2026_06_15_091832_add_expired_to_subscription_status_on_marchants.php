<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // 1. Supprimer la contrainte CHECK actuelle
        DB::statement('ALTER TABLE marchants DROP CONSTRAINT IF EXISTS marchants_subscription_status_check');

        // 2. Recréer avec 'expired' ajouté
        DB::statement("
            ALTER TABLE marchants
            ADD CONSTRAINT marchants_subscription_status_check
            CHECK (subscription_status IN ('trial', 'active', 'expired', 'suspended', 'churned'))
        ");
    }

    public function down(): void
    {
        // Avant de retirer 'expired', on convertit les lignes 'expired' en 'churned'
        // sinon la nouvelle contrainte refuserait ces lignes
        DB::table('marchants')->where('subscription_status', 'expired')
            ->update(['subscription_status' => 'churned']);

        DB::statement('ALTER TABLE marchants DROP CONSTRAINT IF EXISTS marchants_subscription_status_check');
        DB::statement("
            ALTER TABLE marchants
            ADD CONSTRAINT marchants_subscription_status_check
            CHECK (subscription_status IN ('trial', 'active', 'suspended', 'churned'))
        ");
    }
};
