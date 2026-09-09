-- Runs on synthetic and restored/live schemas, rolling all fixtures back.
SAVEPOINT mfa_tests;
INSERT INTO auth.users(id) VALUES
 ('00000000-0000-4000-8000-0000000000a1'),('00000000-0000-4000-8000-0000000000b2');
INSERT INTO public.profiles(id,username,role) VALUES
 ('00000000-0000-4000-8000-0000000000a1','__mfa_test_a_20260909','standard'),
 ('00000000-0000-4000-8000-0000000000b2','__mfa_test_b_20260909','standard');
INSERT INTO auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at) VALUES
 ('00000000-0000-4000-8000-0000000000f1','00000000-0000-4000-8000-0000000000a1','totp','unverified',now(),now());
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
SELECT set_config('request.jwt.claims','{"aal":"aal1"}',true);
DO $$ BEGIN
 IF NOT public.mfa_session_allowed() OR public.get_my_role()<>'standard' THEN RAISE EXCEPTION 'FAIL: unfinished setup blocked account'; END IF;
 PERFORM public.save_personal_documents('[{"key":"goals","payload":[],"expected_revision":0}]');
 BEGIN PERFORM 1 FROM auth.mfa_factors; RAISE EXCEPTION 'FAIL: raw factor access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE auth.mfa_factors SET status='verified' WHERE id='00000000-0000-4000-8000-0000000000f1';
SET LOCAL ROLE authenticated;
DO $$ DECLARE t record; n bigint; BEGIN
 IF public.mfa_session_allowed() OR public.get_my_role() IS NOT NULL THEN RAISE EXCEPTION 'FAIL: aal1 accepted'; END IF;
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
  EXECUTE format('SELECT count(*) FROM public.%I',t.tablename) INTO n;
  IF n<>0 THEN RAISE EXCEPTION 'FAIL: aal1 read from %',t.tablename; END IF;
 END LOOP;
 UPDATE public.profiles SET display_name='blocked' WHERE id=auth.uid();
 IF FOUND THEN RAISE EXCEPTION 'FAIL: aal1 profile update'; END IF;
 BEGIN DELETE FROM public.user_documents WHERE user_id=auth.uid();
  IF FOUND THEN RAISE EXCEPTION 'FAIL: aal1 delete'; END IF;
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.user_documents(user_id,document_key,payload) VALUES(auth.uid(),'habit_definitions','[]');
  RAISE EXCEPTION 'FAIL: aal1 insert'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.save_personal_documents('[]'); RAISE EXCEPTION 'FAIL: aal1 document RPC'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.increment_meal_usage('00000000-0000-4000-8000-0000000000ff'); RAISE EXCEPTION 'FAIL: aal1 meal RPC'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.save_workout_session(gen_random_uuid(),CURRENT_DATE,'Test',0,'',10,'[]'); RAISE EXCEPTION 'FAIL: aal1 workout RPC'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims','{}',true);
DO $$ BEGIN IF public.mfa_session_allowed() THEN RAISE EXCEPTION 'FAIL: absent aal claim'; END IF; END $$;
SELECT set_config('request.jwt.claims','{"aal":"aal2"}',true);
DO $$ BEGIN
 IF NOT public.mfa_session_allowed() OR public.get_my_role()<>'standard' THEN RAISE EXCEPTION 'FAIL: aal2 blocked'; END IF;
 IF (SELECT count(*) FROM public.profiles)<>1 OR (SELECT count(*) FROM public.user_documents)<>1 THEN RAISE EXCEPTION 'FAIL: aal2 ownership'; END IF;
 PERFORM public.save_personal_documents('[{"key":"goals","payload":[],"expected_revision":1}]');
 BEGIN INSERT INTO public.user_documents(user_id,document_key,payload) VALUES('00000000-0000-4000-8000-0000000000b2','goals','[]');
  RAISE EXCEPTION 'FAIL: aal2 crossed owner'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.profiles SET role='admin' WHERE id=auth.uid();
  RAISE EXCEPTION 'FAIL: aal2 escalated role';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000b2',true);
SELECT set_config('request.jwt.claims','{"aal":"aal1"}',true);
DO $$ BEGIN
 IF NOT public.mfa_session_allowed() OR public.get_my_role()<>'standard' THEN RAISE EXCEPTION 'FAIL: other account factor blocks user'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_documents) THEN RAISE EXCEPTION 'FAIL: second user sees first documents'; END IF;
END $$;
RESET ROLE;
UPDATE public.profiles SET role='admin' WHERE id='00000000-0000-4000-8000-0000000000a1';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
DO $$ BEGIN IF public.get_my_role() IS NOT NULL OR EXISTS(SELECT 1 FROM public.profiles) THEN RAISE EXCEPTION 'FAIL: admin bypassed MFA'; END IF; END $$;
RESET ROLE;
UPDATE public.profiles SET force_password_reset=true WHERE id='00000000-0000-4000-8000-0000000000a1';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"aal":"aal2"}',true);
DO $$ BEGIN IF public.get_my_role() IS NOT NULL OR EXISTS(SELECT 1 FROM public.user_documents) THEN RAISE EXCEPTION 'FAIL: aal2 bypassed password reset'; END IF; END $$;
RESET ROLE;
UPDATE public.profiles SET force_password_reset=false,is_disabled=true WHERE id='00000000-0000-4000-8000-0000000000a1';
SET LOCAL ROLE authenticated;
DO $$ BEGIN IF public.get_my_role() IS NOT NULL THEN RAISE EXCEPTION 'FAIL: aal2 bypassed disabled'; END IF; END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.mfa_session_allowed(); RAISE EXCEPTION 'FAIL: anonymous helper'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND policyname='require_verified_mfa'
  AND permissive='RESTRICTIVE' AND cmd='ALL' AND roles=ARRAY['authenticated']::name[])<>26 THEN
  RAISE EXCEPTION 'FAIL: incomplete restrictive policies'; END IF;
END $$;
ROLLBACK TO SAVEPOINT mfa_tests;
RELEASE SAVEPOINT mfa_tests;
SELECT 'PASS: MFA enforcement, cross-user access, privileges, account restrictions and 26-table coverage' AS mfa_result;
