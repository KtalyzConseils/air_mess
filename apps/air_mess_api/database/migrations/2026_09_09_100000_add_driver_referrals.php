<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->string('referral_code', 24)->nullable()->unique()->after('kind');
        });

        Schema::create('driver_referrals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sponsor_driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->foreignId('referred_driver_id')->unique()->constrained('drivers')->cascadeOnDelete();
            $table->string('referral_code', 24)->nullable();
            $table->string('status', 24)->default('pending');
            $table->unsignedInteger('delivered_courses_count')->default(0);
            $table->unsignedInteger('required_delivered_courses')->nullable();
            $table->unsignedInteger('reward_amount_fcfa')->nullable();
            $table->timestamp('qualified_at')->nullable();
            $table->timestamp('rewarded_at')->nullable();
            $table->foreignId('wallet_transaction_id')->nullable()->constrained('wallet_transactions')->nullOnDelete();
            $table->timestamps();

            $table->index(['sponsor_driver_id', 'status']);
            $table->index('referral_code');
        });

        foreach ($this->settings() as $setting) {
            DB::table('app_settings')->updateOrInsert(
                ['key' => $setting['key']],
                array_merge($setting, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ]),
            );
            Cache::forget('app_setting:' . $setting['key']);
        }
    }

    public function down(): void
    {
        foreach ($this->settings() as $setting) {
            DB::table('app_settings')->where('key', $setting['key'])->delete();
            Cache::forget('app_setting:' . $setting['key']);
        }

        Schema::dropIfExists('driver_referrals');

        Schema::table('drivers', function (Blueprint $table) {
            $table->dropUnique(['referral_code']);
            $table->dropColumn('referral_code');
        });
    }

    private function settings(): array
    {
        return [
            [
                'key'         => 'driver_referral_enabled',
                'value'       => 'true',
                'type'        => 'boolean',
                'label'       => 'Parrainage livreur actif',
                'description' => 'Active ou désactive le programme de parrainage dans l’app driver.',
                'group'       => 'referral',
            ],
            [
                'key'         => 'driver_referral_required_deliveries',
                'value'       => '3',
                'type'        => 'number',
                'label'       => 'Courses livrées requises',
                'description' => 'Nombre de premières courses livrées par le filleul avant de créditer la prime au parrain.',
                'group'       => 'referral',
            ],
            [
                'key'         => 'driver_referral_reward_fcfa',
                'value'       => '1000',
                'type'        => 'number',
                'label'       => 'Prime parrainage (FCFA)',
                'description' => 'Montant crédité dans le wallet du parrain lorsque le filleul atteint le seuil.',
                'group'       => 'referral',
            ],
        ];
    }
};
