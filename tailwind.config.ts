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
        background: '#FAF9F6',
        foreground: '#1F2326',
        border: '#E4E2DD',
        accent: {
          DEFAULT: '#1F6F6B',
          hover: '#1A5D59',
          light: '#E8F4F3',
          muted: '#2D8A85',
        },
        muted: {
          DEFAULT: '#6B7280',
          foreground: '#4B5563',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F5F4F1',
        },
        status: {
          success: '#16A34A',
          'success-bg': '#F0FDF4',
          warning: '#CA8A04',
          'warning-bg': '#FEFCE8',
          error: '#DC2626',
          'error-bg': '#FEF2F2',
          info: '#2563EB',
          'info-bg': '#EFF6FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'page-title': ['18px', { lineHeight: '28px', fontWeight: '500' }],
        body: ['14px', { lineHeight: '22px' }],
        label: ['12px', { lineHeight: '16px' }],
        'label-md': ['13px', { lineHeight: '20px' }],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        dialog: '0 4px 24px -4px rgba(0, 0, 0, 0.12)',
      },
      spacing: {
        sidebar: '240px',
        topbar: '56px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};

export default config;
