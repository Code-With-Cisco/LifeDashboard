-- Synthetic equivalent of the inspected Auth factor columns; no real secrets.
CREATE TYPE auth.factor_type AS ENUM ('totp','webauthn','phone');
CREATE TYPE auth.factor_status AS ENUM ('unverified','verified');
CREATE TABLE auth.mfa_factors(
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 friendly_name text, factor_type auth.factor_type NOT NULL, status auth.factor_status NOT NULL,
 created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, secret text
);
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
$$;
