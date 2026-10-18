/** @type {import('tailwindcss').Config} */

// Oro del escudo de Samuel (muestreado del logo). Reemplaza el ámbar naranja de Tailwind,
// así todas las clases text-amber-* / border-amber-* quedan en la paleta de la marca.
const oro = {
  50:  '#fbf6ea',
  100: '#f5ead0',
  200: '#ecdcae',
  300: '#e2c98a',
  400: '#d6b468',
  500: '#c9a24a',
  600: '#a88424',
  700: '#86691d',
  800: '#654f17',
  900: '#4a3a12',
}

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Blanco marfil: más cálido y menos duro que #fff sobre negro
        white: '#f7f2e8',
        amber: oro,
        primary: oro,
        // Verde y azul apagados para que convivan con el oro (USD / Bs)
        emerald: {
          200: '#c6e3cf',
          300: '#9fd3ae',
          400: '#7cc093',
          500: '#5fa877',
        },
        sky: {
          200: '#d2e1ea',
          300: '#a9c7da',
          400: '#86aec6',
          500: '#6b97b2',
        },
      },
    },
  },
  plugins: [],
}
