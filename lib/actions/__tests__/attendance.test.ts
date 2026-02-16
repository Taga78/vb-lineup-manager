import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase helpers
const mockSupabase = {
  from: vi.fn(),
  auth: { getUser: vi.fn() },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// Mock GUEST_LEVELS
vi.mock('@/lib/types', async () => {
  const actual = await vi.importActual('@/lib/types')
  return {
    ...actual,
    GUEST_LEVELS: {
      beginner: { label: 'Débutant', skills: 3 },
      intermediate: { label: 'Intermédiaire', skills: 5 },
      advanced: { label: 'Confirmé', skills: 7 },
    },
  }
})

import { checkIn, checkOut, registerGuest } from '../attendance'

// Fluent chain builder for mocking Supabase queries
function chainMock(finalResult: { data?: unknown; error?: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(finalResult)
  chain.maybeSingle = vi.fn().mockResolvedValue(finalResult)
  // For terminal calls that just return { data, error }
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(finalResult))
  return chain
}

describe('checkIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('succeeds with authenticated user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const chain = chainMock({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const result = await checkIn('session-1', 'player-1')
    expect(result.success).toBe(true)
    expect(chain.upsert).toHaveBeenCalledWith(
      { session_id: 'session-1', player_id: 'player-1', marked_by: 'user-1' },
      { onConflict: 'session_id,player_id' }
    )
  })

  it('succeeds without authenticated user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const chain = chainMock({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const result = await checkIn('session-1', 'player-1')
    expect(result.success).toBe(true)
    expect(chain.upsert).toHaveBeenCalledWith(
      { session_id: 'session-1', player_id: 'player-1' },
      { onConflict: 'session_id,player_id' }
    )
  })

  it('returns error on database failure', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const chain = chainMock({ data: null, error: { message: 'DB error' } })
    mockSupabase.from.mockReturnValue(chain)

    const result = await checkIn('session-1', 'player-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('DB error')
  })
})

describe('checkOut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('succeeds when delete works', async () => {
    const chain = chainMock({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const result = await checkOut('session-1', 'player-1')
    expect(result.success).toBe(true)
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('session_id', 'session-1')
    expect(chain.eq).toHaveBeenCalledWith('player_id', 'player-1')
  })

  it('returns error on database failure', async () => {
    const chain = chainMock({ data: null, error: { message: 'Delete failed' } })
    mockSupabase.from.mockReturnValue(chain)

    const result = await checkOut('session-1', 'player-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Delete failed')
  })
})

