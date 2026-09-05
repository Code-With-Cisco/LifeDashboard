-- Run after migrations 001/002 inside a transaction. Only synthetic fixtures.
SAVEPOINT data_isolation_tests;
INSERT INTO auth.users(id) VALUES
 ('00000000-0000-4000-8000-0000000000a1'),('00000000-0000-4000-8000-0000000000b2'),
 ('00000000-0000-4000-8000-0000000000c3');
INSERT INTO public.profiles(id,username,role) VALUES
 ('00000000-0000-4000-8000-0000000000a1','__security_test_a_20260905','standard'),
 ('00000000-0000-4000-8000-0000000000b2','__security_test_b_20260905','standard'),
 ('00000000-0000-4000-8000-0000000000c3','__security_test_admin_20260905','admin');
INSERT INTO public.todo_items(user_id,title) VALUES
 ('00000000-0000-4000-8000-0000000000a1','fixture A'),('00000000-0000-4000-8000-0000000000b2','fixture B');
INSERT INTO public.meals(id,name,meal_type,created_by,is_template) VALUES
 ('00000000-0000-4000-8000-000000000011','Fixture A','lunch','00000000-0000-4000-8000-0000000000a1',false),
 ('00000000-0000-4000-8000-000000000022','Fixture B','lunch','00000000-0000-4000-8000-0000000000b2',false),
 ('00000000-0000-4000-8000-000000000033','Fixture template','lunch',NULL,true);
INSERT INTO public.workout_sessions(id,user_id,session_date) VALUES
 ('00000000-0000-4000-8000-000000000044','00000000-0000-4000-8000-0000000000a1','2000-01-01'),
 ('00000000-0000-4000-8000-000000000055','00000000-0000-4000-8000-0000000000b2','2000-01-01');
INSERT INTO public.workout_exercise_logs(session_id,exercise_name,set_number) VALUES
 ('00000000-0000-4000-8000-000000000044','Fixture A',1),('00000000-0000-4000-8000-000000000055','Fixture B',1);
INSERT INTO public.workout_plans(id,plan_key,name,created_by,is_template) VALUES
 ('00000000-0000-4000-8000-000000000066','__security_plan_a','Fixture A','00000000-0000-4000-8000-0000000000a1',false),
 ('00000000-0000-4000-8000-000000000077','__security_plan_b','Fixture B','00000000-0000-4000-8000-0000000000b2',false),
 ('00000000-0000-4000-8000-000000000088','__security_template','Fixture shared',NULL,true);
INSERT INTO public.workout_plan_days(plan_id,day_number,day_name) VALUES
 ('00000000-0000-4000-8000-000000000066',1,'Fixture A'),
 ('00000000-0000-4000-8000-000000000077',1,'Fixture B'),
 ('00000000-0000-4000-8000-000000000088',1,'Fixture shared');
SET LOCAL ROLE anon;
DO $test$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','admin_actions','bills_tracker','book_progress','books',
 'calendar_events','debt_tracker','exercises','habit_logs','meal_logs','meals','milestone_status',
 'recipes','roadmap_status','subscription_tracker','todo_items','user_book_list','user_reading_list',
 'user_workout_plans','weight_logs','workout_exercise_logs','workout_logs','workout_plan_days','workout_plans','workout_sessions'] LOOP
  BEGIN EXECUTE format('SELECT 1 FROM public.%I LIMIT 1',t);
   RAISE EXCEPTION 'FAIL: anonymous access to %',t;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 END LOOP;
