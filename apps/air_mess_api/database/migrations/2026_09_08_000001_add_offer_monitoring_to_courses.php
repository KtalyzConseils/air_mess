<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->timestamp('offer_broadcasted_at')->nullable()->after('assigned_at');
            $table->json('offer_alerts_sent')->nullable()->after('offer_broadcasted_at');
            $table->index(['status', 'driver_id', 'offer_broadcasted_at']);
        });

        Schema::create('course_offer_admin_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('admin_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 30);
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['course_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_offer_admin_actions');
        Schema::table('courses', function (Blueprint $table) {
            $table->dropIndex(['status', 'driver_id', 'offer_broadcasted_at']);
            $table->dropColumn(['offer_broadcasted_at', 'offer_alerts_sent']);
        });
    }
};
