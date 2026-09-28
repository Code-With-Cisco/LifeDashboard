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
  win.TextEncoder = TextEncoder;
  win.TextDecoder = TextDecoder;
  win.console = {log: jest.fn(), warn: jest.fn(), error: jest.fn()};
  win.CONFIG = {supabaseUrl: 'https://example.supabase.co', supabaseKey: 'sb_publishable_test'};
  result = {data: [], error: null};
  client = {
    auth: {onAuthStateChange: callback => { authCallback = callback; }, signOut: jest.fn(async () => ({error: null})),
      getSession:jest.fn(async()=>({data:{session:{access_token:'test',user:{id:'user-a'}}},error:null})),
      mfa:{getAuthenticatorAssuranceLevel:jest.fn(async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'},error:null})),
        listFactors:jest.fn(async()=>({data:{all:[]},error:null}))}},
    from: jest.fn(() => chain(result)),
    rpc: jest.fn(async (_name, payload) => ({data: payload.p_session_id, error: null})),
  };
  win.supabase = {createClient: () => client};
  for (const file of ['services/SecurityService.js', 'services/ProfileService.js', 'services/WorkoutService.js',
    'logs.js', 'state.js', 'utils.js', 'api.js', 'render.js', 'main.js', 'services/RecipeService.js',
    'services/HabitService.js', 'services/NutritionService.js', 'services/PlanningService.js', 'services/BriefingService.js',
    'services/PersonalDataService.js', 'services/BackupService.js', 'personal-data.js', 'services/MfaService.js','mfa.js','planning.js','data-operations.js','services/CalendarImportService.js','calendar-import.js','app.js']) {
    run(read(file));
  }
  run("PROFILE={id:'user-a',timezone:'America/New_York',assigned_workout_plan:'custom'};");
});

afterEach(() => dom.window.close());

test('empty recipes offer the first add action and clear a previous catalog',async()=>{
  run("CONTENT.spice={profiles:[{id:'basics',label:'Basics',recipes:[{id:'old',name:'Old recipe'}]}]};renderSpice();");
  result={data:[],error:null};
  await run('(async()=>{CONTENT.spice=await loadRecipesFromDB();renderSpice();})()');
  expect(win.document.getElementById('spice-panels').textContent).not.toContain('Old recipe');
  expect(win.document.getElementById('spice-panels').textContent).toContain('Add Recipe');
});

test('unavailable recipes offer retry while empty goals offer an add action',()=>{
  run('CONTENT.spice=null;renderSpice();renderGoals();');
  expect(win.document.getElementById('spice-panels').textContent).toContain('Retry recipes');
  expect(win.document.getElementById('goals-list').textContent).toContain('Add New Goal');
});

test('timezone detection never accepts an unconfirmed or old-session write',async()=>{
  run('delete PROFILE.timezone');result={data:null,error:null};
  await run('detectAndSaveTimezone()');expect(run('PROFILE.timezone')).toBeUndefined();
  let finish;win.API.records.write=jest.fn(()=>new Promise(resolve=>{finish=resolve;}));
  const pending=run('detectAndSaveTimezone()');authCallback('SIGNED_OUT',null);run("PROFILE={id:'user-b'}");
  finish({timezone:'America/New_York'});await pending;expect(run('PROFILE.timezone')).toBeUndefined();
});

test('a dashboard read finishing after sign-out cannot restore private content',async()=>{
  let finish;client.from.mockImplementation(()=>chain(new Promise(resolve=>{finish=resolve;})));
  const pending=run('renderDash()');authCallback('SIGNED_OUT',null);
  finish({data:[{log_date:'2026-09-28',weight_lbs:201}],error:null});await pending;
  expect(win.document.getElementById('wt-log').textContent).not.toContain('201');
  expect(client.from).toHaveBeenCalledTimes(1);
});

