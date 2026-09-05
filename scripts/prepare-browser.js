'use strict';

const fs = require('fs');
const path = require('path');

function prepareBrowser(destination) {
  const root = path.resolve(__dirname, '..');
  const output = path.resolve(destination || path.join(root, 'vendor'));
  fs.mkdirSync(output, {recursive: true});
  const source = path.join(root, 'node_modules/@supabase/supabase-js');
  fs.copyFileSync(path.join(source, 'dist/umd/supabase.js'), path.join(output, 'supabase.js'));
  fs.copyFileSync(path.join(source, 'LICENSE'), path.join(output, 'supabase-LICENSE'));
}

if (require.main === module) prepareBrowser();
module.exports = {prepareBrowser};
