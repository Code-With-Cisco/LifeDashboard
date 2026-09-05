/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');
const vm = require('vm');
const run = code => vm.runInContext(code, dom.getInternalVMContext());

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
let dom, win, authCallback, result, client;

function chain(value) {
  const query = new Proxy({}, {get: (_, key) => key === 'then'
    ? Promise.resolve(value).then.bind(Promise.resolve(value))
    : () => query});
  return query;
}

beforeEach(() => {
  dom = new JSDOM(read('index.html'), {url: 'https://dashboard.test', runScripts: 'outside-only'});
  win = dom.window;
  win.console = {log: jest.fn(), warn: jest.fn(), error: jest.fn()};
  win.CONFIG = {supabaseUrl: 'https://example.supabase.co', supabaseKey: 'sb_publishable_test'};
  result = {data: [], error: null};
  client = {
    auth: {onAuthStateChange: callback => { authCallback = callback; }, signOut: jest.fn(async () => ({error: null}))},
    from: jest.fn(() => chain(result)),
  };
  win.supabase = {createClient: () => client};
  for (const file of ['services/SecurityService.js', 'services/ProfileService.js', 'services/WorkoutService.js',
    'logs.js', 'state.js', 'utils.js', 'api.js', 'render.js', 'main.js', 'services/RecipeService.js',
    'services/HabitService.js', 'services/NutritionService.js', 'services/BriefingService.js', 'app.js']) {
    run(read(file));
  }
  run("PROFILE={id:'user-a',timezone:'America/New_York',assigned_workout_plan:'custom'};");
});

afterEach(() => dom.window.close());

test('custom workout markup stays text in the actual workout renderer', () => {
  win.payload = '<img src=x onerror="alert(1)">';
  run("CONTENT={workouts:{plans:{custom:{days:[{day:1,day_name:'Monday',focus:payload,muscles:[payload],exercises:[{name:payload,sets:3,reps:payload,notes:payload}]}]}}}};");
  run('renderWorkout()');
  expect(win.document.querySelector('#wk-panels img')).toBeNull();
  expect(win.document.getElementById('wk-panels').textContent).toContain(win.payload);
});

test('questionnaire answers cannot escape the input value on rerender', () => {
  win.payload = '\"><img src=x onerror="alert(1)">';
  run('qStep=0;qAnswers[Q_STEPS[0].inputs[0].id]=payload;renderQStep();');
  expect(win.document.querySelector('#q-steps img')).toBeNull();
  expect(win.document.querySelector('#q-steps input').getAttribute('value')).toBe(win.payload);
});

test('failed recipe retrieval cannot read a different user cache', async () => {
  win.API.recipes.list = jest.fn(async () => [{id: 'recipe-a', profile_id: 'basics', name: 'Private recipe', created_by: 'user-a'}]);
  await run('loadRecipesFromDB()');
  expect(win.localStorage.getItem('_cachedRecipes')).toBeNull();
  run("PROFILE={id:'user-b'}");
  win.API.recipes.list = jest.fn(async () => { throw new Error('offline'); });
  expect(await run('loadRecipesFromDB()')).toBeNull();
});

test('sign-out removes rendered private data, modal values and session caches but preserves local-only goals', () => {
  win.document.querySelector('#home-command-brief').textContent = 'Private meeting';
  win.document.querySelector('#profile-modal input').value = 'Private profile';
  win.document.querySelector('#profile-modal').classList.add('open');
  win.localStorage.setItem('goals_user-a', '[{"g":"Keep my local goal"}]');
  win.State.cacheSet('user-a', 'recipes', ['secret']);
  authCallback('SIGNED_OUT', null);
  expect(win.document.getElementById('app').textContent).not.toContain('Private meeting');
  expect(win.document.querySelector('#profile-modal input').value).toBe('');
  expect(win.document.querySelector('.modal-bg.open')).toBeNull();
  expect(win.State.cacheGet('user-a', 'recipes')).toBeNull();
  expect(win.localStorage.getItem('goals_user-a')).toContain('Keep my local goal');
  expect(run('PROFILE')).toBeNull();
});