END $test$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
DO $test$ DECLARE n integer; BEGIN
 IF has_table_privilege(current_user,'public.todo_items','TRUNCATE') OR has_table_privilege(current_user,'public.profiles','TRIGGER') THEN
  RAISE EXCEPTION 'FAIL: API role has table maintenance privileges'; END IF;
 IF (SELECT count(*) FROM public.todo_items WHERE user_id IN('00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000b2'))<>1 THEN RAISE EXCEPTION 'FAIL: private task read'; END IF;
 DELETE FROM public.todo_items WHERE user_id='00000000-0000-4000-8000-0000000000b2';
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'FAIL: foreign task delete'; END IF;
 IF (SELECT count(*) FROM public.meals WHERE id IN('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000033'))<>2 THEN RAISE EXCEPTION 'FAIL: catalog visibility'; END IF;
 BEGIN INSERT INTO public.meals(name,meal_type,created_by,is_template) VALUES('Forged','lunch',auth.uid(),true);
  RAISE EXCEPTION 'FAIL: template publishing allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.meals(name,meal_type,created_by,is_template) VALUES('Forged','lunch','00000000-0000-4000-8000-0000000000b2',false);
  RAISE EXCEPTION 'FAIL: forged catalog owner'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.meals SET name='Forbidden' WHERE id='00000000-0000-4000-8000-000000000033';
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'FAIL: template edit'; END IF;
 PERFORM public.increment_meal_usage('00000000-0000-4000-8000-000000000011');
 IF (SELECT usage_count FROM public.meals WHERE id='00000000-0000-4000-8000-000000000011')<>1 THEN RAISE EXCEPTION 'FAIL: own meal counter'; END IF;
 BEGIN PERFORM public.increment_meal_usage('00000000-0000-4000-8000-000000000022');
  RAISE EXCEPTION 'FAIL: foreign meal counter'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.workout_exercise_logs WHERE session_id='00000000-0000-4000-8000-000000000055') THEN RAISE EXCEPTION 'FAIL: foreign child read'; END IF;
 BEGIN INSERT INTO public.workout_exercise_logs(session_id,exercise_name,set_number) VALUES('00000000-0000-4000-8000-000000000055','Forged',1);
  RAISE EXCEPTION 'FAIL: foreign child insert'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.workout_exercise_logs SET session_id='00000000-0000-4000-8000-000000000055' WHERE session_id='00000000-0000-4000-8000-000000000044';
  RAISE EXCEPTION 'FAIL: foreign child reassignment'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF (SELECT count(*) FROM public.workout_plan_days WHERE plan_id IN
  ('00000000-0000-4000-8000-000000000066','00000000-0000-4000-8000-000000000077','00000000-0000-4000-8000-000000000088'))<>2 THEN
  RAISE EXCEPTION 'FAIL: plan-day parent visibility'; END IF;
 BEGIN UPDATE public.workout_plan_days SET plan_id='00000000-0000-4000-8000-000000000077'
  WHERE plan_id='00000000-0000-4000-8000-000000000066';
  RAISE EXCEPTION 'FAIL: plan-day ownership reassignment'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.workout_plan_days SET day_name='Forbidden' WHERE plan_id='00000000-0000-4000-8000-000000000088';
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'FAIL: template day edit'; END IF;
END $test$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000c3',true);
DO $test$ DECLARE n integer; BEGIN
 UPDATE public.workout_plan_days SET day_name='Updated shared fixture' WHERE plan_id='00000000-0000-4000-8000-000000000088';
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'FAIL: admin shared template edit'; END IF;
 IF EXISTS(SELECT 1 FROM public.workout_plan_days WHERE plan_id='00000000-0000-4000-8000-000000000066') THEN
  RAISE EXCEPTION 'FAIL: admin sees another account private plan'; END IF;
 INSERT INTO public.admin_actions(admin_id,action_type) VALUES(auth.uid(),'security-test');
 BEGIN DELETE FROM public.admin_actions WHERE admin_id=auth.uid();
  RAISE EXCEPTION 'FAIL: audit deletion allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $test$;
RESET ROLE;
UPDATE public.profiles SET is_disabled=true WHERE id='00000000-0000-4000-8000-0000000000a1';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
DO $test$ BEGIN
 IF EXISTS(SELECT 1 FROM public.todo_items WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'FAIL: disabled task read'; END IF;
 IF EXISTS(SELECT 1 FROM public.meals WHERE id='00000000-0000-4000-8000-000000000033') THEN RAISE EXCEPTION 'FAIL: disabled template read'; END IF;
 IF EXISTS(SELECT 1 FROM public.workout_exercise_logs WHERE session_id='00000000-0000-4000-8000-000000000044') THEN RAISE EXCEPTION 'FAIL: disabled child read'; END IF;
END $test$;
RESET ROLE;
ROLLBACK TO SAVEPOINT data_isolation_tests;
SELECT 'PASS: 25 anonymous denials, private catalogs, task isolation, child ownership, meal RPC, disabled accounts' AS data_security_result;
