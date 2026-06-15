<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('individuals', function (Blueprint $table) {
            $table->string('subscription_plan', 30)->nullable()->after('monthly_period_started_at');
            // null par défaut : un particulier sans abo. Les statuts utilisés sont les mêmes
            // que pour les marchands (active/expired/suspended/churned), mais on n'a pas de
            // 'trial' parce que le quota gratuit standard remplace la période d'essai.
            $table->string('subscription_status', 20)->nullable()->after('subscription_plan');
            $table->timestamp('subscription_started_at')->nullable()->after('subscription_status');
            $table->timestamp('subscription_next_billing_at')->nullable()->after('subscription_started_at');

            $table->index('subscription_status');
        });

        // Contrainte CHECK : les valeurs autorisées pour subscription_status
        DB::statement("
            ALTER TABLE individuals
            ADD CONSTRAINT individuals_subscription_status_check
            CHECK (subscription_status IS NULL OR subscription_status IN ('active', 'expired', 'suspended', 'churned'))
        ");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE individuals DROP CONSTRAINT IF EXISTS individuals_subscription_status_check');

        Schema::table('individuals', function (Blueprint $table) {
            $table->dropIndex(['subscription_status']);
            $table->dropColumn([
                'subscription_plan',
                'subscription_status',
                'subscription_started_at',
                'subscription_next_billing_at',
            ]);
        });
    }
};
