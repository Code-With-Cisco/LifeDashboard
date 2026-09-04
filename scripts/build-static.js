'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_KEY (anon/publishable key) are required.');
}

const parsed = new URL(supabaseUrl);
const localHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
if (parsed.protocol !== 'https:' && !localHost) {
  throw new Error('SUPABASE_URL must use HTTPS outside local development.');
}

fs.rmSync(output, {recursive: true, force: true});
fs.mkdirSync(path.join(output, 'services'), {recursive: true});

const files = [
  '.nojekyll', 'index.html', 'styles.css', 'logs.js', 'state.js', 'utils.js',
  'api.js', 'render.js', 'main.js', 'app.js',
  'services/SecurityService.js', 'services/BriefingService.js',
  'services/RecipeService.js', 'services/HabitService.js', 'services/NutritionService.js',
];

for (const relative of files) {
  fs.copyFileSync(path.join(root, relative), path.join(output, relative));
}

const publicConfig = {
  supabaseUrl,
  supabaseKey,
  allowSelfSignup: false,
};
fs.writeFileSync(
  path.join(output, 'config.js'),
  `window.CONFIG = Object.freeze(${JSON.stringify(publicConfig, null, 2)});\n`,
  'utf8'
);

console.log(`Built ${files.length + 1} public files in ${output}`);