test('failed weight save retains the input and retries with the same ID',async()=>{
  win.document.getElementById('wt-in').value='200';
  const ids=[];win.API.records.write=jest.fn(async(_t,_u,_p,opts)=>{ids.push(opts.id);throw new Error('PRIVATE');});
  await run('logWeight()');await run('logWeight()');
  expect(win.document.getElementById('wt-in').value).toBe('200');
  expect(ids[0]).toBe(ids[1]);expect(win.document.getElementById('toast').textContent).not.toContain('Weight logged');
});
test('failed preset meal save keeps the modal open and never increments usage',async()=>{
  run("openModal('meal-modal')");result={data:null,error:{message:'Denied'}};
  await run("quickLogClose('Lunch',500,40,50,10,'meal-a')");
  expect(win.document.getElementById('meal-modal').classList.contains('open')).toBe(true);
  expect(client.rpc).not.toHaveBeenCalled();expect(win.document.getElementById('toast').textContent).not.toContain('Logged:');
});
test('custom meal retry does not duplicate the library record after log failure',async()=>{
  run("mealTab='custom';openModal('meal-modal')");
  win.document.getElementById('c-meal-name').value='Test lunch';win.document.getElementById('c-cal').value='500';
  let failed=true;
  win.API.records.write=jest.fn(async(table,_user,_payload,opts)=>{if(table==='meal_logs'&&failed)throw new Error();return {id:opts.id};});
  run('renderNutrition=async()=>{};fetchRemainingMacros=async()=>{};');
  await run('submitMeal()');expect(win.document.getElementById('meal-modal').classList.contains('open')).toBe(true);
  failed=false;await run('submitMeal()');
  expect(win.API.records.write.mock.calls.filter(c=>c[0]==='meals')).toHaveLength(1);
  expect(win.document.getElementById('meal-modal').classList.contains('open')).toBe(false);
});
test.each([
  ['saveDebt()', 'debt-modal', {'d-name':'Card','d-bal':'100','d-pay':'20','d-rate':'5','d-due':'10'}],
  ['saveSub()', 'sub-modal', {'s-name':'Music','s-cost':'10','s-due':'15'}],
  ['saveBill()', 'bill-modal', {'bill-name':'Power','bill-amount':'50','bill-due-day':'20'}]
])('unconfirmed %s retains the draft',async(action,modal,fields)=>{
  for(const [id,value] of Object.entries(fields))win.document.getElementById(id).value=value;
  run(`openModal('${modal}')`);result={data:null,error:null};await run(action);
  expect(win.document.getElementById(modal).classList.contains('open')).toBe(true);
  expect(win.document.getElementById('toast').textContent).toContain('could not be confirmed');
});
test('a rejected workout plan switch leaves the committed profile unchanged',async()=>{
  run("CONTENT.workouts={plans:{other:{name:'Other'}}}");result={data:null,error:{message:'denied'}};
  await run("switchWorkoutPlan('other')");expect(run('PROFILE.assigned_workout_plan')).toBe('custom');
});
test('late weight confirmation after sign-out cannot clear the next session input',async()=>{
  let finish;win.API.records.write=jest.fn(()=>new Promise(resolve=>{finish=resolve;}));
  win.document.getElementById('wt-in').value='200';const pending=run('logWeight()');
  authCallback('SIGNED_OUT',null);run("PROFILE={id:'user-b'}");win.document.getElementById('wt-in').value='180';
  finish({id:'weight-a'});await pending;expect(win.document.getElementById('wt-in').value).toBe('180');
});
test('nutrition uses profile targets without requiring an assigned meal catalog',async()=>{
  run('PROFILE.calorie_target=2200;PROFILE.protein_target=160;CONTENT={};');
  result={data:[{id:'meal-a',meal_name:'Lunch',calories:500,protein_g:40,carbs_g:50,fat_g:10}],error:null};
  await run('renderNutrition()');
  expect(win.document.getElementById('nut-targets').textContent).toContain('2,200');
  expect(win.document.getElementById('nut-targets').textContent).toContain('160g');
  expect(win.document.getElementById('meal-entries').textContent).toContain('Lunch');
});
test('failed nutrition and finance reads show unavailable instead of zeros',async()=>{
  result={data:null,error:{message:'offline'}};
  await run('renderNutrition();updateFinancialBoxes()');
  expect(win.document.getElementById('nut-targets').textContent).toContain('unavailable');
  expect(win.document.getElementById('fin-free-cash').textContent).toBe('Unavailable');
});
test('empty shelf replaces stale books and clears the current book',async()=>{
  run("CONTENT.books={lists:{'self-improvement-first':{books:[{id:'old',title:'Old book'}]}}};bookState.curBookId='old';");
  result={data:[],error:null};await run('renderBooks()');
  expect(win.document.getElementById('book-list').textContent).toContain('No books');expect(run('bookState.curBookId')).toBeNull();
  expect(run("CONTENT.books.lists['self-improvement-first'].books.length")).toBe(0);
});
test('zero-row reading updates never report success',async()=>{
  result={data:null,error:null};await run("setBookStatus('book-a','Read')");
  expect(win.document.getElementById('toast').textContent).toContain('could not be confirmed');
});
test('record updates and deletes scope ownership and require a returned row',async()=>{
  const calls=[];
  const query=new Proxy({}, {get:(_,key)=>key==='then'?Promise.resolve({data:null,error:null}).then.bind(Promise.resolve({data:null,error:null})):(...args)=>{calls.push([key,...args]);return query;}});
  client.from.mockReturnValue(query);
  await expect(win.API.records.write('debt_tracker','user-a',{balance:1},{match:{id:'debt-a'}})).rejects.toThrow();
  expect(calls).toContainEqual(['eq','user_id','user-a']);expect(calls).toContainEqual(['eq','id','debt-a']);expect(calls).toContainEqual(['single']);
});
test('retry recovers a confirmed insert but does not overwrite a changed record',async()=>{
  client.from.mockReturnValueOnce(chain({data:null,error:{code:'23505'}})).mockReturnValueOnce(chain({data:{id:'meal-a',user_id:'user-a',meal_name:'Lunch'},error:null}));
  expect(await win.API.records.write('meal_logs','user-a',{meal_name:'Lunch'},{id:'meal-a'})).toMatchObject({id:'meal-a'});
  client.from.mockReturnValueOnce(chain({data:null,error:{code:'23505'}})).mockReturnValueOnce(chain({data:{id:'meal-a',user_id:'user-a',meal_name:'Changed'},error:null}));
  await expect(win.API.records.write('meal_logs','user-a',{meal_name:'Lunch'},{id:'meal-a'})).rejects.toThrow();
});

