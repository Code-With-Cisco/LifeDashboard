SAVEPOINT reset_security_fixtures;
INSERT INTO auth.users(id) VALUES('00000000-0000-4000-8000-0000000000a1');
INSERT INTO public.profiles(id,username,force_password_reset) VALUES
 ('00000000-0000-4000-8000-0000000000a1','security_test_reset',true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
DO $test$ BEGIN
 IF public.get_my_role() IS NOT NULL THEN RAISE EXCEPTION 'Reset requirement did not restrict data access'; END IF;
 BEGIN
  UPDATE public.profiles SET force_password_reset=false WHERE id=auth.uid();
  RAISE EXCEPTION 'User bypassed password reset';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF has_function_privilege(current_user,'public.clear_completed_password_reset()','EXECUTE') THEN
  RAISE EXCEPTION 'API caller can execute privileged trigger function'; END IF;
END; $test$;
RESET ROLE;
-- Synthetic marker on a disposable account only; no real credential is used.
UPDATE auth.users SET encrypted_password='synthetic-test-marker' WHERE id='00000000-0000-4000-8000-0000000000a1';
DO $test$ BEGIN
 IF (SELECT force_password_reset FROM public.profiles WHERE id='00000000-0000-4000-8000-0000000000a1') THEN
  RAISE EXCEPTION 'Auth password change did not clear reset requirement'; END IF;
END; $test$;
UPDATE public.profiles SET force_password_reset=true WHERE id='00000000-0000-4000-8000-0000000000a1';
UPDATE auth.users SET encrypted_password=encrypted_password WHERE id='00000000-0000-4000-8000-0000000000a1';
DO $test$ BEGIN
 IF NOT (SELECT force_password_reset FROM public.profiles WHERE id='00000000-0000-4000-8000-0000000000a1') THEN
  RAISE EXCEPTION 'Unchanged password cleared requirement'; END IF;
END; $test$;
RESET ROLE;
ROLLBACK TO SAVEPOINT reset_security_fixtures;
SELECT 'PASS: reset requirement is protected and cleared only after an Auth password change' AS reset_security_result;
