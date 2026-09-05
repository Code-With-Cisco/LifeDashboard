-- Run after migration 001 inside an explicit transaction. This file rolls all
-- fixtures back to its savepoint and returns only a status, never personal rows.
SAVEPOINT profile_authorization_tests;
INSERT INTO auth.users(id) VALUES
 ('00000000-0000-4000-8000-0000000000a1'),
 ('00000000-0000-4000-8000-0000000000b2'),
 ('00000000-0000-4000-8000-0000000000c3');
INSERT INTO public.profiles(id, username, role) VALUES
 ('00000000-0000-4000-8000-0000000000a1', '__security_test_a_20260905', 'standard'),
 ('00000000-0000-4000-8000-0000000000b2', '__security_test_b_20260905', 'standard'),
 ('00000000-0000-4000-8000-0000000000c3', '__security_test_admin_20260905', 'admin');

SET LOCAL ROLE anon;
DO $test$
BEGIN
  BEGIN
    PERFORM 1 FROM public.profiles;
    RAISE EXCEPTION 'FAIL: anonymous profile read allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
DO $test$
DECLARE affected integer;
BEGIN
  IF (SELECT count(*) FROM public.profiles WHERE id IN
      ('00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000b2')) <> 1 THEN
    RAISE EXCEPTION 'FAIL: cross-user profile read';
  END IF;
  UPDATE public.profiles SET display_name='Fixture updated' WHERE id=auth.uid();
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'FAIL: normal profile edit blocked'; END IF;
  UPDATE public.profiles SET display_name='Forbidden' WHERE id='00000000-0000-4000-8000-0000000000b2';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: cross-user profile update'; END IF;
  BEGIN
    UPDATE public.profiles SET role='admin' WHERE id=auth.uid();
    RAISE EXCEPTION 'FAIL: self-promotion allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.profiles SET is_disabled=true WHERE id=auth.uid();
    RAISE EXCEPTION 'FAIL: security flag edit allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.profiles SET id='00000000-0000-4000-8000-0000000000d4' WHERE id=auth.uid();
    RAISE EXCEPTION 'FAIL: ownership reassignment allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$test$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000c3', true);
DO $test$
DECLARE affected integer;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'FAIL: administrator lost access'; END IF;
  UPDATE public.profiles SET is_disabled=true WHERE id='00000000-0000-4000-8000-0000000000b2';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'FAIL: administrator update blocked'; END IF;
END;
$test$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', true);
DO $test$
DECLARE affected integer;
BEGIN
  IF public.get_my_role() IS NOT NULL THEN RAISE EXCEPTION 'FAIL: disabled role still active'; END IF;
  UPDATE public.profiles SET is_disabled=false WHERE id=auth.uid();
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: disabled user re-enabled itself'; END IF;
END;
$test$;
RESET ROLE;
ROLLBACK TO SAVEPOINT profile_authorization_tests;
SELECT 'PASS: anonymous denial, two-user isolation, protected authorization, administrator access, disabled-account denial' AS profile_security_result;
