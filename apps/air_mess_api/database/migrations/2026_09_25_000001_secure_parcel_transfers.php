<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\{Crypt, DB, Schema};

return new class extends Migration {
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->text('transfer_code')->nullable();
            $table->unsignedInteger('transfer_code_attempts')->default(0);
            $table->timestamp('transfer_code_locked_until')->nullable();
            $table->timestamp('transfer_confirmed_at')->nullable();
        });
        // Les transferts déjà engagés obtiennent aussi un code, sans changer leur garde.
        DB::table('courses')->where('pickup_from_previous_driver', true)
            ->whereNotNull('previous_driver_id')->whereNotIn('status', ['delivered', 'cancelled', 'failed'])
            ->orderBy('id')->eachById(function ($course) {
                DB::table('courses')->where('id', $course->id)->update([
                    'transfer_code' => Crypt::encryptString((string) random_int(100000, 999999)),
                ]);
            });
    }

    public function down(): void
    {
        Schema::table('courses', fn (Blueprint $table) => $table->dropColumn([
            'transfer_code', 'transfer_code_attempts', 'transfer_code_locked_until', 'transfer_confirmed_at',
        ]));
    }
};
