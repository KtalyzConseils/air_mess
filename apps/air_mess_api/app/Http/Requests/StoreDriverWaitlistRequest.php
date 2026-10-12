<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDriverWaitlistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // The current landing questionnaire is validated in the controller
        // because it has a versioned nested payload. Both questionnaire formats
        // still use this single public waitlist endpoint.
        if ($this->input('survey') === 'airmess_livreurs') {
            return [];
        }

        return [
            'vehicle_type' => ['required', 'string', Rule::in([
                'Vélo',
                'Scooter',
                'Moto',
                'Voiture',
            ])],

            'zone' => ['required', 'string', Rule::in(['Cotonou', 'Abomey-Calavi', 'Autre'])],
            'zone_other' => ['nullable', 'string', 'max:160'],

            'experience' => ['required', 'string', Rule::in([
                'Je débute, aucune expérience',
                'Moins de 6 mois',
                '6 mois à 1 an',
                '1 à 3 ans',
                'Plus de 3 ans',
            ])],

            'availability' => ['required', 'string', Rule::in([
                'À temps plein',
                'À temps partiel',
                'Soirs et week-ends uniquement',
                'Je déciderai selon les commandes',
            ])],

            'source' => ['nullable', 'string', Rule::in([
                'WhatsApp',
                'Publicité Facebook',
                'Publicité Google',
                'Site web Airmess',
                'LinkedIn',
                'Autre',
            ])],
            'source_other' => ['nullable', 'string', 'max:160'],

            'platforms_used' => ['required', 'array', 'min:1'],
            'platforms_used.*' => ['string', Rule::in([
                'Aucune',
                'Gozem',
                'Une autre plateforme de livraison',
                'Une application de taxi',
                'Je travaille en direct avec des clients',
                'Autre',
            ])],
            'platforms_used_other' => ['nullable', 'string', 'max:160'],

            'weekly_deliveries' => ['required', 'string', Rule::in([
                'Moins de 10',
                '10 à 30',
                '30 à 50',
                'Plus de 50',
            ])],

            'weekly_income' => ['required', 'string', Rule::in([
                'Moins de 15 000 FCFA',
                '15 000 à 30 000 FCFA',
                '30 000 à 50 000 FCFA',
                '50 000 à 75 000 FCFA',
                'Plus de 75 000 FCFA',
            ])],

            'problems' => ['required', 'array', 'min:1'],
            'problems.*' => ['string', Rule::in([
                'Pas assez de commandes stables',
                'Clients difficiles à joindre ou à localiser',
                'Encaissement cash risqué (vol, erreur de monnaie)',
                'Coût du carburant ou entretien du véhicule',
                "Pas de protection en cas d'accident",
                'Litiges fréquents avec les clients',
                'Aucun problème particulier',
                'Autre',
            ])],
            'problems_other' => ['nullable', 'string', 'max:160'],

            'worst_experience' => ['required', 'string', 'max:2000'],

            'expected_payment_model' => ['required', 'string', Rule::in([
                'Un montant fixe par course',
                'Un pourcentage du prix de la course',
                'Un mélange des deux',
                'Je ne sais pas',
            ])],

            'expected_weekly_income' => ['required', 'string', Rule::in([
                'Moins de 20 000 FCFA',
                '20 000 à 40 000 FCFA',
                '40 000 à 60 000 FCFA',
                'Plus de 60 000 FCFA',
            ])],

            'mobile_money_trust' => ['required', 'string', Rule::in([
                'Oui, totalement',
                'Oui, mais avec des réserves',
                'Non, je préfère le cash',
                "Je n'utilise pas le Mobile Money",
            ])],

            'interest_level' => ['required', 'integer', 'between:1,5'],

            'launch_availability' => ['required', 'string', Rule::in([
                'Oui, dès le lancement',
                'Oui, sous quelques semaines',
                'Non, plus tard',
                "Je veux d'abord en savoir plus",
            ])],

            'full_name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'string', 'email:rfc'],
            'whatsapp' => ['required', 'string', 'regex:/^(\+229)?[0-9]{8}$/'],
        ];
    }
}
