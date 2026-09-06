-- ==========================================
-- HARD RESET: FRESH START (010)
-- ==========================================

-- 1. Wipe all Workspaces/Teams
-- This cascades and deletes all Projects, Tasks, Messages, and Invites.
TRUNCATE public.teams CASCADE;

-- 2. Wipe all User Profiles
TRUNCATE public.profiles CASCADE;

-- 3. Wipe all Auth Accounts
-- You will need to register fresh after running this.
DELETE FROM auth.users;
