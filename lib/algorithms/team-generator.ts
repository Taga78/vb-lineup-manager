import { SKILL_KEYS, type SkillKey, type Player, type Team, type TeamSkillAverages } from '@/lib/types'

/** playerId → coPlayerId → number of times on the same team recently */
export type CooccurrenceMap = Map<string, Map<string, number>>

interface TeamGeneratorInput {
  players: Player[]
  numCourts: number
  preferredTeamSize: number
  cooccurrences?: CooccurrenceMap
}

interface TeamGeneratorOutput {
  teams: Team[]
}

// --- Gender-based skill multipliers ---
// Reflects physical differences (net height, power) that raw ratings don't capture.
// Adjust these constants to tune balance.
const GENDER_MULTIPLIER: Record<string, number> = { M: 1.0, F: 0.85 }
const DEFAULT_MULTIPLIER = 1.0

/** Returns the 4 skills adjusted by a gender multiplier */
function effectiveSkills(player: Player): Record<SkillKey, number> {
  const mult = GENDER_MULTIPLIER[player.gender ?? 'X'] ?? DEFAULT_MULTIPLIER
  const result = {} as Record<SkillKey, number>
  for (const key of SKILL_KEYS) {
    result[key] = player[key] * mult
  }
  return result
}

/** Sum of effective (gender-adjusted) skills */
function effectiveComposite(player: Player): number {
  const eff = effectiveSkills(player)
  return SKILL_KEYS.reduce((acc, key) => acc + eff[key], 0)
}

/**
 * Normalized team score per dimension.
 * Divides by teamSize, except teams of 3 use divisor 4
 * (they need stronger players to match a team of 4 on court).
 */
function normalizedTeamScores(players: Player[]): Record<SkillKey, number> {
  const sums = { skill_service: 0, skill_pass: 0, skill_attack: 0, skill_defense: 0 } as Record<SkillKey, number>
  for (const p of players) {
    const eff = effectiveSkills(p)
    for (const key of SKILL_KEYS) {
      sums[key] += eff[key]
    }
  }
  const divisor = players.length === 3 ? 4 : players.length
  const result = {} as Record<SkillKey, number>
  for (const key of SKILL_KEYS) {
    result[key] = sums[key] / divisor
  }
  return result
}

/**
 * Round-robin distribution + best-improvement swap optimization.
 *
 * 1. Calculate numTeams (even, team sizes 3-6)
 * 2. Round-robin by gender for even gender distribution (±1)
 * 3. Best-improvement swap optimization on skill balance + familiarity
 * 4. Return teams with avgSkills per dimension
 */
