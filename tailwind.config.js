/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        mdautomobile: {
          primary: '#16a34a',     // eco green
          secondary: '#2563eb',   // tech blue
          dark: '#020617',        // dark bg
          accent: '#f59e0b'       // warning yellow
        }
      }
    }
  },
  plugins: []
};
