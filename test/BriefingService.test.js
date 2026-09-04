require('../services/BriefingService.js');

const Briefing = window.BriefingService;

describe('BriefingService', () => {
  const today = '2026-09-03';

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
});
