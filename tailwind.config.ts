import type { Config } from 'tailwindcss';

// Apex Power Ops — reuses the brand's high-voltage industrial palette
// (gold on graphite) so the internal tool matches the company identity.
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
          red: '#D9453B',
          green: '#36A867',
          orange: '#E2741E',
          blue: '#3E86C4',
        },
      },
      fontFamily: {
        display: ['Saira', 'system-ui', 'sans-serif'],
        body: ['Barlow', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
