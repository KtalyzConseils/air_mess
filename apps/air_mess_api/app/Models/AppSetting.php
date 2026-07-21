<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class AppSetting extends Model
{
    protected $fillable = ['key', 'value', 'type', 'label', 'description', 'choices', 'group', 'updated_by'];

    protected $casts = [
        'choices' => 'array',
    ];

    private const CACHE_KEY_PREFIX = 'app_setting:';
    private const CACHE_TTL = 3600; // 1h

    /**
     * Récupère une valeur (avec cast automatique selon `type`).
     * Met en cache pour éviter une requête SQL à chaque appel.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        return Cache::remember(
            self::CACHE_KEY_PREFIX . $key,
            self::CACHE_TTL,
            function () use ($key, $default) {
                $setting = self::where('key', $key)->first();
                if (! $setting) {
                    return $default;
                }
                return self::castValue($setting->value, $setting->type);
            },
        );
    }

    /**
     * Met à jour une valeur et invalide le cache.
     */
    public static function set(string $key, mixed $value, ?int $userId = null): void
    {
        $setting = self::where('key', $key)->firstOrFail();
        $setting->update([
            'value'      => self::serializeValue($value, $setting->type),
            'updated_by' => $userId,
        ]);
        Cache::forget(self::CACHE_KEY_PREFIX . $key);
    }

    private static function castValue(string $raw, string $type): mixed
    {
        return match ($type) {
            'number'  => str_contains($raw, '.') ? (float) $raw : (int) $raw,
            'boolean' => $raw === 'true' || $raw === '1',
            'json'    => json_decode($raw, true),
            default   => $raw,
        };
    }

    private static function serializeValue(mixed $value, string $type): string
    {
        return match ($type) {
            'boolean' => $value ? 'true' : 'false',
            'json'    => json_encode($value),
            default   => (string) $value,
        };
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
