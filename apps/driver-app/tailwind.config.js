/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ─── Brand ───────────────────────────────────────────
        // Alignés sur marchant-web pour cohérence multi-produit.
        // La variante `-hi` est un jaune un ton plus vif — réservée aux
        // éléments qui doivent rester lisibles en plein soleil (statut,
        // bouton primaire d'action, badge critique).
        'airmess-yellow': '#FFCC00',
        'airmess-yellow-hi': '#FFD633',
        'airmess-red': '#D40511',
        'airmess-dark': '#1A1614',
        // `ink` = texte principal (noir chaud), `airmess-dark` = surface sombre.
        // Les deux étaient confondus ici ; ils sont distincts côté canonique.
        ink: '#0A0908',

        // ─── Surfaces ────────────────────────────────────────
        cream: '#FAF7F0',
        'off-white': '#FDFCF9',
        // Neutres chauds : alignés sur la colonne « canonique » de
        // docs/AIRMESS_DESIGN_SYSTEM.md §5.3 (le web marchand fait référence).
        // Avant : warm-500 `#8A7E68` sur cream = 3.5:1 (échec AA) ; la valeur
        // canonique passe à 5.4:1.
        'warm-100': '#F2EFE8',
        'warm-200': '#E8E4DA',
        'warm-300': '#D4CFC2',
        'warm-400': '#9B968A',
        'warm-500': '#6B675E',
        'warm-600': '#4A463E',

        // ─── États sémantiques ──────────────────────────────
        // Backgrounds pastel + border/foreground vivid pour cards.
        // Alignés sur la colonne « canonique » (§5.3).
        success: '#15803D',
        'success-bg': '#DCFCE7',
        warning: '#EA580C',
        // `warning-strong` : version texte du warning, lisible SUR warning-bg
        // (et sur les fonds clairs). warning seul ne tient pas 4.5:1 sur
        // warning-bg — ne l'y utiliser jamais pour du texte.
        'warning-strong': '#9A3412',
        'warning-bg': '#FFEDD5',
        danger: '#D40511',
        'danger-bg': '#FEE2E2',
        info: '#0369A1',
        'info-bg': '#DBEAFE',
      },
      // Police de marque : Plus Jakarta Sans (moderne, chaleureuse, compacte —
      // lisible sur données denses). Une famille par graisse pour un rendu net sur
      // Android (pas de faux-bold). Noms `jk-*` distincts des utilitaires de poids
      // Tailwind (font-bold, etc.) pour éviter toute collision.
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        jk: ['PlusJakartaSans_400Regular'],
        'jk-medium': ['PlusJakartaSans_500Medium'],
        'jk-semibold': ['PlusJakartaSans_600SemiBold'],
        'jk-bold': ['PlusJakartaSans_700Bold'],
        'jk-extrabold': ['PlusJakartaSans_800ExtraBold'],
      },
      borderRadius: {
        // Les cards de l'app driver ont des angles plus généreux que web —
        // ambiance plus tactile / friendly.
        pill: '9999px',
      },
      // Ombres discrètes — on privilégie la border pour le contour, l'ombre
      // sert juste à décoller très légèrement les CTA.
      boxShadow: {
        card: '0 1px 2px rgba(26,22,20,0.04)',
        cta: '0 4px 12px rgba(255,204,0,0.35)',
        'cta-dark': '0 4px 12px rgba(26,22,20,0.20)',
      },
    },
  },
  plugins: [],
}
