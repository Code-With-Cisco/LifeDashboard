-- Two-user checks on real PostgreSQL roles and RLS; all fixtures are rolled back.
SAVEPOINT planning_tests;
INSERT INTO auth.users(id) VALUES
 ('00000000-0000-4000-8000-0000000000c1'),('00000000-0000-4000-8000-0000000000c2');
INSERT INTO public.profiles(id,username) VALUES
 ('00000000-0000-4000-8000-0000000000c1','__planning_a_20260926'),
 ('00000000-0000-4000-8000-0000000000c2','__planning_b_20260926');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000c1',true);
SELECT set_config('request.jwt.claims','{"aal":"aal1"}',true);
INSERT INTO public.todo_items(id,user_id,title,goal_id,estimate_minutes,next_action) VALUES
 ('00000000-0000-4000-8000-0000000000d1',auth.uid(),'Planning fixture','goal-one',30,'Open the draft');
INSERT INTO public.calendar_events(id,user_id,title,event_date,event_time,end_time) VALUES
 ('00000000-0000-4000-8000-0000000000e1',auth.uid(),'Calendar fixture',CURRENT_DATE,'09:00','10:00');
SELECT count(*) FROM public.save_personal_documents('[{"key":"focus_windows","payload":[{"day":1,"start":"09:00","end":"12:00"}],"expected_revision":0}]');
DO $$ BEGIN
 UPDATE public.todo_items SET estimate_minutes=45 WHERE id='00000000-0000-4000-8000-0000000000d1';
 IF NOT FOUND THEN RAISE EXCEPTION 'Owner task update denied'; END IF;
 BEGIN UPDATE public.todo_items SET estimate_minutes=0 WHERE id='00000000-0000-4000-8000-0000000000d1';
  RAISE EXCEPTION 'Invalid estimate accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.calendar_events SET end_time='08:00' WHERE id='00000000-0000-4000-8000-0000000000e1';
  RAISE EXCEPTION 'Invalid event end accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN PERFORM public.save_personal_documents('[{"key":"focus_windows","payload":[],"expected_revision":0}]');
  RAISE EXCEPTION 'Stale revision accepted'; EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000c2',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.todo_items WHERE id='00000000-0000-4000-8000-0000000000d1') OR
    EXISTS(SELECT 1 FROM public.calendar_events WHERE id='00000000-0000-4000-8000-0000000000e1') OR
    EXISTS(SELECT 1 FROM public.user_documents WHERE user_id='00000000-0000-4000-8000-0000000000c1')
 THEN RAISE EXCEPTION 'Foreign planning records visible'; END IF;
 UPDATE public.todo_items SET next_action='foreign write' WHERE id='00000000-0000-4000-8000-0000000000d1';
 IF FOUND THEN RAISE EXCEPTION 'Foreign task update accepted'; END IF;
 UPDATE public.calendar_events SET end_time='12:00' WHERE id='00000000-0000-4000-8000-0000000000e1';
 IF FOUND THEN RAISE EXCEPTION 'Foreign event update accepted'; END IF;
 BEGIN INSERT INTO public.todo_items(user_id,title,estimate_minutes) VALUES('00000000-0000-4000-8000-0000000000c1','Foreign',30);
  RAISE EXCEPTION 'Foreign task insert accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.user_documents(user_id,document_key,payload) VALUES('00000000-0000-4000-8000-0000000000c1','focus_windows','[]');
  RAISE EXCEPTION 'Foreign focus window insert accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
INSERT INTO auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at) VALUES
 ('00000000-0000-4000-8000-0000000000f3','00000000-0000-4000-8000-0000000000c1','totp','verified',now(),now());
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000c1',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.todo_items) OR EXISTS(SELECT 1 FROM public.calendar_events) OR EXISTS(SELECT 1 FROM public.user_documents)
 THEN RAISE EXCEPTION 'Password-only session bypassed MFA'; END IF;
 BEGIN PERFORM public.save_personal_documents('[{"key":"focus_windows","payload":[],"expected_revision":1}]');
  RAISE EXCEPTION 'MFA bypass through document RPC'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims','{"aal":"aal2"}',true);
DO $$ BEGIN
 IF (SELECT estimate_minutes FROM public.todo_items WHERE id='00000000-0000-4000-8000-0000000000d1') IS DISTINCT FROM 45
 THEN RAISE EXCEPTION 'Verified owner cannot read estimate'; END IF;
 PERFORM public.save_personal_documents('[{"key":"focus_windows","payload":[],"expected_revision":1}]');
END $$;
RESET ROLE;
UPDATE public.profiles SET force_password_reset=true WHERE id='00000000-0000-4000-8000-0000000000c1';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.todo_items) OR EXISTS(SELECT 1 FROM public.user_documents) THEN RAISE EXCEPTION 'Password reset guard bypassed'; END IF;
END $$;
RESET ROLE;
UPDATE public.profiles SET force_password_reset=false,is_disabled=true WHERE id='00000000-0000-4000-8000-0000000000c1';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.todo_items) OR EXISTS(SELECT 1 FROM public.user_documents) THEN RAISE EXCEPTION 'Disabled account guard bypassed'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM 1 FROM public.todo_items; RAISE EXCEPTION 'Anonymous task read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.user_documents; RAISE EXCEPTION 'Anonymous document read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK TO SAVEPOINT planning_tests;
RELEASE SAVEPOINT planning_tests;
SELECT 'PASS: planning ownership, validation, revision conflict, MFA, reset and disabled-account guards' AS planning_result;
