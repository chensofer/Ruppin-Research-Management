/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:        '#003478',
        'primary-dark': '#002158',
        'primary-mid':  '#1B4080',
        'primary-light':'#EBF0FA',
        accent:         '#5CB800',
        'accent-dark':  '#449000',
        'accent-light': '#EEF8DC',
        'accent-mid':   '#73D400',
        success:        '#5CB800',
        'success-light':'#EEF8DC',
        'sidebar-bg':   '#0C2340',
        'page-bg':      '#F1F5FB',
      },
      fontFamily: {
        sans:   ['Assistant', 'sans-serif'],
        hebrew: ['Assistant', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.75rem',     { lineHeight: '1.4' }],   // 12px
        xs:    ['0.78125rem',  { lineHeight: '1.5' }],   // 12.5px
        sm:    ['0.84375rem',  { lineHeight: '1.6' }],   // 13.5px
        base:  ['0.9375rem',   { lineHeight: '1.7' }],   // 15px
        lg:    ['1rem',        { lineHeight: '1.65' }],  // 16px
        xl:    ['1.0625rem',   { lineHeight: '1.6' }],   // 17px
        '2xl': ['1.3125rem',   { lineHeight: '1.4' }],   // 21px
        '3xl': ['1.5rem',      { lineHeight: '1.3' }],   // 24px
      },
      boxShadow: {
        card:        '0 1px 3px rgba(0,52,120,0.06), 0 4px 20px rgba(0,52,120,0.07)',
        'card-hover':'0 4px 20px rgba(0,52,120,0.13), 0 8px 32px rgba(0,52,120,0.09)',
        sidebar:     '4px 0 32px rgba(0,0,0,0.22)',
        modal:       '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
        sm:          '0 1px 3px rgba(0,0,0,0.08)',
        md:          '0 2px 8px rgba(0,52,120,0.1)',
      },
      borderRadius: {
        xl:    '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      backgroundImage: {
        'sidebar-grad': 'linear-gradient(180deg, #003478 0%, #001E50 100%)',
        'hero-grad':    'linear-gradient(135deg, #003478 0%, #1B4080 100%)',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
}
