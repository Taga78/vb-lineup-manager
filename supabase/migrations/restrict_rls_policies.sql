-- Migration: restrict_rls_policies
-- Replaces permissive USING (true) policies with auth-based ones.
-- SELECT remains public, mutations require auth.uid() IS NOT NULL.

-- Drop all existing permissive policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Players: public read, auth-only mutations (except guest insert)
CREATE POLICY "players_select_all" ON public.players FOR SELECT USING (true);
CREATE POLICY "players_insert_auth" ON public.players FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL OR is_guest = true
);
CREATE POLICY "players_update_auth" ON public.players FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "players_delete_auth" ON public.players FOR DELETE USING (auth.uid() IS NOT NULL);

-- Sessions: public read, auth-only mutations
CREATE POLICY "sessions_select_all" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "sessions_insert_auth" ON public.sessions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sessions_update_auth" ON public.sessions FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "sessions_delete_auth" ON public.sessions FOR DELETE USING (auth.uid() IS NOT NULL);

-- Attendances: public read & insert (anyone can check in), auth-only update/delete
CREATE POLICY "attendances_select_all" ON public.attendances FOR SELECT USING (true);
CREATE POLICY "attendances_insert_all" ON public.attendances FOR INSERT WITH CHECK (true);
CREATE POLICY "attendances_update_auth" ON public.attendances FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "attendances_delete_auth" ON public.attendances FOR DELETE USING (auth.uid() IS NOT NULL);

-- Teams: public read, auth-only mutations
CREATE POLICY "teams_select_all" ON public.teams FOR SELECT USING (true);
CREATE POLICY "teams_insert_auth" ON public.teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "teams_update_auth" ON public.teams FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "teams_delete_auth" ON public.teams FOR DELETE USING (auth.uid() IS NOT NULL);

-- Team players: public read, auth-only mutations
CREATE POLICY "team_players_select_all" ON public.team_players FOR SELECT USING (true);
CREATE POLICY "team_players_insert_auth" ON public.team_players FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "team_players_update_auth" ON public.team_players FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_players_delete_auth" ON public.team_players FOR DELETE USING (auth.uid() IS NOT NULL);

-- Profiles: public read, update own only
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
