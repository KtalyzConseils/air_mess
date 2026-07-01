<?php

namespace App\Models;

use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

/**
 * ApiApplication — une "app dev" d'un user (marchand ou particulier).
 *
 * Une application porte :
 *   - un plan API (Starter / Pro / Premium) qui fixe le quota mensuel
 *   - un compteur `quota_used` reset au 1er de chaque mois (lazy)
 *   - un statut (active / suspended)
 *   - une (ou plusieurs) clés Sanctum scopées, créées via `IntegrationKeyController`
 *
 * Elle NE porte PAS de solde propre : le paiement des courses créées via cette
 * app est débité du wallet du user propriétaire ([[project_wallet_user]]).
 */
class ApiApplication extends Model implements AuthenticatableContract
{
    use HasFactory;
    use HasApiTokens; // permet $app->createToken(...) et l'auth via `auth:sanctum`
    // Rend l'ApiApplication utilisable comme "user" côté Sanctum : le
    // middleware throttle appelle getAuthIdentifier(), le middleware
    // auth:sanctum utilise Authenticatable pour identifier le porteur du token.
    use Authenticatable;

    public const STATUS_ACTIVE    = 'active';
    public const STATUS_SUSPENDED = 'suspended';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'quota_period_started_at' => 'datetime',
            'paid_until'              => 'datetime',
        ];
    }

    // ─── Relations ─────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
    }

    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }

    public function webhookDeliveries(): HasMany
    {
        return $this->hasMany(WebhookDelivery::class);
    }

    // NB : la relation `tokens()` est fournie par le trait HasApiTokens.
    // Elle est polymorphe : `tokenable_type = ApiApplication`.

    // ─── État ──────────────────────────────────────────────────────────

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /** True si l'app a une URL webhook + un secret HMAC configurés. */
    public function hasWebhookConfigured(): bool
    {
        return ! empty($this->webhook_url) && ! empty($this->webhook_secret);
    }

    /** Quota mensuel de requêtes API accordé par le plan. 0 = illimité. */
    public function monthlyLimit(): int
    {
        return (int) ($this->plan?->api_requests_monthly ?? 0);
    }

    /**
     * Consommation restante ce mois. Renvoie `null` si le plan est illimité.
     */
    public function remainingQuota(): ?int
    {
        $limit = $this->monthlyLimit();
        if ($limit === 0) {
            return null; // illimité
        }
        return max(0, $limit - (int) $this->quota_used);
    }

    /**
     * Reset paresseux : si la période courante est ancienne (mois calendaire
     * différent), on remet le compteur à zéro. Appelé avant chaque
     * `canConsumeRequest()` et `consumeRequest()`.
     */
    public function resetPeriodIfNeeded(): void
    {
        $now = Carbon::now();
        $started = $this->quota_period_started_at;

        // Jamais initialisée OU on a changé de mois calendaire (UTC).
        $needsReset = ! $started
            || $started->month !== $now->month
            || $started->year !== $now->year;

        if ($needsReset) {
            $this->quota_used = 0;
            $this->quota_period_started_at = $now->startOfMonth();
            $this->save();
        }
    }

    /**
     * Peut-elle consommer 1 requête ? Reset paresseux avant vérification.
     * Renvoie `false` si suspendue OU quota atteint.
     */
    public function canConsumeRequest(): bool
    {
        if (! $this->isActive()) {
            return false;
        }
        $this->resetPeriodIfNeeded();

        $limit = $this->monthlyLimit();
        if ($limit === 0) {
            return true; // illimité
        }
        return $this->quota_used < $limit;
    }

    /**
     * Incrémente le compteur de requêtes après un appel réussi. À appeler
     * DANS la transaction de création de course pour cohérence.
     */
    public function consumeRequest(): void
    {
        $this->resetPeriodIfNeeded();
        $this->increment('quota_used');
    }
}
