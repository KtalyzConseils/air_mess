<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('waitlisted_at')->nullable()->after('is_active')->index();
            $table->timestamp('waitlist_notified_at')->nullable()->after('waitlisted_at')->index();
            $table->foreignId('waitlist_notified_by')->nullable()->after('waitlist_notified_at')
                ->constrained('admins')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('waitlist_notified_by');
            $table->dropColumn(['waitlisted_at', 'waitlist_notified_at']);
        });
    }
};
