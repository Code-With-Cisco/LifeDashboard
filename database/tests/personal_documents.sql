-- Exact production functions, synthetic accounts, all fixtures rolled back.
SAVEPOINT personal_document_tests;
INSERT INTO auth.users(id) VALUES
 ('00000000-0000-4000-8000-0000000000a1'),('00000000-0000-4000-8000-0000000000b2');
INSERT INTO public.profiles(id,username,role) VALUES
 ('00000000-0000-4000-8000-0000000000a1','__personal_test_a_20260906','standard'),
 ('00000000-0000-4000-8000-0000000000b2','__personal_test_b_20260906','standard');
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM 1 FROM public.user_documents; RAISE EXCEPTION 'FAIL: anonymous read';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.save_personal_documents('[]'); RAISE EXCEPTION 'FAIL: anonymous RPC';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
DO $$ DECLARE r public.user_documents; n integer; BEGIN
 SELECT * INTO r FROM public.save_personal_documents('[{"key":"goals","payload":[{"sec":"DEV","goals":[{"g":"Fixture goal","freq":"Daily","p":"High"}]}],"expected_revision":0}]');
 IF r.user_id<>auth.uid() OR r.revision<>1 THEN RAISE EXCEPTION 'FAIL: initial save'; END IF;
 BEGIN PERFORM public.save_personal_documents('[{"key":"goals","payload":[],"expected_revision":0}]');
 RAISE EXCEPTION 'FAIL: stale create overwrote data'; EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 BEGIN INSERT INTO public.user_documents(user_id,document_key,payload)
 VALUES('00000000-0000-4000-8000-0000000000b2','goals','[]');
 RAISE EXCEPTION 'FAIL: forged owner'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.user_documents SET user_id='00000000-0000-4000-8000-0000000000b2';
 RAISE EXCEPTION 'FAIL: owner reassignment'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.user_documents SET revision=10;
 RAISE EXCEPTION 'FAIL: forged revision'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.save_personal_documents('[{"key":"goals","payload":[],"expected_revision":1},{"key":"ingredients_side","payload":{},"expected_revision":99}]');
 RAISE EXCEPTION 'FAIL: conflict batch accepted'; EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 IF (SELECT revision FROM public.user_documents WHERE document_key='goals')<>1 OR
 (SELECT payload->0->'goals'->0->>'g' FROM public.user_documents WHERE document_key='goals')<>'Fixture goal'
 THEN RAISE EXCEPTION 'FAIL: failed batch lost data'; END IF;
 BEGIN PERFORM public.save_personal_documents('[{"key":"goals","payload":{},"expected_revision":1}]');
 RAISE EXCEPTION 'FAIL: invalid shape'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN PERFORM public.save_personal_documents('[{"key":"password","payload":[],"expected_revision":0}]');
 RAISE EXCEPTION 'FAIL: arbitrary key'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN PERFORM public.save_personal_documents('[{"key":"goals","payload":[],"expected_revision":1,"user_id":"forged"}]');
 RAISE EXCEPTION 'FAIL: extra input fields'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 SELECT * INTO r FROM public.save_personal_documents('[{"key":"goals","payload":[],"expected_revision":1}]');
 IF r.revision<>2 OR r.payload<>'[]'::jsonb THEN RAISE EXCEPTION 'FAIL: valid update'; END IF;
 SELECT * INTO r FROM public.save_personal_documents('[{"key":"goals","payload":[{"sec":"DEV","goals":[{"g":"Fixture goal","freq":"Daily","p":"High"}]}],"expected_revision":2}]');
 IF r.revision<>3 OR r.payload->0->'goals'->0->>'g'<>'Fixture goal' THEN RAISE EXCEPTION 'FAIL: restore'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000b2',true);
DO $$ DECLARE n integer; BEGIN
 IF EXISTS(SELECT 1 FROM public.user_documents) THEN RAISE EXCEPTION 'FAIL: foreign read'; END IF;
 UPDATE public.user_documents SET payload='[]' WHERE user_id='00000000-0000-4000-8000-0000000000a1';
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'FAIL: foreign update'; END IF;
 PERFORM public.save_personal_documents('[{"key":"goals","payload":[],"expected_revision":0}]');
 IF (SELECT count(*) FROM public.user_documents)<>1 THEN RAISE EXCEPTION 'FAIL: separate same-key records'; END IF;
END $$;
RESET ROLE;
UPDATE public.profiles SET is_disabled=true WHERE id='00000000-0000-4000-8000-0000000000b2';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.user_documents) THEN RAISE EXCEPTION 'FAIL: disabled read'; END IF;
 BEGIN PERFORM public.save_personal_documents('[{"key":"goals","payload":[],"expected_revision":1}]');
 RAISE EXCEPTION 'FAIL: disabled save'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE public.profiles SET is_disabled=false,force_password_reset=true WHERE id='00000000-0000-4000-8000-0000000000b2';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.user_documents) THEN RAISE EXCEPTION 'FAIL: reset-required read'; END IF;
 BEGIN PERFORM public.save_personal_documents('[{"key":"goals","payload":[],"expected_revision":1}]');
 RAISE EXCEPTION 'FAIL: reset-required save'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK TO SAVEPOINT personal_document_tests;
RELEASE SAVEPOINT personal_document_tests;
SELECT 'PASS: document ownership, disabled/reset isolation, conflict preservation, atomic batch and restore' AS personal_document_result;
