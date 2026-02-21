import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      colors: {
        terminal: {
          bg: '#0a0a0f',
          surface: '#0f0f1a',
          border: '#1a1a2e',
          green: '#00ff41',
          cyan: '#00d4ff',
          yellow: '#ffd700',
          red: '#ff3333',
          orange: '#ff6b00',
          purple: '#a855f7',
          dim: '#3a3a5c',
        },
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'scan': 'scan 3s linear infinite',
        'glow-green': 'glow-green 2s ease-in-out infinite alternate',
        'glow-red': 'glow-red 2s ease-in-out infinite alternate',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'glow-green': {
          from: { textShadow: '0 0 5px #00ff41, 0 0 10px #00ff41' },
          to: { textShadow: '0 0 10px #00ff41, 0 0 20px #00ff41, 0 0 30px #00ff41' },
        },
        'glow-red': {
          from: { textShadow: '0 0 5px #ff3333, 0 0 10px #ff3333' },
          to: { textShadow: '0 0 10px #ff3333, 0 0 20px #ff3333, 0 0 30px #ff3333' },
        },
        'slide-up': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
