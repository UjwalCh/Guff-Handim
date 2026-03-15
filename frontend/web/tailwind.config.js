/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // WhatsApp-inspired dark palette
        wa: {
          bg:        '#111B21',
          panel:     '#202C33',
          hover:     '#2A3942',
          border:    '#2A3942',
          bubble_in: '#1F2C34',
          bubble_out:'#005C4B',
          green:     '#00A884',
          green_light:'#25D366',
          text:      '#E9EDEF',
          text_dim:  '#8696A0',
          icon:      '#AEBAC1',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
