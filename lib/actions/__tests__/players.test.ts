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

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(() =>
    Promise.resolve({ user: { id: 'user-1' }, supabase: mockSupabase })
  ),
}))

import {
  createPlayer,
  updatePlayer,
  deletePlayer,
  restorePlayer,
  permanentDeletePlayer,
  toggleGuestStatus,
  updateGuestSkills,
} from '../players'
import { requireAuth } from '@/lib/auth'

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value)
  }
  return fd
}

// Fluent chain builder for mocking Supabase queries
function chainMock(finalResult: { data?: unknown; error?: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
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

describe('createPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects missing name', async () => {
    const fd = makeFormData({
      gender: 'M',
      skill_service: '5',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await createPlayer(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('nom')
  })

  it('rejects empty name', async () => {
    const fd = makeFormData({
      name: '   ',
      gender: 'M',
      skill_service: '5',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await createPlayer(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('nom')
  })

  it('rejects name over 100 chars', async () => {
    const fd = makeFormData({
      name: 'a'.repeat(101),
      gender: 'M',
      skill_service: '5',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await createPlayer(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('100')
  })

  it('rejects invalid gender', async () => {
    const fd = makeFormData({
      name: 'Alice',
      gender: 'X',
      skill_service: '5',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await createPlayer(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Genre')
  })

  it('rejects skill_service < 1', async () => {
    const fd = makeFormData({
      name: 'Alice',
      gender: 'M',
      skill_service: '0',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await createPlayer(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('skill_service')
    expect(result.error).toContain('1 et 10')
  })

  it('rejects skill_service > 10', async () => {
    const fd = makeFormData({
      name: 'Alice',
      gender: 'M',
      skill_service: '11',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await createPlayer(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('skill_service')
    expect(result.error).toContain('1 et 10')
  })

  it('rejects skill_pass out of range', async () => {
    const fd = makeFormData({
      name: 'Alice',
      gender: 'M',
      skill_service: '5',
      skill_pass: '12',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await createPlayer(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('skill_pass')
    expect(result.error).toContain('1 et 10')
  })

  it('rejects skill_attack out of range', async () => {
    const fd = makeFormData({
      name: 'Alice',
      gender: 'M',
      skill_service: '5',
      skill_pass: '5',
      skill_attack: '-1',
      skill_defense: '5',
    })
    const result = await createPlayer(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('skill_attack')
    expect(result.error).toContain('1 et 10')
  })

  it('rejects skill_defense out of range', async () => {
    const fd = makeFormData({
      name: 'Alice',
      gender: 'M',
      skill_service: '5',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '15',
    })
    const result = await createPlayer(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('skill_defense')
    expect(result.error).toContain('1 et 10')
  })

  it('rejects NaN skill values', async () => {
    const fd = makeFormData({
      name: 'Alice',
      gender: 'M',
      skill_service: 'abc',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await createPlayer(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('skill_service')
  })

  it('returns unauthorized when auth fails', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Not authed'))
    const fd = makeFormData({
      name: 'Alice',
      gender: 'F',
      skill_service: '5',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await createPlayer(fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('autorisé')
  })

  it('succeeds with valid input', async () => {
    const chain = chainMock({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const fd = makeFormData({
      name: 'Alice',
      gender: 'F',
      skill_service: '7',
      skill_pass: '8',
      skill_attack: '6',
      skill_defense: '9',
    })
    const result = await createPlayer(fd)
    expect(result.success).toBe(true)
    expect(chain.insert).toHaveBeenCalledWith({
      name: 'Alice',
      gender: 'F',
      skill_service: 7,
      skill_pass: 8,
      skill_attack: 6,
      skill_defense: 9,
    })
  })

  it('defaults gender to M when empty', async () => {
    const chain = chainMock({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const fd = makeFormData({
      name: 'Bob',
      gender: '',
      skill_service: '5',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await createPlayer(fd)
    expect(result.success).toBe(true)
    expect(chain.insert).toHaveBeenCalledWith({
      name: 'Bob',
      gender: 'M',
      skill_service: 5,
      skill_pass: 5,
      skill_attack: 5,
      skill_defense: 5,
    })
  })

  it('trims whitespace from name', async () => {
    const chain = chainMock({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const fd = makeFormData({
      name: '  Alice  ',
      gender: 'F',
      skill_service: '5',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await createPlayer(fd)
    expect(result.success).toBe(true)
    expect(chain.insert).toHaveBeenCalledWith({
      name: 'Alice',
      gender: 'F',
      skill_service: 5,
      skill_pass: 5,
      skill_attack: 5,
      skill_defense: 5,
    })
  })

  it('returns Supabase error on insert failure', async () => {
    const chain = chainMock({ data: null, error: { message: 'Unique constraint violation' } })
    mockSupabase.from.mockReturnValue(chain)

    const fd = makeFormData({
      name: 'Alice',
      gender: 'F',
      skill_service: '5',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await createPlayer(fd)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unique constraint violation')
  })
})

describe('updatePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects missing name', async () => {
    const fd = makeFormData({
      gender: 'M',
      skill_service: '5',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await updatePlayer('player-1', fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('nom')
  })

  it('rejects name over 100 chars', async () => {
    const fd = makeFormData({
      name: 'b'.repeat(101),
      gender: 'M',
      skill_service: '5',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await updatePlayer('player-1', fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('100')
  })

  it('rejects invalid gender', async () => {
    const fd = makeFormData({
      name: 'Charlie',
      gender: 'Z',
      skill_service: '5',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await updatePlayer('player-1', fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Genre')
  })

  it('rejects skills out of range', async () => {
    const fd = makeFormData({
      name: 'Charlie',
      gender: 'M',
      skill_service: '5',
      skill_pass: '11',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await updatePlayer('player-1', fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('skill_pass')
  })

  it('returns unauthorized when auth fails', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Not authed'))
    const fd = makeFormData({
      name: 'Charlie',
      gender: 'M',
      skill_service: '5',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await updatePlayer('player-1', fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('autorisé')
  })

  it('succeeds with valid input', async () => {
    const chain = chainMock({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const fd = makeFormData({
      name: 'Charlie Updated',
      gender: 'M',
      skill_service: '8',
      skill_pass: '7',
      skill_attack: '9',
      skill_defense: '6',
    })
    const result = await updatePlayer('player-1', fd)
    expect(result.success).toBe(true)
    expect(chain.update).toHaveBeenCalledWith({
      name: 'Charlie Updated',
      gender: 'M',
      skill_service: 8,
      skill_pass: 7,
      skill_attack: 9,
      skill_defense: 6,
    })
    expect(chain.eq).toHaveBeenCalledWith('id', 'player-1')
  })

  it('returns Supabase error on update failure', async () => {
    const chain = chainMock({ data: null, error: { message: 'Database error' } })
    mockSupabase.from.mockReturnValue(chain)

    const fd = makeFormData({
      name: 'Charlie',
      gender: 'M',
      skill_service: '5',
      skill_pass: '5',
      skill_attack: '5',
      skill_defense: '5',
    })
    const result = await updatePlayer('player-1', fd)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Database error')
  })
})

describe('deletePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns unauthorized when auth fails', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Not authed'))
    const result = await deletePlayer('player-1')
    expect(result.success).toBe(false)
    expect(result.error).toContain('autorisé')
  })

  it('succeeds and sets is_active to false', async () => {
    const chain = chainMock({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const result = await deletePlayer('player-1')
    expect(result.success).toBe(true)
    expect(chain.update).toHaveBeenCalledWith({ is_active: false })
    expect(chain.eq).toHaveBeenCalledWith('id', 'player-1')
  })

  it('returns Supabase error on update failure', async () => {
    const chain = chainMock({ data: null, error: { message: 'Update failed' } })
    mockSupabase.from.mockReturnValue(chain)

    const result = await deletePlayer('player-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Update failed')
  })
})

describe('restorePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns unauthorized when auth fails', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Not authed'))
    const result = await restorePlayer('player-1')
    expect(result.success).toBe(false)
    expect(result.error).toContain('autorisé')
  })

  it('succeeds and sets is_active to true', async () => {
    const chain = chainMock({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const result = await restorePlayer('player-1')
    expect(result.success).toBe(true)
    expect(chain.update).toHaveBeenCalledWith({ is_active: true })
    expect(chain.eq).toHaveBeenCalledWith('id', 'player-1')
  })

  it('returns Supabase error on update failure', async () => {
    const chain = chainMock({ data: null, error: { message: 'Restore failed' } })
    mockSupabase.from.mockReturnValue(chain)

    const result = await restorePlayer('player-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Restore failed')
  })
})

describe('permanentDeletePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns unauthorized when auth fails', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Not authed'))
    const result = await permanentDeletePlayer('player-1')
    expect(result.success).toBe(false)
    expect(result.error).toContain('autorisé')
  })

  it('succeeds and calls delete', async () => {
    const chain = chainMock({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const result = await permanentDeletePlayer('player-1')
    expect(result.success).toBe(true)
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'player-1')
  })

  it('returns Supabase error on delete failure', async () => {
    const chain = chainMock({ data: null, error: { message: 'Delete failed' } })
    mockSupabase.from.mockReturnValue(chain)

    const result = await permanentDeletePlayer('player-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Delete failed')
  })
})

describe('toggleGuestStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns unauthorized when auth fails', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Not authed'))
    const result = await toggleGuestStatus('player-1', true)
    expect(result.success).toBe(false)
    expect(result.error).toContain('autorisé')
  })

  it('succeeds and sets is_guest to true', async () => {
    const chain = chainMock({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const result = await toggleGuestStatus('player-1', true)
    expect(result.success).toBe(true)
    expect(chain.update).toHaveBeenCalledWith({ is_guest: true })
    expect(chain.eq).toHaveBeenCalledWith('id', 'player-1')
  })

  it('succeeds and sets is_guest to false', async () => {
    const chain = chainMock({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const result = await toggleGuestStatus('player-1', false)
    expect(result.success).toBe(true)
    expect(chain.update).toHaveBeenCalledWith({ is_guest: false })
    expect(chain.eq).toHaveBeenCalledWith('id', 'player-1')
  })

  it('returns Supabase error on update failure', async () => {
    const chain = chainMock({ data: null, error: { message: 'Update guest status failed' } })
    mockSupabase.from.mockReturnValue(chain)

    const result = await toggleGuestStatus('player-1', true)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Update guest status failed')
  })
})

describe('updateGuestSkills', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects skills below 1', async () => {
    const skills = {
      skill_service: 0,
      skill_pass: 5,
      skill_attack: 5,
      skill_defense: 5,
    }
    const result = await updateGuestSkills('player-1', skills)
    expect(result.success).toBe(false)
    expect(result.error).toContain('skill_service')
    expect(result.error).toContain('1 et 10')
  })

  it('rejects skills above 10', async () => {
    const skills = {
      skill_service: 5,
      skill_pass: 11,
      skill_attack: 5,
      skill_defense: 5,
    }
    const result = await updateGuestSkills('player-1', skills)
    expect(result.success).toBe(false)
    expect(result.error).toContain('skill_pass')
    expect(result.error).toContain('1 et 10')
  })

  it('rejects NaN skills', async () => {
    const skills = {
      skill_service: NaN,
      skill_pass: 5,
      skill_attack: 5,
      skill_defense: 5,
    }
    const result = await updateGuestSkills('player-1', skills)
    expect(result.success).toBe(false)
    expect(result.error).toContain('skill_service')
  })

  it('returns unauthorized when auth fails', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Not authed'))
    const skills = {
      skill_service: 7,
      skill_pass: 8,
      skill_attack: 6,
      skill_defense: 9,
    }
    const result = await updateGuestSkills('player-1', skills)
    expect(result.success).toBe(false)
    expect(result.error).toContain('autorisé')
  })

  it('rejects when player not found', async () => {
    const selectChain = chainMock({ data: null, error: { message: 'Not found' } })
    mockSupabase.from.mockReturnValue(selectChain)

    const skills = {
      skill_service: 7,
      skill_pass: 8,
      skill_attack: 6,
      skill_defense: 9,
    }
    const result = await updateGuestSkills('player-1', skills)
    expect(result.success).toBe(false)
    expect(result.error).toContain('introuvable')
  })

  it('rejects when player is not a guest', async () => {
    const selectChain = chainMock({ data: { is_guest: false }, error: null })
    mockSupabase.from.mockReturnValue(selectChain)

    const skills = {
      skill_service: 7,
      skill_pass: 8,
      skill_attack: 6,
      skill_defense: 9,
    }
    const result = await updateGuestSkills('player-1', skills)
    expect(result.success).toBe(false)
    expect(result.error).toContain('invités')
  })

  it('succeeds when player is a guest with valid skills', async () => {
    // First call: select (check is_guest)
    const selectChain = chainMock({ data: { is_guest: true }, error: null })
    // Second call: update
    const updateChain = chainMock({ data: null, error: null })

    mockSupabase.from
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain)

    const skills = {
      skill_service: 7,
      skill_pass: 8,
      skill_attack: 6,
      skill_defense: 9,
    }
    const result = await updateGuestSkills('player-1', skills)
    expect(result.success).toBe(true)
    expect(updateChain.update).toHaveBeenCalledWith({
      ...skills,
      skills_verified: true,
    })
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'player-1')
  })

  it('returns Supabase error on update failure', async () => {
    // First call: select succeeds
    const selectChain = chainMock({ data: { is_guest: true }, error: null })
    // Second call: update fails
    const updateChain = chainMock({ data: null, error: { message: 'Update skills failed' } })

    mockSupabase.from
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain)

    const skills = {
      skill_service: 7,
      skill_pass: 8,
      skill_attack: 6,
      skill_defense: 9,
    }
    const result = await updateGuestSkills('player-1', skills)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Update skills failed')
  })

  it('accepts all skills at boundary value 1', async () => {
    const selectChain = chainMock({ data: { is_guest: true }, error: null })
    const updateChain = chainMock({ data: null, error: null })

    mockSupabase.from
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain)

    const skills = {
      skill_service: 1,
      skill_pass: 1,
      skill_attack: 1,
      skill_defense: 1,
    }
    const result = await updateGuestSkills('player-1', skills)
    expect(result.success).toBe(true)
  })

  it('accepts all skills at boundary value 10', async () => {
    const selectChain = chainMock({ data: { is_guest: true }, error: null })
    const updateChain = chainMock({ data: null, error: null })

    mockSupabase.from
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain)

    const skills = {
      skill_service: 10,
      skill_pass: 10,
      skill_attack: 10,
      skill_defense: 10,
    }
    const result = await updateGuestSkills('player-1', skills)
    expect(result.success).toBe(true)
  })
})
