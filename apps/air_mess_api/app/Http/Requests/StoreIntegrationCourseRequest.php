<?php

namespace App\Http\Requests;

use App\Models\ApiApplication;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validation de la création de course depuis un site externe (Gbandjo/Systige).
 *
 * Les coordonnées de retrait et de livraison sont obligatoires pour calculer
 * le tarif à la distance. Les compléments d'adresse restent facultatifs.
 *
 * L'authentification et l'ability `integration:create-course` sont déjà
 * vérifiées par le middleware de route ; on contrôle ici que le porteur de la
 * clé est bien un marchand actif et validé.
 */
class StoreIntegrationCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return self::resolvePayer($this->user()) !== null;
    }

    /** Autorisation commune à la création et à la gestion des courses intégrées. */
    public static function resolvePayer(mixed $authenticatable): ?User
    {

        // ─── Nouveau flow : token porté par une ApiApplication (mode dev) ───
        // Le middleware `api.quota` a déjà vérifié activation + quota.
        // On revalide juste que le user propriétaire est actif.
        if ($authenticatable instanceof ApiApplication) {
            return ($authenticatable->isActive()
                && $authenticatable->user
                && $authenticatable->user->is_active) ? $authenticatable->user : null;
        }

        // ─── Ancien flow : token porté directement par un User marchand ───
        // (clés Gbandjo/Systige générées via IntegrationKeyController).
        if ($authenticatable instanceof User) {
            if (! $authenticatable->is_active || ! $authenticatable->isMarchant()) {
                return null;
            }
            $marchant = $authenticatable->marchant;
            return ($marchant
                && $marchant->validated_at
                && $marchant->hasApiAccess()) ? $authenticatable : null;
        }

        return null;
    }

    public function rules(): array
    {
        return [
            'external_reference' => ['nullable', 'string', 'max:100'],
            'source'             => ['nullable', 'string', 'max:30'],
            'urgency'            => ['nullable', Rule::in(['standard', 'express'])],

            // ===== Colis =====
            'package'             => ['nullable', 'array'],
            'package.category_id' => ['nullable', 'integer', 'exists:package_categories,id'],
            'package.description' => ['nullable', 'string', 'max:255'],
            'package.size'        => ['nullable', Rule::in(['S', 'M', 'L', 'XL'])],

            // ===== Origine (vendeur / retrait) — GPS obligatoire =====
            'origin'          => ['required', 'array'],
            'origin.name'     => ['required', 'string', 'max:150'],
            'origin.phone'    => ['required', 'string', 'max:20'],
            'origin.street'   => ['nullable', 'string', 'max:255'],
            'origin.landmark' => ['nullable', 'string', 'max:255'],
            'origin.quartier' => ['required', 'string', 'max:100'],
            'origin.city'     => ['required', 'string', 'max:100'],
            'origin.lat'      => ['required', 'numeric', 'between:-90,90', 'not_in:0'],
            'origin.lng'      => ['required', 'numeric', 'between:-180,180', 'not_in:0'],
            'origin.instructions' => ['nullable', 'string'],

            // ===== Destination (client) — souvent incomplète à la commande =====
            'destination'          => ['required', 'array'],
            'destination.name'     => ['nullable', 'string', 'max:150'],
            'destination.phone'    => ['required', 'string', 'max:20'], // WhatsApp du client
            'destination.address'  => ['nullable', 'string', 'max:255'], // adresse texte libre
            'destination.landmark' => ['nullable', 'string', 'max:255'],
            'destination.quartier' => ['nullable', 'string', 'max:100'],
            'destination.city'     => ['nullable', 'string', 'max:100'],
            'destination.lat'      => ['required', 'numeric', 'between:-90,90', 'not_in:0'],
            'destination.lng'      => ['required', 'numeric', 'between:-180,180', 'not_in:0'],
            'destination.instructions' => ['nullable', 'string'],

            // ===== Encaissement à la livraison (paiement à la livraison éventuel) =====
            'collection_amount' => ['nullable', 'numeric', 'min:0'],
            'collection_method' => ['nullable', Rule::in(['cash', 'mobile_money', 'prepaid'])],
        ];
    }
}
