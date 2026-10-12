<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDriverWaitlistRequest;
use App\Mail\DriverWaitlistNotificationMail;
use App\Models\DriverWaitlist;
use App\Services\PhoneVerificationToken;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class DriverWaitlistController extends Controller
{
    public function store(
        StoreDriverWaitlistRequest $request,
        PhoneVerificationToken $tokens,
    ): JsonResponse
    {
        if ($request->input('survey') === 'airmess_livreurs') {
            return $this->storeSurvey($request, $tokens);
        }

        $waitlist = DriverWaitlist::create($request->validated() + [
            'status' => DriverWaitlist::STATUS_WAITLISTED,
            'ip_address' => $request->ip(),
        ]);

        try {
            Mail::to(config('services.driver_waitlist.notification_email'))
                ->send(new DriverWaitlistNotificationMail($waitlist));
        } catch (\Throwable $e) {
            Log::warning('DriverWaitlistNotificationMail failed', [
                'error' => $e->getMessage(),
                'waitlist_id' => $waitlist->id,
            ]);
        }

        return response()->json([
            'message' => "Votre inscription sur la liste d'attente des livreurs est confirmée.",
            'waitlist' => [
                'id' => $waitlist->id,
                'status' => $waitlist->status,
                'created_at' => $waitlist->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * Persist the questionnaire used by the public drivers landing page.
     *
     * The response id is supplied by the browser and is unique, which makes a
     * retry safe after a flaky mobile connection. Submissions without account
     * data are still useful survey results and are stored with survey_only status.
     */
    private function storeSurvey(
        Request $request,
        PhoneVerificationToken $tokens,
    ): JsonResponse {
        $data = $request->validate([
            'survey' => ['required', 'string', 'in:airmess_livreurs'],
            'version' => ['required', 'string', 'max:20'],
            'mode' => ['required', 'string', 'max:20'],
            'response' => ['required', 'array'],
            'response.response_id' => ['required', 'string', 'max:100'],
            'response.started_at' => ['required', 'date'],
            'response.submitted_at' => ['required', 'date'],
            'response.duration_s' => ['required', 'integer', 'min:0'],
            'response.suspect' => ['required', 'boolean'],
            'response.src' => ['nullable', 'string', 'max:160'],
            'response.completed' => ['required', 'boolean'],
            'response.stop_reason' => ['nullable', 'string', 'max:255'],
            'response.answers' => ['required', 'array'],
            'account' => ['nullable', 'array'],
            'account.prenom' => ['required_with:account', 'string', 'max:100'],
            'account.nom' => ['required_with:account', 'string', 'max:100'],
            'account.telephone' => ['required_with:account', 'string', 'max:20'],
            'account.operateur' => ['required_with:account', 'string', 'max:80'],
            'account.zone' => ['required_with:account', 'string', 'max:160'],
            'account.majeur' => ['required_with:account', 'accepted'],
            'account.consentements' => ['required_with:account', 'array'],
            'account.verification_token' => ['required_with:account', 'string'],
            'account.profil_operationnel' => ['required_with:account', 'array'],
            'account.bonus_demande' => ['required_with:account', 'boolean'],
            'account.source' => ['nullable', 'string', 'max:80'],
            'account.src' => ['nullable', 'string', 'max:160'],
        ]);

        $account = $data['account'] ?? null;
        $phone = null;

        if ($account !== null) {
            $phone = Phone::normalize($account['telephone']);
            $verifiedPhone = $tokens->verify($account['verification_token']);

            if ($verifiedPhone === null || $verifiedPhone !== $phone) {
                return response()->json([
                    'message' => 'Le jeton de verification du numero est invalide ou expire.',
                ], 422);
            }

            $account['telephone'] = $phone;
        }

        $answers = $data['response']['answers'];
        $profile = $account['profil_operationnel'] ?? [];
        $zone = $account['zone'] ?? ($answers['A1'] ?? null);
        $fullName = $account === null
            ? null
            : trim($account['prenom'] . ' ' . $account['nom']);

        $waitlist = DriverWaitlist::firstOrCreate(
            ['survey_response_id' => $data['response']['response_id']],
            [
                'survey_version' => $data['version'],
                'survey_mode' => $data['mode'],
                'survey_payload' => $data['response'],
                'account_payload' => $account,
                'survey_started_at' => $data['response']['started_at'],
                'survey_submitted_at' => $data['response']['submitted_at'],
                'survey_duration_seconds' => $data['response']['duration_s'],
                'survey_suspect' => $data['response']['suspect'],
                'vehicle_type' => ($answers['A2'] ?? null) === 'Oui' ? 'Moto' : null,
                'zone' => $zone,
                'experience' => $profile['experience_livraison'] ?? ($answers['S4'] ?? null),
                'availability' => $profile['jours_par_semaine'] ?? ($answers['B1'] ?? null),
                'source' => $data['response']['src'] ?? ($account['src'] ?? null),
                'full_name' => $fullName,
                'whatsapp' => $phone,
                'status' => $account === null ? 'survey_only' : DriverWaitlist::STATUS_WAITLISTED,
                'ip_address' => $request->ip(),
            ],
        );

        return response()->json([
            'compte' => [
                'id' => $account === null ? null : sprintf('LIV-%06d', $waitlist->id),
                'statut' => $account === null ? 'non_ouvert' : 'en_liste_attente',
                'deja_existant' => ! $waitlist->wasRecentlyCreated,
            ],
            'liste_attente' => [
                'zone' => $zone,
                'position_zone' => null,
            ],
            'bonus' => [
                'statut' => $account === null ? 'non_attribue' : 'en_verification',
                'montant' => $account === null ? '0 FCFA' : '500 FCFA',
            ],
        ], $waitlist->wasRecentlyCreated ? 201 : 200);
    }
}
