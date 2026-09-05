require('../services/WorkoutService.js');

const Workouts = window.WorkoutService;

describe('WorkoutService', () => {
  test('finds Friday in a compact three-day plan by its day number', () => {
    const plan = {days: [
      {day: 1, focus: 'Full Body A'},
      {day: 3, focus: 'Full Body B'},
      {day: 5, focus: 'Full Body C'},
    ]};
    expect(Workouts.forWeekday(plan, 5)?.focus).toBe('Full Body C');
    expect(Workouts.forWeekday(plan, 2)).toBeNull();
  });

  test('keeps compatibility with legacy seven-slot arrays', () => {
    const friday = {focus: 'Legacy Friday'};
    expect(Workouts.forWeekday({days: [null, null, null, null, null, friday]}, 5)).toBe(friday);
  });

  test('normalizes named custom-plan days for reload-safe daily selection', () => {
    const days = Workouts.normalizeCustomDays([{day_name: 'Monday'}, {day_name: 'Friday'}]);
    expect(days.map(day => day.day)).toEqual([1, 5]);
    expect(Workouts.forWeekday({days}, 5)?.day_name).toBe('Friday');
  });

  test('keeps zero values, omits blank sets, and bounds numeric input before a save', () => {
    const draft={sessionId:'session',date:'2026-09-05',focus:'Push',dayIndex:0,
      exercises:[{name:'Press',sets:2}]};
    const result=Workouts.sessionPayload(draft,(_ex,set)=>set===0?'0':'','Notes','0');
    expect(result.p_sets).toHaveLength(1);
    expect(result.p_sets[0]).toMatchObject({weight_lbs:0,reps_completed:0});
    expect(result.p_duration_minutes).toBe(0);
    expect(()=>Workouts.sessionPayload(draft,()=>'-1','','')).toThrow('valid');
    expect(()=>Workouts.sessionPayload(draft,()=>'', '', '10abc')).toThrow('valid');
    expect(()=>Workouts.sessionPayload(draft,(_ex,_set,field)=>field==='r'?'2.5':'','','')).toThrow('whole');
  });
});
