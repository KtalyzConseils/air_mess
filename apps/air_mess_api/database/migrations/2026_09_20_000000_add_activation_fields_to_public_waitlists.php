<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['merchant_waitlists', 'driver_waitlists'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->string('activation_token_hash', 64)->nullable()->unique();
                $table->timestamp('activation_expires_at')->nullable();
                $table->foreignId('activated_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('activated_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['merchant_waitlists', 'driver_waitlists'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('activated_user_id');
                $table->dropColumn(['activation_token_hash', 'activation_expires_at', 'activated_at']);
            });
        }
    }
};
