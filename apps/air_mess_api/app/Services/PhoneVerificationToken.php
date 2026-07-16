<?php

namespace App\Services;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;

/**
 * Jeton court prouvant qu'un numéro a été vérifié par OTP SMS (app mobile).
 *
 * Équivalent mobile du jeton Firebase utilisé côté web : au lieu de faire
 * confiance à Firebase, on émet nous-mêmes un jeton chiffré (donc infalsifiable
 * et confidentiel via APP_KEY) après vérification du code SMS. `registerDriver`
 * l'accepte en alternative au `firebase_id_token`.
 */
class PhoneVerificationToken
{
    /** Durée de validité du jeton après vérification du code (le temps de finir le formulaire). */
    private const TTL_SECONDS = 900; // 15 min

    private const PURPOSE = 'driver_register';

    /**
     * Émet un jeton pour un numéro (déjà normalisé E.164) tout juste vérifié.
     */
    public function issue(string $phoneE164): string
    {
        return Crypt::encryptString(json_encode([
            'phone'   => $phoneE164,
            'purpose' => self::PURPOSE,
            'exp'     => now()->getTimestamp() + self::TTL_SECONDS,
        ]));
    }

    /**
     * Vérifie un jeton et retourne le numéro E.164 prouvé, ou null si le jeton
     * est invalide, expiré, altéré ou d'un autre usage.
     */
    public function verify(string $token): ?string
    {
        try {
            $payload = json_decode(Crypt::decryptString($token), true);
        } catch (DecryptException) {
            return null;
        }

        if (! is_array($payload)
            || ($payload['purpose'] ?? null) !== self::PURPOSE
            || ! isset($payload['phone'], $payload['exp'])
            || now()->getTimestamp() > (int) $payload['exp']
        ) {
            return null;
        }

        return (string) $payload['phone'];
    }
}
