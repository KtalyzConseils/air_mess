@extends('emails.layouts.base')

@section('content')
    <h1 style="margin:0 0 16px 0; font-size:24px; color:#0F172A;">Bienvenue {{ $user->name }} 👋</h1>

    @if ($isMarchant)
        <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
            Votre compte <strong>marchand</strong> sur Air Mess est actif.
            Vous pouvez dès maintenant créer vos courses.
        </p>

        <div style="background-color:#dcfce7; border-left:4px solid #16a34a; padding:12px 16px; border-radius:6px; margin:16px 0;">
            <p style="margin:0; color:#166534; font-size:14px;">
                <strong>✅ Compte validé :</strong> aucune attente, votre espace marchand est
                opérationnel.
            </p>
        </div>

        <p style="margin:16px 0; line-height:1.6; font-size:15px;">
            Pensez à enregistrer vos adresses de livraison habituelles : elles accélèrent la
            création de vos prochaines courses.
        </p>
    @elseif ($isDriver)
        <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
            Votre inscription en tant que <strong>livreur</strong> sur Air Mess a bien été reçue.
            Nous allons vérifier vos documents avant d'activer votre compte.
        </p>

        <div style="background-color:#fef3c7; border-left:4px solid #f59e0b; padding:12px 16px; border-radius:6px; margin:16px 0;">
            <p style="margin:0; color:#92400e; font-size:14px;">
                <strong>⏳ Étape suivante :</strong> nos équipes vérifient votre CNI et votre permis
                sous 48h. Vous recevrez un email dès que votre compte sera activé et que vous pourrez
                commencer à accepter des courses.
            </p>
        </div>

        <p style="margin:16px 0; line-height:1.6; font-size:15px;">
            Vous pouvez d'ores et déjà vous connecter à l'application pour voir votre statut.
        </p>
    @else
        <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
            Votre compte sur Air Mess a bien été créé. Vous pouvez maintenant commander
            des livraisons partout à Cotonou et au Bénin.
        </p>

        <p style="margin:16px 0; line-height:1.6; font-size:15px;">
            Bonne nouvelle : vos <strong>premières courses du mois sont offertes</strong>
            (selon votre quota mensuel). Profitez-en pour tester !
        </p>
    @endif

    <x-emails.button :url="$frontendUrl . '/login'">
        Me connecter à mon espace
    </x-emails.button>

    <p style="margin:24px 0 0 0; line-height:1.6; font-size:13px; color:#6b7280;">
        Une question ? Répondez simplement à cet email, notre équipe vous répondra.
    </p>
@endsection
