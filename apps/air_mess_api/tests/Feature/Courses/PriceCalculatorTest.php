<?php

namespace Tests\Feature\Courses;

use App\Services\PriceCalculator;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class PriceCalculatorTest extends TestCase
{
    public function test_delivery_fee_uses_new_linear_formula_with_floor(): void
    {
        config(['cache.default' => 'array']);

        Cache::put('app_setting:price_per_km_fcfa', 20);
        Cache::put('app_setting:price_min_fcfa', 250);
        Cache::put('app_setting:price_floor_fcfa', 400);
        Cache::put('app_setting:price_max_fcfa', 0);
        Cache::put('app_setting:price_express_multiplier', 1.5);
        Cache::put('app_setting:price_detour_factor', 1.35);

        $shortTrip = app(PriceCalculator::class)->estimate(6.37, 2.41, 6.3701, 2.4101);
        $this->assertSame(20, $shortTrip['per_km']);
        $this->assertSame(250, $shortTrip['min']);
        $this->assertSame(400, $shortTrip['floor']);
        $this->assertSame(400, $shortTrip['fee']);

        $trip = app(PriceCalculator::class)->estimate(6.37, 2.41, 6.45, 2.35);
        $expectedRaw = (20 * $trip['distance_km']) + 250;
        $expected = (int) (ceil($expectedRaw / 100) * 100);
        $this->assertSame(max(400, $expected), $trip['fee']);
    }
}
