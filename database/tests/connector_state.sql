SAVEPOINT connector_tests;
INSERT INTO auth.users(id) VALUES('00000000-0000-4000-8000-0000000000c3'),('00000000-0000-4000-8000-0000000000c4');
INSERT INTO public.profiles(id,username) VALUES('00000000-0000-4000-8000-0000000000c3','__connector_a_20260927'),('00000000-0000-4000-8000-0000000000c4','__connector_b_20260927');
SET LOCAL ROLE service_role;
SELECT public.save_connector_state('00000000-0000-4000-8000-0000000000c3','00000000-0000-4000-8000-0000000000d3','google',0,'{"v":1,"data":"synthetic-encrypted-fixture"}');
SELECT public.save_connector_state('00000000-0000-4000-8000-0000000000c4','00000000-0000-4000-8000-0000000000d3','google',0,'{"v":1,"data":"other-owner"}');
DO $$ BEGIN
 PERFORM public.save_connector_state('00000000-0000-4000-8000-0000000000c3','00000000-0000-4000-8000-0000000000d3','google',1,'{"v":1,"data":"updated"}');
 BEGIN PERFORM public.save_connector_state('00000000-0000-4000-8000-0000000000c3','00000000-0000-4000-8000-0000000000d3','google',1,'{}');RAISE EXCEPTION 'Stale writer accepted';EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL;END;
 IF (SELECT revision FROM public.connector_state WHERE user_id='00000000-0000-4000-8000-0000000000c4')<>1 THEN RAISE EXCEPTION 'Other owner changed';END IF;
 DELETE FROM public.connector_state WHERE user_id='00000000-0000-4000-8000-0000000000c3';
 BEGIN PERFORM public.save_connector_state('00000000-0000-4000-8000-0000000000c3','00000000-0000-4000-8000-0000000000d3','google',2,'{}');RAISE EXCEPTION 'Deleted record resurrected';EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL;END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000c4',true);
SELECT set_config('request.jwt.claims','{"aal":"aal2"}',true);
DO $$ BEGIN
 BEGIN PERFORM 1 FROM public.connector_state;RAISE EXCEPTION 'Owner read credentials';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.save_connector_state('00000000-0000-4000-8000-0000000000c4','00000000-0000-4000-8000-0000000000d3','google',1,'{}');RAISE EXCEPTION 'Owner bypassed broker';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000c3',true);
DO $$ BEGIN
 BEGIN PERFORM 1 FROM public.connector_state;RAISE EXCEPTION 'Foreign read credentials';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN DELETE FROM public.connector_state;RAISE EXCEPTION 'Foreign delete credentials';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM 1 FROM public.connector_state;RAISE EXCEPTION 'Anonymous read credentials';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.save_connector_state('00000000-0000-4000-8000-0000000000c4','00000000-0000-4000-8000-0000000000d3','google',1,'{}');RAISE EXCEPTION 'Anonymous RPC';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
RESET ROLE;
ROLLBACK TO SAVEPOINT connector_tests;
RELEASE SAVEPOINT connector_tests;
SELECT 'PASS: broker-only storage, owner separation, stale revision and disconnect protection' AS connector_result;
