<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('merchant_waitlists', fn (Blueprint $table) => $table->timestamp('notified_at')->nullable()->index());
        Schema::table('driver_waitlists', fn (Blueprint $table) => $table->timestamp('notified_at')->nullable()->index());
    }

    public function down(): void
    {
        Schema::table('merchant_waitlists', fn (Blueprint $table) => $table->dropColumn('notified_at'));
        Schema::table('driver_waitlists', fn (Blueprint $table) => $table->dropColumn('notified_at'));
    }
};
