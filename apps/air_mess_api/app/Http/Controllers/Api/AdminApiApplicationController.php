<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Panel admin des ApiApplications.
 *
 *   GET   /admin/api-apps                   liste paginée (search + statut)
 *   GET   /admin/api-apps/{app}             détail (avec compteur de courses créées)
 *   POST  /admin/api-apps/{app}/suspend     suspendre (bloque les nouvelles courses)
 *   POST  /admin/api-apps/{app}/reactivate  réactiver
 *
 * La lecture est partagée (commercial+ops+support) ; la suspension est
 * commerciale (mêmes règles que suspension d'un marchand).
 */
class AdminApiApplicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $status = $request->query('status'); // active|suspended|null

        $query = ApiApplication::query()
            ->with(['user:id,email,phone,type,first_name,last_name', 'plan:id,code,name,api_requests_monthly'])
            ->withCount('courses')
            ->orderByDesc('id');

        if ($search !== '') {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)
                  ->orWhereHas('user', fn ($u) => $u->where('email', 'like', $like)
                      ->orWhere('phone', 'like', $like));
            });
        }
        if (in_array($status, [ApiApplication::STATUS_ACTIVE, ApiApplication::STATUS_SUSPENDED], true)) {
            $query->where('status', $status);
        }

        $page = $query->paginate(20);

        $page->getCollection()->transform(fn (ApiApplication $a) => $this->present($a));

        return response()->json($page);
    }

    public function show(ApiApplication $app): JsonResponse
    {
        $app->load(['user:id,email,phone,type,first_name,last_name', 'plan:id,code,name,api_requests_monthly'])
            ->loadCount('courses');

        return response()->json(['data' => $this->present($app)]);
    }

    public function suspend(ApiApplication $app): JsonResponse
    {
        $app->update(['status' => ApiApplication::STATUS_SUSPENDED]);
        return response()->json(['data' => $this->present($app->fresh(['user', 'plan'])->loadCount('courses'))]);
    }

    public function reactivate(ApiApplication $app): JsonResponse
    {
        $app->update(['status' => ApiApplication::STATUS_ACTIVE]);
        return response()->json(['data' => $this->present($app->fresh(['user', 'plan'])->loadCount('courses'))]);
    }

    private function present(ApiApplication $app): array
    {
        $app->resetPeriodIfNeeded();

        return [
            'id'              => $app->id,
            'name'            => $app->name,
            'description'     => $app->description,
            'status'          => $app->status,
            'quota_used'      => (int) $app->quota_used,
            'quota_limit'     => $app->monthlyLimit(),
            'quota_remaining' => $app->remainingQuota(),
            'courses_count'   => (int) ($app->courses_count ?? 0),
            'created_at'      => $app->created_at?->toIso8601String(),
            'owner' => $app->user ? [
                'id'        => $app->user->id,
                'type'      => $app->user->type,
                'email'     => $app->user->email,
                'phone'     => $app->user->phone,
                'full_name' => trim(($app->user->first_name ?? '') . ' ' . ($app->user->last_name ?? '')),
            ] : null,
            'plan' => $app->plan ? [
                'id'                   => $app->plan->id,
                'code'                 => $app->plan->code,
                'name'                 => $app->plan->name,
                'api_requests_monthly' => (int) ($app->plan->api_requests_monthly ?? 0),
            ] : null,
        ];
    }
}
