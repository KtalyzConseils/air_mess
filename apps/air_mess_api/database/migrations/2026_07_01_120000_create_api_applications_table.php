<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Table `api_applications` — représente une "app dev" chez un user.
 *
 * Un user (marchand OU particulier) peut basculer en mode développeur et
 * créer une ou plusieurs applications. Chaque application a :
 *   - son propre plan API (avec un quota de requêtes / mois)
 *   - son compteur d'usage (reset au 1er du mois)
 *   - ses propres clés d'accès (Sanctum tokens scopés)
 *
 * Le paiement des courses créées via l'app se fait depuis le WALLET DU USER
 * (owner), pas depuis un solde propre à l'app. Le quota API et le paiement
 * course sont deux mécanismes distincts :
 *   - le quota API borne combien de fois l'app peut APPELER l'endpoint
 *   - le wallet du user couvre le prix de chaque COURSE effectivement lancée
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('subscription_plan_id')->constrained('subscription_plans');

            $table->string('name', 100);                    // "Mon shop", "Systige integration"
            $table->text('description')->nullable();

            // Statut de l'app côté Air Mess.
            //  - active    : opérationnelle
            //  - suspended : suspendue par un admin (abus, non-paiement, etc.)
            $table->string('status', 20)->default('active');

            // Compteur mensuel — le plan porte la LIMITE, l'app porte l'USAGE.
            $table->unsignedInteger('quota_used')->default(0);
            $table->timestamp('quota_period_started_at')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('subscription_plan_id');
        });

        // Contrainte CHECK Postgres sur le statut.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                ALTER TABLE api_applications
                ADD CONSTRAINT api_applications_status_check
                CHECK (status IN ('active', 'suspended'))
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('api_applications');
    }
};
