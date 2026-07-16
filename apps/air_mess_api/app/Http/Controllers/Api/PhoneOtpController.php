<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BrevoSmsService;
use App\Services\PhoneVerificationToken;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Vérification d'un numéro de téléphone par code SMS (OTP), pour l'inscription
 * livreur depuis l'app mobile. Équivalent maison du Firebase Phone Auth du web.
 *
 * Flux : send (envoie un code) → verify (échange code contre un jeton signé) →
 * le jeton est passé à POST /auth/register/driver comme preuve de possession.
 */
class PhoneOtpController extends Controller
{
    private const CODE_TTL       = 600; // 10 min de validité du code
    private const RESEND_COOLDOWN = 45;  // délai mini entre deux envois
    private const MAX_ATTEMPTS    = 5;   // essais de code avant invalidation

    public function send(Request $request, BrevoSmsService $sms): JsonResponse
    {
        $request->merge(['phone' => Phone::normalize((string) $request->input('phone'))]);
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
        ]);
        $phone = $data['phone'];

        // Numéro déjà rattaché à un compte : inutile d'envoyer un SMS.
        if (\App\Models\User::where('phone', $phone)->exists()) {
            throw ValidationException::withMessages([
                'phone' => ['Ce numéro est déjà utilisé par un compte.'],
            ]);
        }

        // Anti-spam : un envoi toutes les RESEND_COOLDOWN secondes par numéro.
        $cooldownKey = "otp:cooldown:{$phone}";
        if (Cache::has($cooldownKey)) {
            throw ValidationException::withMessages([
                'phone' => ['Patientez quelques secondes avant de redemander un code.'],
            ]);
        }

        $code = (string) random_int(100000, 999999);
        Cache::put("otp:code:{$phone}", ['hash' => Hash::make($code), 'attempts' => 0], self::CODE_TTL);
        Cache::put($cooldownKey, true, self::RESEND_COOLDOWN);

        $sms->send($phone, "RMess : votre code de vérification est {$code}. Valable 10 minutes.");

        $response = [
            'message'    => 'Code envoyé par SMS.',
            'expires_in' => self::CODE_TTL,
        ];
        // En mode SMS simulé (local/dev), on renvoie le code pour tester sans crédits.
        if (config('services.brevo.sms_fake')) {
            $response['debug_code'] = $code;
        }

        return response()->json($response);
    }

    public function verify(Request $request, PhoneVerificationToken $tokens): JsonResponse
    {
        $request->merge(['phone' => Phone::normalize((string) $request->input('phone'))]);
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
            'code'  => ['required', 'string'],
        ]);
        $phone = $data['phone'];

        $key   = "otp:code:{$phone}";
        $entry = Cache::get($key);
        if (! $entry) {
            throw ValidationException::withMessages([
                'code' => ['Code expiré ou inexistant. Demandez un nouveau code.'],
            ]);
        }

        if ($entry['attempts'] >= self::MAX_ATTEMPTS) {
            Cache::forget($key);
            throw ValidationException::withMessages([
                'code' => ['Trop de tentatives. Demandez un nouveau code.'],
            ]);
        }

        if (! Hash::check($data['code'], $entry['hash'])) {
            $entry['attempts']++;
            Cache::put($key, $entry, self::CODE_TTL);
            throw ValidationException::withMessages([
                'code' => ['Code incorrect.'],
            ]);
        }

        // Succès : le code est consommé, on délivre le jeton de vérification.
        Cache::forget($key);
        Cache::forget("otp:cooldown:{$phone}");

        return response()->json([
            'message'                  => 'Numéro vérifié.',
            'phone_verification_token' => $tokens->issue($phone),
        ]);
    }
}
