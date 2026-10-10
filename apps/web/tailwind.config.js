/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep charcoal backgrounds
        bg: {
          primary: '#0f0f11',
          secondary: '#18181b',
          tertiary: '#1e1e24',
          panel: '#16161a',
          elevated: '#222228',
        },
        // Blue-violet accent palette
        accent: {
          blue: '#3b82f6',
          'blue-dim': '#1d4ed8',
          violet: '#7c3aed',
          'violet-dim': '#5b21b6',
          cyan: '#06b6d4',
          indigo: '#4f46e5',
        },
        // Surface colours
        surface: {
          DEFAULT: '#1e1e24',
          hover: '#26262e',
          active: '#2c2c36',
          border: '#2a2a35',
          'border-subtle': '#1e1e28',
        },
        'surface-DEFAULT': '#1e1e24',
        // Text colours
        text: {
          primary: '#f8f8f9',
          secondary: '#9ca3af',
          muted: '#6b7280',
          disabled: '#4b5563',
          accent: '#60a5fa',
        },
        // Status colours
        status: {
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
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
        panel: '0 0 0 1px rgba(255,255,255,0.06)',
        glow: '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-violet': '0 0 20px rgba(124, 58, 237, 0.3)',
        overlay: '0 20px 60px rgba(0, 0, 0, 0.8)',
      },
    },
  },
  plugins: [],
};
