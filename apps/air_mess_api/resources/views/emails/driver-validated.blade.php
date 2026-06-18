@extends('emails.layouts.base')

@section('content')
    <h1 style="margin:0 0 16px 0; font-size:24px; color:#0F172A;">
        🎉 Votre compte livreur est activé !
    </h1>

    <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
        Bonjour {{ $driver->first_name }},
    </p>

    <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
        Vos documents ont été vérifiés et votre compte livreur RMess est désormais
        <strong>actif</strong>. Vous pouvez maintenant vous connecter à l'application
        et commencer à accepter des courses.
    </p>

    <div style="background-color:#dcfce7; border-left:4px solid #22c55e; padding:12px 16px; border-radius:6px; margin:16px 0;">
        <p style="margin:0; color:#166534; font-size:14px;">
            <strong>Quelques rappels :</strong>
            <br>· Mettez-vous en ligne dans l'app pour recevoir des propositions de courses.
            <br>· Vos gains sont consultables à tout moment depuis l'écran "Solde".
            <br>· En cas d'incident, signalez-le immédiatement depuis l'écran de la course.
        </p>
    </div>

    <p style="margin:16px 0; line-height:1.6; font-size:15px;">
        Bienvenue dans l'équipe RMess et bonne route !
    </p>

    <p style="margin:24px 0 0 0; line-height:1.6; font-size:13px; color:#6b7280;">
        Une question ? Répondez simplement à cet email, notre équipe vous répondra.
    </p>
@endsection
