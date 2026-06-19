/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.{js,jsx,ts,tsx}', './src/components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'airmess-yellow': '#FFC300',
        'airmess-red': '#CC0000',
        'airmess-dark': '#2C2C2C',
      },
    },
  },
  plugins: [],
}
