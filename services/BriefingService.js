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

  const DEFAULT_PREFERENCES = Object.freeze({
    focusRule: 'balanced',
    focusLimit: 3,
    includeTasks: true,
    includeCalendar: true,
    includeWorkout: true,
    morningEnabled: false,
    morningTime: '07:00',
  });

  const RULE_WEIGHTS = Object.freeze({
    balanced: Object.freeze({status: 1, overdue: 60, today: 40, postponed: 8}),
    deadlines: Object.freeze({status: 0.35, overdue: 140, today: 90, postponed: 4}),
    priorities: Object.freeze({status: 1, overdue: 10, today: 5, postponed: 4}),
  });

  function normalizePreferences(value) {
    const input = value && typeof value === 'object' ? value : {};
    const focusRule = Object.prototype.hasOwnProperty.call(RULE_WEIGHTS, input.focusRule)
      ? input.focusRule
      : DEFAULT_PREFERENCES.focusRule;
    const requestedLimit = Number(input.focusLimit);
    const focusLimit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(5, Math.round(requestedLimit)))
      : DEFAULT_PREFERENCES.focusLimit;

    return {
      focusRule,
      focusLimit,
      includeTasks: input.includeTasks !== false,
      includeCalendar: input.includeCalendar !== false,
      includeWorkout: input.includeWorkout !== false,
      morningEnabled: input.morningEnabled === true,
      morningTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(input.morningTime || ''))
        ? input.morningTime
        : DEFAULT_PREFERENCES.morningTime,
    };
  }

  function taskScore(task, today, focusRule) {
    const weights = RULE_WEIGHTS[focusRule] || RULE_WEIGHTS.balanced;
    let score = (STATUS_WEIGHT[task.status] || 20) * weights.status;
    if (task.due_date) {
      if (task.due_date < today) score += weights.overdue;
      else if (task.due_date === today) score += weights.today;
    }
    score += Math.min(Number(task.push_back_count) || 0, 5) * weights.postponed;
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
    const preferences = normalizePreferences(data.preferences);
    const todos = (data.todos || [])
      .filter(item => item && item.status !== 'Done' && item.completed !== true)
      .map(item => ({...item, _score: taskScore(item, today, preferences.focusRule)}))
      .sort((a, b) => b._score - a._score || String(a.due_date || '').localeCompare(String(b.due_date || '')));
    const events = (data.events || [])
      .filter(event => event && event.event_date <= today && (event.end_date || event.event_date) >= today);
    const focus = (preferences.includeTasks ? todos.slice(0, preferences.focusLimit) : []).map(item => ({
      kind: 'task',
      title: item.title || 'Untitled task',
      reason: taskReason(item, today),
      id: item.id || null,
    }));

    if (preferences.includeCalendar && focus.length < preferences.focusLimit && events.length) {
      focus.push({kind: 'event', title: events[0].title || 'Calendar event', reason: 'On today\'s calendar'});
    }
    if (preferences.includeWorkout && focus.length < preferences.focusLimit && data.workout && !data.workout.rest) {
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
      preferences,
    };
  }

  root.BriefingService = Object.freeze({build, taskScore, normalizePreferences, DEFAULT_PREFERENCES});
})(typeof window !== 'undefined' ? window : globalThis);
