<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('driver_waitlists', function (Blueprint $table) {
            // The new public survey asks a different set of questions than the
            // historical driver waitlist form. Keep both formats in one table so
            // the existing admin listing remains the single source of truth.
            $table->string('survey_response_id', 100)->nullable()->unique()->after('id');
            $table->string('survey_version', 20)->nullable()->after('survey_response_id');
            $table->string('survey_mode', 20)->nullable()->after('survey_version');
            $table->json('survey_payload')->nullable()->after('survey_mode');
            $table->json('account_payload')->nullable()->after('survey_payload');
            $table->timestamp('survey_started_at')->nullable()->after('account_payload');
            $table->timestamp('survey_submitted_at')->nullable()->after('survey_started_at');
            $table->unsignedInteger('survey_duration_seconds')->nullable()->after('survey_submitted_at');
            $table->boolean('survey_suspect')->default(false)->after('survey_duration_seconds');

            // Fields that only exist in the historical questionnaire must accept
            // null for submissions coming from the new survey.
            $table->string('vehicle_type', 80)->nullable()->change();
            $table->string('zone', 80)->nullable()->change();
            $table->string('experience', 80)->nullable()->change();
            $table->string('availability', 80)->nullable()->change();
            $table->json('platforms_used')->nullable()->change();
            $table->string('weekly_deliveries', 40)->nullable()->change();
            $table->string('weekly_income', 80)->nullable()->change();
            $table->json('problems')->nullable()->change();
            $table->text('worst_experience')->nullable()->change();
            $table->string('expected_payment_model', 80)->nullable()->change();
            $table->string('expected_weekly_income', 80)->nullable()->change();
            $table->string('mobile_money_trust', 80)->nullable()->change();
            $table->unsignedTinyInteger('interest_level')->nullable()->change();
            $table->string('launch_availability', 80)->nullable()->change();
            $table->string('full_name', 160)->nullable()->change();
            $table->string('email', 160)->nullable()->change();
            $table->string('whatsapp', 20)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('driver_waitlists', function (Blueprint $table) {
            $table->dropUnique(['survey_response_id']);
            $table->dropColumn([
                'survey_response_id',
                'survey_version',
                'survey_mode',
                'survey_payload',
                'account_payload',
                'survey_started_at',
                'survey_submitted_at',
                'survey_duration_seconds',
                'survey_suspect',
            ]);
        });
    }
};
