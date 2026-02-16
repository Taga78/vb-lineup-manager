// Application-level types (distinct from database types in lib/supabase/types.ts)

export const SKILL_KEYS = ['skill_service', 'skill_pass', 'skill_attack', 'skill_defense'] as const
export type SkillKey = typeof SKILL_KEYS[number]

export const SKILL_LABELS: Record<SkillKey, string> = {
  skill_service: 'Service',
  skill_pass: 'Passe',
  skill_attack: 'Attaque',
  skill_defense: 'Défense',
}

export const SKILL_SHORT: Record<SkillKey, string> = {
  skill_service: 'S',
  skill_pass: 'P',
  skill_attack: 'A',
  skill_defense: 'D',
}

export interface Player {
  id: string
  name: string
  gender: string | null
  skill_service: number
  skill_pass: number
  skill_attack: number
  skill_defense: number
  is_active: boolean
  is_guest: boolean
}

export const GUEST_LEVELS = {
  beginner:     { label: 'Débutant',       skills: 3 },
  intermediate: { label: 'Intermédiaire',  skills: 5 },
  advanced:     { label: 'Confirmé',       skills: 7 },
} as const

export type GuestLevel = keyof typeof GUEST_LEVELS

export type SessionType = 'TRAINING' | 'TOURNAMENT'
export type TournamentMode = 'CLASSIC' | 'KOTH'
export type MatchStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED'

export interface MatchConfig {
  sets: number
  points: number
  win_by_two: boolean
}

export interface ClassicTournamentFormat {
  mode: 'CLASSIC'
  pool_config: MatchConfig
  playoff_config: MatchConfig & { tie_break_points: number }
  num_pools: number
  qualifiers_per_pool: number
}

export interface KothTournamentFormat {
  mode: 'KOTH'
  match_config: MatchConfig
}

export type TournamentFormat = ClassicTournamentFormat | KothTournamentFormat

export interface Session {
  id: string
  date: string
  label: string | null
  nb_courts_planned: number
  preferred_team_size: number
  is_open: boolean
  recurring_schedule_id: string | null
  type: SessionType
  format: TournamentFormat | null
}

export interface Match {
  id: string
  session_id: string
  team_a_id: string | null
  team_b_id: string | null
  score_a: number | null
  score_b: number | null
  winner_id: string | null
  round: string
  court_number: number
  status: MatchStatus
  match_order: number
}

export interface Standing {
  id: string
  session_id: string
  player_id: string | null
  team_id: string | null
  points: number
  matches_played: number
  wins: number
  losses: number
  points_diff: number
  rank: number | null
}

// Jours de la semaine ISO (1=Lundi..7=Dimanche)
export const DAYS_OF_WEEK_FR: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
}

export const DAYS_OF_WEEK_SHORT_FR: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
  7: 'Dim',
}

export interface RecurringSchedule {
  id: string
  label: string
  days_of_week: number[]
  session_time: string
  open_before_minutes: number
  nb_courts_planned: number
  preferred_team_size: number
  session_label_template: string | null
  timezone: string
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ScheduleExclusion {
  id: string
  schedule_id: string
  start_date: string
  end_date: string
  reason: string | null
  created_at: string
}

export interface AttendanceRecord {
  id: string
  session_id: string
  player_id: string
  marked_by: string | null
  created_at: string
}

export interface TeamSkillAverages {
  skill_service: number
  skill_pass: number
  skill_attack: number
  skill_defense: number
  overall: number
}

export interface Team {
  court_number: number
  name: string | null
  players: Player[]
  avgSkills: TeamSkillAverages
}

export interface GenerationResult {
  teams: Team[]
  timestamp: string
}
