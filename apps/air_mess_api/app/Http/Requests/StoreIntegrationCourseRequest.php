<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validation de la création de course depuis un site externe (Gbandjo/Systige).
 *
 * Plus permissive que CreateCourseRequest : la destination peut être
 * incomplète (le client n'a fourni qu'un contact + parfois une adresse texte
 * sans GPS), et l'origine (vendeur) peut arriver sans coordonnées.
 *
 * L'authentification et l'ability `integration:create-course` sont déjà
 * vérifiées par le middleware de route ; on contrôle ici que le porteur de la
 * clé est bien un marchand actif et validé.
 */
class StoreIntegrationCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user || ! $user->is_active || ! $user->isMarchant()) {
            return false;
        }

        $marchant = $user->marchant;

        // L'accès API est réservé aux plans avec `api_access` (Starter/Pro/Business).
        // On revérifie ici (pas seulement à la génération de clé) pour invalider une
        // clé existante si le marchand rétrograde vers un plan sans API.
        return $marchant
            && $marchant->validated_at
            && $marchant->hasApiAccess();
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

            // ===== Origine (vendeur / retrait) — coordonnées facultatives =====
            'origin'          => ['required', 'array'],
            'origin.name'     => ['required', 'string', 'max:150'],
            'origin.phone'    => ['required', 'string', 'max:20'],
            'origin.street'   => ['nullable', 'string', 'max:255'],
            'origin.landmark' => ['nullable', 'string', 'max:255'],
            'origin.quartier' => ['required', 'string', 'max:100'],
            'origin.city'     => ['required', 'string', 'max:100'],
            'origin.lat'      => ['nullable', 'numeric', 'between:-90,90'],
            'origin.lng'      => ['nullable', 'numeric', 'between:-180,180'],
            'origin.instructions' => ['nullable', 'string'],

            // ===== Destination (client) — souvent incomplète à la commande =====
            'destination'          => ['required', 'array'],
            'destination.name'     => ['nullable', 'string', 'max:150'],
            'destination.phone'    => ['required', 'string', 'max:20'], // WhatsApp du client
            'destination.address'  => ['nullable', 'string', 'max:255'], // adresse texte libre
            'destination.landmark' => ['nullable', 'string', 'max:255'],
            'destination.quartier' => ['nullable', 'string', 'max:100'],
            'destination.city'     => ['nullable', 'string', 'max:100'],
            'destination.lat'      => ['nullable', 'numeric', 'between:-90,90'],
            'destination.lng'      => ['nullable', 'numeric', 'between:-180,180'],
            'destination.instructions' => ['nullable', 'string'],

            // ===== Encaissement à la livraison (paiement à la livraison éventuel) =====
            'collection_amount' => ['nullable', 'numeric', 'min:0'],
            'collection_method' => ['nullable', Rule::in(['cash', 'mobile_money', 'prepaid'])],
        ];
    }
}
