-- Requires 001 and 002. Auth owns password verification and hashing.
-- Clearing the reset requirement follows an actual Auth password change.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $function$
 SELECT role FROM public.profiles WHERE id=auth.uid()
   AND NOT coalesce(is_disabled,false) AND NOT coalesce(force_password_reset,false);
$function$;
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_password_reset_requirement()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $function$
BEGIN
 IF current_user IN ('postgres','service_role','supabase_auth_admin') THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.force_password_reset IS DISTINCT FROM OLD.force_password_reset
   AND public.get_my_role() IS DISTINCT FROM 'admin' THEN
   RAISE EXCEPTION 'Administrator required for reset requirements' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.guard_password_reset_requirement() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS guard_password_reset_requirement ON public.profiles;
CREATE TRIGGER guard_password_reset_requirement BEFORE UPDATE ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION public.guard_password_reset_requirement();

CREATE OR REPLACE FUNCTION public.clear_completed_password_reset()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
BEGIN
 UPDATE public.profiles SET force_password_reset=false,updated_at=now()
   WHERE id=NEW.id AND force_password_reset=true;
 RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.clear_completed_password_reset() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS clear_completed_password_reset ON auth.users;
CREATE TRIGGER clear_completed_password_reset AFTER UPDATE OF encrypted_password ON auth.users
 FOR EACH ROW WHEN (NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password
   AND NEW.encrypted_password IS NOT NULL AND NEW.encrypted_password<>'')
 EXECUTE FUNCTION public.clear_completed_password_reset();
