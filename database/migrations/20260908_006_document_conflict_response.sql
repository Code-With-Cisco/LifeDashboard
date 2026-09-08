-- Business revision conflicts must not use PostgreSQL serialization_failure.
-- Older PostgREST releases retry 40001 internally, preventing a prompt response.
DO $$ BEGIN
 IF to_regclass('public.user_documents') IS NULL OR
    to_regprocedure('public.save_personal_documents(jsonb)') IS NULL THEN
  RAISE EXCEPTION 'Personal document migration 005 is required'; END IF;
 IF position('ERRCODE=''40001''' IN pg_get_functiondef('public.save_personal_documents(jsonb)'::regprocedure))=0 THEN
  RAISE EXCEPTION 'Expected the reviewed 005 conflict behavior; inspect current migration state'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.save_personal_documents(p_documents jsonb)
RETURNS SETOF public.user_documents LANGUAGE plpgsql SECURITY INVOKER
SET search_path = '' AS $$
DECLARE item jsonb; saved public.user_documents; expected bigint; key text;
BEGIN
 IF auth.uid() IS NULL OR public.get_my_role() IS NULL THEN
  RAISE EXCEPTION 'An active account is required' USING ERRCODE='42501'; END IF;
 IF p_documents IS NULL OR jsonb_typeof(p_documents) <> 'array' THEN
  RAISE EXCEPTION 'Expected a document array' USING ERRCODE='22023'; END IF;
 IF jsonb_array_length(p_documents) NOT BETWEEN 1 AND 300 OR
  octet_length(p_documents::text) > 5242880 THEN
  RAISE EXCEPTION 'Document batch is too large or empty' USING ERRCODE='22023'; END IF;
 IF (SELECT count(DISTINCT e->>'key') FROM jsonb_array_elements(p_documents) e)
  <> jsonb_array_length(p_documents) THEN
  RAISE EXCEPTION 'Duplicate or missing document keys' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
 FOR item IN SELECT e FROM jsonb_array_elements(p_documents) e ORDER BY e->>'key' LOOP
  IF jsonb_typeof(item) <> 'object' OR
   (SELECT count(*) FROM jsonb_object_keys(item)) <> 3 OR
   NOT (item ?& ARRAY['key','payload','expected_revision']) OR
   jsonb_typeof(item->'key') <> 'string' OR
   jsonb_typeof(item->'expected_revision') <> 'number' OR
   (item->>'expected_revision') !~ '^[0-9]{1,15}$' THEN
   RAISE EXCEPTION 'Invalid document entry' USING ERRCODE='22023'; END IF;
  key := item->>'key'; expected := (item->>'expected_revision')::bigint;
  IF expected = 0 THEN
   INSERT INTO public.user_documents(user_id,document_key,payload)
    VALUES(auth.uid(),key,item->'payload') ON CONFLICT (user_id,document_key) DO NOTHING
    RETURNING * INTO saved;
  ELSE
   UPDATE public.user_documents SET payload=item->'payload'
    WHERE user_id=auth.uid() AND document_key=key AND revision=expected
    RETURNING * INTO saved;
  END IF;
  IF NOT FOUND THEN
   RAISE EXCEPTION 'This document changed. Refresh and review it before saving.' USING ERRCODE='PT409'; END IF;
  RETURN NEXT saved;
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.save_personal_documents(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_personal_documents(jsonb) TO authenticated;
