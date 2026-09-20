<?php

namespace App\Services;

use App\Models\DriverWaitlist;
use App\Models\MerchantWaitlist;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PublicWaitlistActivationService
{
    public function issue(MerchantWaitlist|DriverWaitlist $candidate): string
    {
        $token = Str::random(64);
        $candidate->update([
            'activation_token_hash' => hash('sha256', $token),
            'activation_expires_at' => now()->addDays(7),
        ]);

        return $token;
    }

    /** @return array{kind: string, candidate: MerchantWaitlist|DriverWaitlist} */
    public function resolve(string $token): array
    {
        $hash = hash('sha256', $token);
        $candidate = MerchantWaitlist::where('activation_token_hash', $hash)->first();
        $kind = 'merchant';

        if (! $candidate) {
            $candidate = DriverWaitlist::where('activation_token_hash', $hash)->first();
            $kind = 'driver';
        }

        if (! $candidate || $candidate->activated_at || ! $candidate->activation_expires_at || $candidate->activation_expires_at->isPast()) {
            throw ValidationException::withMessages([
                'activation_token' => ["Ce lien d'activation est invalide, expiré ou déjà utilisé."],
            ]);
        }

        return compact('kind', 'candidate');
    }

    public function assertForRegistration(?string $token, string $kind, string $email): MerchantWaitlist|DriverWaitlist|null
    {
        if (! $token) {
            return null;
        }

        $resolved = $this->resolve($token);
        if ($resolved['kind'] !== $kind || mb_strtolower($resolved['candidate']->email) !== mb_strtolower($email)) {
            throw ValidationException::withMessages([
                'activation_token' => ["Ce lien d'activation ne correspond pas à cette inscription."],
            ]);
        }

        return $resolved['candidate'];
    }

    public function consume(MerchantWaitlist|DriverWaitlist|null $candidate, User $user): void
    {
        if (! $candidate) {
            return;
        }

        $candidate->update([
            'status' => 'activated',
            'activated_user_id' => $user->id,
            'activated_at' => now(),
            'activation_token_hash' => null,
            'activation_expires_at' => null,
        ]);
    }

    /** @return array<string, mixed> */
    public function prefill(string $token): array
    {
        ['kind' => $kind, 'candidate' => $candidate] = $this->resolve($token);

        if ($kind === 'merchant') {
            return [
                'kind' => $kind,
                'email' => $candidate->email,
                'phone' => $candidate->whatsapp,
                'name' => $candidate->contact_name,
                'raison_sociale' => $candidate->shop_name,
                'secteur_activite' => $this->merchantSector($candidate->commerce_type),
            ];
        }

        $parts = preg_split('/\s+/', trim($candidate->full_name)) ?: [];
        $firstName = array_shift($parts) ?: '';

        return [
            'kind' => $kind,
            'email' => $candidate->email,
            'phone' => $candidate->whatsapp,
            'first_name' => $firstName,
            'last_name' => implode(' ', $parts),
            'vehicle_type' => $this->driverVehicle($candidate->vehicle_type),
        ];
    }

    private function merchantSector(string $value): string
    {
        $lower = Str::lower($value);
        return match (true) {
            Str::contains($lower, ['restaurant', 'restauration', 'plats préparés']) => 'restaurant',
            Str::contains($lower, ['épicerie', 'supermarché']) => 'supermarche',
            default => 'autre',
        };
    }

    private function driverVehicle(string $value): string
    {
        return match (Str::lower($value)) {
            'vélo', 'velo' => 'velo',
            'scooter' => 'scooter',
            'voiture' => 'voiture',
            default => 'moto',
        };
    }
}
