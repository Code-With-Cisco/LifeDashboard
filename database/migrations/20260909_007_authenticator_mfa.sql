-- Inspected live schema: 26 public tables, auth.mfa_factors and auth.jwt().
-- Opt-in MFA: only accounts with a verified factor require an aal2 session.
-- Keep all ownership, role, disabled-account and password-reset restrictions.
DO $$ BEGIN
 IF to_regprocedure('public.mfa_session_allowed()') IS NOT NULL THEN
  RAISE EXCEPTION 'MFA guard already exists; inspect migration state'; END IF;
 IF to_regclass('auth.mfa_factors') IS NULL OR to_regprocedure('auth.jwt()') IS NULL
 OR to_regclass('public.user_documents') IS NULL THEN
  RAISE EXCEPTION 'Inspected Auth schema and migrations 001–006 are required'; END IF;
END $$;

CREATE FUNCTION public.mfa_session_allowed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT auth.uid() IS NOT NULL AND (
  coalesce(auth.jwt()->>'aal','aal1')='aal2'
  OR NOT EXISTS(SELECT 1 FROM auth.mfa_factors f
    WHERE f.user_id=auth.uid() AND f.status='verified')
 );
$$;
REVOKE ALL ON FUNCTION public.mfa_session_allowed() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mfa_session_allowed() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT role FROM public.profiles WHERE id=auth.uid()
  AND NOT coalesce(is_disabled,false) AND NOT coalesce(force_password_reset,false)
  AND public.mfa_session_allowed();
$$;
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

DO $$
DECLARE t text; tables text[]:=ARRAY['admin_actions','bills_tracker','book_progress','books',
 'calendar_events','debt_tracker','exercises','habit_logs','meal_logs','meals',
 'milestone_status','profiles','recipes','roadmap_status','subscription_tracker','todo_items',
 'user_book_list','user_documents','user_reading_list','user_workout_plans','weight_logs',
 'workout_exercise_logs','workout_logs','workout_plan_days','workout_plans','workout_sessions'];
BEGIN
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relname=ANY(tables)) THEN
  RAISE EXCEPTION 'Unreviewed public table: update the MFA coverage review first'; END IF;
 FOREACH t IN ARRAY tables LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(format('public.%I',t)) AND relrowsecurity) THEN
   RAISE EXCEPTION 'Required RLS table missing or disabled: %',t; END IF;
  EXECUTE format('CREATE POLICY require_verified_mfa ON public.%I AS RESTRICTIVE
   FOR ALL TO authenticated USING ((SELECT public.mfa_session_allowed()))
   WITH CHECK ((SELECT public.mfa_session_allowed()))',t);
 END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
