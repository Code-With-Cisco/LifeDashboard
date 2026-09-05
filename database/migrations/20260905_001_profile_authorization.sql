-- Reviewed against the live schema on 2026-09-05. Run inside a transaction.
-- Does not change existing profile data or the owner's administrator role.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT role FROM public.profiles
  WHERE id = auth.uid() AND NOT coalesce(is_disabled, false);
$function$;
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_profile_authorization()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $function$
BEGIN
  -- Trusted database administration and server credentials are outside the API role.
  IF current_user IN ('postgres', 'service_role', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Profile ownership cannot change' USING ERRCODE = '42501';
  END IF;
  IF public.get_my_role() = 'admin' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS DISTINCT FROM 'standard' OR coalesce(NEW.is_disabled, false) THEN
      RAISE EXCEPTION 'Invalid initial authorization' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.role IS DISTINCT FROM OLD.role OR NEW.is_disabled IS DISTINCT FROM OLD.is_disabled THEN
    RAISE EXCEPTION 'Administrator required for authorization changes' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.guard_profile_authorization() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_profile_authorization ON public.profiles;
CREATE TRIGGER guard_profile_authorization BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_authorization();

-- Replace all legacy policies, including the permissive allow_all_reads policy.
DO $migration$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profiles'
  LOOP EXECUTE format('DROP POLICY %I ON public.profiles', p.policyname); END LOOP;
END;
$migration$;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
CREATE POLICY profile_read ON public.profiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR (SELECT public.get_my_role()) = 'admin');
CREATE POLICY profile_insert ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()) AND role = 'standard' AND NOT coalesce(is_disabled, false));
CREATE POLICY profile_update ON public.profiles FOR UPDATE TO authenticated
USING ((id = (SELECT auth.uid()) AND NOT coalesce(is_disabled, false)) OR (SELECT public.get_my_role()) = 'admin')
WITH CHECK (id = (SELECT auth.uid()) OR (SELECT public.get_my_role()) = 'admin');
