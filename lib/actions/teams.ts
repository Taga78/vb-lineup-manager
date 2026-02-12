'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { generateTeams, type CooccurrenceMap } from '@/lib/algorithms/team-generator'
import { SKILL_KEYS, type Player, type TeamSkillAverages } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TeamPlayerInfo = {
  id: string
  name: string
  gender: string | null
  skill_service: number
  skill_pass: number
  skill_attack: number
  skill_defense: number
}

export type SavedTeam = {
  id: string
  court_number: number
  name: string | null
  players: TeamPlayerInfo[]
  avgSkills: TeamSkillAverages
}

type AttendancePlayerRow = {
  player_id: string
  players: {
    id: string
    name: string
    gender: string | null
    skill_service: number
    skill_pass: number
    skill_attack: number
    skill_defense: number
    is_active: boolean
    is_guest: boolean
  } | null
}

/** Shape returned by `team_players.select('player_id, players(id, name, gender, skill_service, skill_pass, skill_attack, skill_defense)')` */
type TeamPlayerRow = {
  player_id: string
  players: {
    id: string
    name: string
    gender: string | null
    skill_service: number
    skill_pass: number
    skill_attack: number
    skill_defense: number
  } | null
}

// ---------------------------------------------------------------------------
// Co-occurrence history
// ---------------------------------------------------------------------------

const MAX_RECENT_SESSIONS = 8

/**
 * Build a co-occurrence map: for each pair of present players, count how many
 * times they were on the same team in recent sessions.
 */
async function getRecentCooccurrences(
  sessionId: string,
  playerIds: string[]
): Promise<CooccurrenceMap> {
  const cooc: CooccurrenceMap = new Map()
  if (playerIds.length < 2) return cooc

  const supabase = await createClient()

  // Get the date of the current session to exclude it and find recent ones
  const { data: currentSession } = await supabase
    .from('sessions')
    .select('date')
    .eq('id', sessionId)
    .single()

  if (!currentSession?.date) return cooc

  // Find the N most recent sessions before the current one
  const { data: recentSessions } = await supabase
    .from('sessions')
    .select('id')
    .lt('date', currentSession.date)
    .order('date', { ascending: false })
    .limit(MAX_RECENT_SESSIONS)

  if (!recentSessions || recentSessions.length === 0) return cooc

  const sessionIds = recentSessions.map((s) => s.id)

  // Fetch all teams for these sessions
  const { data: teams } = await supabase
    .from('teams')
    .select('id, session_id')
    .in('session_id', sessionIds)

  if (!teams || teams.length === 0) return cooc

  const teamIds = teams.map((t) => t.id)

  // Fetch all team_players for these teams, filtered to present players
  const { data: teamPlayers } = await supabase
    .from('team_players')
    .select('team_id, player_id')
    .in('team_id', teamIds)
    .in('player_id', playerIds)

  if (!teamPlayers || teamPlayers.length === 0) return cooc

  // Group player IDs by team_id
  const teamMembers = new Map<string, string[]>()
  for (const tp of teamPlayers) {
    if (!teamMembers.has(tp.team_id)) teamMembers.set(tp.team_id, [])
    teamMembers.get(tp.team_id)!.push(tp.player_id)
  }

  // Count co-occurrences for each pair
  for (const members of teamMembers.values()) {
    for (let i = 0; i < members.length - 1; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const a = members[i]
        const b = members[j]
        // Symmetric: store both directions
        if (!cooc.has(a)) cooc.set(a, new Map())
        if (!cooc.has(b)) cooc.set(b, new Map())
        cooc.get(a)!.set(b, (cooc.get(a)!.get(b) ?? 0) + 1)
        cooc.get(b)!.set(a, (cooc.get(b)!.get(a) ?? 0) + 1)
      }
    }
  }

  return cooc
}

// ---------------------------------------------------------------------------
// Generate & Save
// ---------------------------------------------------------------------------