test('habit failure leaves the saved checkbox state unchanged',async()=>{
  run("habitCache={walk:false};document.getElementById('h-habits-list').innerHTML='<div id=hc-walk><span id=hb-walk></span></div>';");
  win.API.habits.upsert=jest.fn(async()=>{throw new Error('offline');});
  await run("toggleHabit('walk')");
  expect(run('habitCache.walk')).toBe(false);expect(win.document.getElementById('hc-walk').classList.contains('done')).toBe(false);
});
test('take-home pay accepts zero but retains committed values on failure',async()=>{
  run('PROFILE.take_home_pay=5000;updateFinancialBoxes=async()=>{};');
  result={data:null,error:{message:'offline'}};await run('saveTakeHome(0)');expect(run('PROFILE.take_home_pay')).toBe(5000);
  result={data:{id:'user-a',take_home_pay:0},error:null};await run('saveTakeHome(0)');expect(run('PROFILE.take_home_pay')).toBe(0);
});
test.each([['renderMonth()','cal-month'],['renderWeek()','cal-week'],['renderDay()','cal-day'],['renderDebtList()','debt-list'],['renderSubList()','sub-list'],['renderBillsList()','bill-list']])('failed %s renders an explicit failure',async(action,id)=>{
  result={data:null,error:{message:'offline'}};await run(action);expect(win.document.getElementById(id).textContent).toContain('Could not load');
});
const importText=(details='')=>`BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:fixture\nSUMMARY:<img src=x> workout\nDTSTART:20260929T090000Z\nDTEND:20260929T100000Z\n${details}\nEND:VEVENT\nEND:VCALENDAR`;
function importFixture(details=''){
  Object.defineProperty(win,'crypto',{value:require('crypto').webcrypto});
  win.fileInput={files:[{size:100,text:async()=>importText(details)}],value:'file.ics'};
  win.API.calendarImport.list=jest.fn(async()=>[]);win.API.calendarImport.insert=jest.fn(async()=>{});
  run('renderCal=async()=>{};renderHome=async()=>{};');
}
test('calendar preview is read-only, escapes titles, and needs details acknowledgment',async()=>{
  importFixture('DESCRIPTION:Private instructions');await run('CalendarImport.read(fileInput)');
  expect(win.API.calendarImport.insert).not.toHaveBeenCalled();expect(win.document.querySelector('#ics-preview img')).toBeNull();
  expect(win.document.getElementById('ics-preview').textContent).toContain('<img src=x>');
  await run('CalendarImport.save()');expect(win.API.calendarImport.insert).not.toHaveBeenCalled();
  win.document.getElementById('ics-details-confirm').checked=true;await run('CalendarImport.save()');
  expect(win.API.calendarImport.insert).toHaveBeenCalledTimes(1);expect(win.document.getElementById('ics-status').textContent).toContain('Imported 1');
});
test('repeating a calendar preview reuses IDs and skips confirmed records',async()=>{
  importFixture();await run('CalendarImport.read(fileInput)');await run('CalendarImport.save()');
  const rows=win.API.calendarImport.insert.mock.calls[0][1];
  win.API.calendarImport.list.mockResolvedValue(rows);await run('CalendarImport.read(fileInput)');
  expect(win.document.getElementById('ics-status').textContent).toContain('1 already present');
  expect(win.document.getElementById('ics-confirm').disabled).toBe(true);
});
test('calendar write failure requires a new preview and never claims completion',async()=>{
  importFixture();win.API.calendarImport.insert.mockRejectedValue(new Error('private'));await run('CalendarImport.read(fileInput)');await run('CalendarImport.save()');
  expect(win.document.getElementById('ics-status').textContent).toContain('import stopped');
  expect(win.document.getElementById('ics-status').textContent).not.toContain('private');
  await run('CalendarImport.save()');expect(win.API.calendarImport.insert).toHaveBeenCalledTimes(1);
});
test('sign-out invalidates an outstanding calendar preview',async()=>{
  importFixture();let finish;win.API.calendarImport.list.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  const pending=run('CalendarImport.read(fileInput)');
  while(!finish)await new Promise(resolve=>setImmediate(resolve));
  authCallback('SIGNED_OUT',null);finish([]);await pending;await run('CalendarImport.save()');
  expect(win.API.calendarImport.insert).not.toHaveBeenCalled();expect(win.document.getElementById('ics-preview').textContent).toBe('');
});

