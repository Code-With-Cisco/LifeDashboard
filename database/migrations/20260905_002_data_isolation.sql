-- Requires 001. Reviewed table/ownership names; no personal rows are modified.
-- Every app table is authenticated-only. Disabled accounts lose data access.
DO $migration$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['admin_actions','bills_tracker','book_progress','books',
    'calendar_events','debt_tracker','exercises','habit_logs','meal_logs','meals',
    'milestone_status','recipes','roadmap_status','subscription_tracker','todo_items',
    'user_book_list','user_reading_list','user_workout_plans','weight_logs',
    'workout_exercise_logs','workout_logs','workout_plan_days','workout_plans','workout_sessions']
  LOOP
    IF to_regclass(format('public.%I',t)) IS NULL THEN RAISE EXCEPTION 'Required table missing: %',t; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t
    LOOP EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t); END LOOP;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['bills_tracker','book_progress','calendar_events','debt_tracker',
    'habit_logs','meal_logs','milestone_status','roadmap_status','subscription_tracker',
    'todo_items','user_book_list','user_reading_list','user_workout_plans','weight_logs',
    'workout_logs','workout_sessions']
  LOOP
    EXECUTE format('CREATE POLICY owner_access ON public.%I FOR ALL TO authenticated
      USING (user_id=(SELECT auth.uid()) AND (SELECT public.get_my_role()) IS NOT NULL)
      WITH CHECK (user_id=(SELECT auth.uid()) AND (SELECT public.get_my_role()) IS NOT NULL)',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['books','meals','recipes','exercises','workout_plans']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN is_template SET DEFAULT false',t);
    EXECUTE format('CREATE POLICY catalog_read ON public.%I FOR SELECT TO authenticated
      USING ((SELECT public.get_my_role()) IS NOT NULL AND
        (created_by=(SELECT auth.uid()) OR coalesce(is_template,false)))',t);
    EXECUTE format('CREATE POLICY catalog_insert ON public.%I FOR INSERT TO authenticated
      WITH CHECK ((SELECT public.get_my_role()) IS NOT NULL AND
        (created_by=(SELECT auth.uid()) OR (created_by IS NULL AND coalesce(is_template,false)))
        AND (NOT coalesce(is_template,false) OR (SELECT public.get_my_role())=''admin''))',t);
    EXECUTE format('CREATE POLICY catalog_update ON public.%I FOR UPDATE TO authenticated
      USING ((SELECT public.get_my_role()) IS NOT NULL AND
        ((created_by=(SELECT auth.uid()) AND NOT coalesce(is_template,false)) OR
         ((SELECT public.get_my_role())=''admin'' AND coalesce(is_template,false))))
      WITH CHECK ((SELECT public.get_my_role()) IS NOT NULL AND
        ((created_by=(SELECT auth.uid()) AND NOT coalesce(is_template,false)) OR
         ((SELECT public.get_my_role())=''admin'' AND coalesce(is_template,false))))',t);
    EXECUTE format('CREATE POLICY catalog_delete ON public.%I FOR DELETE TO authenticated
      USING ((SELECT public.get_my_role()) IS NOT NULL AND
        ((created_by=(SELECT auth.uid()) AND NOT coalesce(is_template,false)) OR
         ((SELECT public.get_my_role())=''admin'' AND coalesce(is_template,false))))',t);
  END LOOP;
END;
$migration$;

CREATE POLICY session_owner ON public.workout_exercise_logs FOR ALL TO authenticated
USING (EXISTS(SELECT 1 FROM public.workout_sessions s WHERE s.id=session_id AND s.user_id=(SELECT auth.uid())))
WITH CHECK (EXISTS(SELECT 1 FROM public.workout_sessions s WHERE s.id=session_id AND s.user_id=(SELECT auth.uid())));
CREATE POLICY plan_days_read ON public.workout_plan_days FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.workout_plans p WHERE p.id=plan_id));
CREATE POLICY plan_days_write ON public.workout_plan_days FOR ALL TO authenticated
USING (EXISTS(SELECT 1 FROM public.workout_plans p WHERE p.id=plan_id AND
  ((p.created_by=(SELECT auth.uid()) AND NOT coalesce(p.is_template,false)) OR
   ((SELECT public.get_my_role())='admin' AND coalesce(p.is_template,false)))))
WITH CHECK (EXISTS(SELECT 1 FROM public.workout_plans p WHERE p.id=plan_id AND
  ((p.created_by=(SELECT auth.uid()) AND NOT coalesce(p.is_template,false)) OR
   ((SELECT public.get_my_role())='admin' AND coalesce(p.is_template,false)))));
REVOKE UPDATE,DELETE ON public.admin_actions FROM authenticated;
CREATE POLICY admin_audit_read ON public.admin_actions FOR SELECT TO authenticated
USING ((SELECT public.get_my_role())='admin');
CREATE POLICY admin_audit_insert ON public.admin_actions FOR INSERT TO authenticated
WITH CHECK ((SELECT public.get_my_role())='admin' AND admin_id=(SELECT auth.uid()));

-- Future application migrations must opt in to API grants explicitly.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon,authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

CREATE OR REPLACE FUNCTION public.increment_meal_usage(meal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $function$
BEGIN
  IF public.get_my_role() IS NULL THEN RAISE EXCEPTION 'Active account required' USING ERRCODE='42501'; END IF;
  UPDATE public.meals SET usage_count=coalesce(usage_count,0)+1
    WHERE id=meal_id AND created_by=auth.uid() AND NOT coalesce(is_template,false);
  IF NOT FOUND THEN RAISE EXCEPTION 'Meal unavailable' USING ERRCODE='42501'; END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.increment_meal_usage(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.increment_meal_usage(uuid) TO authenticated;
