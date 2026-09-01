@extends('emails.layouts.base')

@section('content')
    <h1 style="margin:0 0 16px 0; font-size:24px; color:#0F172A;">Confirmez votre compte Air Mess</h1>

    <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
        Bonjour {{ $displayName }},
    </p>

    <p style="margin:0 0 18px 0; line-height:1.6; font-size:15px;">
        Utilisez le code ci-dessous pour finaliser la creation de votre compte.
    </p>

    <div style="margin:22px 0; padding:20px; text-align:center; background-color:#FAF7F0; border:1px solid #EEE8DC; border-radius:12px;">
        <p style="margin:0 0 6px 0; color:#6b7280; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">
            Code de confirmation
        </p>
        <p style="margin:0; color:#1A1614; font-size:34px; line-height:1.1; font-weight:800; letter-spacing:6px;">
            {{ $code }}
        </p>
    </div>

    <p style="margin:0; line-height:1.6; font-size:14px; color:#6b7280;">
        Ce code expire dans {{ $expiresInMinutes }} minutes. Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email.
    </p>
@endsection
