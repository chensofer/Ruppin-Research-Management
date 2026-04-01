/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1a56db',
        'primary-dark': '#1e429f',
        'primary-light': '#e8f0fe',
        success: '#057a55',
        'success-light': '#def7ec',
        'sidebar-bg': '#ffffff',
        'page-bg': '#f3f4f6',
      },
      fontFamily: {
        hebrew: ['Heebo', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

