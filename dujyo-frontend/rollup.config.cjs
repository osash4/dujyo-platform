// rollup.config.cjs
const path = require('path');

module.exports = {
  input: path.resolve(__dirname, 'src/index.js'),
  output: {
    file: path.resolve(__dirname, 'dist/bundle.js'),
    format: 'esm',  // o 'cjs', dependiendo del tipo de módulos que utilices
  },
  plugins: [
    // Puedes añadir plugins aquí, como babel, node-resolve, etc.
  ]
};
