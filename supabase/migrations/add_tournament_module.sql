-- Migration: add_tournament_module
-- Adds tournament support: enums, matches table, standings table, session columns

-- 1. Create enums
CREATE TYPE session_type AS ENUM ('TRAINING', 'TOURNAMENT');
CREATE TYPE match_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'FINISHED');

-- 2. Add tournament columns to sessions
ALTER TABLE sessions
  ADD COLUMN type session_type NOT NULL DEFAULT 'TRAINING',
  ADD COLUMN format jsonb DEFAULT NULL;

-- 3. Create matches table
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  team_a_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  team_b_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  score_a int DEFAULT 0,
  score_b int DEFAULT 0,
  winner_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  round text NOT NULL,
  court_number int NOT NULL DEFAULT 1,
  status match_status NOT NULL DEFAULT 'SCHEDULED',
  match_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_matches_session_id ON matches(session_id);
CREATE INDEX idx_matches_status ON matches(status);

-- 4. Create standings table
CREATE TABLE standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  points int NOT NULL DEFAULT 0,
  matches_played int NOT NULL DEFAULT 0,
  wins int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0,
  points_diff int NOT NULL DEFAULT 0,
  rank int DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_standings_session_id ON standings(session_id);
CREATE INDEX idx_standings_player_id ON standings(player_id);
CREATE UNIQUE INDEX idx_standings_session_player ON standings(session_id, player_id) WHERE player_id IS NOT NULL;
CREATE UNIQUE INDEX idx_standings_session_team ON standings(session_id, team_id) WHERE team_id IS NOT NULL AND player_id IS NULL;

-- 5. Enable RLS on new tables
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for matches
CREATE POLICY "Matches are viewable by everyone" ON matches
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert matches" ON matches
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'staff')
  );

CREATE POLICY "Staff can update matches" ON matches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'staff')
  );

CREATE POLICY "Staff can delete matches" ON matches
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'staff')
  );

-- 7. RLS policies for standings
CREATE POLICY "Standings are viewable by everyone" ON standings
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert standings" ON standings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'staff')
  );

CREATE POLICY "Staff can update standings" ON standings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'staff')
  );

CREATE POLICY "Staff can delete standings" ON standings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'staff')
  );