describe('registerGuest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects empty name', async () => {
    const result = await registerGuest('session-1', '   ', 'M', 'beginner')
    expect(result.success).toBe(false)
    expect(result.error).toContain('nom')
  })

  it('rejects invalid gender', async () => {
    const result = await registerGuest('session-1', 'John Doe', 'X' as 'M', 'beginner')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Genre invalide')
  })

  it('rejects invalid level', async () => {
    const result = await registerGuest('session-1', 'John Doe', 'M', 'expert' as unknown as Parameters<typeof registerGuest>[3])
    expect(result.success).toBe(false)
    expect(result.error).toContain('Niveau invalide')
  })

  it('succeeds and creates player + attendance with beginner level', async () => {
    const mockPlayer = {
      id: 'player-123',
      name: 'John Doe',
      gender: 'M',
      skill_service: 3,
      skill_pass: 3,
      skill_attack: 3,
      skill_defense: 3,
      is_active: true,
      is_guest: true,
    }

    // First call: player insert
    const playerChain = chainMock({ data: mockPlayer, error: null })
    // Second call: attendance insert
    const attendanceChain = chainMock({ data: null, error: null })

    mockSupabase.from
      .mockReturnValueOnce(playerChain)
      .mockReturnValueOnce(attendanceChain)

    const result = await registerGuest('session-1', 'John Doe', 'M', 'beginner')
    expect(result.success).toBe(true)
    expect(result.player).toEqual(mockPlayer)

    // Verify player insert
    expect(playerChain.insert).toHaveBeenCalledWith({
      name: 'John Doe',
      gender: 'M',
      is_guest: true,
      is_active: true,
      skills_verified: false,
      skill_service: 3,
      skill_pass: 3,
      skill_attack: 3,
      skill_defense: 3,
    })
    expect(playerChain.select).toHaveBeenCalled()
    expect(playerChain.single).toHaveBeenCalled()

    // Verify attendance insert
    expect(attendanceChain.insert).toHaveBeenCalledWith({
      session_id: 'session-1',
      player_id: 'player-123',
    })
  })

  it('succeeds with intermediate level', async () => {
    const mockPlayer = {
      id: 'player-456',
      name: 'Jane Smith',
      gender: 'F',
      skill_service: 5,
      skill_pass: 5,
      skill_attack: 5,
      skill_defense: 5,
      is_active: true,
      is_guest: true,
    }

    const playerChain = chainMock({ data: mockPlayer, error: null })
    const attendanceChain = chainMock({ data: null, error: null })

    mockSupabase.from
      .mockReturnValueOnce(playerChain)
      .mockReturnValueOnce(attendanceChain)

    const result = await registerGuest('session-1', 'Jane Smith', 'F', 'intermediate')
    expect(result.success).toBe(true)
    expect(result.player?.skill_service).toBe(5)
  })

  it('succeeds with advanced level', async () => {
    const mockPlayer = {
      id: 'player-789',
      name: 'Alex Pro',
      gender: 'M',
      skill_service: 7,
      skill_pass: 7,
      skill_attack: 7,
      skill_defense: 7,
      is_active: true,
      is_guest: true,
    }

    const playerChain = chainMock({ data: mockPlayer, error: null })
    const attendanceChain = chainMock({ data: null, error: null })

    mockSupabase.from
      .mockReturnValueOnce(playerChain)
      .mockReturnValueOnce(attendanceChain)

    const result = await registerGuest('session-1', 'Alex Pro', 'M', 'advanced')
    expect(result.success).toBe(true)
    expect(result.player?.skill_service).toBe(7)
  })

  it('returns error when player creation fails', async () => {
    const playerChain = chainMock({ data: null, error: { message: 'Player creation failed' } })
    mockSupabase.from.mockReturnValue(playerChain)

    const result = await registerGuest('session-1', 'John Doe', 'M', 'beginner')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Player creation failed')
  })

  it('returns error when attendance creation fails', async () => {
    const mockPlayer = {
      id: 'player-123',
      name: 'John Doe',
      gender: 'M',
      skill_service: 3,
      skill_pass: 3,
      skill_attack: 3,
      skill_defense: 3,
      is_active: true,
      is_guest: true,
    }

    const playerChain = chainMock({ data: mockPlayer, error: null })
    const attendanceChain = chainMock({ data: null, error: { message: 'Attendance failed' } })

    mockSupabase.from
      .mockReturnValueOnce(playerChain)
      .mockReturnValueOnce(attendanceChain)

    const result = await registerGuest('session-1', 'John Doe', 'M', 'beginner')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Attendance failed')
  })

  it('trims whitespace from name', async () => {
    const mockPlayer = {
      id: 'player-123',
      name: 'John Doe',
      gender: 'M',
      skill_service: 3,
      skill_pass: 3,
      skill_attack: 3,
      skill_defense: 3,
      is_active: true,
      is_guest: true,
    }

    const playerChain = chainMock({ data: mockPlayer, error: null })
    const attendanceChain = chainMock({ data: null, error: null })

    mockSupabase.from
      .mockReturnValueOnce(playerChain)
      .mockReturnValueOnce(attendanceChain)

    const result = await registerGuest('session-1', '  John Doe  ', 'M', 'beginner')
    expect(result.success).toBe(true)
    expect(playerChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'John Doe' })
    )
  })
})
