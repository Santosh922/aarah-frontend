import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#191919',
        'primary-light': '#FFFFFF',
        brand: {
          discount:  '#d32f2f',
          success:   '#00a859',
          sale:      '#00a859',
        },
        semantic: {
          error:    '#dc2626',
          warning:  '#d97706',
          info:     '#2563eb',
          success:  '#16a34a',
        },
        surface: {
          bg:       '#FAFAFA',
          card:     '#FFFFFF',
          overlay:  '#F5F5F5',
          divider:   '#E5E5E5',
        },
        text: {
          primary:   '#191919',
          secondary: '#6b7280',
          muted:     '#9ca3af',
          placeholder: '#d1d5db',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],   // 10px
        xs:    ['0.75rem',  { lineHeight: '1rem' }],    // 12px
        sm:    ['0.875rem', { lineHeight: '1.25rem' }], // 14px
        base:  ['1rem',     { lineHeight: '1.5rem' }],   // 16px
        lg:    ['1.125rem', { lineHeight: '1.75rem' }], // 18px
        xl:    ['1.25rem',  { lineHeight: '1.75rem' }], // 20px
        '2xl': ['1.5rem',   { lineHeight: '2rem' }],    // 24px — section headings
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px — page titles
        '4xl': ['2.25rem',  { lineHeight: '2.5rem' }],  // 36px — hero / display
        '5xl': ['3rem',     { lineHeight: '1.1' }],     // 48px — large hero
      },
      maxWidth: {
        content: '80rem',     // 1280px — standard page content
        wide: '86rem',       // 1376px — wide layouts (banners, carousels)
        full: '90rem',       // 1440px — max width for product grids
      },
      spacing: {
        section: '5rem',     // 80px — between sections
        'section-lg': '7rem', // 112px — large section gaps
        'section-sm': '3rem', // 48px — tight section gaps
        card: '1.25rem',     // 20px — card internal padding
        'card-lg': '1.5rem', // 24px — large card padding
      },
    },
  },
  plugins: [],
};

export default config;