test('custom workout markup stays text in the actual workout renderer', () => {
  win.payload = '<img src=x onerror="alert(1)">';
  run("CONTENT={workouts:{plans:{custom:{days:[{day:1,day_name:'Monday',focus:payload,muscles:[payload],exercises:[{name:payload,sets:3,reps:payload,notes:payload}]}]}}}};");
  run('renderWorkout()');
  expect(win.document.querySelector('#wk-panels img')).toBeNull();
  expect(win.document.getElementById('wk-panels').textContent).toContain(win.payload);
});

test('profile settings display saved personal details as input values', () => {
  win.payload = '\"><img src=x onerror="alert(1)">';
  run('PROFILE.display_name=payload;PROFILE.target_weight=175;openProfileModal();');
  expect(win.document.querySelector('#profile-modal img')).toBeNull();
  expect(win.document.getElementById('profile-display-name').value).toBe(win.payload);
  expect(win.document.getElementById('profile-target-weight').value).toBe('175');
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
  const pending = run("applyAuthSession('INITIAL_SESSION',{access_token:'test',user:{id:'user-a'}},_authEpoch)");
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
  expect(client.auth.mfa.listFactors).not.toHaveBeenCalled();
});

function requireAuthenticator(){
 client.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({data:{currentLevel:'aal1',nextLevel:'aal2'}});
 client.auth.mfa.listFactors.mockResolvedValue({data:{all:[{id:'factor-a',friendly_name:'Phone',factor_type:'totp',status:'verified'}]}});
}
test('MFA blocks profile reads and auto-creation before opening private data',async()=>{
 requireAuthenticator();
 await run("applyAuthSession('INITIAL_SESSION',{access_token:'test',user:{id:'user-a'}},_authEpoch)");
 expect(client.from).not.toHaveBeenCalled();expect(run('PROFILE')).toBeNull();
 expect(win.document.getElementById('s-mfa').classList.contains('show')).toBe(true);
 expect(win.document.getElementById('mfa-factor').value).toBe('factor-a');
});
test('MFA status failure clears private content and offers retry',async()=>{
 client.auth.mfa.listFactors.mockResolvedValue({error:{message:'PRIVATE token'}});
 win.document.getElementById('home-command-brief').textContent='PRIVATE meeting';
 await run("applyAuthSession('TOKEN_REFRESHED',{access_token:'test',user:{id:'user-a'}},_authEpoch)");
 expect(client.from).not.toHaveBeenCalled();expect(run('PROFILE')).toBeNull();
 expect(win.document.getElementById('app').textContent).not.toContain('PRIVATE');
 expect(win.document.getElementById('mfa-error').textContent).toContain('Retry');
});
test('password recovery must pass MFA before the password screen',async()=>{
 requireAuthenticator();
 await run("applyAuthSession('PASSWORD_RECOVERY',{access_token:'test',user:{id:'user-a'}},_authEpoch)");
 expect(win.document.getElementById('s-fpr').classList.contains('show')).toBe(false);
 client.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({data:{currentLevel:'aal2',nextLevel:'aal2'}});
 await run('MFA.retry()');
 expect(win.document.getElementById('s-fpr').classList.contains('show')).toBe(true);
 expect(client.from).not.toHaveBeenCalled();
});
test('valid token refresh keeps current edits and skips data reinitialization',async()=>{
 win.document.querySelector('#profile-modal input').value='Unsaved edit';
 await run("applyAuthSession('TOKEN_REFRESHED',{access_token:'test',user:{id:'user-a'}},_authEpoch)");
 expect(win.document.querySelector('#profile-modal input').value).toBe('Unsaved edit');
 expect(client.from).not.toHaveBeenCalled();
});
test('a security retry completing after logout cannot restart sign-in',async()=>{
 let finish;
 client.auth.getSession.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const pending=run('MFA.retry()');authCallback('SIGNED_OUT',null);
 finish({data:{session:{access_token:'test',user:{id:'user-a'}}}});await pending;
 expect(client.auth.mfa.listFactors).not.toHaveBeenCalled();
 expect(run('PROFILE')).toBeNull();
 expect(win.document.getElementById('s-mfa').classList.contains('show')).toBe(false);
});
test('late enrollment cannot render a secret after sign-out',async()=>{
 let finish;
 client.auth.mfa.enroll=jest.fn(()=>new Promise(resolve=>{finish=resolve;}));
 await run('MFA.open()');win.document.getElementById('mfa-name').value='Phone';
 const pending=run('MFA.begin()');
 authCallback('SIGNED_OUT',null);
 finish({data:{id:'factor-a',totp:{secret:'PRIVATE-SETUP',qr_code:'<svg></svg>'}}});await pending;
 expect(win.document.body.textContent).not.toContain('PRIVATE-SETUP');
 expect(win.document.getElementById('mfa-qr').hasAttribute('src')).toBe(false);
});
test('closing the setup backdrop clears its secret and code',async()=>{
 client.auth.mfa.enroll=jest.fn(async()=>({data:{id:'factor-a',totp:{secret:'PRIVATE-SETUP',qr_code:'<svg></svg>'}}}));
 await run('MFA.open()');win.document.getElementById('mfa-name').value='Phone';await run('MFA.begin()');
 expect(win.document.getElementById('mfa-secret').textContent).toBe('PRIVATE-SETUP');
 win.document.getElementById('mfa-setup-code').value='012345';
 win.document.getElementById('mfa-modal').click();
 expect(win.document.getElementById('mfa-secret').textContent).toBe('');
 expect(win.document.getElementById('mfa-setup-code').value).toBe('');
 expect(win.document.getElementById('mfa-qr').hasAttribute('src')).toBe(false);
});

