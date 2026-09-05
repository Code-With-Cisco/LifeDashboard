-- Minimal, synthetic test schema covering the inspected authorization columns
-- and constraints. Not a production schema dump or a backup.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE ROLE supabase_auth_admin;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated;
CREATE TABLE auth.users(id uuid PRIMARY KEY, encrypted_password varchar);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
 (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'))::uuid;
$$;
CREATE TABLE public.profiles(
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 username text NOT NULL UNIQUE, display_name text,
 role text DEFAULT 'standard' CHECK(role IN ('admin','standard')),
 is_disabled boolean DEFAULT false, force_password_reset boolean DEFAULT false,
 signup_complete boolean DEFAULT false, questionnaire jsonb,
 assigned_workout_plan text, assigned_meal_plan text, assigned_reading_list text,
 start_date date DEFAULT CURRENT_DATE, created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now(), timezone text, target_weight numeric,
 start_weight numeric, wit_hourly_rate numeric, take_home_pay numeric,
 calorie_target integer DEFAULT 1900, protein_target integer DEFAULT 185, book_list_order jsonb
);
CREATE FUNCTION public.get_my_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
 SELECT role FROM public.profiles WHERE id=auth.uid();
$$;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all_reads ON public.profiles FOR SELECT USING(true);
CREATE POLICY allow_own_update ON public.profiles FOR UPDATE USING(id=auth.uid());
GRANT ALL ON public.profiles TO anon, authenticated;

CREATE TABLE public.meals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
 meal_type text NOT NULL, created_by uuid REFERENCES public.profiles(id),
 is_template boolean DEFAULT true, usage_count integer DEFAULT 0);
CREATE TABLE public.books(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
 author text NOT NULL, created_by uuid REFERENCES public.profiles(id), is_template boolean DEFAULT true);
CREATE TABLE public.recipes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
 profile_id text NOT NULL, created_by uuid REFERENCES public.profiles(id), is_template boolean DEFAULT true);
CREATE TABLE public.exercises(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
 muscle_group text NOT NULL, created_by uuid REFERENCES public.profiles(id), is_template boolean DEFAULT true);
CREATE TABLE public.workout_plans(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
 plan_key text NOT NULL UNIQUE, created_by uuid REFERENCES public.profiles(id), is_template boolean DEFAULT true);
CREATE TABLE public.workout_plan_days(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 plan_id uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
 day_number integer NOT NULL, day_name text NOT NULL, UNIQUE(plan_id,day_number));
CREATE TABLE public.workout_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 plan_day_id uuid REFERENCES public.workout_plan_days(id), session_date date NOT NULL,
 day_name text, duration_minutes integer, notes text, created_at timestamptz DEFAULT now());
CREATE TABLE public.workout_exercise_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
 exercise_name text NOT NULL, set_number integer NOT NULL, reps_completed integer,
 weight_lbs numeric, notes text, created_at timestamptz DEFAULT now());
CREATE TABLE public.workout_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 log_date date NOT NULL, day_index integer, notes text, UNIQUE(user_id,log_date,day_index));
CREATE TABLE public.admin_actions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 admin_id uuid REFERENCES public.profiles(id), target_user_id uuid REFERENCES public.profiles(id),
 action_type text NOT NULL, details jsonb);
-- Only ownership fields are needed to test the common policy. Domain-specific
-- mandatory fields remain covered by live tests in their separate transaction.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['bills_tracker','book_progress','calendar_events','debt_tracker',
 'habit_logs','meal_logs','milestone_status','roadmap_status','subscription_tracker',
 'todo_items','user_book_list','user_reading_list','user_workout_plans','weight_logs'] LOOP
 EXECUTE format('CREATE TABLE public.%I(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id))',t);
 END LOOP;
END $$;
ALTER TABLE public.todo_items ADD COLUMN title text NOT NULL;
ALTER TABLE public.habit_logs ADD COLUMN log_date date NOT NULL;
ALTER TABLE public.habit_logs ADD COLUMN habit_id text NOT NULL;
ALTER TABLE public.habit_logs ADD COLUMN completed boolean DEFAULT false;
ALTER TABLE public.weight_logs ADD COLUMN log_date date NOT NULL;
ALTER TABLE public.weight_logs ADD COLUMN weight_lbs numeric NOT NULL;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
