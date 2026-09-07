-- Prerequisites inspected on 2026-09-06: profiles.id is uuid; get_my_role()
-- denies disabled and reset-required accounts; user_documents does not exist.
-- Additive only. Existing personal rows and browser records are not migrated here.
CREATE TABLE public.user_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 document_key text NOT NULL,
 payload jsonb NOT NULL,
 revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (user_id, document_key),
 CONSTRAINT personal_document_key CHECK (document_key IN
  ('goals','habit_definitions','ingredients_protein','ingredients_side') OR
  document_key ~ '^purchase_decisions:[0-9]{4}-(0[1-9]|1[0-2])$'),
 CONSTRAINT personal_document_size CHECK (octet_length(payload::text) <= 262144),
 CONSTRAINT personal_document_shape CHECK (
  CASE WHEN document_key IN ('ingredients_protein','ingredients_side')
   THEN jsonb_typeof(payload) = 'object'
   ELSE jsonb_typeof(payload) = 'array' END)
);
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY personal_documents_owner ON public.user_documents FOR ALL
 TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.get_my_role()) IS NOT NULL)
 WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.get_my_role()) IS NOT NULL);
REVOKE ALL ON public.user_documents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_documents TO authenticated;
GRANT INSERT (user_id,document_key,payload) ON public.user_documents TO authenticated;
GRANT UPDATE (payload) ON public.user_documents TO authenticated;

CREATE FUNCTION public.bump_personal_document_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
 NEW.revision := OLD.revision + 1;
 NEW.updated_at := clock_timestamp();
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.bump_personal_document_revision() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER personal_document_revision BEFORE UPDATE ON public.user_documents
 FOR EACH ROW EXECUTE FUNCTION public.bump_personal_document_revision();

-- One transaction for a previewed import/restore or a normal document save.
-- The caller owns every row; supplied user IDs and protected profile fields
-- are never accepted. A conflict aborts the whole batch rather than losing edits.
CREATE FUNCTION public.save_personal_documents(p_documents jsonb)
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
   RAISE EXCEPTION 'This document changed. Refresh and review it before saving.' USING ERRCODE='40001'; END IF;
  RETURN NEXT saved;
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.save_personal_documents(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_personal_documents(jsonb) TO authenticated;
