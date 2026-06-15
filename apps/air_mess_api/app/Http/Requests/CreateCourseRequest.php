<?php

namespace App\Http\Requests;

use App\Models\Course;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateCourseRequest extends FormRequest
{
    /**
     * Autorise la requête seulement si l'utilisateur est marchant ou particulier,
     * actif, et (pour marchant) validé.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user || ! $user->is_active) {
            return false;
        }

        if ($user->isMarchant()) {
            $marchant = $user->marchant;
            if (! $marchant || ! $marchant->validated_at) {
                return false;
            }
            if (! in_array($marchant->subscription_status, ['trial', 'active'], true)) {
                return false;
            }
            // Le check de quota se fait dans le controller pour retourner un message clair (au lieu d'un 403 muet).
            return true;
        }

        if ($user->isIndividual()) {
            // Le check de quota se fait dans le controller : au-delà du quota le particulier
            // peut payer la course à l'unité (flux one-shot).
            return true;
        }

        return false; // livreurs et admins ne peuvent pas créer de course
    }

    public function rules(): array
    {
        return [
            'package_category_id'      => ['required', 'exists:package_categories,id'],
            'urgency'                  => ['nullable', Rule::in(['standard', 'express'])],
            'package_description'      => ['required', 'string', 'max:255'],
            'package_size'             => ['required', Rule::in(['S', 'M', 'L', 'XL'])],
            'package_weight_kg'        => ['nullable', 'numeric', 'min:0', 'max:50'],
            'package_declared_value'   => ['nullable', 'numeric', 'min:0'],

            // Origine
            'origin_name'              => ['required', 'string', 'max:150'],
            'origin_phone'             => ['required', 'string', 'max:20'],
            'origin_street'            => ['nullable', 'string', 'max:255'],
            'origin_landmark'          => ['nullable', 'string', 'max:255'],
            'origin_quartier'          => ['required', 'string', 'max:100'],
            'origin_city'              => ['required', 'string', 'max:100'],
            'origin_lat'               => ['required', 'numeric', 'between:-90,90'],
            'origin_lng'               => ['required', 'numeric', 'between:-180,180'],
            'origin_instructions'      => ['nullable', 'string'],

            // Destination
            'destination_name'         => ['required', 'string', 'max:150'],
            'destination_phone'        => ['required', 'string', 'max:20'],
            'destination_street'       => ['nullable', 'string', 'max:255'],
            'destination_landmark'     => ['nullable', 'string', 'max:255'],
            'destination_quartier'     => ['required', 'string', 'max:100'],
            'destination_city'         => ['required', 'string', 'max:100'],
            'destination_lat'          => ['required', 'numeric', 'between:-90,90'],
            'destination_lng'          => ['required', 'numeric', 'between:-180,180'],
            'destination_instructions' => ['nullable', 'string'],

            // Encaissement
            'has_collection'           => ['boolean'],
            'collection_amount'        => ['required_if:has_collection,true', 'nullable', 'numeric', 'min:0'],
            'collection_method'        => ['required_if:has_collection,true', 'nullable', Rule::in(['cash', 'mobile_money', 'prepaid'])],

            // Timing
            'scheduled_for'            => ['nullable', 'date', 'after:now'],

            // Pour le flux one-shot (particulier au-delà du quota) : URL de retour Fedapay
            'callback_url'             => ['nullable', 'url'],
        ];
    }

    public function messages(): array
    {
        return [
            'authorize.failed' => 'Vous n\'êtes pas autorisé à créer une course.',
        ];
    }
}
