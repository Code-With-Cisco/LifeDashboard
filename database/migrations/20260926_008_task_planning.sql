-- Live columns, constraints, grants and owner/MFA policies inspected 2026-09-26.
-- Additive: preserve existing tasks, calendar records, profile values and documents.
-- Existing table grants and owner + restrictive MFA policies cover these columns.
ALTER TABLE public.todo_items
 ADD COLUMN goal_id text CHECK (goal_id IS NULL OR length(goal_id) BETWEEN 1 AND 100),
 ADD COLUMN estimate_minutes integer CHECK (estimate_minutes BETWEEN 5 AND 1440),
 ADD COLUMN next_action text CHECK (next_action IS NULL OR length(next_action) <= 500);
-- Goal IDs refer to entries in this owner's goals document, not to another table.
-- A deleted goal leaves an explicit unavailable link; it never removes the task.
ALTER TABLE public.calendar_events ADD COLUMN end_time time;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_end_time_order CHECK (
 end_time IS NULL OR (event_time IS NOT NULL AND coalesce(end_date,event_date) >= event_date AND
  (coalesce(end_date,event_date) > event_date OR end_time > event_time)));
ALTER TABLE public.user_documents DROP CONSTRAINT personal_document_key;
ALTER TABLE public.user_documents ADD CONSTRAINT personal_document_key CHECK (
 document_key IN ('goals','habit_definitions','ingredients_protein','ingredients_side','focus_windows') OR
 document_key ~ '^purchase_decisions:[0-9]{4}-(0[1-9]|1[0-2])$');
-- focus_windows uses the existing bounded JSON array shape, revision checks,
-- invoker save RPC, ownership policy, account restrictions and MFA enforcement.
