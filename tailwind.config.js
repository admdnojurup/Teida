/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        guru: {
          50: '#FEE7EB',
          100: '#FDCFD8',
          200: '#FB9FB1',
          300: '#F86F8A',
          400: '#F63F63',
          500: '#D02340', // Primary red
          600: '#A81C33',
          700: '#801527',
          800: '#570E1A',
          900: '#2F070E',
        },
        surface: {
          50: '#F8F8F8',
          100: '#F0F0F0',
          200: '#E4E4E4',
          300: '#D1D1D1',
          400: '#B4B4B4',
          500: '#9A9A9A',
          600: '#818181',
          700: '#6A6A6A',
          800: '#474747',
          900: '#292929',
        },
      },
      boxShadow: {
        'guru': '0 4px 12px rgba(208, 35, 64, 0.15)',
        'guru-hover': '0 8px 24px rgba(208, 35, 64, 0.25)',
      },
      fontFamily: {
        'sans': ['Inter', 'Helvetica', 'Arial', 'sans-serif'],
        'heading': ['Inter', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'guru': '12px',
      },
    },
  },
  plugins: [],
}