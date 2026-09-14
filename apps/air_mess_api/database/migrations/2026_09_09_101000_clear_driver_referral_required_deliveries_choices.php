<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('app_settings')
            ->where('key', 'driver_referral_required_deliveries')
            ->update([
                'choices' => null,
                'type' => 'number',
                'updated_at' => now(),
            ]);

        Cache::forget('app_setting:driver_referral_required_deliveries');
    }

    public function down(): void
    {
        DB::table('app_settings')
            ->where('key', 'driver_referral_required_deliveries')
            ->update([
                'choices' => json_encode([
                    ['value' => '1', 'label' => 'Après 1 course livrée'],
                    ['value' => '3', 'label' => 'Après 3 courses livrées'],
                    ['value' => '5', 'label' => 'Après 5 courses livrées'],
                ]),
                'updated_at' => now(),
            ]);

        Cache::forget('app_setting:driver_referral_required_deliveries');
    }
};
