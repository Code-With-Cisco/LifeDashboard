'use strict';

const fs = require('fs');
const path = require('path');
const {validatePublicConfig} = require('../services/SecurityService');
const {prepareBrowser} = require('./prepare-browser');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_KEY (anon/publishable key) are required.');
}

const publicConfig = validatePublicConfig({supabaseUrl, supabaseKey, allowSelfSignup: false});

fs.rmSync(output, {recursive: true, force: true});
fs.mkdirSync(path.join(output, 'services'), {recursive: true});
prepareBrowser(path.join(output, 'vendor'));

const files = [
  '.nojekyll', 'index.html', 'styles.css', 'logs.js', 'state.js', 'utils.js',
  'api.js', 'render.js', 'main.js', 'app.js', 'personal-data.js', 'mfa.js', 'services/MfaService.js',
  'services/SecurityService.js', 'services/ProfileService.js', 'services/WorkoutService.js', 'services/BriefingService.js',
  'services/RecipeService.js', 'services/HabitService.js', 'services/NutritionService.js',
  'services/PersonalDataService.js', 'services/BackupService.js',
];

for (const relative of files) {
  fs.copyFileSync(path.join(root, relative), path.join(output, relative));
}

const indexPath = path.join(output, 'index.html');
const connectSources = [publicConfig.supabaseUrl, publicConfig.supabaseUrl.replace(/^http/, 'ws')].join(' ');
const html = fs.readFileSync(indexPath, 'utf8').replace(
  /connect-src [^;]+;/,
  `connect-src 'self' ${connectSources};`
);
fs.writeFileSync(indexPath, html, 'utf8');
fs.writeFileSync(
  path.join(output, 'config.js'),
  `window.CONFIG = Object.freeze(${JSON.stringify(publicConfig, null, 2)});\n`,
  'utf8'
);

console.log(`Built ${files.length + 3} public files, including the locked SDK, in ${output}`);
