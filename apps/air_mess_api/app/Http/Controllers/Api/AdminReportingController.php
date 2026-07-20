<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DriverWallet;
use App\Models\PlatformEarning;
use App\Models\UserWallet;
use App\Models\UserWalletTransaction;
use App\Models\WalletTransaction;
use App\Models\WalletWithdrawRequest;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Reporting compta admin — vue d'ensemble des mouvements financiers.
 *
 * Sources agrégées :
 *  - wallet_transactions (driver) : deposit, withdraw, earning, pickup_debit,
 *    refund, adjustment_credit/debit
 *  - user_wallet_transactions (marchand + particulier) : deposit, course_charge,
 *    withdraw, refund, adjustment_credit/debit, collection_credit
 *  - platform_earnings : delivery_fee sur courses recipient-paid (revenus directs)
 *
 * Toutes les métriques sont scoped à une période paramétrable — le calcul
 * reste rapide (index sur created_at + petits volumes MVP).
 */
class AdminReportingController extends Controller
{
    /**
     * Point d'entrée unique du dashboard reporting wallet.
     *
     * Params :
     *  - from, to (YYYY-MM-DD) : période explicite
     *  - days (int) : raccourci "N derniers jours" (7 / 30 / 90). Défaut 30.
     *  Si `from`/`to` sont fournis, `days` est ignoré.
     */
    public function wallets(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to'   => ['nullable', 'date_format:Y-m-d'],
            'days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);

        [$from, $to] = $this->resolvePeriod($data);
        $days        = $from->diffInDays($to) + 1;

        return response()->json([
            'period'              => [
                'from' => $from->toDateString(),
                'to'   => $to->toDateString(),
                'days' => (int) $days,
            ],
            'kpis'                => $this->computeKpis($from, $to),
            'daily_series'        => $this->computeDailySeries($from, $to),
            'type_breakdown'      => $this->computeTypeBreakdown($from, $to),
            'top_movers'          => $this->computeTopMovers($from, $to),
            'pending_withdrawals' => $this->computePendingWithdrawals(),
        ]);
    }

    /**
     * Résout la période effective à partir des paramètres. `from`/`to` sont bornés
     * (00:00 → 23:59) pour couvrir la journée entière.
     */
    private function resolvePeriod(array $data): array
    {
        if (! empty($data['from']) && ! empty($data['to'])) {
            return [
                Carbon::parse($data['from'])->startOfDay(),
                Carbon::parse($data['to'])->endOfDay(),
            ];
        }
        $days = (int) ($data['days'] ?? 30);
        return [
            now()->subDays($days - 1)->startOfDay(),
            now()->endOfDay(),
        ];
    }

    /**
     * KPIs globaux : soldes actuels (snapshot) + flux de la période.
     * NB : les soldes sont "à maintenant", pas "à la fin de la période" —
     * l'UI le mentionne clairement.
     */
    private function computeKpis(Carbon $from, Carbon $to): array
    {
        $driverBalance = (int) DriverWallet::sum('balance');
        $userBalance   = (int) UserWallet::sum('balance');
        $userReserved  = (int) UserWallet::sum('pending_reserved');

        // Cash-in = tous les deposits (driver + user) sur la période.
        $driverDeposits = (int) WalletTransaction::where('type', WalletTransaction::TYPE_DEPOSIT)
            ->whereBetween('created_at', [$from, $to])
            ->sum('amount_fcfa');
        $userDeposits   = (int) UserWalletTransaction::where('type', UserWalletTransaction::TYPE_DEPOSIT)
            ->whereBetween('created_at', [$from, $to])
            ->sum('amount_fcfa');

        // Cash-out = withdraw effectivement payés (paid_at non null) sur la période.
        // On date par paid_at car c'est le moment où l'argent QUITTE nos comptes.
        $paidWithdraws = (int) WalletWithdrawRequest::whereNotNull('paid_at')
            ->whereBetween('paid_at', [$from, $to])
            ->sum('amount_fcfa');

        // Revenus plateforme : commission (delivery_fee - driver_earnings sur courses
        // sender-paid) implicite dans les earnings, MAIS pour la trace directe on
        // s'appuie sur platform_earnings (recipient-paid uniquement pour l'instant).
        $platformRevenue = (int) PlatformEarning::whereBetween('created_at', [$from, $to])
            ->sum('amount_fcfa');

        return [
            'total_balance_fcfa'           => $driverBalance + $userBalance,
            'driver_balance_fcfa'          => $driverBalance,
            'user_balance_fcfa'            => $userBalance,
            'user_reserved_fcfa'           => $userReserved,
            'cash_in_period_fcfa'          => $driverDeposits + $userDeposits,
            'cash_out_period_fcfa'         => $paidWithdraws,
            'platform_revenue_period_fcfa' => $platformRevenue,
        ];
    }

