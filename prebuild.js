const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'node_modules', 'plotly.js-dist-min', 'plotly.min.js');
const dst = path.join(__dirname, 'dist', 'plotly.min.js');

if (!fs.existsSync(src)) {
  console.error(`plotly.min.js not found at ${src}`);
  console.error('Run "npm install" first.');
  process.exit(1);
}

fs.copyFileSync(src, dst);
console.log(`Copied plotly.min.js -> dist/plotly.min.js`);
