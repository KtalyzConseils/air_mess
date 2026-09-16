@extends('emails.layouts.base')

@section('content')
    <h1 style="margin:0 0 16px 0; font-size:24px; color:#0F172A;">
        Nouvelle réponse au formulaire livreur
    </h1>

    <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
        Une nouvelle inscription vient d'être enregistrée sur la liste d'attente des livreurs.
        Le détail de toutes les réponses est disponible dans le fichier CSV joint à cet email.
    </p>

    <table cellpadding="6" cellspacing="0" border="0" style="margin:16px 0; font-size:14px; width:100%;">
        <tr>
            <td style="color:#6b7280; width:150px;">Référence</td>
            <td style="font-weight:600;">#{{ $waitlist->id }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">Date</td>
            <td>{{ $waitlist->created_at?->format('d/m/Y à H:i') }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">Livreur</td>
            <td>{{ $waitlist->full_name }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">Véhicule</td>
            <td>{{ $waitlist->vehicle_type }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">Zone</td>
            <td>{{ $waitlist->zone }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">Email</td>
            <td>{{ $waitlist->email }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">WhatsApp</td>
            <td>{{ $waitlist->whatsapp }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">Disponibilité</td>
            <td>{{ $waitlist->launch_availability }}</td>
        </tr>
    </table>

    <div style="background-color:#d1fae5; border-left:4px solid #10b981; padding:12px 16px; border-radius:6px; margin:16px 0;">
        <p style="margin:0; color:#065f46; font-size:14px;">
            <strong>Rappel :</strong> le répondant a été ajouté à la liste d'attente pour une
            activation prioritaire au lancement du service.
        </p>
    </div>

    <p style="margin:24px 0 0 0; line-height:1.6; font-size:13px; color:#6b7280;">
        Cet email est envoyé automatiquement à chaque nouvelle soumission du formulaire livreur.
    </p>
@endsection
