-- Exact destination schema tests. Fixtures roll back; no Auth login is implied.
SAVEPOINT calendar_details_tests;
INSERT INTO auth.users(id) VALUES
 ('00000000-0000-4000-8000-0000000010a1'),('00000000-0000-4000-8000-0000000010b2');
INSERT INTO public.profiles(id,username) VALUES
 ('00000000-0000-4000-8000-0000000010a1','__calendar_20261010_a'),
 ('00000000-0000-4000-8000-0000000010b2','__calendar_20261010_b');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000010a1',true),set_config('request.jwt.claims','{"aal":"aal1"}',true);
INSERT INTO public.calendar_events(id,user_id,title,event_date,source_details) VALUES
 ('00000000-0000-4000-8000-0000000010e1',auth.uid(),'Calendar fixture','2026-10-10','{"description":"Sets and reps","location":"Gym","alarms":[]}');
INSERT INTO public.roadmap_status(user_id,step_number,status) VALUES(auth.uid(),1,'In Progress')
 ON CONFLICT(user_id,step_number) DO UPDATE SET status=excluded.status;
DO $$ BEGIN
 UPDATE public.calendar_events SET source_details=jsonb_set(source_details,'{description}','"Updated"') WHERE id='00000000-0000-4000-8000-0000000010e1';
 IF NOT FOUND THEN RAISE EXCEPTION 'Owner edit denied'; END IF;
 BEGIN UPDATE public.calendar_events SET source_details='[]' WHERE id='00000000-0000-4000-8000-0000000010e1';
 RAISE EXCEPTION 'Invalid details accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.calendar_events SET source_details=jsonb_build_object('description',repeat('x',32769)) WHERE id='00000000-0000-4000-8000-0000000010e1';
 RAISE EXCEPTION 'Oversized details accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000010b2',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.calendar_events WHERE id='00000000-0000-4000-8000-0000000010e1') OR EXISTS(SELECT 1 FROM public.roadmap_status WHERE user_id='00000000-0000-4000-8000-0000000010a1')
 THEN RAISE EXCEPTION 'Foreign records visible'; END IF;
 UPDATE public.calendar_events SET source_details='{}' WHERE id='00000000-0000-4000-8000-0000000010e1';
 IF FOUND THEN RAISE EXCEPTION 'Foreign edit accepted'; END IF;
 DELETE FROM public.calendar_events WHERE id='00000000-0000-4000-8000-0000000010e1';
 IF FOUND THEN RAISE EXCEPTION 'Foreign delete accepted'; END IF;
 BEGIN INSERT INTO public.calendar_events(user_id,title,event_date,source_details) VALUES('00000000-0000-4000-8000-0000000010a1','Foreign','2026-10-10','{}');
 RAISE EXCEPTION 'Foreign insert accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.roadmap_status(user_id,step_number,status) VALUES('00000000-0000-4000-8000-0000000010a1',1,'Complete') ON CONFLICT(user_id,step_number) DO UPDATE SET status=excluded.status;
 RAISE EXCEPTION 'Foreign roadmap upsert accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
INSERT INTO auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at) VALUES
 ('00000000-0000-4000-8000-0000000010f1','00000000-0000-4000-8000-0000000010a1','totp','verified',now(),now());
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000010a1',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.calendar_events) THEN RAISE EXCEPTION 'MFA bypass'; END IF;
END $$;
SELECT set_config('request.jwt.claims','{"aal":"aal2"}',true);
DO $$ BEGIN
 IF (SELECT source_details->>'description' FROM public.calendar_events WHERE id='00000000-0000-4000-8000-0000000010e1') IS DISTINCT FROM 'Updated' THEN RAISE EXCEPTION 'Verified owner read denied'; END IF;
 DELETE FROM public.calendar_events WHERE id='00000000-0000-4000-8000-0000000010e1';
 IF NOT FOUND THEN RAISE EXCEPTION 'Owner delete denied'; END IF;
END $$;
RESET ROLE;
ROLLBACK TO SAVEPOINT calendar_details_tests;
RELEASE SAVEPOINT calendar_details_tests;
SELECT 'PASS: calendar details bounds, owner CRUD, cross-user isolation, MFA and roadmap upsert' AS calendar_details_result;