test.each([false, true, null])('sign-in opens the dashboard with legacy setup status %s and preserves saved values', async signupComplete => {
  const profile={id:'user-a',username:'user.a',display_name:'Returning user',timezone:'America/New_York',
    signup_complete:signupComplete,questionnaire:{days:'3'},assigned_workout_plan:'custom',
    assigned_meal_plan:'custom-meals',assigned_reading_list:'custom-books',start_weight:180,target_weight:170};
  const update=jest.fn();
  client.from.mockImplementation(table=>table==='profiles'
    ? {...chain({data:profile,error:null}),select:()=>chain({data:profile,error:null}),update}
    : chain({data:[],error:null}));
  await run("applyAuthSession('INITIAL_SESSION',{access_token:'test',user:{id:'user-a'}},_authEpoch)");
  expect(win.document.querySelector('#app.show')).not.toBeNull();
  expect(win.document.querySelector('.auth-screen.show')).toBeNull();
  expect(win.document.getElementById('q-screen')).toBeNull();
  expect(run('PROFILE')).toEqual(profile);
  expect(update).not.toHaveBeenCalled();
  expect(client.from.mock.calls.map(([table])=>table)).toContain('user_documents');
  run('openProfileModal()');
  expect(win.document.getElementById('profile-target-weight').value).toBe('170');
});

