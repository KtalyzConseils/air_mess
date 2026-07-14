<?php

namespace App\Support;

class Phone
{
    /**
     * Normalise un numéro vers le format E.164 (celui du claim `phone_number`
     * des jetons Firebase) : "+229 01 90 12 34 56" → "+2290190123456".
     *
     * - retire espaces, tirets, points et parenthèses ;
     * - "00" initial converti en "+" ;
     * - sans indicatif, on préfixe +229 (Bénin — numéros locaux 8 ou 10 chiffres,
     *   le plan 2021 préfixe les mobiles en "01").
     *
     * Doit rester alignée avec normalizePhone() côté marchant-web, sinon le
     * numéro vérifié par Firebase ne matchera jamais celui soumis au register.
     */
    public static function normalize(string $raw): string
    {
        $phone = preg_replace('/[\s\-\.\(\)]+/', '', trim($raw)) ?? '';

        if (str_starts_with($phone, '00')) {
            $phone = '+' . substr($phone, 2);
        }

        if ($phone !== '' && ! str_starts_with($phone, '+')) {
            $phone = '+229' . $phone;
        }

        return $phone;
    }
}
