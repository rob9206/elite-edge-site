import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#E4B45E',
          hover: '#E9C677',
          press: '#D69E42',
        },
        ink: {
          950: '#0C0C0D',
          900: '#131315',
          850: '#18181B',
          800: '#1F1F22',
          750: '#26262A',
          700: '#2E2E33',
          600: '#3D3D44',
          500: '#565660',
          400: '#7C7C87',
          300: '#A7A7B1',
          200: '#CBCBD2',
          100: '#E7E7EB',
        },
        edge: {
          red: '#aa3430',
          green: '#216b43',
          orange: '#925412',
          blue: '#2b5c88',
        },
      },
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
