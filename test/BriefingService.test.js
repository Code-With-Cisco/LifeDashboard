require('../services/BriefingService.js');
require('../services/PlanningService.js');

const Briefing = window.BriefingService;

describe('BriefingService', () => {
  const today = '2026-09-03';

  test('an outage produces an incomplete brief instead of an all-clear message', () => {
    const brief = Briefing.build({today, unavailableSources: ['Tasks', 'Calendar']});
    expect(brief.headline).toContain('incomplete');
    expect(brief.summary).toContain('? tasks');
    expect(brief.alerts).toHaveLength(2);
  });

  test('keeps saved long-term goals separate from immediate task priorities', () => {
    const brief = Briefing.build({today, todos: [{id:'task-1',title:'Finish report'}],
      goals:[{g:'Practice guitar',p:'Low',freq:'Weekly'}, {g:'Finish certification',p:'High',freq:'Daily'}]});
    expect(brief.directions[0].title).toBe('Finish certification');
    expect(brief.focus[0].id).toBe('task-1');
  });

  test('calendar fallback selects the earliest event rather than database row order', () => {
    const brief = Briefing.build({today, events: [
      {title:'Evening',event_date:today,start_time:'18:00'}, {title:'Morning',event_date:today,start_time:'08:00'},
    ]});
    expect(brief.focus[0].title).toBe('Morning');
  });

  test('prioritizes overdue and urgent work', () => {
    const result = Briefing.build({
      today,
      todos: [
        {id: 'later', title: 'Later task', status: 'Not Started', due_date: '2026-09-05'},
        {id: 'urgent', title: 'Urgent task', status: 'Urgent', due_date: today},
        {id: 'old', title: 'Overdue task', status: 'Important', due_date: '2026-09-01'},
      ],
      habitCompleted: 4,
      habitTotal: 10,
    });
    expect(result.focus.map(item => item.id)).toEqual(['old', 'urgent', 'later']);
    expect(result.metrics.overdue).toBe(1);
    expect(result.headline).toBe('Start with Overdue task.');
  });

  test('fills an open focus slot with a calendar event and workout', () => {
    const result = Briefing.build({
      today,
      events: [{title: 'Doctor appointment', event_date: today}],
      workout: {focus: 'Upper body', rest: false},
    });
    expect(result.focus.map(item => item.kind)).toEqual(['event', 'workout']);
  });

  test('ignores calendar events that ended before today', () => {
    const result = Briefing.build({
      today,
      events: [{title: 'Yesterday', event_date: '2026-09-02'}],
    });
    expect(result.metrics.eventCount).toBe(0);
    expect(result.focus).toEqual([]);
  });

  test('ignores completed tasks and reports a clear runway', () => {
    const result = Briefing.build({today, todos: [{title: 'Done', status: 'Done'}]});
    expect(result.focus).toEqual([]);
    expect(result.headline).toContain('runway is clear');
  });

  test('lets deadline-first focus outrank a future urgent task', () => {
    const todos = [
      {id: 'future', title: 'Future urgent', status: 'Urgent', due_date: '2026-09-10'},
      {id: 'today', title: 'Due today', status: 'Not Started', due_date: today},
    ];
    const balanced = Briefing.build({today, todos});
    const deadlineFirst = Briefing.build({today, todos, preferences: {focusRule: 'deadlines'}});

    expect(balanced.focus[0].id).toBe('future');
    expect(deadlineFirst.focus[0].id).toBe('today');
  });

  test('applies the focus limit and source controls', () => {
    const result = Briefing.build({
      today,
      todos: [{id: 'task', title: 'Task', status: 'Urgent'}],
      events: [{title: 'Appointment', event_date: today}],
      workout: {focus: 'Leg day', rest: false},
      preferences: {focusLimit: 1, includeTasks: false, includeCalendar: true, includeWorkout: true},
    });

    expect(result.focus).toEqual([{kind: 'event', title: 'Appointment', reason: 'On today\'s calendar'}]);
    expect(result.metrics.dueToday).toBe(0);
  });

  test('normalizes malformed preferences to safe defaults', () => {
    expect(Briefing.normalizePreferences({
      focusRule: 'random',
      focusLimit: 99,
      includeTasks: false,
      morningEnabled: 'yes',
      morningTime: '25:00',
    })).toEqual({
      focusRule: 'balanced',
      focusLimit: 5,
      includeTasks: false,
      includeCalendar: true,
      includeWorkout: true,
      morningEnabled: false,
      morningTime: '07:00',
    });
  });

  test('planning explains fit, links a goal and keeps overdue oversized work visible',()=>{
    const brief=Briefing.build({today:'2026-09-28',goals:[{id:'g',g:'Finish course',p:'Critical'}],
      todos:[{id:'big',title:'Long report',status:'Urgent',due_date:'2026-09-27',estimate_minutes:120},
        {id:'small',title:'Study',goal_id:'g',estimate_minutes:30,next_action:'Read chapter 2'}],
      planning:{timezone:'UTC',now:'2026-09-28T08:00:00Z',focusWindows:[{day:1,start:'09:00',end:'10:00'}]}});
    expect(brief.focus[0]).toMatchObject({id:'small',goalTitle:'Finish course',nextAction:'Read chapter 2'});
    expect(brief.focus[0].reason).toContain('09:00–09:30');
    expect(brief.planning.deferred[0].id).toBe('big');expect(brief.metrics.overdue).toBe(1);
  });
});
