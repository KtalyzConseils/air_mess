<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subject ?? 'Air Mess' }}</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1f2937;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f3f4f6;">
        <tr>
            <td align="center" style="padding: 32px 16px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    {{-- Header --}}
                    <tr>
                        <td style="background-color:#0F172A; padding:24px 32px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="vertical-align:middle;">
                                        <div style="display:inline-block; width:40px; height:40px; background-color:#FFC300; border-radius:8px; text-align:center; line-height:40px; color:#0F172A; font-weight:bold; font-size:16px;">
                                            AM
                                        </div>
                                    </td>
                                    <td style="vertical-align:middle; padding-left:12px;">
                                        <p style="margin:0; color:#ffffff; font-size:18px; font-weight:bold;">Air Mess</p>
                                        <p style="margin:0; color:#9ca3af; font-size:12px;">Plateforme de livraison · Bénin</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Contenu --}}
                    <tr>
                        <td style="padding: 32px;">
                            {{ $slot ?? '' }}
                            @yield('content')
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="padding:24px 32px; background-color:#f9fafb; border-top: 1px solid #e5e7eb;">
                            <p style="margin:0 0 8px 0; font-size:12px; color:#6b7280; line-height:1.5;">
                                Cet email a été envoyé automatiquement par Air Mess.
                                Si vous n'êtes pas à l'origine de cette action, vous pouvez l'ignorer.
                            </p>
                            <p style="margin:0; font-size:11px; color:#9ca3af;">
                                © {{ date('Y') }} Air Mess · KTALYZ · Cotonou, Bénin
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
