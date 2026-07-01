<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Journal des envois de webhooks vers les endpoints des apps dev.
 *
 * Une ligne = une tentative d'envoi (pas un event distinct). Si un event
 * fait 3 tentatives, on aura 1 ligne avec `attempts = 3` et l'issue finale.
 * L'idempotence côté client se fait via `event_id` (UUID) qu'on envoie dans
 * le payload : si l'app reçoit deux fois le même event_id, elle ignore.
 *
 * Statut :
 *   - pending    : en attente d'envoi (job pas encore parti)
 *   - delivered  : reçu (2xx)
 *   - failed     : toutes les tentatives ont échoué (non-2xx ou timeout)
 *
 * On garde les payloads/réponses pour l'historique — soft-truncate côté
 * requêtes admin/UI si besoin. Purge à prévoir plus tard (>90j).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhook_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('api_application_id')->constrained('api_applications')->cascadeOnDelete();
            $table->foreignId('course_id')->nullable()->constrained('courses')->nullOnDelete();

            $table->uuid('event_id');                              // UUID envoyé au client (idempotence côté receveur)
            $table->string('event_type', 60);                      // 'course.created', 'course.delivered', etc.
            $table->string('url', 500);                            // snapshot de la webhook_url au moment de l'envoi
            $table->json('payload');                               // corps JSON envoyé
            $table->string('status', 20)->default('pending');      // pending|delivered|failed
            $table->unsignedTinyInteger('attempts')->default(0);   // nb de tentatives faites
            $table->unsignedSmallInteger('last_http_status')->nullable();
            $table->text('last_response_body')->nullable();
            $table->text('last_error')->nullable();                // exception (timeout, DNS...)
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('last_attempted_at')->nullable();

            $table->timestamps();

            $table->index(['api_application_id', 'status']);
            $table->index(['api_application_id', 'created_at']);
            $table->index('event_id');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                ALTER TABLE webhook_deliveries
                ADD CONSTRAINT webhook_deliveries_status_check
                CHECK (status IN ('pending', 'delivered', 'failed'))
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_deliveries');
    }
};
