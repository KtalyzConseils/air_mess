<!doctype html>
<html lang="fr"><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6">
<h1 style="font-size:22px">Airmess est prêt !</h1>
<p>Bonjour {{ $name }},</p>
<p>Vous aviez rejoint notre liste d’attente. Le service Airmess est maintenant disponible.</p>
<p>Créez votre compte pour commencer{{ $kind === 'merchant' ? ' et profiter de votre bon de 500 F CFA sur votre première course' : '' }}.</p>
<p><a href="{{ $registrationUrl }}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;text-decoration:none;border-radius:8px">Créer mon compte</a></p>
<p>L’équipe Airmess</p>
</body></html>
