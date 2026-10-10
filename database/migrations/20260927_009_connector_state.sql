-- Additive private broker storage. Live profile columns and account/MFA helpers
-- inspected September 27. No provider material is readable by public API users.
CREATE TABLE public.connector_state (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 id uuid NOT NULL,
 provider text NOT NULL CHECK (provider IN ('google','github','obsidian','brief')),
 revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
 sealed jsonb NOT NULL CHECK (jsonb_typeof(sealed)='object' AND octet_length(sealed::text)<=4000000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,id)
);
ALTER TABLE public.connector_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.connector_state FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.connector_state TO service_role;
-- Even accidental future table grants do not expose encrypted credentials.
CREATE POLICY deny_browser_access ON public.connector_state AS RESTRICTIVE
 FOR ALL TO authenticated USING(false) WITH CHECK(false);

CREATE FUNCTION public.save_connector_state(p_user uuid,p_id uuid,p_provider text,p_revision bigint,p_sealed jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE result bigint;
BEGIN
 IF p_revision=0 THEN
  INSERT INTO public.connector_state(user_id,id,provider,sealed)
   VALUES(p_user,p_id,p_provider,p_sealed) RETURNING revision INTO result;
 ELSE
  UPDATE public.connector_state SET sealed=p_sealed,revision=revision+1,updated_at=now()
   WHERE user_id=p_user AND id=p_id AND provider=p_provider AND revision=p_revision
   RETURNING revision INTO result;
  IF result IS NULL THEN RAISE EXCEPTION USING ERRCODE='PT409',MESSAGE='Connection changed; refresh before retrying'; END IF;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.save_connector_state(uuid,uuid,text,bigint,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_connector_state(uuid,uuid,text,bigint,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