export async function generateAndSaveTeams(
  sessionId: string
): Promise<{ success: true; teams: SavedTeam[] } | { success: false; error: string }> {
  try {
    const { supabase } = await requireAuth()

    // 1. Fetch the session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, nb_courts_planned, preferred_team_size')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return { success: false, error: sessionError?.message ?? 'Session introuvable.' }
    }

    // 2. Fetch attendances joined with players
    const { data: attendances, error: attendError } = await supabase
      .from('attendances')
      .select('player_id, players(id, name, gender, skill_service, skill_pass, skill_attack, skill_defense, is_active, is_guest)')
      .eq('session_id', sessionId)

    if (attendError) {
      return { success: false, error: attendError.message }
    }

    if (!attendances || attendances.length === 0) {
      return { success: false, error: 'Aucun joueur present pour cette seance.' }
    }

    // Build players array from attendance records
    const rows = attendances as AttendancePlayerRow[]
    const players: Player[] = rows
      .map((a) => {
        const p = a.players
        if (!p) return null
        return {
          id: p.id,
          name: p.name,
          gender: p.gender as Player['gender'],
          skill_service: p.skill_service,
          skill_pass: p.skill_pass,
          skill_attack: p.skill_attack,
          skill_defense: p.skill_defense,
          is_active: p.is_active,
          is_guest: p.is_guest,
        }
      })
      .filter((p): p is Player => p !== null && p.is_active)

    if (players.length === 0) {
      return { success: false, error: 'Aucun joueur actif present pour cette seance.' }
    }

    // 3. Build co-occurrence history & run the algorithm
    const cooccurrences = await getRecentCooccurrences(
      sessionId,
      players.map((p) => p.id)
    )

    const { teams } = generateTeams({
      players,
      numCourts: session.nb_courts_planned,
      preferredTeamSize: session.preferred_team_size,
      cooccurrences,
    })

    // 4. Delete existing teams for this session (cascade handles team_players)
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('session_id', sessionId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    // 5. Insert new teams and team_players
    const savedTeams: SavedTeam[] = []

    for (const team of teams) {
      const { data: insertedTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          session_id: sessionId,
          court_number: team.court_number,
          name: team.name,
        })
        .select('id')
        .single()

      if (teamError || !insertedTeam) {
        return { success: false, error: teamError?.message ?? 'Erreur lors de la creation des equipes.' }
      }

      // 6. Insert player assignments
      if (team.players.length > 0) {
        const teamPlayerRows = team.players.map((p) => ({
          team_id: insertedTeam.id,
          player_id: p.id,
        }))

        const { error: tpError } = await supabase
          .from('team_players')
          .insert(teamPlayerRows)

        if (tpError) {
          return { success: false, error: tpError.message }
        }
      }

      savedTeams.push({
        id: insertedTeam.id,
        court_number: team.court_number,
        name: team.name,
        players: team.players.map((p) => ({
          id: p.id,
          name: p.name,
          gender: p.gender,
          skill_service: p.skill_service,
          skill_pass: p.skill_pass,
          skill_attack: p.skill_attack,
          skill_defense: p.skill_defense,
        })),
        avgSkills: team.avgSkills,
      })
    }

    // 7. Revalidate
    revalidatePath(`/staff/sessions/${sessionId}/teams`)

    return { success: true, teams: savedTeams }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// Swap two players between teams
// ---------------------------------------------------------------------------

export async function swapPlayers(
  player1: { teamId: string; playerId: string },
  player2: { teamId: string; playerId: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireAuth()

    // Validate that both team_players rows exist
    const [{ data: tp1, error: e1 }, { data: tp2, error: e2 }] = await Promise.all([
      supabase
        .from('team_players')
        .select('team_id, player_id')
        .eq('team_id', player1.teamId)
        .eq('player_id', player1.playerId)
        .single(),
      supabase
        .from('team_players')
        .select('team_id, player_id')
        .eq('team_id', player2.teamId)
        .eq('player_id', player2.playerId)
        .single(),
    ])

    if (e1 || !tp1 || e2 || !tp2) {
      return { success: false, error: 'Joueur(s) introuvable(s) dans les équipes.' }
    }

    // Swap: update player1 to team2, player2 to team1
    // Delete both rows then re-insert with swapped team_ids to avoid unique constraint issues
    const { error: d1 } = await supabase
      .from('team_players')
      .delete()
      .eq('team_id', player1.teamId)
      .eq('player_id', player1.playerId)

    if (d1) return { success: false, error: d1.message }

    const { error: d2 } = await supabase
      .from('team_players')
      .delete()
      .eq('team_id', player2.teamId)
      .eq('player_id', player2.playerId)

    if (d2) return { success: false, error: d2.message }

    const { error: i1 } = await supabase
      .from('team_players')
      .insert([
        { team_id: player2.teamId, player_id: player1.playerId },
        { team_id: player1.teamId, player_id: player2.playerId },
      ])

    if (i1) return { success: false, error: i1.message }

    // Get the session_id from one of the teams to revalidate
    const { data: team } = await supabase
      .from('teams')
      .select('session_id')
      .eq('id', player1.teamId)
      .single()

    if (team?.session_id) {
      revalidatePath(`/staff/sessions/${team.session_id}/teams`)
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// Fetch existing teams
// ---------------------------------------------------------------------------

function computeAvgSkills(players: TeamPlayerInfo[]): TeamSkillAverages {
  if (players.length === 0) {
    return { skill_service: 0, skill_pass: 0, skill_attack: 0, skill_defense: 0, overall: 0 }
  }
  const avgs = {} as Record<string, number>
  let totalSum = 0
  for (const key of SKILL_KEYS) {
    const sum = players.reduce((acc, p) => acc + p[key], 0)
    avgs[key] = Math.round((sum / players.length) * 10) / 10
    totalSum += avgs[key]
  }
  return {
    skill_service: avgs.skill_service,
    skill_pass: avgs.skill_pass,
    skill_attack: avgs.skill_attack,
    skill_defense: avgs.skill_defense,
    overall: Math.round((totalSum / SKILL_KEYS.length) * 10) / 10,
  }
}

export async function hasTeamsForSession(sessionId: string): Promise<boolean> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
  return (count ?? 0) > 0
}

export async function getGeneratedTeams(
  sessionId: string
): Promise<{ data: SavedTeam[]; error: string | null }> {
  const supabase = await createClient()

  // Fetch teams ordered by court_number
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, court_number, name')
    .eq('session_id', sessionId)
    .order('court_number')

  if (teamsError) {
    return { data: [], error: teamsError.message }
  }

  if (!teams || teams.length === 0) {
    return { data: [], error: null }
  }

  // Fetch all team_players in a single query
  const teamIds = teams.map((t) => t.id)
  const { data: allTeamPlayers, error: tpError } = await supabase
    .from('team_players')
    .select('team_id, player_id, players(id, name, gender, skill_service, skill_pass, skill_attack, skill_defense)')
    .in('team_id', teamIds)

  if (tpError) {
    return { data: [], error: tpError.message }
  }

  // Group players by team_id
  const tpRows = (allTeamPlayers ?? []) as (TeamPlayerRow & { team_id: string })[]
  const playersByTeam = new Map<string, TeamPlayerInfo[]>()
  for (const tp of tpRows) {
    const p = tp.players
    if (!p) continue
    const list = playersByTeam.get(tp.team_id) ?? []
    list.push({
      id: p.id,
      name: p.name,
      gender: p.gender,
      skill_service: p.skill_service,
      skill_pass: p.skill_pass,
      skill_attack: p.skill_attack,
      skill_defense: p.skill_defense,
    })
    playersByTeam.set(tp.team_id, list)
  }

  const result: SavedTeam[] = teams.map((team) => {
    const players = playersByTeam.get(team.id) ?? []
    return {
      id: team.id,
      court_number: team.court_number,
      name: team.name,
      players,
      avgSkills: computeAvgSkills(players),
    }
  })

  return { data: result, error: null }
}
