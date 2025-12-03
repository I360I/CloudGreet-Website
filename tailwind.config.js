/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Typography System
      fontSize: {
        xs: ['12px', { lineHeight: '1.5', letterSpacing: '0' }],
        sm: ['14px', { lineHeight: '1.5', letterSpacing: '0' }],
        base: ['16px', { lineHeight: '1.5', letterSpacing: '0' }],
        lg: ['18px', { lineHeight: '1.5', letterSpacing: '0' }],
        xl: ['20px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        '2xl': ['24px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        '3xl': ['30px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        '4xl': ['36px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      // Spacing System (8px base unit)
      spacing: {
        '1': '8px',
        '2': '16px',
        '3': '24px',
        '4': '32px',
        '5': '40px',
        '6': '48px',
        '8': '64px',
        '10': '80px',
        '12': '96px',
      },
      // Shadow System
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px rgba(0, 0, 0, 0.15)',
        '2xl': '0 25px 50px rgba(0, 0, 0, 0.25)',
      },
      // Border Radius System
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
      // Animation Timing
      transitionDuration: {
        'fast': '150ms',
        'normal': '300ms',
        'slow': '500ms',
        'very-slow': '800ms',
      },
      // Easing Functions
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-out-cubic': 'cubic-bezier(0.33, 1, 0.68, 1)',
        'ease-in-out-cubic': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
    },
  },
  plugins: [],
}
