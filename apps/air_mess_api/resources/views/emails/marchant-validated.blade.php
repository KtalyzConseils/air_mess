@extends('emails.layouts.base')

@section('content')
    <h1 style="margin:0 0 16px 0; font-size:24px; color:#0F172A;">
        🎉 Votre compte est activé
    </h1>

    <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
        Bonjour {{ $user->name }},
    </p>

    <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
        Bonne nouvelle ! Le compte de <strong>{{ $marchant->raison_sociale }}</strong> vient d'être validé
        par notre équipe. Vous pouvez maintenant créer des courses sur Air Mess.
    </p>

    <div style="background-color:#d1fae5; border-left:4px solid #10b981; padding:12px 16px; border-radius:6px; margin:16px 0;">
        <p style="margin:0 0 4px 0; color:#065f46; font-size:14px; font-weight:bold;">
            Votre plan : Essai gratuit
        </p>
        <p style="margin:0; color:#065f46; font-size:13px;">
            Vous bénéficiez de 10 courses incluses pour démarrer. Passez à un plan payant
            quand vous serez prêt à grandir.
        </p>
    </div>

    <x-emails.button :url="$frontendUrl . '/dashboard'" color="success">
        Créer ma première course
    </x-emails.button>

    <p style="margin:24px 0 0 0; line-height:1.6; font-size:13px; color:#6b7280;">
        Besoin d'aide pour démarrer ? Notre équipe est là — répondez à cet email.
    </p>
@endsection
