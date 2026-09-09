@extends('emails.layouts.base')

@section('content')
    <h1 style="margin:0 0 16px; font-size:24px; color:#0F172A;">Airmess est maintenant opérationnel 🎉</h1>
    <p style="margin:0 0 16px; line-height:1.6; font-size:15px;">Bonjour {{ $user->name }},</p>
    <p style="margin:0 0 16px; line-height:1.6; font-size:15px;">
        Votre attente est terminée : votre compte est activé et vous pouvez désormais créer vos courses.
    </p>
    <div style="background:#fef3c7; border-left:4px solid #f59e0b; padding:12px 16px; border-radius:6px; margin:16px 0;">
        <strong>Votre cadeau de bienvenue :</strong> 500 FCFA seront automatiquement déduits de votre première course.
    </div>
    <x-emails.button :url="$frontendUrl . '/login'">Accéder à mon espace Airmess</x-emails.button>
@endsection
