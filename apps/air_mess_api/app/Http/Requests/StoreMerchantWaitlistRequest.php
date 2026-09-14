<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMerchantWaitlistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'commerce_type' => ['required', 'string', Rule::in([
                'Restauration rapide / plats préparés',
                'Épicerie / supermarché',
                'Produits frais (fruits, légumes, viande, poisson)',
                'Autre commerce de détail',
                'Autre',
            ])],
            'commerce_type_other' => ['nullable', 'string', 'max:160'],

            'zone' => ['required', 'string', Rule::in(['Cotonou', 'Abomey-Calavi', 'Autre'])],
            'zone_other' => ['nullable', 'string', 'max:160'],

            'weekly_orders' => ['required', 'string', Rule::in([
                'Moins de 10',
                '10 à 30',
                '30 à 70',
                'Plus de 70',
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

            'delivery_methods' => ['required', 'array', 'min:1'],
            'delivery_methods.*' => ['string', Rule::in([
                'Je ne livre pas, vente sur place uniquement',
                'Moi-même ou un employé du commerce',
                'Un ou des zémidjans sollicités au cas par cas',
                "Un livreur que j'emploie à temps plein",
                'Une plateforme de livraison existante',
                'Autre',
            ])],
            'delivery_methods_other' => ['nullable', 'string', 'max:160'],

            'problems' => ['required', 'array', 'min:1'],
            'problems.*' => ['string', Rule::in([
                'Coût trop élevé',
                'Livreurs non fiables / en retard',
                'Pas de livreur disponible aux heures de pointe',
                'Difficile de trouver un livreur de confiance',
                "Problèmes avec l'argent collecté par le livreur (retard, montant incorrect, disparition)",
                'Clients mécontents des délais',
                'Produits endommagés ou renversés en route',
                'Communication difficile avec le client pendant la livraison',
                'Aucun problème particulier',
                'Autre',
            ])],
            'problems_other' => ['nullable', 'string', 'max:160'],

            'worst_experience' => ['required', 'string', 'max:2000'],

            'cash_collection_issue' => ['required', 'string', Rule::in([
                'Oui, plusieurs fois',
                'Oui, une fois',
                'Non, jamais',
                "Je ne fais pas encaisser mes livreurs (paiement à l'avance ou sur place)",
            ])],

            'time_lost_weekly' => ['required', 'string', Rule::in([
                "Moins d'1 heure",
                '1 à 3 heures',
                '3 à 6 heures',
                'Plus de 6 heures',
            ])],

            'orders_lost_weekly' => ['required', 'string', Rule::in([
                'Aucune',
                '1 à 3',
                '4 à 10',
                'Plus de 10',
            ])],

            'expected_benefit' => ['required', 'string', 'max:2000'],

            'commission_acceptance' => ['required', 'string', Rule::in([
                'Oui, sans hésiter',
                'Oui, si le prix est raisonnable',
                'Non, je préfère gérer moi-même',
                'Je ne sais pas',
            ])],

            'reasonable_fee' => ['required', 'string', Rule::in([
                'Moins de 300 FCFA',
                '300 à 500 FCFA',
                '500 à 750 FCFA',
                '750 à 1000 FCFA',
                'Plus de 1000 FCFA',
                'Je ne sais pas',
            ])],

            'mobile_money_trust' => ['required', 'string', Rule::in([
                'Oui, totalement',
                'Oui, mais avec des réserves',
                'Non, je préfère le cash',
                "Je n'utilise pas le Mobile Money",
            ])],

            'interest_level' => ['required', 'integer', 'between:1,5'],

            'trial_interest' => ['required', 'string', Rule::in([
                'Oui',
                'Non',
                "Peut-être, j'ai besoin d'en savoir plus",
            ])],

            'shop_name' => ['nullable', 'string', 'max:160'],
            'contact_name' => ['nullable', 'string', 'max:160'],
            'email' => ['required', 'string', 'email:rfc'],
            'whatsapp' => ['nullable', 'string', 'regex:/^(\+229)?[0-9]{8}$/'],
        ];
    }
}