test('a missing profile is created and enters the dashboard without collecting answers', async () => {
  const profile={id:'user-a',username:'new-user',display_name:'New user',timezone:'America/New_York',signup_complete:false};
  const insert=jest.fn(()=>chain({data:profile,error:null}));
  client.from.mockImplementation(table=>table==='profiles'
    ? {select:()=>chain({data:null,error:null}),insert}
    : chain({data:[],error:null}));
  await run("applyAuthSession('INITIAL_SESSION',{access_token:'test',user:{id:'user-a',user_metadata:{username:'new-user',display_name:'New user'}}},_authEpoch)");
  expect(insert).toHaveBeenCalledTimes(1);
  expect(insert.mock.calls[0][0]).not.toHaveProperty('questionnaire');
  expect(win.document.querySelector('#app.show')).not.toBeNull();
  expect(win.document.getElementById('nav-uname').textContent).toBe('New user');
  expect(client.from.mock.calls.map(([table])=>table)).toContain('user_documents');
});

test('sign-out during personal-record initialization cannot reopen the dashboard', async () => {
  client.from.mockImplementation(table=>{
    if(table==='profiles')return chain({data:{id:'user-a',signup_complete:false,timezone:'America/New_York'},error:null});
    if(table==='user_documents')authCallback('SIGNED_OUT',null);
    return chain({data:[],error:null});
  });
  await run("applyAuthSession('INITIAL_SESSION',{access_token:'test',user:{id:'user-a'}},_authEpoch)");
  expect(run('PROFILE')).toBeNull();
  expect(win.document.querySelector('#app.show')).toBeNull();
  expect(client.from.mock.calls.map(([table])=>table)).toEqual(['profiles','user_documents']);
});

test('an incomplete legacy profile still requires a password reset before entry', async () => {
  result={data:{id:'user-a',signup_complete:false,force_password_reset:true,timezone:'America/New_York'},error:null};
  await run("applyAuthSession('INITIAL_SESSION',{access_token:'test',user:{id:'user-a'}},_authEpoch)");
  expect(win.document.querySelector('#app.show')).toBeNull();
  expect(win.document.getElementById('s-fpr').classList.contains('show')).toBe(true);
  expect(client.from.mock.calls.map(([table])=>table)).toEqual(['profiles']);
});

test('a disabled profile cannot enter even when no setup is required', async () => {
  result={data:{id:'user-a',signup_complete:false,is_disabled:true,timezone:'America/New_York'},error:null};
  await run("applyAuthSession('INITIAL_SESSION',{access_token:'test',user:{id:'user-a'}},_authEpoch)");
  expect(client.auth.signOut).toHaveBeenCalled();
  expect(run('PROFILE')).toBeNull();
  expect(win.document.querySelector('#app.show')).toBeNull();
});

test('administration no longer labels existing users as awaiting a questionnaire', async () => {
  run("PROFILE.role='admin'");
  result={data:[{id:'user-b',display_name:'Existing user',signup_complete:false}],error:null};
  await run('renderAdmin()');
  const text=win.document.getElementById('user-list').textContent;
  expect(text).toContain('Existing user');
  expect(text).not.toMatch(/Questionnaire pending|Setup complete/);
});

test('custom ingredients resolve from the current account without changing built-in macros', async () => {
  const entry={cal:0,pro:1,car:0,fat:0,label:'PRIVATE custom ingredient',unit:'oz'};
  result={data:[{user_id:'user-a',document_key:'ingredients_protein',payload:{chicken_breast:entry},revision:1}],error:null};
  await win.PersonalData.initialize(client,'user-a');
  expect(run("getMacroProtein('chicken_breast').label")).toBe(entry.label);
  expect(run("MACRO_PROT.chicken_breast.label")).toBe('Chicken Breast');
  authCallback('SIGNED_OUT',null);
  expect(run("getMacroProtein('chicken_breast').label")).toBe('Chicken Breast');
});

