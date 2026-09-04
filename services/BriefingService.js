/**
 * BriefingService - deterministic prioritization for the daily command brief.
 *
 * This service intentionally has no network, DOM, or AI dependency. External
 * connectors can normalize their data into these inputs without gaining access
 * to the rest of the dashboard.
 */
(function(root) {
  'use strict';

  const STATUS_WEIGHT = {
    Urgent: 100,
    Important: 80,
    'In Progress': 60,
    'Not Started': 40,
    'On Hold': 15,
    'Not Urgent': 10,
  };

  function taskScore(task, today) {
    let score = STATUS_WEIGHT[task.status] || 20;
    if (task.due_date) {
      if (task.due_date < today) score += 60;
      else if (task.due_date === today) score += 40;
    }
    score += Math.min(Number(task.push_back_count) || 0, 5) * 8;
    return score;
  }

  function taskReason(task, today) {
    if (task.due_date && task.due_date < today) return 'Overdue';
    if (task.due_date === today) return 'Due today';
    if (task.status === 'Urgent' || task.status === 'Important') return task.status;
    if ((Number(task.push_back_count) || 0) > 0) return 'Previously postponed';
    return 'Next best action';
  }

  function build(input) {
    const data = input || {};
    const today = data.today || new Date().toISOString().slice(0, 10);
    const todos = (data.todos || [])
      .filter(item => item && item.status !== 'Done' && item.completed !== true)
      .map(item => ({...item, _score: taskScore(item, today)}))
      .sort((a, b) => b._score - a._score || String(a.due_date || '').localeCompare(String(b.due_date || '')));
    const events = (data.events || [])
      .filter(event => event && event.event_date <= today && (event.end_date || event.event_date) >= today);
    const focus = todos.slice(0, 3).map(item => ({
      kind: 'task',
      title: item.title || 'Untitled task',
      reason: taskReason(item, today),
      id: item.id || null,
    }));

    if (focus.length < 3 && events.length) {
      focus.push({kind: 'event', title: events[0].title || 'Calendar event', reason: 'On today\'s calendar'});
    }
    if (focus.length < 3 && data.workout && !data.workout.rest) {
      focus.push({kind: 'workout', title: data.workout.focus || 'Complete today\'s workout', reason: 'Planned training'});
    }

    const completedHabits = Number(data.habitCompleted) || 0;
    const totalHabits = Math.max(Number(data.habitTotal) || 0, completedHabits);
    const dueToday = todos.filter(item => item.due_date && item.due_date <= today).length;
    const overdue = todos.filter(item => item.due_date && item.due_date < today).length;
    const headline = focus.length
      ? `Start with ${focus[0].title}.`
      : 'Your runway is clear. Choose one meaningful next action.';
    const summary = `${dueToday} task${dueToday === 1 ? '' : 's'} due, ${events.length} event${events.length === 1 ? '' : 's'}, ${completedHabits}/${totalHabits || 0} habits complete.`;
    const alerts = [];
    if (overdue) alerts.push(`${overdue} overdue task${overdue === 1 ? '' : 's'} need a decision.`);
    if (data.leakedPasswordProtection === false) alerts.push('Account protection needs attention.');

    return {
      headline,
      summary,
      focus,
      alerts,
      metrics: {dueToday, overdue, eventCount: events.length, completedHabits, totalHabits},
    };
  }

  root.BriefingService = Object.freeze({build, taskScore});
})(typeof window !== 'undefined' ? window : globalThis);
