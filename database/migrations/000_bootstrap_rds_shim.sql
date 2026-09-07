-- ==============================================================================
-- Migration 041: Amazon RDS PostgreSQL Compatibility Shim
-- Enables seamless execution of migrations 000-040 on vanilla RDS PostgreSQL 16
-- by replicating the auth schema, auth.users baseline table, and auth.uid() function.
-- ==============================================================================

-- 1. Create auth schema
CREATE SCHEMA IF NOT EXISTS auth;

-- 2. Create baseline auth.users table matching GoTrue / Supabase schema expectations
CREATE TABLE IF NOT EXISTS auth.users (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id                 uuid,
  aud                         varchar(255),
  role                        varchar(255),
  email                       varchar(255) UNIQUE,
  encrypted_password          varchar(255),
  email_confirmed_at          timestamptz,
  invited_at                  timestamptz,
  confirmation_token          varchar(255),
  confirmation_sent_at        timestamptz,
  recovery_token              varchar(255),
  recovery_sent_at            timestamptz,
  email_change_token_new      varchar(255),
  email_change                varchar(255),
  email_change_sent_at        timestamptz,
  last_sign_in_at             timestamptz,
  raw_app_meta_data           jsonb DEFAULT '{}'::jsonb,
  raw_user_meta_data          jsonb DEFAULT '{}'::jsonb,
  is_super_admin              boolean,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now(),
  phone                       text,
  phone_confirmed_at          timestamptz,
  phone_change                text,
  phone_change_token          varchar(255),
  phone_change_sent_at        timestamptz,
  confirmed_at                timestamptz,
  email_change_token_current  varchar(255),
  email_change_confirm_status smallint,
  banned_until                timestamptz,
  reauthentication_token      varchar(255),
  reauthentication_sent_at    timestamptz,
  is_sso_user                 boolean DEFAULT false,
  deleted_at                  timestamptz
);

-- Index on email for fast lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users (email);

-- 3. Session Context Functions for Row-Level Security (RLS)
-- Enables auth.uid() to resolve either from session configuration (request.jwt.claim.sub)
-- or from standard Supabase request context.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claim.role', true),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    'authenticated'
  )::text;
$$;

-- 4. Grants for application user
GRANT USAGE ON SCHEMA auth TO PUBLIC;
GRANT SELECT ON auth.users TO PUBLIC;
