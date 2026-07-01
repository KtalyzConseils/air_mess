<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use Illuminate\Http\JsonResponse;

/**
 * Liste des plans API disponibles pour un user qui veut activer le mode dev.
 * Endpoint public authentifié : n'importe quel user connecté (marchand,
 * particulier) peut voir la grille pour choisir.
 */
class ApiPlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = SubscriptionPlan::query()
            ->where('is_api_plan', true)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'code', 'name', 'monthly_price_fcfa', 'api_requests_monthly', 'description', 'features'])
            ->map(fn (SubscriptionPlan $p) => [
                'id'                   => $p->id,
                'code'                 => $p->code,
                'name'                 => $p->name,
                'monthly_price_fcfa'   => (int) $p->monthly_price_fcfa,
                'api_requests_monthly' => (int) ($p->api_requests_monthly ?? 0),
                'description'          => $p->description,
                'features'             => $p->features ?? [],
            ]);

        return response()->json(['data' => $plans]);
    }
}
