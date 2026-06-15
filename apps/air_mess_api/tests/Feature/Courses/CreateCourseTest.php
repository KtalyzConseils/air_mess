<?php

namespace Tests\Feature\Courses;

use App\Models\Course;
use App\Models\Individual;
use App\Models\Marchant;
use App\Models\PackageCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CreateCourseTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Payload minimal valide réutilisable dans tous les tests
     */
    private function validPayload(int $categoryId): array
    {
        return [
            'package_category_id'  => $categoryId,
            'package_description'  => '2 pizzas Margherita',
            'package_size'         => 'M',
            'urgency'              => 'standard',

            'origin_name'          => 'Resto Test',
            'origin_phone'         => '+22997000000',
            'origin_quartier'      => 'Ganhi',
            'origin_city'          => 'Cotonou',
            'origin_lat'           => 6.3703,
            'origin_lng'           => 2.3912,

            'destination_name'     => 'Yvette',
            'destination_phone'    => '+22996000000',
            'destination_quartier' => 'Calavi',
            'destination_city'     => 'Cotonou',
            'destination_lat'      => 6.4500,
            'destination_lng'      => 2.4300,

            'has_collection'       => false,
        ];
    }

    public function test_authenticated_marchant_can_create_course(): void
    {
        $user = User::factory()->create(['type' => 'marchant']);
        Marchant::factory()->create(['user_id' => $user->id]);
        $cat = PackageCategory::factory()->create();

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/courses', $this->validPayload($cat->id));

        $response->assertStatus(201);
        $response->assertJsonPath('course.status', Course::STATUS_AWAITING);
        $this->assertDatabaseCount('courses', 1);
    }

    public function test_unauthenticated_user_cannot_create_course(): void
    {
        $cat = PackageCategory::factory()->create();

        $response = $this->postJson('/api/courses', $this->validPayload($cat->id));

        $response->assertStatus(401);
        $this->assertDatabaseCount('courses', 0);
    }

    public function test_missing_required_field_returns_422(): void
    {
        $user = User::factory()->create(['type' => 'marchant']);
        Marchant::factory()->create(['user_id' => $user->id]);
        $cat = PackageCategory::factory()->create();

        Sanctum::actingAs($user);

        $payload = $this->validPayload($cat->id);
        unset($payload['origin_name']);  // on retire un champ obligatoire

        $response = $this->postJson('/api/courses', $payload);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['origin_name']);
    }

    public function test_reference_and_tracking_token_are_generated(): void
    {
        $user = User::factory()->create(['type' => 'marchant']);
        Marchant::factory()->create(['user_id' => $user->id]);
        $cat = PackageCategory::factory()->create();

        Sanctum::actingAs($user);
        $response = $this->postJson('/api/courses', $this->validPayload($cat->id));

        $course = Course::first();
        $this->assertNotEmpty($course->reference);
        $this->assertMatchesRegularExpression('/^AM-\d{4}-\d{5}$/', $course->reference);
        $this->assertNotEmpty($course->tracking_token);
        $this->assertEquals(10, strlen($course->tracking_token));
    }

    public function test_individual_counter_increments_on_course_creation(): void
    {
        $user = User::factory()->create(['type' => 'individual']);
        $individual = Individual::factory()->create([
            'user_id' => $user->id,
            'monthly_courses_used' => 3,
        ]);
        $cat = PackageCategory::factory()->create();

        Sanctum::actingAs($user);
        $this->postJson('/api/courses', $this->validPayload($cat->id))->assertStatus(201);

        $this->assertEquals(4, $individual->fresh()->monthly_courses_used);
    }
}
