-- Calendar columns, owner/MFA policies and table grants inspected on the real
-- test project on 2026-10-10. Review the destination again before deployment.
-- Additive; existing values, grants, functions and policies are preserved.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.calendar_events'::regclass AND relrowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='calendar_events' AND policyname='owner_access')
 OR NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='calendar_events' AND policyname='require_verified_mfa' AND permissive='RESTRICTIVE')
 OR EXISTS(SELECT 1 FROM information_schema.table_privileges WHERE table_schema='public' AND table_name='calendar_events' AND grantee IN ('anon','PUBLIC'))
 THEN RAISE EXCEPTION 'Calendar authorization prerequisites require review'; END IF;
END $$;
ALTER TABLE public.calendar_events ADD COLUMN source_details jsonb;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_details_bounded CHECK (
 source_details IS NULL OR (jsonb_typeof(source_details)='object' AND octet_length(source_details::text)<=32768));
-- Existing owner and restrictive MFA policies cover this optional object.
-- Links, reminders and attachment references remain inert metadata.
