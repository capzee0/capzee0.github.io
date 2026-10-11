/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '440px',
      },
      colors: {
        // Orange & Terracotta Backgrounds (NO BLACK)
        bg: {
          primary: '#D96846',   // Terracotta Burnt Orange as main background
          secondary: '#C85A3A', // Rich Burnt Orange
          tertiary: '#B84E30',  // Deep Terracotta
          panel: '#CDCBD6',     // Lavender Tint for panels & containers
          elevated: '#E3E1EB',  // Light Lavender surface
          light: '#FAF7F5',     // Cream light
        },
        // Lavender Neutral Palette
        lavender: {
          DEFAULT: '#CDCBD6',
          light: '#EBEAEF',
          dark: '#B0ADC0',
          panel: '#CDCBD6',
        },
        // Terracotta / Burnt Orange Palette
        terracotta: {
          DEFAULT: '#D96846',
          hover: '#C25534',
          dark: '#B04728',
          light: '#F8DFD7',
        },
        // Olive Green Secondary Accent
        olive: {
          DEFAULT: '#16A34A',
          hover: '#15803D',
          light: '#22C55E',
          dark: '#14532D',
        },
        // Deep Forest Green / Charcoal Text & Dark Elements
        forest: {
          DEFAULT: '#2F3020',
          dark: '#1F2015',
          light: '#4B4D34',
        },
        palette: {
          neutral: '#CDCBD6',
          primary: '#D96846',
          secondary: '#16A34A',
          dark: '#2F3020',
          terracotta: '#D96846',
          olive: '#16A34A',
          lavender: '#CDCBD6',
          forest: '#2F3020',
        },
        // Accent Colors (BLUE COMPLETELY REMOVED - mapped to Olive & Forest)
        accent: {
          blue: '#16A34A',        // Olive green replaces blue
          'blue-dim': '#15803D',  // Dark olive replaces blue-dim
          violet: '#2F3020',      // Forest green replaces violet
          'violet-dim': '#1F2015',
          cyan: '#16A34A',
          indigo: '#16A34A',
          terracotta: '#D96846',
          olive: '#16A34A',
          emerald: '#16A34A',     // Olive green secondary CTA
        },
        // Surface colours (Lavender tint & crisp cards)
        surface: {
          DEFAULT: '#CDCBD6',
          hover: '#DBD8E3',
          active: '#C0BDCB',
          border: 'rgba(47, 48, 32, 0.15)',
          'border-subtle': 'rgba(47, 48, 32, 0.08)',
        },
        'surface-DEFAULT': '#CDCBD6',
        // Text colours - Deep Forest Green and Crisp White
        text: {
          primary: '#2F3020',
          secondary: '#454832',
          muted: '#63664D',
          disabled: '#8A8C74',
          accent: '#16A34A',
          light: '#FFFFFF',
        },
        // Status colours
        status: {
          success: '#16A34A',
          warning: '#D96846',
          error: '#B91C1C',
          info: '#16A34A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(47, 48, 32, 0.1)',
        glow: '0 0 20px rgba(89, 98, 53, 0.35)',
        'glow-terracotta': '0 0 20px rgba(217, 104, 70, 0.35)',
        overlay: '0 20px 60px rgba(47, 48, 32, 0.4)',
      },
    },
  },
  plugins: [],
};
