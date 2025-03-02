/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: theme('colors.gray.300'),
            h1: {
              color: theme('colors.gray.100'),
              fontWeight: '800',
              marginTop: '1.5em',
              marginBottom: '0.5em',
            },
            h2: {
              color: theme('colors.gray.100'),
              fontWeight: '700',
              marginTop: '1.5em',
              marginBottom: '0.5em',
            },
            h3: {
              color: theme('colors.gray.100'),
              fontWeight: '600',
              marginTop: '1.5em',
              marginBottom: '0.5em',
            },
            code: {
              backgroundColor: theme('colors.gray.800'),
              color: theme('colors.gray.300'),
              padding: '0.25rem',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: theme('colors.gray.900'),
              color: theme('colors.gray.200'),
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid',
              borderColor: theme('colors.gray.700'),
              overflowX: 'auto',
            },
            a: {
              color: theme('colors.blue.500'),
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            hr: {
              borderColor: theme('colors.gray.700'),
            },
            strong: {
              color: theme('colors.gray.100'),
              fontWeight: '600',
            },
            blockquote: {
              color: theme('colors.gray.400'),
              borderLeftColor: theme('colors.blue.500'),
            },
            table: {
              borderColor: theme('colors.gray.700'),
            },
            thead: {
              color: theme('colors.gray.100'),
              borderBottomColor: theme('colors.gray.700'),
            },
            'tbody tr': {
              borderBottomColor: theme('colors.gray.800'),
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 