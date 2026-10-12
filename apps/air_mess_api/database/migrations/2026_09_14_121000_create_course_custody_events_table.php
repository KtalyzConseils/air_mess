<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_custody_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->string('event_type', 80);
            $table->string('asset_type', 40);
            $table->string('from_holder_type', 40)->nullable();
            $table->unsignedBigInteger('from_holder_id')->nullable();
            $table->string('to_holder_type', 40)->nullable();
            $table->unsignedBigInteger('to_holder_id')->nullable();
            $table->foreignId('driver_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('amount_fcfa')->nullable();
            $table->string('idempotency_key', 160)->unique();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at')->useCurrent();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['course_id', 'occurred_at']);
            $table->index(['event_type', 'occurred_at']);
            $table->index(['driver_id', 'occurred_at']);
            $table->index(['user_id', 'occurred_at']);
        });

        DB::statement("ALTER TABLE course_custody_events ADD CONSTRAINT course_custody_events_asset_type_check CHECK (asset_type IN ('package', 'cash_delivery_fee', 'cash_collection'))");
        DB::statement('ALTER TABLE course_custody_events ADD CONSTRAINT course_custody_events_amount_positive_check CHECK (amount_fcfa IS NULL OR amount_fcfa > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('course_custody_events');
    }
};