export function generateTeams({ players, numCourts, preferredTeamSize, cooccurrences }: TeamGeneratorInput): TeamGeneratorOutput {
  if (players.length === 0) {
    return { teams: [] }
  }

  // Step 1: Calculate number of teams
  let numTeams = Math.round(players.length / preferredTeamSize)
  // Force even
  if (numTeams % 2 !== 0) {
    const lower = Math.max(2, numTeams - 1)
    const upper = numTeams + 1
    const lowerSize = players.length / lower
    const upperSize = players.length / upper
    numTeams = Math.abs(lowerSize - preferredTeamSize) <= Math.abs(upperSize - preferredTeamSize)
      ? lower
      : upper
  }
  if (numTeams < 2) numTeams = 2

  // Hard guardrails: team sizes must stay within 3-6
  while (numTeams > 2 && players.length / numTeams < 3) {
    numTeams -= 2
  }
  while (Math.ceil(players.length / numTeams) > 6 && numTeams < players.length) {
    numTeams += 2
  }
  if (numTeams < 2) numTeams = 2

  // Step 2: Round-robin distribution by gender
  const women = players.filter((p) => p.gender === 'F')
  const men = players.filter((p) => p.gender !== 'F')

  // Shuffle then sort by effective composite desc for each group
  shuffleArray(women)
  women.sort((a, b) => effectiveComposite(b) - effectiveComposite(a))
  shuffleArray(men)
  men.sort((a, b) => effectiveComposite(b) - effectiveComposite(a))

  const teamBuckets: Player[][] = Array.from({ length: numTeams }, () => [])

  // Round-robin women
  for (let i = 0; i < women.length; i++) {
    teamBuckets[i % numTeams].push(women[i])
  }

  // Round-robin men: order teams by current size (ascending) so teams
  // with fewer women get men first → balanced total sizes (±1)
  const teamOrder = Array.from({ length: numTeams }, (_, i) => i)
    .sort((a, b) => teamBuckets[a].length - teamBuckets[b].length)
  for (let i = 0; i < men.length; i++) {
    teamBuckets[teamOrder[i % numTeams]].push(men[i])
  }

  // Step 3: Best-improvement swap optimization
  const familiarityWeight = cooccurrences ? 0.3 : 0

  const score = (buckets: Player[][]) =>
    globalImbalance(buckets) + familiarityWeight * globalFamiliarity(buckets, cooccurrences)

  for (let iter = 0; iter < 200; iter++) {
    let bestImprovement = 0
    let bestSwap: { tA: number; iA: number; tB: number; iB: number } | null = null

    const currentScore = score(teamBuckets)

    // Scan all possible same-gender swaps, find the single best one
    for (let tA = 0; tA < numTeams - 1; tA++) {
      for (let tB = tA + 1; tB < numTeams; tB++) {
        for (let i = 0; i < teamBuckets[tA].length; i++) {
          for (let j = 0; j < teamBuckets[tB].length; j++) {
            const playerA = teamBuckets[tA][i]
            const playerB = teamBuckets[tB][j]

            // Only swap same gender to preserve round-robin gender balance
            if ((playerA.gender ?? 'X') !== (playerB.gender ?? 'X')) continue

            // Apply swap
            teamBuckets[tA][i] = playerB
            teamBuckets[tB][j] = playerA

            const newScore = score(teamBuckets)
            const improvement = currentScore - newScore

            if (improvement > bestImprovement) {
              bestImprovement = improvement
              bestSwap = { tA, iA: i, tB, iB: j }
            }

            // Revert swap
            teamBuckets[tA][i] = playerA
            teamBuckets[tB][j] = playerB
          }
        }
      }
    }

    // Apply the best swap if it exceeds the convergence threshold
    if (bestSwap && bestImprovement > 0.005) {
      const { tA, iA, tB, iB } = bestSwap
      const tmp = teamBuckets[tA][iA]
      teamBuckets[tA][iA] = teamBuckets[tB][iB]
      teamBuckets[tB][iB] = tmp
    } else {
      break // Converged
    }
  }

  // Step 4: Build result
  const result: Team[] = teamBuckets
    .filter((t) => t.length > 0)
    .map((teamPlayers, i) => ({
      court_number: Math.floor(i / 2) + 1,
      name: i % 2 === 0 ? 'Equipe A' : 'Equipe B',
      players: teamPlayers,
      avgSkills: teamSkillAverages(teamPlayers),
    }))

  return { teams: result }
}

/** Compute average skills per dimension for a team (raw skills, not effective) */
function teamSkillAverages(players: Player[]): TeamSkillAverages {
  if (players.length === 0) {
    return { skill_service: 0, skill_pass: 0, skill_attack: 0, skill_defense: 0, overall: 0 }
  }
  const avgs = {} as Record<string, number>
  let totalSum = 0
  for (const key of SKILL_KEYS) {
    const sum = players.reduce((acc, p) => acc + p[key], 0)
    avgs[key] = sum / players.length
    totalSum += avgs[key]
  }
  return {
    skill_service: Math.round(avgs.skill_service * 10) / 10,
    skill_pass: Math.round(avgs.skill_pass * 10) / 10,
    skill_attack: Math.round(avgs.skill_attack * 10) / 10,
    skill_defense: Math.round(avgs.skill_defense * 10) / 10,
    overall: Math.round((totalSum / SKILL_KEYS.length) * 10) / 10,
  }
}

/** Max skill dimension spread across all teams using effective normalized scores */
function globalImbalance(teams: Player[][]): number {
  const nonEmpty = teams.filter((t) => t.length > 0)
  if (nonEmpty.length < 2) return 0
  const allScores = nonEmpty.map((t) => normalizedTeamScores(t))
  let maxSpread = 0
  for (const key of SKILL_KEYS) {
    const values = allScores.map((s) => s[key])
    maxSpread = Math.max(maxSpread, Math.max(...values) - Math.min(...values))
  }
  return maxSpread
}

/** Sum of co-occurrence counts for all player pairs in a single team */
function teamFamiliarity(team: Player[], cooccurrences?: CooccurrenceMap): number {
  if (!cooccurrences) return 0
  let sum = 0
  for (let i = 0; i < team.length - 1; i++) {
    const playerMap = cooccurrences.get(team[i].id)
    if (!playerMap) continue
    for (let j = i + 1; j < team.length; j++) {
      sum += playerMap.get(team[j].id) ?? 0
    }
  }
  return sum
}

/** Total familiarity across all teams */
function globalFamiliarity(teams: Player[][], cooccurrences?: CooccurrenceMap): number {
  let sum = 0
  for (const team of teams) {
    sum += teamFamiliarity(team, cooccurrences)
  }
  return sum
}

/** Fisher-Yates shuffle (in-place) */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}