test('a profile request completing after sign-out cannot reopen the dashboard', async () => {
  let finish;
  run('loadProfile = () => window.pendingProfile;');
  win.pendingProfile = new Promise(resolve => { finish = resolve; });
  const pending = run("applyAuthSession('SIGNED_IN',{user:{id:'user-a'}},_authEpoch)");
  authCallback('SIGNED_OUT', null);
  finish({id: 'user-a', signup_complete: true});
  await pending;
  expect(run('PROFILE')).toBeNull();
  expect(win.document.querySelector('#app.show')).toBeNull();
});

test('auth callback returns synchronously without querying Supabase inside it', () => {
  client.from.mockClear();
  expect(authCallback('SIGNED_IN', {user: {id: 'user-b'}})).toBeUndefined();
  expect(client.from).not.toHaveBeenCalled();
});

test('plan builder saves one record per day rather than one per nested input', async () => {
  result = {data: {id: 'plan-1'}, error: null};
  run('confirmDialog=async()=>false;openPlanBuilder();addPlanDay("Monday","Push","Press 3x8");');
  win.document.getElementById('pb-name').value = 'Test plan';
  await run('savePlan()');
  expect(run("CONTENT.workouts.plans['custom_plan-1'].days.length")).toBe(1);
});

test('workout set inputs reject markup and limit excessive set counts', async () => {
  win.payload = '\" autofocus onfocus=alert(1) x=\"';
  run("CONTENT={workouts:{plans:{custom:{days:[{focus:'Push',exercises:[{name:'Press',sets:10000000,reps:payload}]}]}}}};");
  result = {data: null, error: null};
  await run('openLogModal(0)');
  expect(win.document.querySelector('#log-exercises [onfocus]')).toBeNull();
  expect(win.document.querySelectorAll('#log-exercises input')).toHaveLength(40);
});

test('shared template helpers escape content and reject executable identifiers', () => {
  const html = win.Render.habitRow({id: "x');alert(1)//", label: '<svg onload=alert(1)>'}, false);
  const target = win.document.createElement('div');target.innerHTML = html;
  expect(target.querySelector('svg')).toBeNull();
  expect(target.querySelector('input').getAttribute('onchange')).toBe("toggleHabit('')");
});

test('logger does not persist or emit personal payloads and raw errors', () => {
  win.Logger.log('profile', 'saved', {salary: 999999, name: 'PRIVATE'});
  win.Logger.error('api', 'failed', new Error('PRIVATE token=secret'));
  expect(JSON.stringify(win.Logger.getLogs())).not.toContain('PRIVATE');
  expect(JSON.stringify(win.console.error.mock.calls)).not.toContain('PRIVATE');
  expect(win.localStorage.getItem('_app_logs')).toBeNull();
});

test('home reports partial failures and loads the 14-day habit window in one query', async () => {
  client.from.mockImplementation(table => chain(table === 'todo_items'
    ? {data: null, error: {message: 'offline'}} : {data: [], error: null}));
  await run('renderHome()');
  expect(win.document.getElementById('home-command-brief').textContent).toContain('incomplete');
  expect(win.document.getElementById('home-command-brief').textContent).not.toContain('No deadline');
  expect(client.from.mock.calls.filter(([table]) => table === 'habit_logs')).toHaveLength(1);
});

test('late home requests cannot put a previous account brief back on screen', async () => {
  let finish;
  const response = new Promise(resolve => { finish = resolve; });
  client.from.mockImplementation(() => chain(response));
  const pending = run('renderHome()');
  authCallback('SIGNED_OUT', null);
  finish({data: [{title: 'PRIVATE previous task'}], error: null});
  await pending;
  expect(win.document.getElementById('home-command-brief').textContent).not.toContain('PRIVATE');
});