test('failed hourly-rate save retains input and does not change the committed profile', async () => {
  run('PROFILE.wit_hourly_rate=20');win.document.getElementById('wit-rate').value='30';
  client.from.mockImplementation(()=>chain(Promise.reject(new Error('offline'))));
  await run('saveWitRate()');
  expect(run('PROFILE.wit_hourly_rate')).toBe(20);
  expect(win.document.getElementById('wit-rate').value).toBe('30');
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

test('calendar brief selects the actual database time column and uses its alias', async () => {
  const selections=[];
  client.from.mockImplementation(table=>{
    if(table!=='calendar_events')return chain({data:[],error:null});
    return {select: selection=>{selections.push(selection);return chain({data:[
      {id:'event-1',title:'Morning appointment',event_date:run('todayStr()'),start_time:'08:00:00'},
    ],error:null});}};
  });
  await run('renderHome()');
  expect(selections).toEqual(['id,title,event_date,end_date,start_time:event_time,end_time,all_day,is_recurring,event_type']);
  expect(win.document.getElementById('home-command-brief').textContent).toContain('Morning appointment');
});

test('a failed workout save keeps entries and retries the same session without direct deletes', async () => {
  run("CONTENT={workouts:{plans:{custom:{days:[{focus:'Push',exercises:[{name:'Press',sets:1,reps:8}]}]}}}};");
  result={data:null,error:null};
  await run('openLogModal(0)');
  win.document.getElementById('ex-0-s0-w').value='0';
  win.document.getElementById('log-text').value='Keep my notes';
  client.from.mockClear();
  client.rpc.mockResolvedValueOnce({data:null,error:{message:'PRIVATE database details'}});
  await run('saveLog()');
  const payload=client.rpc.mock.calls[0][1];
  expect(payload.p_sets[0].weight_lbs).toBe(0);
  expect(client.from).not.toHaveBeenCalled();
  expect(win.document.getElementById('log-text').value).toBe('Keep my notes');
  expect(win.document.getElementById('log-modal').classList.contains('open')).toBe(true);
  expect(win.document.querySelector('#log-modal .btn-r').disabled).toBe(false);
  await run('saveLog()');
  expect(client.rpc.mock.calls[1][1].p_session_id).toBe(payload.p_session_id);
  expect(win.document.getElementById('log-modal').classList.contains('open')).toBe(false);
});

test('failed or late workout reads cannot open an empty replacement session', async () => {
  result={data:null,error:{message:'offline'}};
  await run('openLogModal(0)');
  expect(run('workoutState.draft')).toBeNull();
  expect(win.document.getElementById('log-modal').classList.contains('open')).toBe(false);
  let finish;
  client.from.mockImplementation(()=>chain(new Promise(resolve=>{finish=resolve;})));
  const pending=run('openLogModal(0)');
  authCallback('SIGNED_OUT',null);
  finish({data:{id:'old',notes:'PRIVATE'},error:null});
  await pending;
  expect(win.document.getElementById('log-text').value).toBe('');
  expect(run('workoutState.draft')).toBeNull();
});

test('password update sends the exact current password and never clears the server reset flag itself', async () => {
  win.document.getElementById('fpr-cur').value=' current with spaces ';
  win.document.getElementById('fpr-pass').value='new-password-123';
  win.document.getElementById('fpr-pass2').value='new-password-123';
  client.auth.updateUser=jest.fn(async()=>({data:{user:{id:'user-a'}},error:null}));
  result={data:{id:'user-a',force_password_reset:true},error:null};
  await run('doFPR()');
  expect(client.auth.updateUser).toHaveBeenCalledWith({password:'new-password-123',current_password:' current with spaces '});
  expect(win.document.getElementById('fpr-err').textContent).toContain('could not be verified');
  expect(win.document.getElementById('fpr-cur').value).toBe('');
  expect(run('PROFILE.force_password_reset')).toBeUndefined();
});

test('zero-row administrator writes do not report a successful role change', async () => {
  run("PROFILE.role='admin';toast=message=>window.lastToast=message;");
  result={data:null,error:null};
  await run("toggleAdminRole('user-b',true)");
  expect(win.lastToast).toContain('could not be confirmed');
});

test('late workout history cannot restore private notes after sign-out', async () => {
  let finish;
  client.from.mockImplementation(()=>chain(new Promise(resolve=>{finish=resolve;})));
  const pending=run('renderWorkoutHistory()');
  authCallback('SIGNED_OUT',null);
  finish({data:[{session_date:'2026-09-05',day_name:'PRIVATE',notes:'PRIVATE'}],error:null});
  await pending;
  expect(win.document.getElementById('wk-history').textContent).not.toContain('PRIVATE');
});

test('failed task saves preserve planning fields and retry the same task ID', async () => {
  run('Planning.open();renderHome=async()=>{};');
  win.document.getElementById('todo-title').value='Prepare application';
  win.document.getElementById('todo-estimate').value='45';
  win.document.getElementById('todo-next-action').value='Collect references';
  const inserts=[];
  client.from.mockImplementation(()=>({insert:payload=>{inserts.push(payload);return chain({data:null,error:{message:'PRIVATE'}});}}));
  await run('Planning.save()');
  expect(win.document.getElementById('todo-modal').classList.contains('open')).toBe(true);
  expect(win.document.getElementById('todo-next-action').value).toBe('Collect references');
  expect(win.document.getElementById('todo-save').disabled).toBe(false);
  expect(win.document.getElementById('todo-error').textContent).not.toContain('PRIVATE');
  client.from.mockImplementation(()=>({insert:payload=>{inserts.push(payload);return chain({data:payload,error:null});}}));
  await run('Planning.save()');
  expect(inserts[1].id).toBe(inserts[0].id);
  expect(inserts[1]).toMatchObject({estimate_minutes:45,next_action:'Collect references',user_id:'user-a'});
  expect(win.document.getElementById('todo-modal').classList.contains('open')).toBe(false);
});

test('late task save cannot reopen content after sign-out', async () => {
  run('Planning.open()');win.document.getElementById('todo-title').value='Private task';
  let finish,payload;
  client.from.mockImplementation(()=>({insert:value=>{payload=value;return chain(new Promise(resolve=>{finish=resolve;}));}}));
  const pending=run('Planning.save()');authCallback('SIGNED_OUT',null);
  finish({data:payload,error:null});await pending;
  expect(win.document.body.textContent).not.toContain('Private task');
  expect(win.document.querySelector('.modal-bg.open')).toBeNull();
});

test('zero-row task changes never report successful completion', async () => {
  run('toast=message=>window.lastToast=message');
  // The controller captured toast during construction; inspect its actual output.
  result={data:null,error:null};
  await run("Planning.change('task-a',{status:'Done',completed:true})");
  expect(win.document.getElementById('toast').textContent).toContain('could not be confirmed');
});

test('focus windows remain editable after a rejected save and never write to another account', async () => {
  client.from.mockImplementation(()=>chain({data:[],error:null}));
  await win.PersonalData.initialize(client,'user-a');
  run('Planning.openWindows();Planning.addWindow({day:1,start:"09:00",end:"11:00"});');
  client.rpc.mockResolvedValue({data:null,error:{code:'PT409'}});
  await run('Planning.saveWindows()');
  expect(win.document.getElementById('focus-windows-modal').classList.contains('open')).toBe(true);
  expect(win.document.querySelector('#focus-window-rows input').value).toBe('09:00');
  expect(client.rpc.mock.calls[0][1]).toEqual({p_documents:[{key:'focus_windows',payload:[{day:1,start:'09:00',end:'11:00'}],expected_revision:0}]});
});

test('an event end-time save failure keeps the event draft', async () => {
  run('openEventModal()');
  win.document.getElementById('ev-title').value='Appointment';
  win.document.getElementById('ev-end-time').value='10:00';
  result={data:null,error:{message:'offline'}};
  await run('saveEvent()');
  expect(win.document.getElementById('event-modal').classList.contains('open')).toBe(true);
  expect(win.document.getElementById('ev-end-time').value).toBe('10:00');
  expect(win.document.getElementById('ev-save').disabled).toBe(false);
});

test('the calendar shows chosen focus windows instead of fixed routine events', async () => {
  client.from.mockImplementation(()=>chain({data:[{user_id:'user-a',document_key:'focus_windows',payload:[{day:1,start:'09:00',end:'10:00'}],revision:1}],error:null}));
  await win.PersonalData.initialize(client,'user-a');
  client.from.mockImplementation(()=>chain({data:[],error:null}));
  run("calDate=new Date('2026-09-28T12:00:00')");
  await run('renderDay()');
  expect(win.document.getElementById('cal-day').textContent).toContain('Focus window 09:00–10:00');
  expect(win.document.getElementById('cal-day').textContent).not.toContain('Workout');
});

test('a token refresh requiring MFA clears already rendered private data', async () => {
  win.document.getElementById('home-command-brief').textContent='PRIVATE planning detail';
  requireAuthenticator();
  await run("applyAuthSession('TOKEN_REFRESHED',{access_token:'expired-aal2',user:{id:'user-a'}},_authEpoch)");
  expect(win.document.getElementById('app').textContent).not.toContain('PRIVATE');
  expect(win.document.getElementById('s-mfa').classList.contains('show')).toBe(true);
  expect(win.document.querySelector('#app.show')).toBeNull();
});
