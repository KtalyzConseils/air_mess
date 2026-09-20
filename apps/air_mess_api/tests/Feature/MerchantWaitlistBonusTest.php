<?php

namespace Tests\Feature;

use App\Services\FirstCourseDiscountService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class MerchantWaitlistBonusTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_application_promises_the_central_discount_without_creating_a_second_code(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/waitlist/merchants', [
            'commerce_type' => 'Restauration rapide / plats préparés',
            'zone' => 'Cotonou',
            'weekly_orders' => 'Moins de 10',
            'delivery_methods' => ['Je ne livre pas, vente sur place uniquement'],
            'problems' => ['Aucun problème particulier'],
            'worst_experience' => 'Aucune expérience négative à signaler.',
            'cash_collection_issue' => 'Non, jamais',
            'time_lost_weekly' => "Moins d'1 heure",
            'orders_lost_weekly' => 'Aucune',
            'expected_benefit' => 'Trouver rapidement un livreur disponible.',
            'commission_acceptance' => 'Oui, si le prix est raisonnable',
            'reasonable_fee' => '300 à 500 FCFA',
            'mobile_money_trust' => 'Oui, totalement',
            'interest_level' => 5,
            'trial_interest' => 'Oui',
            'shop_name' => 'Commerce test',
            'contact_name' => 'Prospect test',
            'email' => 'prospect@example.test',
            'whatsapp' => '0102030405',
        ]);

        $response->assertCreated()
            ->assertJsonPath('waitlist.bonus_amount', FirstCourseDiscountService::AMOUNT_FCFA)
            ->assertJsonMissingPath('waitlist.bonus_code');

        $this->assertDatabaseHas('merchant_waitlists', [
            'email' => 'prospect@example.test',
            'bonus_amount' => FirstCourseDiscountService::AMOUNT_FCFA,
            'bonus_code' => null,
        ]);
    }
}
