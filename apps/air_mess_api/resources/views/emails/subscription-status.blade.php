@extends('emails.layouts.base')

@section('content')
    @if ($type === 'expired')
        <h1 style="margin:0 0 16px 0; font-size:24px; color:#0F172A;">
            🚫 Abonnement expiré
        </h1>

        <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
            Bonjour {{ $displayName }},
        </p>

        <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
            Votre abonnement <strong>{{ ucfirst($profile->subscription_plan) }}</strong> a expiré.
            @if ($isMarchant)
                Vous ne pouvez plus créer de nouvelles courses jusqu'au renouvellement.
            @else
                Pas de panique : vous gardez vos courses gratuites mensuelles. Au-delà du quota,
                vous pourrez payer à la course ou renouveler votre abonnement.
            @endif
        </p>

        <div style="background-color:#fee2e2; border-left:4px solid #ef4444; padding:12px 16px; border-radius:6px; margin:16px 0;">
            <p style="margin:0; color:#991b1b; font-size:14px;">
                <strong>Bonne nouvelle :</strong> votre compte et votre historique sont conservés.
                Il suffit de renouveler pour tout réactiver instantanément.
            </p>
        </div>

        <x-emails.button :url="$frontendUrl . '/billing'" color="danger">
            Renouveler maintenant
        </x-emails.button>
    @else
        <h1 style="margin:0 0 16px 0; font-size:24px; color:#0F172A;">
            ⏰ Votre abonnement expire bientôt
        </h1>

        <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
            Bonjour {{ $displayName }},
        </p>

        <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
            Votre abonnement <strong>{{ ucfirst($profile->subscription_plan) }}</strong> arrive à échéance
            @if ($daysRemaining === 1)
                <strong>demain</strong>.
            @else
                dans <strong>{{ $daysRemaining }} jours</strong>.
            @endif
        </p>

        <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
            Renouvelez dès maintenant pour éviter toute interruption du service —
            vos courses en attente continueront sans rupture.
        </p>

        <x-emails.button :url="$frontendUrl . '/billing'">
            Renouveler mon abonnement
        </x-emails.button>
    @endif

    <p style="margin:24px 0 0 0; line-height:1.6; font-size:13px; color:#6b7280;">
        Une question sur la facturation ? Répondez à cet email, on s'en occupe.
    </p>
@endsection
