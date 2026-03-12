const fs = require('fs');
const data = JSON.parse(fs.readFileSync('lint-errors.json', 'utf8'));
const errors = data.diagnostics.filter(d => d.severity === 'error' || d.severity === 'fatal');
errors.forEach(e => console.log(`${e.location.path.File}:${e.location.span[0]} - ${e.description}`));
