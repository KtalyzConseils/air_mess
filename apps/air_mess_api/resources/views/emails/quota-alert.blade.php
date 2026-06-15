@extends('emails.layouts.base')

@section('content')
    @if ($level === 'reached')
        <h1 style="margin:0 0 16px 0; font-size:24px; color:#0F172A;">
            🚫 Quota mensuel atteint
        </h1>

        <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
            Bonjour {{ $marchant->raison_sociale }},
        </p>

        <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
            Vous avez utilisé l'intégralité de votre quota mensuel
            (<strong>{{ $used }}/{{ $limit }} courses</strong>) sur votre plan
            <strong>{{ ucfirst($marchant->subscription_plan) }}</strong>.
        </p>

        <div style="background-color:#fee2e2; border-left:4px solid #ef4444; padding:12px 16px; border-radius:6px; margin:16px 0;">
            <p style="margin:0; color:#991b1b; font-size:14px;">
                <strong>Vos prochaines courses sont bloquées.</strong>
                Passez à un plan supérieur pour continuer à expédier sans interruption.
            </p>
        </div>
    @else
        <h1 style="margin:0 0 16px 0; font-size:24px; color:#0F172A;">
            ⚠️ Vous approchez de votre quota
        </h1>

        <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
            Bonjour {{ $marchant->raison_sociale }},
        </p>

        <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
            Vous avez déjà utilisé <strong>{{ $used }} courses sur {{ $limit }}</strong>
            ce mois-ci ({{ round($used / $limit * 100) }}% de votre quota).
            Il vous reste <strong>{{ $limit - $used }} courses</strong>.
        </p>

        <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
            Si vous prévoyez de continuer au même rythme, envisagez de passer à un plan
            supérieur pour ne pas être bloqué.
        </p>
    @endif

    <x-emails.button :url="$frontendUrl . '/billing'" :color="$level === 'reached' ? 'danger' : 'primary'">
        Voir les plans disponibles
    </x-emails.button>

    <p style="margin:24px 0 0 0; line-height:1.6; font-size:13px; color:#6b7280;">
        Vous pensez que c'est une erreur ? Répondez à cet email, on regarde ensemble.
    </p>
@endsection
