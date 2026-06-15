@props(['url', 'color' => 'primary'])

@php
    $colors = [
        'primary' => ['bg' => '#FFC300', 'text' => '#0F172A'],
        'danger'  => ['bg' => '#EF4444', 'text' => '#ffffff'],
        'success' => ['bg' => '#22c55e', 'text' => '#ffffff'],
    ];
    $c = $colors[$color] ?? $colors['primary'];
@endphp

<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
    <tr>
        <td style="background-color: {{ $c['bg'] }}; border-radius: 8px; padding: 12px 24px;">
            <a href="{{ $url }}" style="color: {{ $c['text'] }}; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
                {{ $slot }}
            </a>
        </td>
    </tr>
</table>
