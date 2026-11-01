-- Testers can preview school levels without inheriting administrator privileges.
-- Existing user_roles RLS continues to require an administrator for role changes.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tester';
