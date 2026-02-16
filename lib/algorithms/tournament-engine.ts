/**
 * Tournament Engine — Algorithmes de génération de matchs et calcul de classements.
 *
 * Modes supportés :
 * - CLASSIC : Phase de poules (Round Robin) + Phase finale (Bracket)
 * - KOTH (King of the Hill) : Matchs successifs avec classement individuel
 */

import type { Match, MatchStatus } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types internes
// ---------------------------------------------------------------------------

export interface PoolMatchInput {
  sessionId: string
  teamIds: string[]
  poolName: string
  courtNumber: number
  startOrder?: number
}

export interface BracketMatchInput {
  sessionId: string
  pairings: { teamAId: string; teamBId: string }[]
  roundName: string
  startCourt?: number
  startOrder?: number
}

export interface MatchTemplate {
  session_id: string
  team_a_id: string
  team_b_id: string
  round: string
  court_number: number
  status: MatchStatus
  match_order: number
}

export interface StandingEntry {
  teamId?: string
  playerId?: string
  points: number
  matchesPlayed: number
  wins: number
  losses: number
  pointsDiff: number
}

// ---------------------------------------------------------------------------
// Round Robin (Poules)
// ---------------------------------------------------------------------------

/**
 * Génère les matchs d'une poule en Round Robin (chaque équipe joue contre toutes les autres).
 * Utilise l'algorithme du cercle (polygon scheduling) pour un calendrier optimal.
 */
export function generatePoolMatches({
  sessionId,
  teamIds,
  poolName,
  courtNumber,
  startOrder = 0,
}: PoolMatchInput): MatchTemplate[] {
  if (teamIds.length < 2) return []

  const matches: MatchTemplate[] = []
  const n = teamIds.length
  let order = startOrder

  // Round-robin : chaque paire se rencontre une fois
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      matches.push({
        session_id: sessionId,
        team_a_id: teamIds[i],
        team_b_id: teamIds[j],
        round: poolName,
        court_number: courtNumber,
        status: 'SCHEDULED',
        match_order: order++,
      })
    }
  }

  return matches
}

/**
 * Répartit les équipes en poules de taille aussi égale que possible.
 * Ex: 8 équipes, 2 poules → [4, 4]; 7 équipes, 2 poules → [4, 3]
 */
export function distributeTeamsIntoPools(
  teamIds: string[],
  numPools: number
): string[][] {
  const pools: string[][] = Array.from({ length: numPools }, () => [])

  // Distribuer en round-robin
  for (let i = 0; i < teamIds.length; i++) {
    pools[i % numPools].push(teamIds[i])
  }

  return pools
}

/**
 * Génère tous les matchs de poule pour un tournoi classique.
 * Retourne un tableau plat de MatchTemplate.
 */
export function generateAllPoolMatches(
  sessionId: string,
  pools: string[][],
  startCourt: number = 1
): MatchTemplate[] {
  const allMatches: MatchTemplate[] = []
  let order = 0

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const poolName = `POOL_${String.fromCharCode(65 + poolIdx)}` // POOL_A, POOL_B, etc.
    const courtNumber = startCourt + poolIdx

    const poolMatches = generatePoolMatches({
      sessionId,
      teamIds: pools[poolIdx],
      poolName,
      courtNumber,
      startOrder: order,
    })

    allMatches.push(...poolMatches)
    order += poolMatches.length
  }

  return allMatches
}

// ---------------------------------------------------------------------------
// Bracket (Phase finale)
// ---------------------------------------------------------------------------

const ROUND_NAMES: Record<number, string> = {
  2: 'FINAL',
  4: 'SEMI_FINAL',
  8: 'QUARTER_FINAL',
  16: 'ROUND_16',
}

/**
 * Génère les matchs d'un bracket (arbre éliminatoire).
 * Les pairings doivent être fournis (ex: 1er Poule A vs 2e Poule B).
 */
export function generateBracketMatches({
  sessionId,
  pairings,
  roundName,
  startCourt = 1,
  startOrder = 0,
}: BracketMatchInput): MatchTemplate[] {
  return pairings.map((pairing, i) => ({
    session_id: sessionId,
    team_a_id: pairing.teamAId,
    team_b_id: pairing.teamBId,
    round: roundName,
    court_number: startCourt + (i % 4),
    status: 'SCHEDULED',
    match_order: startOrder + i,
  }))
}

/**
 * Détermine le nom du round en fonction du nombre de matchs.
 */
export function getRoundName(numMatches: number): string {
  return ROUND_NAMES[numMatches] ?? `ROUND_${numMatches}`
}

/**
 * Génère les pairings croisés entre poules pour la phase finale.
 * Ex: 2 poules, 2 qualifiés chacune → 1er A vs 2e B, 1er B vs 2e A
 */
