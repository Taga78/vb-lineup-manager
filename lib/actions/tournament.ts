'use server'

/**
 * Server Actions — Module Tournoi.
 *
 * Responsabilités :
 * - Créer une session de type TOURNAMENT
 * - Générer les matchs de poule (Classic) ou les rounds (KOTH)
 * - Mettre à jour les scores
 * - Calculer et persister les classements
 * - Générer les phases finales (Bracket)
 */

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { TournamentFormat, Match, Standing } from '@/lib/types'
import {
  generateAllPoolMatches,
  distributeTeamsIntoPools,
  calculatePoolStandings,
  generateBracketMatches,
  generateCrossPoolPairings,
  getRoundName,
  calculateKothStandings,
  type MatchTemplate,
} from '@/lib/algorithms/tournament-engine'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function revalidateTournament(sessionId: string) {
  revalidatePath(`/staff/sessions/${sessionId}`)
  revalidatePath(`/staff/sessions/${sessionId}/tournament`)
  revalidatePath(`/tournament/public/${sessionId}`)
}

// ---------------------------------------------------------------------------
// Create Tournament Session
// ---------------------------------------------------------------------------

export async function createTournamentSession(data: {
  date: string
  label: string | null
  nbCourts: number
  preferredTeamSize: number
  format: TournamentFormat
}): Promise<{ success: true; sessionId: string } | { success: false; error: string }> {
  let supabase, user
  try {
    ;({ supabase, user } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      date: new Date(data.date).toISOString(),
      label: data.label?.trim() || null,
      nb_courts_planned: data.nbCourts,
      preferred_team_size: data.preferredTeamSize,
      type: 'TOURNAMENT',
      format: JSON.parse(JSON.stringify(data.format)),
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !session) {
    return { success: false, error: error?.message ?? 'Erreur lors de la création.' }
  }

  revalidatePath('/staff/sessions')
  return { success: true, sessionId: session.id }
}

// ---------------------------------------------------------------------------
// Generate Pool Matches (Classic)
// ---------------------------------------------------------------------------

export async function generateTournamentPoolMatches(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  // Fetch session and teams
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, format, nb_courts_planned')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    return { success: false, error: 'Session introuvable.' }
  }

  const format = session.format as unknown as TournamentFormat | null
  if (!format || format.mode !== 'CLASSIC') {
    return { success: false, error: 'Cette session n\'est pas un tournoi classique.' }
  }

  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id')
    .eq('session_id', sessionId)
    .order('court_number')

  if (teamsError || !teams || teams.length < 2) {
    return { success: false, error: 'Il faut au moins 2 équipes pour lancer le tournoi.' }
  }

  const teamIds = teams.map((t) => t.id)
  const numPools = format.num_pools || 2
  const pools = distributeTeamsIntoPools(teamIds, numPools)
  const matchTemplates = generateAllPoolMatches(sessionId, pools)

  // Delete existing matches for this session
  await supabase.from('matches').delete().eq('session_id', sessionId)

  // Insert new matches
  if (matchTemplates.length > 0) {
    const { error: insertError } = await supabase.from('matches').insert(matchTemplates)
    if (insertError) {
      return { success: false, error: insertError.message }
    }
  }

  revalidateTournament(sessionId)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Update Match Score
// ---------------------------------------------------------------------------

export async function updateMatchScore(
  matchId: string,
  scoreA: number,
  scoreB: number,
  finish: boolean = false
): Promise<{ success: boolean; error?: string }> {
  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const updateData: Record<string, unknown> = {
    score_a: scoreA,
    score_b: scoreB,
  }

  if (finish) {
    updateData.status = 'FINISHED'
    updateData.winner_id = scoreA > scoreB ? undefined : undefined // will be set below
  } else {
    updateData.status = 'IN_PROGRESS'
  }

  // Fetch match to determine winner
  if (finish) {
    const { data: match } = await supabase
      .from('matches')
      .select('team_a_id, team_b_id')
      .eq('id', matchId)
      .single()

    if (match) {
      updateData.winner_id = scoreA > scoreB ? match.team_a_id : match.team_b_id
    }
  }

  const { error } = await supabase
    .from('matches')
    .update(updateData)
    .eq('id', matchId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Update standings if match is finished
  if (finish) {
    const { data: match } = await supabase
      .from('matches')
      .select('session_id')
      .eq('id', matchId)
      .single()
    if (match) {
      await recalculateStandings(match.session_id)
      revalidateTournament(match.session_id)
    }
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// Start Match
// ---------------------------------------------------------------------------

export async function startMatch(
  matchId: string
): Promise<{ success: boolean; error?: string }> {
  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { error } = await supabase
    .from('matches')
    .update({ status: 'IN_PROGRESS' })
    .eq('id', matchId)

  if (error) {
    return { success: false, error: error.message }
  }

  const { data: match } = await supabase
    .from('matches')
    .select('session_id')
    .eq('id', matchId)
    .single()

  if (match) {
    revalidateTournament(match.session_id)
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// Recalculate Standings
// ---------------------------------------------------------------------------

async function recalculateStandings(sessionId: string): Promise<void> {
  const supabase = await createClient()

  // Fetch session format
  const { data: session } = await supabase
    .from('sessions')
    .select('format')
    .eq('id', sessionId)
    .single()

  if (!session) return

  const format = session.format as unknown as TournamentFormat | null
  if (!format) return

  // Fetch all finished matches
  const { data: matches } = await supabase
    .from('matches')
    .select('id, team_a_id, team_b_id, score_a, score_b, winner_id, status, round')
    .eq('session_id', sessionId)

  if (!matches) return

  // Delete existing standings
  await supabase.from('standings').delete().eq('session_id', sessionId)

  if (format.mode === 'CLASSIC') {
    // Group matches by pool
    const poolMatches = new Map<string, typeof matches>()
    const poolTeams = new Map<string, Set<string>>()

    for (const match of matches) {
      const pool = match.round
      if (!pool.startsWith('POOL_')) continue
      if (!poolMatches.has(pool)) poolMatches.set(pool, [])
      poolMatches.get(pool)!.push(match)
      if (!poolTeams.has(pool)) poolTeams.set(pool, new Set())
      if (match.team_a_id) poolTeams.get(pool)!.add(match.team_a_id)
      if (match.team_b_id) poolTeams.get(pool)!.add(match.team_b_id)
    }

    // Calculate standings per pool
    const standingsToInsert: Array<{
      session_id: string
      team_id: string
      points: number
      matches_played: number
      wins: number
      losses: number
      points_diff: number
      rank: number
    }> = []

    for (const [, teamSet] of poolTeams) {
      const teamIds = Array.from(teamSet)
      const poolName = Array.from(poolMatches.keys()).find((p) => {
        const pTeams = poolTeams.get(p)
        return pTeams && teamIds.every((t) => pTeams.has(t))
      })

      if (!poolName) continue
      const pMatches = poolMatches.get(poolName) ?? []
      const standings = calculatePoolStandings(pMatches, teamIds)

      for (let i = 0; i < standings.length; i++) {
        const s = standings[i]
        if (!s.teamId) continue
        standingsToInsert.push({
          session_id: sessionId,
          team_id: s.teamId,
          points: s.points,
          matches_played: s.matchesPlayed,
          wins: s.wins,
          losses: s.losses,
          points_diff: s.pointsDiff,
          rank: i + 1,
        })
      }
    }

    if (standingsToInsert.length > 0) {
      await supabase.from('standings').insert(standingsToInsert)
    }
  } else if (format.mode === 'KOTH') {
    // Fetch team players for all teams in this session
    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .eq('session_id', sessionId)

    if (!teams) return

    const teamPlayerMap = new Map<string, string[]>()
    for (const team of teams) {
      const { data: tps } = await supabase
        .from('team_players')
        .select('player_id')
        .eq('team_id', team.id)

      teamPlayerMap.set(team.id, (tps ?? []).map((tp) => tp.player_id))
    }

    const standings = calculateKothStandings(matches, teamPlayerMap)

    const standingsToInsert = standings.map((s, i) => ({
      session_id: sessionId,
      player_id: s.playerId!,
      points: s.points,
      matches_played: s.matchesPlayed,
      wins: s.wins,
      losses: s.losses,
      points_diff: s.pointsDiff,
      rank: i + 1,
    }))

    if (standingsToInsert.length > 0) {
      await supabase.from('standings').insert(standingsToInsert)
    }
  }
}

// ---------------------------------------------------------------------------
// Generate Playoffs (Classic)
// ---------------------------------------------------------------------------

export async function generatePlayoffs(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('format')
    .eq('id', sessionId)
    .single()

  if (!session) return { success: false, error: 'Session introuvable.' }

  const format = session.format as unknown as TournamentFormat | null
  if (!format || format.mode !== 'CLASSIC') {
    return { success: false, error: 'Cette session n\'est pas un tournoi classique.' }
  }

  // Fetch standings
  const { data: standings } = await supabase
    .from('standings')
    .select('team_id, rank')
    .eq('session_id', sessionId)
    .not('team_id', 'is', null)
    .order('rank')

  if (!standings || standings.length === 0) {
    return { success: false, error: 'Aucun classement disponible. Terminez les matchs de poule d\'abord.' }
  }

  // Determine pools from existing matches
  const { data: matches } = await supabase
    .from('matches')
    .select('round, team_a_id, team_b_id')
    .eq('session_id', sessionId)

  const poolTeams = new Map<number, Set<string>>()
  for (const match of matches ?? []) {
    if (!match.round.startsWith('POOL_')) continue
    const poolIndex = match.round.charCodeAt(5) - 65 // POOL_A → 0
    if (!poolTeams.has(poolIndex)) poolTeams.set(poolIndex, new Set())
    if (match.team_a_id) poolTeams.get(poolIndex)!.add(match.team_a_id)
    if (match.team_b_id) poolTeams.get(poolIndex)!.add(match.team_b_id)
  }

  const numPools = poolTeams.size
  const qualifiersPerPool = format.qualifiers_per_pool || 2

  // Build pool standings for cross-pool pairing
  const poolStandingsInput: { poolIndex: number; teamId: string; rank: number }[] = []
  for (const s of standings) {
    if (!s.team_id) continue
    // Find which pool this team belongs to
    for (const [poolIndex, teams] of poolTeams) {
      if (teams.has(s.team_id)) {
        poolStandingsInput.push({ poolIndex, teamId: s.team_id, rank: s.rank! })
        break
      }
    }
  }

  const pairings = generateCrossPoolPairings(poolStandingsInput, numPools, qualifiersPerPool)

  if (pairings.length === 0) {
    return { success: false, error: 'Impossible de générer les play-offs.' }
  }

  const roundName = getRoundName(pairings.length)

  // Get the max match_order to continue from
  const { data: existingMatches } = await supabase
    .from('matches')
    .select('match_order')
    .eq('session_id', sessionId)
    .order('match_order', { ascending: false })
    .limit(1)

  const startOrder = (existingMatches?.[0]?.match_order ?? 0) + 1

  const bracketMatches = generateBracketMatches({
    sessionId,
    pairings,
    roundName,
    startOrder,
  })

  const { error: insertError } = await supabase.from('matches').insert(bracketMatches)
  if (insertError) {
    return { success: false, error: insertError.message }
  }

  revalidateTournament(sessionId)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Generate KOTH Round
// ---------------------------------------------------------------------------

export async function generateKothRound(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  let supabase
  try {
    ;({ supabase } = await requireAuth())
  } catch {
    return { success: false, error: 'Non autorisé.' }
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('id, format, nb_courts_planned, preferred_team_size')
    .eq('id', sessionId)
    .single()

  if (!session) return { success: false, error: 'Session introuvable.' }

  const format = session.format as unknown as TournamentFormat | null
  if (!format || format.mode !== 'KOTH') {
    return { success: false, error: 'Cette session n\'est pas un tournoi KOTH.' }
  }

  // Get current round number
  const { data: existingMatches } = await supabase
    .from('matches')
    .select('round')
    .eq('session_id', sessionId)

  const roundNumbers = (existingMatches ?? [])
    .map((m) => parseInt(m.round.replace('ROUND_', ''), 10))
    .filter((n) => !isNaN(n))
  const nextRound = roundNumbers.length > 0 ? Math.max(...roundNumbers) + 1 : 1

  // Fetch present players via attendance
  const { data: attendances } = await supabase
    .from('attendances')
    .select('player_id')
    .eq('session_id', sessionId)

  if (!attendances || attendances.length < 4) {
    return { success: false, error: 'Il faut au moins 4 joueurs présents.' }
  }

  const playerIds = attendances.map((a) => a.player_id)

  // Delete existing teams for this round (we create new ones)
  // First, generate team assignments
  const numCourts = session.nb_courts_planned
  const numTeams = numCourts * 2
  const shuffled = [...playerIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // Create teams
  const teamIds: string[] = []
  for (let t = 0; t < numTeams; t++) {
    const courtNumber = Math.floor(t / 2) + 1
    const teamName = t % 2 === 0 ? `R${nextRound} Équipe A` : `R${nextRound} Équipe B`

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ session_id: sessionId, court_number: courtNumber, name: teamName })
      .select('id')
      .single()

    if (teamError || !team) {
      return { success: false, error: teamError?.message ?? 'Erreur création équipe.' }
    }
    teamIds.push(team.id)

    // Assign players to this team
    const teamPlayers = shuffled.filter((_, i) => i % numTeams === t)
    if (teamPlayers.length > 0) {
      await supabase.from('team_players').insert(
        teamPlayers.map((pid) => ({ team_id: team.id, player_id: pid }))
      )
    }
  }

  // Create matches (one per court)
  const matchTemplates: MatchTemplate[] = []
  for (let c = 0; c < numCourts; c++) {
    matchTemplates.push({
      session_id: sessionId,
      team_a_id: teamIds[c * 2],
      team_b_id: teamIds[c * 2 + 1],
      round: `ROUND_${nextRound}`,
      court_number: c + 1,
      status: 'SCHEDULED',
      match_order: (existingMatches?.length ?? 0) + c,
    })
  }

  const { error: insertError } = await supabase.from('matches').insert(matchTemplates)
  if (insertError) {
    return { success: false, error: insertError.message }
  }

  revalidateTournament(sessionId)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Fetch Tournament Data
// ---------------------------------------------------------------------------

export async function getTournamentMatches(
  sessionId: string
): Promise<{ data: Match[]; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('matches')
    .select('id, session_id, team_a_id, team_b_id, score_a, score_b, winner_id, round, court_number, status, match_order')
    .eq('session_id', sessionId)
    .order('match_order')

  if (error) return { data: [], error: error.message }

  return {
    data: (data ?? []).map((m) => ({
      id: m.id,
      session_id: m.session_id,
      team_a_id: m.team_a_id,
      team_b_id: m.team_b_id,
      score_a: m.score_a,
      score_b: m.score_b,
      winner_id: m.winner_id,
      round: m.round,
      court_number: m.court_number,
      status: m.status as Match['status'],
      match_order: m.match_order,
    })),
    error: null,
  }
}

export async function getTournamentStandings(
  sessionId: string
): Promise<{ data: Standing[]; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('standings')
    .select('id, session_id, player_id, team_id, points, matches_played, wins, losses, points_diff, rank')
    .eq('session_id', sessionId)
    .order('rank')

  if (error) return { data: [], error: error.message }

  return {
    data: (data ?? []).map((s) => ({
      id: s.id,
      session_id: s.session_id,
      player_id: s.player_id,
      team_id: s.team_id,
      points: s.points,
      matches_played: s.matches_played,
      wins: s.wins,
      losses: s.losses,
      points_diff: s.points_diff,
      rank: s.rank,
    })),
    error: null,
  }
}

/**
 * Récupère les noms des équipes indexés par ID pour l'affichage.
 */
export async function getTeamNames(
  sessionId: string
): Promise<Map<string, string>> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('teams')
    .select('id, name, court_number')
    .eq('session_id', sessionId)

  const map = new Map<string, string>()
  for (const t of data ?? []) {
    map.set(t.id, t.name ?? `Terrain ${t.court_number}`)
  }
  return map
}
