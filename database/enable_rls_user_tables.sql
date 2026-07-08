-- Fix the Supabase "rls_disabled_in_public" security alert (July 2026).
--
-- Two tables in the public schema had Row-Level Security DISABLED, so anyone
-- holding the (public) anon key could read/insert/update/delete every row:
--
--   * user_profiles       — RLS was OFF even though 5 policies existed, so the
--                           policies were DORMANT. Anyone could read all
--                           profiles AND update any row — including setting
--                           their own role to 'admin' (privilege escalation),
--                           or insert/delete profiles.
--   * user_phrase_bookmarks — an orphan table (0 rows, not referenced anywhere
--                           in the app/worker) with no policies at all.
--
-- --- Why we don't just flip RLS on for user_profiles as-is ---
-- The two "Admins ..." policies each ran
--     EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role='admin')
-- a self-referential subquery on the very table the policy guards. With RLS
-- enabled that triggers Postgres "infinite recursion detected in policy for
-- relation user_profiles" on EVERY read — and AuthContext reads the profile on
-- every session, so login would break for everyone. This migration removes the
-- recursive policies.
--
-- --- Resulting user_profiles policy set (RLS enabled) ---
--   SELECT: "Anyone can read profiles" (USING true) — unchanged read behavior.
--   WRITE : no INSERT/UPDATE/DELETE policy => anon/authenticated writes are
--           denied by default. This is correct: the app performs NO client-side
--           writes to user_profiles. New rows are created by the SECURITY
--           DEFINER signup trigger handle_new_user() (bypasses RLS); role
--           promotion is done with the service role / SQL. Dropping the old
--           "Users can update own profile" policy also closes the role-
--           escalation hole (it let a user rewrite their own role column).
--
-- Admin writes to other tables (shows/episodes/extracted_phrases/
-- phrase_extractions) are gated by current_user_is_admin() — a SECURITY DEFINER
-- function that reads user_profiles bypassing RLS — and keep working because
-- the read-all SELECT policy above lets the admin see their own role.
--
-- Idempotent: safe to run repeatedly.

-- 1) Orphan bookmarks table: enable RLS with no policy => deny-all for
--    anon/authenticated; the service role still bypasses RLS. (If you never
--    plan to use this table, consider `DROP TABLE public.user_phrase_bookmarks`
--    instead — it is currently unused.)
ALTER TABLE public.user_phrase_bookmarks ENABLE ROW LEVEL SECURITY;

-- 2) user_profiles: drop the recursive admin policies and the unused/unsafe
--    write policies, then (re)assert a single read-all SELECT policy.
DROP POLICY IF EXISTS "Admins can view all profiles"  ON public.user_profiles; -- recursive
DROP POLICY IF EXISTS "Admins can update any profile" ON public.user_profiles; -- recursive
DROP POLICY IF EXISTS "Users can update own profile"  ON public.user_profiles; -- unused + role-escalation
DROP POLICY IF EXISTS "Users can view own profile"    ON public.user_profiles; -- redundant with read-all

DROP POLICY IF EXISTS "Anyone can read profiles"      ON public.user_profiles;
CREATE POLICY "Anyone can read profiles" ON public.user_profiles
  FOR SELECT USING (true);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
