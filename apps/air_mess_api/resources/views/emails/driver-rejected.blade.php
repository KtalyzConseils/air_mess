@extends('emails.layouts.base')

@section('content')
    <h1 style="margin:0 0 16px 0; font-size:24px; color:#0F172A;">
        Votre candidature livreur n'a pas ete retenue
    </h1>

    <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
        Bonjour {{ $driverName }},
    </p>

    <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
        Apres verification, votre candidature livreur Air Mess n'a pas pu etre validee pour le moment.
    </p>

    <div style="background-color:#FEF2F2; border-left:4px solid #EF4444; padding:12px 16px; border-radius:6px; margin:16px 0;">
        <p style="margin:0; color:#991B1B; font-size:14px;">
            <strong>Motif :</strong><br>
            {{ $reason }}
        </p>
    </div>

    <p style="margin:16px 0; line-height:1.6; font-size:15px;">
        Votre dossier a ete retire afin que vous puissiez reprendre l'inscription avec la meme adresse email,
        en corrigeant les informations ou documents concernes.
    </p>

    @if($frontendUrl)
        <p style="margin:20px 0;">
            <a href="{{ $frontendUrl }}/register/driver"
               style="display:inline-block; background:#FFC400; color:#111111; text-decoration:none; padding:12px 18px; border-radius:8px; font-weight:700;">
                Reprendre mon inscription
            </a>
        </p>
    @endif

    <p style="margin:24px 0 0 0; line-height:1.6; font-size:13px; color:#6b7280;">
        Si vous pensez qu'il s'agit d'une erreur, contactez le support Air Mess.
    </p>
@endsection
