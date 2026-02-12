import { describe, it, expect } from 'vitest'
import { generateTeams } from '@/lib/algorithms/team-generator'
import type { Player } from '@/lib/types'

/** Helper: create a player with default skills */
function makePlayer(
  overrides: Partial<Player> & { name: string }
): Player {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name,
    gender: overrides.gender ?? 'M',
    skill_service: overrides.skill_service ?? 5,
    skill_pass: overrides.skill_pass ?? 5,
    skill_attack: overrides.skill_attack ?? 5,
    skill_defense: overrides.skill_defense ?? 5,
    is_active: overrides.is_active ?? true,
    is_guest: overrides.is_guest ?? false,
  }
}

/** Helper: generate N players with sequential names */
function makePlayers(
  count: number,
  overrides?: Partial<Player>
): Player[] {
  return Array.from({ length: count }, (_, i) =>
    makePlayer({ name: `Player ${i + 1}`, ...overrides })
  )
}

describe('generateTeams', () => {
  // --- All players distributed ---

  it('distributes all players across teams (no player left out)', () => {
    const players = makePlayers(12)
    const { teams } = generateTeams({ players, numCourts: 2, preferredTeamSize: 4 })

    const assignedIds = teams.flatMap((t) => t.players.map((p) => p.id))
    const inputIds = players.map((p) => p.id)

    expect(assignedIds.sort()).toEqual(inputIds.sort())
  })

  it('distributes all players when count is not evenly divisible', () => {
    const players = makePlayers(11)
    const { teams } = generateTeams({ players, numCourts: 2, preferredTeamSize: 4 })

    const assignedIds = teams.flatMap((t) => t.players.map((p) => p.id))
    expect(assignedIds).toHaveLength(11)
  })

  // --- Correct number of teams ---

  it('generates an even number of teams', () => {
    const players = makePlayers(16)
    const { teams } = generateTeams({ players, numCourts: 3, preferredTeamSize: 4 })

    expect(teams.length % 2).toBe(0)
  })

  it('generates at least 2 teams when there are enough players', () => {
    const players = makePlayers(8)
    const { teams } = generateTeams({ players, numCourts: 1, preferredTeamSize: 4 })

    expect(teams.length).toBeGreaterThanOrEqual(2)
  })

  // --- Gender balancing ---

  it('distributes women evenly across teams (within +/-1)', () => {
    const women = makePlayers(4, { gender: 'F' })
    const men = makePlayers(12, { gender: 'M' })
    const players = [...women, ...men]

    const { teams } = generateTeams({ players, numCourts: 2, preferredTeamSize: 4 })

    const womenCounts = teams.map(
      (t) => t.players.filter((p) => p.gender === 'F').length
    )
    const minW = Math.min(...womenCounts)
    const maxW = Math.max(...womenCounts)

    expect(maxW - minW).toBeLessThanOrEqual(1)
  })

  it('handles all-female roster', () => {
    const players = makePlayers(8, { gender: 'F' })
    const { teams } = generateTeams({ players, numCourts: 1, preferredTeamSize: 4 })

    const total = teams.reduce((acc, t) => acc + t.players.length, 0)
    expect(total).toBe(8)
  })

  // --- Team size range ---

  it('keeps teams within 3-6 player size range', () => {
    const players = makePlayers(20)
    const { teams } = generateTeams({ players, numCourts: 3, preferredTeamSize: 4 })

    for (const team of teams) {
      expect(team.players.length).toBeGreaterThanOrEqual(3)
      expect(team.players.length).toBeLessThanOrEqual(6)
    }
  })

  it('targets the preferred team size', () => {
    const players = makePlayers(16)
    const { teams } = generateTeams({ players, numCourts: 2, preferredTeamSize: 4 })

    const avgSize = players.length / teams.length
    // Average should be close to preferred size
    expect(avgSize).toBeGreaterThanOrEqual(3)
    expect(avgSize).toBeLessThanOrEqual(6)
  })

  // --- Edge cases ---

  it('returns empty teams array for 0 players', () => {
    const { teams } = generateTeams({ players: [], numCourts: 2, preferredTeamSize: 4 })
    expect(teams).toEqual([])
  })

  it('handles 1 player by placing them in a team', () => {
    const players = makePlayers(1)
    const { teams } = generateTeams({ players, numCourts: 1, preferredTeamSize: 4 })

    const total = teams.reduce((acc, t) => acc + t.players.length, 0)
    expect(total).toBe(1)
  })

  it('handles odd number of players', () => {
    const players = makePlayers(9)
    const { teams } = generateTeams({ players, numCourts: 1, preferredTeamSize: 4 })

    const total = teams.reduce((acc, t) => acc + t.players.length, 0)
    expect(total).toBe(9)
    // All teams should exist
    expect(teams.length).toBeGreaterThanOrEqual(2)
  })

  it('handles 2 players', () => {
    const players = makePlayers(2)
    const { teams } = generateTeams({ players, numCourts: 1, preferredTeamSize: 4 })

    const total = teams.reduce((acc, t) => acc + t.players.length, 0)
    expect(total).toBe(2)
  })

  // --- Team output structure ---

  it('assigns court_number and name correctly', () => {
    const players = makePlayers(16)
    const { teams } = generateTeams({ players, numCourts: 2, preferredTeamSize: 4 })

    // Teams should be paired: court 1 has Equipe A and B, court 2 has Equipe A and B
    for (let i = 0; i < teams.length; i++) {
      expect(teams[i].court_number).toBe(Math.floor(i / 2) + 1)
      expect(teams[i].name).toBe(i % 2 === 0 ? 'Equipe A' : 'Equipe B')
    }
  })

  it('includes avgSkills with all 4 dimensions + overall', () => {
    const players = makePlayers(8)
    const { teams } = generateTeams({ players, numCourts: 1, preferredTeamSize: 4 })

    for (const team of teams) {
      expect(team.avgSkills).toHaveProperty('skill_service')
      expect(team.avgSkills).toHaveProperty('skill_pass')
      expect(team.avgSkills).toHaveProperty('skill_attack')
      expect(team.avgSkills).toHaveProperty('skill_defense')
      expect(team.avgSkills).toHaveProperty('overall')
      // Values should be numbers > 0
      expect(team.avgSkills.overall).toBeGreaterThan(0)
    }
  })

  // --- Skill balancing ---

  it('produces balanced teams when players have varied skills', () => {
    // Create players with a range of skill levels
    const players: Player[] = []
    for (let i = 0; i < 12; i++) {
      players.push(
        makePlayer({
          name: `Player ${i}`,
          skill_service: (i % 10) + 1,
          skill_pass: ((i + 2) % 10) + 1,
          skill_attack: ((i + 4) % 10) + 1,
          skill_defense: ((i + 6) % 10) + 1,
        })
      )
    }

    const { teams } = generateTeams({ players, numCourts: 2, preferredTeamSize: 4 })

    // Overall averages should not differ too wildly between teams
    const overalls = teams.map((t) => t.avgSkills.overall)
    const maxDiff = Math.max(...overalls) - Math.min(...overalls)
    // Allow some tolerance but teams should be roughly balanced
    expect(maxDiff).toBeLessThan(5)
  })
})