export function generateCrossPoolPairings(
  poolStandings: { poolIndex: number; teamId: string; rank: number }[],
  numPools: number,
  qualifiersPerPool: number
): { teamAId: string; teamBId: string }[] {
  // Organiser par poule et rang
  const byPool = new Map<number, Map<number, string>>()
  for (const entry of poolStandings) {
    if (!byPool.has(entry.poolIndex)) byPool.set(entry.poolIndex, new Map())
    byPool.get(entry.poolIndex)!.set(entry.rank, entry.teamId)
  }

  const pairings: { teamAId: string; teamBId: string }[] = []

  if (numPools === 2) {
    // Croisement classique : 1A vs 2B, 1B vs 2A
    for (let rank = 1; rank <= qualifiersPerPool; rank++) {
      const teamA = byPool.get(0)?.get(rank)
      const teamB = byPool.get(1)?.get(qualifiersPerPool - rank + 1)
      if (teamA && teamB) {
        pairings.push({ teamAId: teamA, teamBId: teamB })
      }
    }
  } else {
    // Pour 3+ poules : séquentiellement
    const qualified: { teamId: string; rank: number; poolIndex: number }[] = []
    for (const entry of poolStandings) {
      if (entry.rank <= qualifiersPerPool) {
        qualified.push(entry)
      }
    }
    // Trier : meilleur rang d'abord, puis par index de poule
    qualified.sort((a, b) => a.rank - b.rank || a.poolIndex - b.poolIndex)

    // Pairer : premier vs dernier
    for (let i = 0; i < Math.floor(qualified.length / 2); i++) {
      pairings.push({
        teamAId: qualified[i].teamId,
        teamBId: qualified[qualified.length - 1 - i].teamId,
      })
    }
  }

  return pairings
}

// ---------------------------------------------------------------------------
// KOTH (King of the Hill)
// ---------------------------------------------------------------------------

/**
 * Génère les équipes pour un round KOTH de manière aléatoire.
 * Mélange les joueurs et les répartit en équipes de la taille préférée.
 */
export function generateKothTeamAssignments(
  playerIds: string[],
  numCourts: number
): string[][] {
  // Mélanger les joueurs
  const shuffled = [...playerIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // Calculer le nombre d'équipes (2 par terrain)
  const numTeams = numCourts * 2
  const teams: string[][] = Array.from({ length: numTeams }, () => [])

  // Distribuer en round-robin
  for (let i = 0; i < shuffled.length; i++) {
    teams[i % numTeams].push(shuffled[i])
  }

  return teams
}

// ---------------------------------------------------------------------------
// Classements / Standings
// ---------------------------------------------------------------------------

/**
 * Calcule le classement d'une poule à partir des matchs terminés.
 * Critères de tri : points (3 pour victoire, 0 pour défaite) → diff → matchs gagnés
 */
export function calculatePoolStandings(
  matches: Pick<Match, 'team_a_id' | 'team_b_id' | 'score_a' | 'score_b' | 'winner_id' | 'status'>[],
  teamIds: string[]
): StandingEntry[] {
  const stats = new Map<string, StandingEntry>()

  for (const teamId of teamIds) {
    stats.set(teamId, {
      teamId,
      points: 0,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      pointsDiff: 0,
    })
  }

  for (const match of matches) {
    if (match.status !== 'FINISHED') continue
    if (!match.team_a_id || !match.team_b_id) continue

    const a = stats.get(match.team_a_id)
    const b = stats.get(match.team_b_id)
    if (!a || !b) continue

    const sA = match.score_a ?? 0
    const sB = match.score_b ?? 0

    a.matchesPlayed++
    b.matchesPlayed++
    a.pointsDiff += sA - sB
    b.pointsDiff += sB - sA

    if (match.winner_id === match.team_a_id) {
      a.wins++
      a.points += 3
      b.losses++
    } else if (match.winner_id === match.team_b_id) {
      b.wins++
      b.points += 3
      a.losses++
    }
  }

  // Trier par points desc, puis diff desc, puis victoires desc
  const sorted = Array.from(stats.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff
    return b.wins - a.wins
  })

  return sorted
}

/**
 * Calcule le classement individuel KOTH.
 * Chaque joueur de l'équipe gagnante gagne des points.
 */
export function calculateKothStandings(
  matches: (Pick<Match, 'team_a_id' | 'team_b_id' | 'score_a' | 'score_b' | 'winner_id' | 'status'>)[],
  teamPlayerMap: Map<string, string[]> // teamId → playerIds
): StandingEntry[] {
  const stats = new Map<string, StandingEntry>()

  // Initialiser tous les joueurs
  for (const [, playerIds] of teamPlayerMap) {
    for (const playerId of playerIds) {
      if (!stats.has(playerId)) {
        stats.set(playerId, {
          playerId,
          points: 0,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          pointsDiff: 0,
        })
      }
    }
  }

  for (const match of matches) {
    if (match.status !== 'FINISHED') continue
    if (!match.team_a_id || !match.team_b_id) continue

    const teamAPlayers = teamPlayerMap.get(match.team_a_id) ?? []
    const teamBPlayers = teamPlayerMap.get(match.team_b_id) ?? []

    const sA = match.score_a ?? 0
    const sB = match.score_b ?? 0
    const winPoints = 3
    const diff = Math.abs(sA - sB)

    for (const pid of teamAPlayers) {
      const s = stats.get(pid)
      if (!s) continue
      s.matchesPlayed++
      s.pointsDiff += sA - sB
      if (match.winner_id === match.team_a_id) {
        s.wins++
        s.points += winPoints + diff
      } else {
        s.losses++
      }
    }

    for (const pid of teamBPlayers) {
      const s = stats.get(pid)
      if (!s) continue
      s.matchesPlayed++
      s.pointsDiff += sB - sA
      if (match.winner_id === match.team_b_id) {
        s.wins++
        s.points += winPoints + diff
      } else {
        s.losses++
      }
    }
  }

  return Array.from(stats.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff
    return b.wins - a.wins
  })
}
