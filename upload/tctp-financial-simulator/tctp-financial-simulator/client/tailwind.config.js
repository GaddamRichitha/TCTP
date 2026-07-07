/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0f1923',
          2: '#3d4f5c',
          3: '#7a8fa0',
          4: '#b0c0cc',
        },
        surface: {
          DEFAULT: '#ffffff',
          2: '#f7fafc',
        },
        border: {
          DEFAULT: '#dde4eb',
          2: '#c5d0da',
        },
        cat: {
          labour: '#1a6cf0',
          infra: '#0ea8a8',
          apis: '#7c3aed',
          llm: '#d97706',
          overhead: '#6b7280',
        },
      },
    },
  },
  plugins: [],
};