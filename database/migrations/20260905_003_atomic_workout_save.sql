-- Requires 001 and 002. One RPC transaction replaces a complete workout.
-- The caller supplies a stable UUID so retrying an uncertain response is safe.
CREATE OR REPLACE FUNCTION public.save_workout_session(
  p_session_id uuid, p_session_date date, p_day_name text, p_day_index integer,
  p_notes text, p_duration_minutes integer, p_sets jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $function$
DECLARE item jsonb; saved_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.get_my_role() IS NULL THEN
    RAISE EXCEPTION 'Active account required' USING ERRCODE='42501';
  END IF;
  IF p_session_id IS NULL OR p_session_date IS NULL OR NOT isfinite(p_session_date)
    OR p_day_name IS NULL OR length(btrim(p_day_name)) NOT BETWEEN 1 AND 200
    OR p_day_index IS NULL OR p_day_index NOT BETWEEN 0 AND 30
    OR length(coalesce(p_notes,''))>10000
    OR (p_duration_minutes IS NOT NULL AND p_duration_minutes NOT BETWEEN 0 AND 1440)
    OR p_sets IS NULL OR jsonb_typeof(p_sets)<>'array' THEN
    RAISE EXCEPTION 'Invalid workout' USING ERRCODE='22023';
  END IF;
  IF jsonb_array_length(p_sets)>400 THEN
    RAISE EXCEPTION 'Too many sets' USING ERRCODE='22023';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_sets) LOOP
    IF jsonb_typeof(item)<>'object' OR jsonb_typeof(item->'exercise_name') IS DISTINCT FROM 'string'
      OR length(btrim(item->>'exercise_name')) NOT BETWEEN 1 AND 200
      OR jsonb_typeof(item->'set_number') IS DISTINCT FROM 'number'
      OR (item->>'set_number')::numeric NOT BETWEEN 1 AND 20
      OR (item->>'set_number')::numeric<>trunc((item->>'set_number')::numeric) THEN
      RAISE EXCEPTION 'Invalid exercise set' USING ERRCODE='22023';
    END IF;
    IF coalesce(item->'reps_completed','null'::jsonb)<>'null'::jsonb THEN
      IF jsonb_typeof(item->'reps_completed')<>'number'
        OR (item->>'reps_completed')::numeric NOT BETWEEN 0 AND 10000
        OR (item->>'reps_completed')::numeric<>trunc((item->>'reps_completed')::numeric) THEN
        RAISE EXCEPTION 'Invalid repetitions' USING ERRCODE='22023';
      END IF;
    END IF;
    IF coalesce(item->'weight_lbs','null'::jsonb)<>'null'::jsonb THEN
      IF jsonb_typeof(item->'weight_lbs')<>'number'
        OR (item->>'weight_lbs')::numeric NOT BETWEEN 0 AND 5000 THEN
        RAISE EXCEPTION 'Invalid weight' USING ERRCODE='22023';
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.workout_sessions(id,user_id,session_date,day_name,notes,duration_minutes)
    VALUES(p_session_id,auth.uid(),p_session_date,p_day_name,p_notes,p_duration_minutes)
  ON CONFLICT(id) DO UPDATE SET notes=excluded.notes,duration_minutes=excluded.duration_minutes
    WHERE workout_sessions.user_id=auth.uid()
      AND workout_sessions.session_date=excluded.session_date
      AND workout_sessions.day_name IS NOT DISTINCT FROM excluded.day_name
  RETURNING id INTO saved_id;
  IF saved_id IS NULL THEN RAISE EXCEPTION 'Session unavailable' USING ERRCODE='42501'; END IF;
  -- The upsert holds the parent row lock through all child writes.
  DELETE FROM public.workout_exercise_logs WHERE session_id=saved_id;
  INSERT INTO public.workout_exercise_logs(session_id,exercise_name,set_number,reps_completed,weight_lbs)
    SELECT saved_id,value->>'exercise_name',(value->>'set_number')::integer,
      (value->>'reps_completed')::integer,(value->>'weight_lbs')::numeric
    FROM jsonb_array_elements(p_sets);
  INSERT INTO public.workout_logs(user_id,log_date,day_index,notes)
    VALUES(auth.uid(),p_session_date,p_day_index,p_notes)
  ON CONFLICT(user_id,log_date,day_index) DO UPDATE SET notes=excluded.notes;
  RETURN saved_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.save_workout_session(uuid,date,text,integer,text,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_workout_session(uuid,date,text,integer,text,integer,jsonb) TO authenticated;
