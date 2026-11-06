module.exports = {
  content: ['./*.html', './*.tsx', './components/**/*.tsx', './contexts/**/*.tsx', './desktop/**/*.tsx'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: { primary: {50:'#effaff',100:'#d9f5ff',200:'#a8eaff',300:'#58d5f5',400:'#16b8ed',500:'#0b8fe5',600:'#0648c8',700:'#0739a7',800:'#0a3284',900:'#08265f'} },
      fontFamily: { sans: ['Inter','system-ui','sans-serif'], mono: ['JetBrains Mono','monospace'] },
    },
  },
  plugins: [],
};
