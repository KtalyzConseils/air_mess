<?php

namespace Database\Factories;

use App\Models\Driver;
use App\Models\DriverWallet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DriverWallet>
 */
class DriverWalletFactory extends Factory
{
    protected $model = DriverWallet::class;

    public function definition(): array
    {
        return [
            'driver_id'       => Driver::factory(),
            'balance'         => 0,
            'total_deposited' => 0,
            'total_withdrawn' => 0,
        ];
    }
}
