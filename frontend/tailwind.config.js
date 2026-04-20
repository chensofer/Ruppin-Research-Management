/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:        '#003478',
        'primary-dark': '#002158',
        'primary-mid':  '#1B4080',
        'primary-light':'#E8EEFA',
        accent:         '#5CB800',
        'accent-dark':  '#449000',
        'accent-light': '#F0FAE0',
        success:        '#5CB800',
        'success-light':'#F0FAE0',
        'sidebar-bg':   '#0C2340',
        'page-bg':      '#F0F4F9',
      },
      fontFamily: {
        sans:   ['Assistant', 'sans-serif'],
        hebrew: ['Assistant', 'sans-serif'],
      },
      boxShadow: {
        card:       '0 1px 4px rgba(0,52,120,0.07), 0 4px 16px rgba(0,52,120,0.05)',
        'card-hover':'0 4px 16px rgba(0,52,120,0.12), 0 8px 32px rgba(0,52,120,0.08)',
        sidebar:    '4px 0 24px rgba(0,0,0,0.18)',
      },
      borderRadius: {
        xl:  '0.75rem',
        '2xl':'1rem',
        '3xl':'1.5rem',
      },
      backgroundImage: {
        'sidebar-grad': 'linear-gradient(180deg, #003478 0%, #001E50 100%)',
        'hero-grad':    'linear-gradient(135deg, #003478 0%, #1B4080 100%)',
      },
    },
  },
  plugins: [],
}
