SAVEPOINT workout_security_fixtures;
INSERT INTO auth.users(id) VALUES('00000000-0000-4000-8000-0000000000a1'),('00000000-0000-4000-8000-0000000000b2');
INSERT INTO public.profiles(id,username) VALUES
 ('00000000-0000-4000-8000-0000000000a1','security_test_a'),('00000000-0000-4000-8000-0000000000b2','security_test_b');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
DO $test$
DECLARE sid uuid := '00000000-0000-4000-8000-000000000011'; sets jsonb := '[{"exercise_name":"Press","set_number":1,"reps_completed":8,"weight_lbs":0}]';
BEGIN
 PERFORM public.save_workout_session(sid,current_date,'Push',0,'Original',45,sets);
 PERFORM public.save_workout_session(sid,current_date,'Push',0,'Retry',0,sets);
 IF (SELECT count(*) FROM public.workout_sessions WHERE id=sid)<>1
   OR (SELECT count(*) FROM public.workout_exercise_logs WHERE session_id=sid)<>1
   OR (SELECT duration_minutes FROM public.workout_sessions WHERE id=sid)<>0 THEN
   RAISE EXCEPTION 'Idempotent retry failed'; END IF;
 BEGIN
   PERFORM public.save_workout_session(sid,current_date,'Push',0,'Invalid',45,'[{"exercise_name":"Press","set_number":1,"weight_lbs":-1}]');
   RAISE EXCEPTION 'Invalid weight accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF (SELECT notes FROM public.workout_sessions WHERE id=sid)<>'Retry' THEN RAISE EXCEPTION 'Invalid input mutated session'; END IF;
END;
$test$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000b2',true);
DO $test$ BEGIN
 BEGIN
  PERFORM public.save_workout_session('00000000-0000-4000-8000-000000000011',current_date,'Push',0,'Foreign',45,'[]');
  RAISE EXCEPTION 'Foreign workout replaced';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $test$;
RESET ROLE;
-- Force an error after the RPC has updated the parent and deleted old sets.
CREATE FUNCTION public.security_test_reject_set() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.exercise_name='Reject fixture' THEN RAISE EXCEPTION 'Fixture failure' USING ERRCODE='23514'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER security_test_reject_set BEFORE INSERT ON public.workout_exercise_logs
 FOR EACH ROW EXECUTE FUNCTION public.security_test_reject_set();
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
DO $test$ BEGIN
 BEGIN
  PERFORM public.save_workout_session('00000000-0000-4000-8000-000000000011',current_date,'Push',0,'Must roll back',90,
   '[{"exercise_name":"Reject fixture","set_number":1,"reps_completed":1}]');
  RAISE EXCEPTION 'Failure fixture did not fail';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF (SELECT notes FROM public.workout_sessions WHERE id='00000000-0000-4000-8000-000000000011')<>'Retry'
   OR (SELECT count(*) FROM public.workout_exercise_logs WHERE exercise_name='Press' AND weight_lbs=0)<>1
   OR (SELECT notes FROM public.workout_logs WHERE user_id=auth.uid())<>'Retry' THEN
   RAISE EXCEPTION 'Partial write escaped rollback'; END IF;
END; $test$;
RESET ROLE;
UPDATE public.profiles SET is_disabled=true WHERE id='00000000-0000-4000-8000-0000000000a1';
SET LOCAL ROLE authenticated;
DO $test$ BEGIN
 BEGIN
  PERFORM public.save_workout_session('00000000-0000-4000-8000-000000000011',current_date,'Push',0,'Disabled',45,'[]');
  RAISE EXCEPTION 'Disabled user wrote workout';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $test$;
SET LOCAL ROLE anon;
DO $test$ BEGIN
 IF has_function_privilege(current_user,'public.save_workout_session(uuid,date,text,integer,text,integer,jsonb)','EXECUTE') THEN
  RAISE EXCEPTION 'Anonymous caller can execute workout RPC'; END IF;
END; $test$;
RESET ROLE;
ROLLBACK TO SAVEPOINT workout_security_fixtures;
SELECT 'PASS: atomic workout replacement, retries, ownership, input bounds, disabled access, and rollback' AS workout_security_result;
