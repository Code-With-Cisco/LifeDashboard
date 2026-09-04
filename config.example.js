// Template config file. Copy this to config.js and fill in your real values.
// config.js is gitignored — never commit it.
// Get values from: Supabase Dashboard → Settings → API
window.CONFIG = Object.freeze({
  supabaseUrl:  'https://your-project.supabase.co',
  supabaseKey:  'your-anon-key-here',
  // Public clients must not contain shared invite secrets. Provision accounts
  // through an authenticated server-side admin function instead.
  allowSelfSignup: false,
});
