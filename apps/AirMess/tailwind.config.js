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
        'airmess-yellow': '#FFCC00',
        'airmess-yellow-hi': '#FFD633',
        'airmess-red': '#D40511',
        'airmess-dark': '#1A1614',
        ink: '#1A1614',
        cream: '#FAF7F0',
        'off-white': '#FDFCF9',
        'warm-100': '#F4EFE4',
        'warm-200': '#EEE8DC',
        'warm-300': '#D9D2C4',
        'warm-400': '#B8AF9F',
        'warm-500': '#8A7E68',
        'warm-600': '#6B6250',
        success: '#16A34A',
        'success-bg': '#DCFCE7',
        warning: '#F59E0B',
        'warning-bg': '#FEF3C7',
        danger: '#D40511',
        'danger-bg': '#FEE2E2',
        info: '#0284C7',
        'info-bg': '#E0F2FE',
      },
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        jk: ['PlusJakartaSans_400Regular'],
        'jk-medium': ['PlusJakartaSans_500Medium'],
        'jk-semibold': ['PlusJakartaSans_600SemiBold'],
        'jk-bold': ['PlusJakartaSans_700Bold'],
        'jk-extrabold': ['PlusJakartaSans_800ExtraBold'],
      },
      borderRadius: {
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,22,20,0.04)',
        cta: '0 4px 12px rgba(255,204,0,0.35)',
        'cta-dark': '0 4px 12px rgba(26,22,20,0.20)',
      },
    },
  },
  plugins: [],
}