    /**
     * Série journalière pour le time-series chart. Pour chaque jour de la période :
     *  - cash_in  : deposits driver + user
     *  - cash_out : withdrawals payés (dated par paid_at)
     *  - revenue  : platform_earnings
     *
     * Rempli avec des zéros pour les jours sans mouvement (évite les trous
     * dans le graphique côté frontend).
     */
    private function computeDailySeries(Carbon $from, Carbon $to): array
    {
        $tz = 'UTC';

        // Deposits driver par jour.
        $driverDepositsByDay = WalletTransaction::selectRaw("DATE(created_at AT TIME ZONE ?) as day, SUM(amount_fcfa) as total", [$tz])
            ->where('type', WalletTransaction::TYPE_DEPOSIT)
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('day')
            ->pluck('total', 'day');

        // Deposits user par jour.
        $userDepositsByDay = UserWalletTransaction::selectRaw("DATE(created_at AT TIME ZONE ?) as day, SUM(amount_fcfa) as total", [$tz])
            ->where('type', UserWalletTransaction::TYPE_DEPOSIT)
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('day')
            ->pluck('total', 'day');

        // Withdrawals payés (par paid_at, pas created_at).
        $withdrawalsByDay = WalletWithdrawRequest::selectRaw("DATE(paid_at AT TIME ZONE ?) as day, SUM(amount_fcfa) as total", [$tz])
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$from, $to])
            ->groupBy('day')
            ->pluck('total', 'day');

        // Revenus plateforme.
        $revenueByDay = PlatformEarning::selectRaw("DATE(created_at AT TIME ZONE ?) as day, SUM(amount_fcfa) as total", [$tz])
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('day')
            ->pluck('total', 'day');

        // Fill des jours manquants avec 0 pour un graphe continu.
        $series = [];
        for ($d = $from->copy()->startOfDay(); $d->lte($to); $d->addDay()) {
            $key         = $d->toDateString();
            $cashIn      = (int) ($driverDepositsByDay[$key] ?? 0)
                         + (int) ($userDepositsByDay[$key] ?? 0);
            $cashOut     = (int) ($withdrawalsByDay[$key] ?? 0);
            $revenue     = (int) ($revenueByDay[$key] ?? 0);
            $series[]    = [
                'date'     => $key,
                'cash_in'  => $cashIn,
                'cash_out' => $cashOut,
                'revenue'  => $revenue,
            ];
        }

        return $series;
    }

    /**
     * Ventilation par type de transaction (bar chart) — utile pour voir
     * "qu'est-ce qui a bougé le plus ce mois-ci ?". On merge driver + user
     * sur les types communs (deposit, withdraw, refund, adjustment_*).
     * Les types spécifiques restent séparés par wallet.
     */
    private function computeTypeBreakdown(Carbon $from, Carbon $to): array
    {
        $driverRows = WalletTransaction::selectRaw('type, COUNT(*) as count, SUM(ABS(amount_fcfa)) as total')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('type')
            ->get();

        $userRows = UserWalletTransaction::selectRaw('type, COUNT(*) as count, SUM(ABS(amount_fcfa)) as total')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('type')
            ->get();

        $rows = [];
        foreach ($driverRows as $r) {
            $rows[] = [
                'type'   => $r->type,
                'wallet' => 'driver',
                'count'  => (int) $r->count,
                'total'  => (int) $r->total,
            ];
        }
        foreach ($userRows as $r) {
            $rows[] = [
                'type'   => $r->type,
                'wallet' => 'user',
                'count'  => (int) $r->count,
                'total'  => (int) $r->total,
            ];
        }

        // Tri décroissant par volume — le plus gros mouvement en premier.
        usort($rows, fn ($a, $b) => $b['total'] <=> $a['total']);
        return $rows;
    }

    /**
     * Top 10 "movers" tous wallets confondus (drivers + users) sur la période.
     * Volume total mouvement = SUM(|amount|) — les plus actifs quel que soit le sens.
     * Utile pour repérer les gros comptes et détecter d'éventuelles anomalies.
     */
    private function computeTopMovers(Carbon $from, Carbon $to): array
    {
        // Drivers par volume (chaque tx compte, quel que soit le sens).
        $driverTop = WalletTransaction::selectRaw('driver_id, SUM(ABS(amount_fcfa)) as total, COUNT(*) as tx_count')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('driver_id')
            ->orderByDesc('total')
            ->limit(10)
            ->with('driver:id,first_name,last_name')
            ->get()
            ->map(fn ($r) => [
                'kind'      => 'driver',
                'id'        => (int) $r->driver_id,
                'name'      => trim(($r->driver->first_name ?? '') . ' ' . ($r->driver->last_name ?? '')) ?: "Driver #{$r->driver_id}",
                'total'     => (int) $r->total,
                'tx_count'  => (int) $r->tx_count,
            ]);

        // Users par volume.
        $userTop = UserWalletTransaction::selectRaw('user_id, SUM(ABS(amount_fcfa)) as total, COUNT(*) as tx_count')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('user_id')
            ->orderByDesc('total')
            ->limit(10)
            ->with('user:id,name')
            ->get()
            ->map(fn ($r) => [
                'kind'     => 'user',
                'id'       => (int) $r->user_id,
                'name'     => $r->user->name ?? "User #{$r->user_id}",
                'total'    => (int) $r->total,
                'tx_count' => (int) $r->tx_count,
            ]);

        // Merge + tri global décroissant, top 10.
        $merged = $driverTop->concat($userTop)->sortByDesc('total')->take(10)->values();
        return $merged->all();
    }

    /**
     * Retraits en attente (bloque de la tréso — l'admin sait combien il doit
     * décaisser prochainement). Inclut driver ET user.
     */
    private function computePendingWithdrawals(): array
    {
        $agg = WalletWithdrawRequest::where('status', WalletWithdrawRequest::STATUS_PENDING)
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(amount_fcfa), 0) as total')
            ->first();

        return [
            'count' => (int) ($agg->count ?? 0),
            'total' => (int) ($agg->total ?? 0),
        ];
    }
}
